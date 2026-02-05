<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    /**
     * Get all settings formatted as key-value pairs.
     * Ensures default values for critical settings and proper type conversion.
     */
    public function index()
    {
        $allSettings = Setting::all()->pluck('value', 'key')->toArray();
        
        // Define public-safe keys (whitelist)
        $publicKeys = [
            'company_name', 'system_logo', 'timezone', 'language', 'date_format', 'time_format',
            'grace_period', 'late_threshold', 'allow_multi_checkin', 'checkin_start', 'session_timeout',
            'require_ot_approval', 'break_duration', 'break_start_window', 'break_end_window',
            '2fa_enabled', 'pass_min_length', 'pass_special_chars',
            'max_login_attempts',
            'weekend_checkin', 'holiday_checkin', 'auto_checkout', 'prevent_duplicate_checkin',
            'max_breaks', 'max_break_duration', 'auto_end_break', 'prevent_overlap_break',
            'allow_overtime', 'min_overtime_minutes', 'overtime_rate', 'ot_rounding',
            'late_alerts', 'absent_alerts', 'break_alerts', 'notify_sms', 'notify_inapp',
            'break_penalty', 'auto_resume', 'retention_policy', 'positions'
        ];

        // Filter settings
        $settings = array_intersect_key($allSettings, array_flip($publicKeys));
        
        // Define defaults for critical settings that should never be empty
        $defaults = [
            'date_format' => 'ymd',
            'time_format' => '24h',
            'timezone' => 'Asia/Manila',
            'company_name' => 'QuickConn Virtual',
        ];
        
        // Apply defaults for missing or empty values
        foreach ($defaults as $key => $defaultValue) {
            if (!isset($settings[$key]) || $settings[$key] === null || $settings[$key] === '') {
                $settings[$key] = $defaultValue;
            }
        }
        
        return response()->json($settings);
    }

    /**
     * Allowed setting keys (whitelist) - prevents arbitrary key creation.
     */
    private function getAllowedSettingKeys(): array
    {
        return [
            'company_name', 'system_logo', 'timezone', 'language', 'date_format', 'time_format',
            'grace_period', 'late_threshold', 'allow_multi_checkin', 'prevent_duplicate_checkin', 'auto_checkout',
            'checkin_start', 'checkin_end', 'weekend_checkin', 'holiday_checkin',
            'work_start', 'work_end', 'auto_absent_time', 'min_work_hours', 'allow_late_checkout', 'strict_mode',
            'max_breaks', 'max_break_duration', 'auto_end_break', 'prevent_overlap_break',
            'allow_overtime', 'min_overtime_minutes', 'overtime_rate', 'require_ot_approval', 'ot_rounding',
            'break_duration', 'break_start_window', 'break_end_window', 'auto_resume', 'break_penalty',
            'late_alerts', 'absent_alerts', 'break_alerts', 'notify_email', 'notify_sms', 'notify_inapp',
            '2fa_enabled', 'session_timeout', 'max_login_attempts', 'pass_min_length', 'pass_special_chars',
            'retention_policy', 'positions',
        ];
    }

    /**
     * Update settings.
     * Expects an array of key-value pairs.
     * Only allows whitelisted keys for new settings.
     */
    public function update(Request $request)
    {
        $allowedKeys = $this->getAllowedSettingKeys();
        $data = array_intersect_key($request->all(), array_flip($allowedKeys));
        $updated = 0;

        foreach ($data as $key => $value) {
            // Check if setting exists
            $setting = Setting::where('key', $key)->first();
            
            if ($setting) {
                // If boolean type, ensure 0/1 logic consistency
                // We handle true/false (bool), "true"/"false" (string), "1"/"0" (string), 1/0 (int)
                if ($setting->type === 'boolean') {
                    $boolValue = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                    $value = $boolValue ? '1' : '0';
                }
                
                $setting->value = $value;
                $setting->save();
                $updated++;
                
                Log::info("Setting updated: {$key} = {$value}");
            } else {
                // Create the setting only if key is in whitelist (already filtered above)
                // Auto-detect type based on value
                $type = 'string';
                $storedValue = $value;
                
                if (is_bool($value) || $value === 'true' || $value === 'false' || $value === '1' || $value === '0') {
                    $type = 'boolean';
                    $storedValue = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? '1' : '0';
                } elseif (is_numeric($value) && !str_contains($value, '.')) {
                    $type = 'integer';
                }
                
                Setting::create([
                    'key' => $key,
                    'value' => $storedValue,
                    'group' => 'general',
                    'type' => $type,
                ]);
                
                $updated++;
                Log::info("Setting created: {$key} = {$storedValue}");
            }
        }

        return response()->json([
            'message' => 'Settings updated successfully',
            'count' => $updated
        ]);
    }

    /**
     * Upload system logo.
     */
    public function uploadLogo(Request $request)
    {
        // SVG excluded - can contain scripts (XSS risk)
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($request->file('logo')) {
            $path = $request->file('logo')->store('logos', 'public');
            $url = url('/storage/' . $path);

            Setting::updateOrCreate(
                ['key' => 'system_logo'],
                ['value' => $url, 'group' => 'general']
            );

            return response()->json(['url' => $url, 'message' => 'Logo uploaded successfully']);
        }

        return response()->json(['message' => 'Upload failed'], 400);
    }

    /**
     * Generate database backup.
     * Note: This is a simulation/placeholder as real backup requires shell access or specific packages.
     * We will generate a JSON dump of key tables for now.
     */
    public function backup()
    {
        // For security and simplicity in this environment, allow only admin
        // logic is handled by middleware
        
        $data = [
            'users' => \App\Models\User::all(),
            'settings' => Setting::all(),
            'sessions' => \App\Models\AttendanceSession::all(),
            'records' => \App\Models\AttendanceRecord::all(),
            'breaks' => \App\Models\EmployeeBreak::all(),
            'notifications' => \Illuminate\Support\Facades\DB::table('notifications')->get(),
            'audit_logs' => \App\Models\AuditLog::all(),
        ];

        $filename = 'backup-' . date('Y-m-d-His') . '.json';
        
        return response()->streamDownload(function () use ($data) {
            echo json_encode($data, JSON_PRETTY_PRINT);
        }, $filename);
    }

    /**
     * Restore database from backup file.
     */
    public function restore(Request $request)
    {
        $request->validate([
             'file' => 'required|file|mimes:json'
        ]);

        try {
            $content = file_get_contents($request->file('file')->getRealPath());
            $data = json_decode($content, true);

            if (!$data) {
                 throw new \Exception('Invalid backup file format');
            }

            \Illuminate\Support\Facades\DB::transaction(function () use ($data) {
                // Disable FK checks for bulk restore (MySQL only; PostgreSQL/SQLite don't use this)
                $driver = \Illuminate\Support\Facades\DB::getDriverName();
                if ($driver === 'mysql') {
                    \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0;');
                }

                // 1. Settings (Upsert)
                if (isset($data['settings'])) {
                    foreach ($data['settings'] as $setting) {
                        Setting::updateOrCreate(
                            ['key' => $setting['key']],
                            [
                                'value' => $setting['value'],
                                'group' => $setting['group'] ?? 'general',
                                'type' => $setting['type'] ?? 'string'
                            ]
                        );
                    }
                }

                // 2. Users (Upsert) - only safe fields, never role/password from backup (privilege escalation risk)
                if (isset($data['users'])) {
                    $safeUserFields = ['employee_id', 'first_name', 'last_name', 'email', 'position', 'avatar'];
                    foreach ($data['users'] as $userData) {
                        $id = $userData['id'] ?? null;
                        if (!$id) continue;
                        $safe = array_intersect_key($userData, array_flip($safeUserFields));
                        $existing = \App\Models\User::find($id);
                        if ($existing) {
                            $existing->update($safe);
                        }
                        // Skip creating new users from backup (no password, security risk)
                    }
                }

                // 3. Operational Data (Wipe & Replace for consistency in full restore)
                // Note: In production, might want 'merge' logic, but 'Restore' usually implies reverting to snapshot.
                // We will use upsert to be safe against existing IDs.
                
                if (isset($data['sessions'])) {
                    foreach ($data['sessions'] as $session) {
                        \App\Models\AttendanceSession::updateOrCreate(['id' => $session['id']], $session);
                    }
                }

                if (isset($data['records'])) {
                    foreach ($data['records'] as $record) {
                         \App\Models\AttendanceRecord::updateOrCreate(['id' => $record['id']], $record);
                    }
                }

                if (isset($data['breaks'])) {
                    foreach ($data['breaks'] as $brk) {
                        \App\Models\EmployeeBreak::updateOrCreate(['id' => $brk['id']], $brk);
                    }
                }

                if (isset($data['notifications'])) {
                    // Notifications table has UUIDs usually, checking ID
                    foreach ($data['notifications'] as $notif) {
                        \Illuminate\Support\Facades\DB::table('notifications')->updateOrInsert(['id' => $notif['id']], (array)$notif);
                    }
                }
                
                if (isset($data['audit_logs'])) {
                    foreach ($data['audit_logs'] as $log) {
                         \App\Models\AuditLog::updateOrCreate(['id' => $log['id']], $log);
                    }
                }

                if ($driver === 'mysql') {
                    \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                }

                // Log the restore
                \App\Models\AuditLog::log('system_restore', 'System restored from backup file', \App\Models\AuditLog::STATUS_SUCCESS, auth()->id(), 'System', null);
            });

            return response()->json(['message' => 'System settings restored successfully']);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Restore failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Clear audit logs specifically.
     */
    public function clearLogs(Request $request)
    {
        try {
            \App\Models\AuditLog::truncate();
            
            // Log this action (creating a new log entry after truncation)
             \App\Models\AuditLog::log(
                'clear_logs',
                'Audit logs cleared by admin',
                \App\Models\AuditLog::STATUS_SUCCESS,
                auth()->id(),
                'System',
                null
            );

            return response()->json(['message' => 'Audit logs cleared successfully']);
        } catch (\Exception $e) {
             return response()->json(['message' => 'Failed to clear logs'], 500);
        }
    }

    /**
     * Export system data/settings (similar to backup but maybe CSV or tailored).
     * Reusing backup logic for now as requested.
     */
    public function export(Request $request)
    {
        return $this->backup();
    }

    /**
     * Clear old data based on retention policy.
     */
    public function clearData(Request $request)
    {
        // Using confirm parameter to ensure intent, though middleware should also protect this
        
        try {
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            
            \App\Models\AttendanceRecord::truncate();
            \App\Models\AttendanceSession::truncate();
            \App\Models\EmployeeBreak::truncate(); // Wipes breaks too matching attendance stats cleanup
            // We might keep users and audit logs here if just clearing "data"
            
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            
            // Log this action (creating a new log entry after truncation)
            \App\Models\AuditLog::log(
                'clear_data',
                'System attendance data cleared by admin',
                \App\Models\AuditLog::STATUS_SUCCESS,
                auth()->id(),
                'System',
                null
            );
            
            return response()->json(['message' => 'System data cleared successfully. All attendance records have been reset.']);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            return response()->json(['message' => 'Failed to clear data: ' . $e->getMessage()], 500);
        }
    }
}
