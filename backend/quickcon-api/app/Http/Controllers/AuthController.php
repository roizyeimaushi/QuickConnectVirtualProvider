<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\AuditLog;
use App\Models\UserSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;

use Illuminate\Support\Facades\RateLimiter;
use App\Models\Setting;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Security: Rate Limiting
        // Use IP and Email as key to prevent lockouts from shared IPs unless same email
        $throttleKey = 'login.' . $request->ip() . '.' . $request->email;
        $maxAttempts = (int) (Setting::where('key', 'max_login_attempts')->value('value') ?: 5);
        $decaySeconds = 60; // Lockout for 1 minute

        if (RateLimiter::tooManyAttempts($throttleKey, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            
            // Log rate limit exceeded
            AuditLog::logFailed(
                'login_rate_limited',
                "Login rate limit exceeded for email: {$request->email}",
                null,
                'User',
                null,
                ['email' => $request->email, 'lockout_seconds' => $seconds]
            );
            
            throw ValidationException::withMessages([
                'email' => ["Too many login attempts. Please try again in {$seconds} seconds."],
            ]);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            // Increment failed attempts
            RateLimiter::hit($throttleKey, $decaySeconds);
            
            // Log failed login attempt with detailed info
            AuditLog::logFailed(
                'login_failed',
                "Failed login attempt for email: {$request->email}",
                $user?->id,
                'User',
                $user?->id,
                [
                    'email' => $request->email,
                    'reason' => !$user ? 'user_not_found' : 'invalid_password',
                    'attempts_remaining' => $maxAttempts - RateLimiter::attempts($throttleKey),
                ]
            );
            
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            // Log deactivated account login attempt
            AuditLog::logFailed(
                'login_failed',
                "Login blocked - Account deactivated: {$user->first_name} {$user->last_name}",
                $user->id,
                'User',
                $user->id,
                ['email' => $request->email, 'reason' => 'account_deactivated']
            );
            
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated. Please contact the administrator.'],
            ]);
        }

        // Clear rate limit on successful login
        RateLimiter::clear($throttleKey);

        // No 2FA - proceed with normal login
        $token = $user->createToken('auth_token')->plainTextToken;

        // Create new User Session
        $session = UserSession::create([
            'user_id' => $user->id,
            'login_time' => now(),
            'is_online' => true,
            'last_activity' => now(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->header('User-Agent'),
        ]);

        // Log successful login with enhanced data
        AuditLog::log(
            'login',
            "{$user->first_name} {$user->last_name} logged in successfully",
            AuditLog::STATUS_SUCCESS,
            $user->id,
            'User',
            $user->id,
            null,
            ['session_id' => $session->id]
        );

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        
        // Close active session
        $session = UserSession::where('user_id', $user->id)
                              ->where('is_online', true)
                              ->orderBy('created_at', 'desc')
                              ->first();
                              
        if ($session) {
            $session->update([
                'logout_time' => now(),
                'is_online' => false,
                'last_activity' => now(),
            ]);
        }
        
        AuditLog::log(
            'logout',
            "{$user->first_name} {$user->last_name} logged out",
            AuditLog::STATUS_SUCCESS,
            $user->id,
            'User',
            $user->id
        );

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function heartbeat(Request $request)
    {
        $user = $request->user();
        
        // Find active session
        $session = UserSession::where('user_id', $user->id)
                              ->where('is_online', true)
                              ->orderBy('created_at', 'desc')
                              ->first();

        if ($session) {
            // Security: Session Timeout Check
            $timeoutMinutes = (int) (Setting::where('key', 'session_timeout')->value('value') ?: 30);
            $lastActivity = \Carbon\Carbon::parse($session->last_activity);
            
            if ($lastActivity->diffInMinutes(now()) > $timeoutMinutes) {
                // Session expired
                $session->update([
                    'logout_time' => now(),
                    'is_online' => false
                ]);
                $user->currentAccessToken()->delete();
                
                return response()->json(['message' => 'Session expired due to inactivity'], 401);
            }

            $session->update([
                'last_activity' => now(),
                'is_online' => true
            ]);
        } else {
            // If no active session but user is authenticated, create one (healing)
             $session = UserSession::create([
                'user_id' => $user->id,
                'login_time' => now(),
                'is_online' => true,
                'last_activity' => now(),
                'ip_address' => $request->ip(),
                'user_agent' => $request->header('User-Agent'),
            ]);
        }

        return response()->json(['status' => 'ok']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function refresh(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
    }
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'avatar' => 'nullable|image|max:2048', // 2MB max
        ]);

        $user->first_name = $request->first_name;
        $user->last_name = $request->last_name;
        $user->email = $request->email;

        if ($request->hasFile('avatar')) {
            // Delete old avatar if exists
            if ($user->avatar && str_contains($user->avatar, '/storage/avatars/')) {
                // Extract filename to delete from storage
                $filename = basename($user->avatar);
                if ($filename) {
                    Storage::disk('public')->delete('avatars/' . $filename);
                }
            }
            
            $path = $request->file('avatar')->store('avatars', 'public');
            // Save absolute URL so frontend can display it correctly
            $user->avatar = url('/storage/' . $path);
        }

        $user->save();
        
        // Log the action
        AuditLog::log(
            'update_profile',
            "{$user->first_name} {$user->last_name} updated their profile",
            AuditLog::STATUS_SUCCESS,
            $user->id,
            'User',
            $user->id
        );

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    }

    /**
     * Change user password with dynamic security policy validation.
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        // Get password policy settings
        $minLength = (int) (Setting::where('key', 'pass_min_length')->value('value') ?: 8);
        $requireSpecialChar = filter_var(Setting::where('key', 'pass_special_chars')->value('value'), FILTER_VALIDATE_BOOLEAN);

        // Build validation rules dynamically
        $passwordRules = ['required', 'string', 'min:' . $minLength, 'confirmed'];
        
        if ($requireSpecialChar) {
            // Require at least one special character
            $passwordRules[] = 'regex:/[!@#$%^&*(),.?":{}|<>]/';
        }

        $request->validate([
            'current_password' => 'required',
            'password' => $passwordRules,
        ], [
            'password.regex' => 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>).',
            'password.min' => "Password must be at least {$minLength} characters long.",
        ]);

        // Verify current password
        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        // Update password
        $user->password = Hash::make($request->password);
        $user->save();

        // Log the action
        AuditLog::log(
            'password_change',
            "{$user->first_name} {$user->last_name} changed their password",
            AuditLog::STATUS_SUCCESS,
            $user->id,
            'User',
            $user->id
        );

        return response()->json([
            'message' => 'Password changed successfully'
        ]);
    }

    /**
     * Get password policy settings (for frontend validation hints).
     */
    public function getPasswordPolicy()
    {
        return response()->json([
            'min_length' => (int) (Setting::where('key', 'pass_min_length')->value('value') ?: 8),
            'require_special_char' => filter_var(Setting::where('key', 'pass_special_chars')->value('value'), FILTER_VALIDATE_BOOLEAN),
        ]);
    }
}
