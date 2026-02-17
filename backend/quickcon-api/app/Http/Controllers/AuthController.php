<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\AuditLog;
use App\Models\UserSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;

use Illuminate\Support\Facades\RateLimiter;
use App\Models\Setting;
use App\Http\Resources\UserResource;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'login_type' => 'nullable|string|in:admin,employee', // Optional: restrict login by role
        ]);

        // Security: Rate Limiting
        // Use IP and Email as key to prevent lockouts from shared IPs unless same email
        $throttleKey = 'login.' . $request->ip() . '.' . $request->email;
        $maxAttempts = (int) Setting::getCached('max_login_attempts', 5);
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

        // Role-based login restriction
        $loginType = $request->input('login_type');
        if ($loginType) {
            if ($loginType === 'employee' && $user->role === 'admin') {
                // Admin trying to use employee login
                AuditLog::logFailed(
                    'login_failed',
                    "Admin tried to login via employee portal: {$user->first_name} {$user->last_name}",
                    $user->id,
                    'User',
                    $user->id,
                    ['email' => $request->email, 'reason' => 'wrong_portal', 'login_type' => $loginType]
                );
                
                throw ValidationException::withMessages([
                    'email' => ['Access denied. Administrators must use the admin login portal.'],
                ]);
            }
            
            if ($loginType === 'admin' && $user->role !== 'admin') {
                // Non-admin trying to use admin login
                AuditLog::logFailed(
                    'login_failed',
                    "Non-admin tried to login via admin portal: {$user->first_name} {$user->last_name}",
                    $user->id,
                    'User',
                    $user->id,
                    ['email' => $request->email, 'reason' => 'wrong_portal', 'login_type' => $loginType]
                );
                
                throw ValidationException::withMessages([
                    'email' => ['Access denied. This login is for administrators only.'],
                ]);
            }
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

        // Security: Revoke all previous tokens to enforce single active session per user
        // This prevents concurrent session hijacking
        $user->tokens()->delete();
        
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
            'user' => new UserResource($user),
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

        // Revoke the specific token used for the request
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
            $timeoutMinutes = (int) Setting::getCached('session_timeout', 30);
            $lastActivity = \Carbon\Carbon::parse($session->last_activity);
            
            if ($lastActivity->diffInMinutes(now()) > $timeoutMinutes) {
                // Session expired
                $session->update([
                    'logout_time' => now(),
                    'is_online' => false
                ]);
                
                // Revoke token
                $user->currentAccessToken()->delete();
                
                return response()->json(['message' => 'Session expired due to inactivity'], 401);
            }

            $session->update([
                'last_activity' => now(),
                'is_online' => true
            ]);
        } else {
            // Self-Healing: If authenticated but no session marked online, verify if a recent session exists
            // This prevents creating duplicates if the heartbeat logic runs multiple times or after a server restart
            
            $recentSession = UserSession::where('user_id', $user->id)
                ->where('created_at', '>=', now()->subHours(12)) // Conservative check
                ->whereNull('logout_time')
                ->orderBy('created_at', 'desc')
                ->first();
                
            if ($recentSession) {
                // Reactive existing session
                $recentSession->update([
                    'is_online' => true,
                    'last_activity' => now()
                ]);
            } else {
                // Create new only if absolutely needed
                $session = UserSession::create([
                    'user_id' => $user->id,
                    'login_time' => now(),
                    'is_online' => true,
                    'last_activity' => now(),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->header('User-Agent'),
                ]);
            }
        }

        return response()->json(['status' => 'ok']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        
        // Get user's current schedule from their latest attendance record
        $latestRecord = $user->attendanceRecords()
            ->with('session.schedule')
            ->orderBy('attendance_date', 'desc')
            ->first();
        
        $schedule = $latestRecord?->session?->schedule;
        
        // Return user with schedule info
        return response()->json([
            'user' => (new UserResource($user))->additional([
                'schedule' => $schedule ? [
                    'id' => $schedule->id,
                    'name' => $schedule->name,
                ] : null
            ])
        ]);
    }

    public function refresh(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
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

        try {
            $user->first_name = $request->first_name;
            $user->last_name = $request->last_name;
            $user->email = $request->email;

            $uploadWarning = null;
            if ($request->hasFile('avatar')) {
                $uploaded = false;
                
                // Try Cloudinary if configured
                if (config('cloudinary.cloud_url') || env('CLOUDINARY_URL')) {
                    try {
                        $result = $request->file('avatar')->storeOnCloudinary('avatars');
                        $user->avatar = $result->getSecurePath();
                        $uploaded = true;
                    } catch (\Exception $e) {
                        Log::warning("Cloudinary upload failed, falling back to base64: " . $e->getMessage());
                    }
                }

                // Fallback: Convert to base64 data URI and store in database
                // This survives Railway/Render redeployments (ephemeral filesystem wipes local files)
                if (!$uploaded) {
                    try {
                        $file = $request->file('avatar');
                        $imageData = file_get_contents($file->getRealPath());
                        $mime = $file->getMimeType();
                        
                        // Try to resize with GD if available (keeps DB size small)
                        if (function_exists('imagecreatefromstring')) {
                            $image = @imagecreatefromstring($imageData);
                            
                            if ($image) {
                                $origWidth = imagesx($image);
                                $origHeight = imagesy($image);
                                $maxDim = 200;
                                
                                if ($origWidth > $maxDim || $origHeight > $maxDim) {
                                    $ratio = min($maxDim / $origWidth, $maxDim / $origHeight);
                                    $newWidth = (int) round($origWidth * $ratio);
                                    $newHeight = (int) round($origHeight * $ratio);
                                    
                                    $resized = imagecreatetruecolor($newWidth, $newHeight);
                                    imagealphablending($resized, false);
                                    imagesavealpha($resized, true);
                                    imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);
                                    
                                    ob_start();
                                    imagejpeg($resized, null, 80);
                                    $compressedData = ob_get_clean();
                                    
                                    imagedestroy($image);
                                    imagedestroy($resized);
                                } else {
                                    ob_start();
                                    imagejpeg($image, null, 85);
                                    $compressedData = ob_get_clean();
                                    imagedestroy($image);
                                }
                                
                                $base64 = base64_encode($compressedData);
                                $user->avatar = "data:image/jpeg;base64,{$base64}";
                                $uploaded = true;
                            }
                        }
                        
                        // If GD not available or failed, store raw base64
                        if (!$uploaded) {
                            $base64 = base64_encode($imageData);
                            $user->avatar = "data:{$mime};base64,{$base64}";
                            $uploaded = true;
                        }
                    } catch (\Exception $e) {
                        $uploadWarning = "Avatar upload failed: " . $e->getMessage();
                        Log::warning($uploadWarning);
                    }
                }
            }

            // Try to save - if avatar column is still VARCHAR and base64 is too large,
            // fall back to saving without avatar
            try {
                $user->save();
            } catch (\Exception $saveErr) {
                // If save failed and we were trying to save base64 avatar,
                // the column might still be VARCHAR(255) - try without avatar
                if ($request->hasFile('avatar') && str_starts_with($user->avatar ?? '', 'data:')) {
                    Log::warning("Avatar save failed (column may need LONGTEXT migration): " . $saveErr->getMessage());
                    $user->avatar = $user->getOriginal('avatar'); // Restore original
                    $uploadWarning = "Avatar upload failed: database column needs migration. Please contact admin.";
                    $user->save(); // Save other fields
                } else {
                    throw $saveErr; // Re-throw if not avatar-related
                }
            }
            
            // Log the action
            AuditLog::log(
                'update_profile',
                "{$user->first_name} {$user->last_name} updated their profile",
                AuditLog::STATUS_SUCCESS,
                $user->id,
                'User',
                $user->id
            );

            // Re-fetch to get clean data
            $user->refresh();

            return response()->json([
                'message' => $uploadWarning ? "Profile updated but avatar upload failed" : 'Profile updated successfully',
                'user' => new UserResource($user),
                'warning' => $uploadWarning
            ]);
        } catch (\Exception $e) {
            Log::error("Profile update failed: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Change user password with dynamic security policy validation.
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        // Get password policy settings
        $minLength = (int) Setting::getCached('pass_min_length', 8);
        $requireSpecialChar = filter_var(Setting::getCached('pass_special_chars', 'false'), FILTER_VALIDATE_BOOLEAN);

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
            'min_length' => (int) Setting::getCached('pass_min_length', 8),
            'require_special_char' => filter_var(Setting::getCached('pass_special_chars', 'false'), FILTER_VALIDATE_BOOLEAN),
        ]);
    }
}
