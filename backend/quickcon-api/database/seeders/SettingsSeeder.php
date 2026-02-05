<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;

class SettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            // ==========================================
            // General Settings
            // ==========================================
            ['key' => 'company_name', 'value' => 'QuickConn Virtual', 'group' => 'general', 'type' => 'string'],
            ['key' => 'system_logo', 'value' => '/logo.png', 'group' => 'general', 'type' => 'string'],
            ['key' => 'timezone', 'value' => 'Asia/Manila', 'group' => 'general', 'type' => 'string'],
            ['key' => 'language', 'value' => 'en', 'group' => 'general', 'type' => 'string'],
            ['key' => 'date_format', 'value' => 'mdy', 'group' => 'general', 'type' => 'string'],
            ['key' => 'time_format', 'value' => '24h', 'group' => 'general', 'type' => 'string'],

            // ==========================================
            // Attendance Rules - Validation Thresholds
            // ==========================================
            ['key' => 'grace_period', 'value' => '15', 'group' => 'attendance', 'type' => 'integer'],
            ['key' => 'late_threshold', 'value' => '30', 'group' => 'attendance', 'type' => 'integer'],
            ['key' => 'allow_multi_checkin', 'value' => '0', 'group' => 'attendance', 'type' => 'boolean'],
            ['key' => 'prevent_duplicate_checkin', 'value' => '1', 'group' => 'attendance', 'type' => 'boolean'],
            ['key' => 'auto_checkout', 'value' => '1', 'group' => 'attendance', 'type' => 'boolean'],

            // ==========================================
            // Attendance Rules - Check-in Window (Night Shift: 23:00 - 07:00)
            // Window: 18:00 Open, 01:00 Auto-Absent, 01:30 Close
            // ==========================================
            ['key' => 'checkin_start', 'value' => '18:00', 'group' => 'attendance', 'type' => 'string'],
            ['key' => 'checkin_end', 'value' => '01:30', 'group' => 'attendance', 'type' => 'string'],
            ['key' => 'weekend_checkin', 'value' => '0', 'group' => 'attendance', 'type' => 'boolean'],
            ['key' => 'holiday_checkin', 'value' => '1', 'group' => 'attendance', 'type' => 'boolean'],

            // Core attendance time settings
            ['key' => 'work_start', 'value' => '23:00', 'group' => 'attendance', 'type' => 'string'],
            ['key' => 'work_end', 'value' => '07:00', 'group' => 'attendance', 'type' => 'string'],
            ['key' => 'auto_absent_time', 'value' => '01:00', 'group' => 'attendance', 'type' => 'string'],
            ['key' => 'min_work_hours', 'value' => '8', 'group' => 'attendance', 'type' => 'integer'],
            ['key' => 'allow_late_checkout', 'value' => '0', 'group' => 'attendance', 'type' => 'boolean'],
            ['key' => 'strict_mode', 'value' => '1', 'group' => 'attendance', 'type' => 'boolean'],
            // Night Shift Boundary: Before this hour, system considers it previous day's shift
            // Set to 14 (2PM) for night shifts that end in the morning (e.g., 23:00 - 07:00)
            ['key' => 'shift_boundary_hour', 'value' => '14', 'group' => 'attendance', 'type' => 'integer'],

            // ==========================================
            // Attendance Rules - Break Rules
            // ==========================================
            ['key' => 'max_breaks', 'value' => '1', 'group' => 'attendance', 'type' => 'integer'],
            ['key' => 'max_break_duration', 'value' => '60', 'group' => 'attendance', 'type' => 'integer'],
            ['key' => 'auto_end_break', 'value' => '1', 'group' => 'attendance', 'type' => 'boolean'],
            ['key' => 'prevent_overlap_break', 'value' => '1', 'group' => 'attendance', 'type' => 'boolean'],

            // ==========================================
            // Attendance Rules - Overtime Rules
            // ==========================================
            ['key' => 'allow_overtime', 'value' => '0', 'group' => 'attendance', 'type' => 'boolean'],
            ['key' => 'min_overtime_minutes', 'value' => '60', 'group' => 'attendance', 'type' => 'integer'],
            ['key' => 'overtime_rate', 'value' => '1.25', 'group' => 'attendance', 'type' => 'string'],
            ['key' => 'require_ot_approval', 'value' => '1', 'group' => 'attendance', 'type' => 'boolean'],
            ['key' => 'ot_rounding', 'value' => 'none', 'group' => 'attendance', 'type' => 'string'],

            // ==========================================
            // Break Settings (Legacy)
            // ==========================================
            ['key' => 'break_duration', 'value' => '90', 'group' => 'break', 'type' => 'integer'],
            ['key' => 'break_start_window', 'value' => '00:00', 'group' => 'break', 'type' => 'string'],
            ['key' => 'break_end_window', 'value' => '01:00', 'group' => 'break', 'type' => 'string'],
            ['key' => 'auto_resume', 'value' => '0', 'group' => 'break', 'type' => 'boolean'],
            ['key' => 'break_penalty', 'value' => '1', 'group' => 'break', 'type' => 'boolean'],

            // ==========================================
            // Notifications
            // ==========================================
            ['key' => 'late_alerts', 'value' => '1', 'group' => 'notifications', 'type' => 'boolean'],
            ['key' => 'absent_alerts', 'value' => '1', 'group' => 'notifications', 'type' => 'boolean'],
            ['key' => 'break_alerts', 'value' => '1', 'group' => 'notifications', 'type' => 'boolean'],
            ['key' => 'notify_email', 'value' => '1', 'group' => 'notifications', 'type' => 'boolean'],
            ['key' => 'notify_sms', 'value' => '0', 'group' => 'notifications', 'type' => 'boolean'],
            ['key' => 'notify_inapp', 'value' => '1', 'group' => 'notifications', 'type' => 'boolean'],

            // ==========================================
            // Security
            // ==========================================
            ['key' => '2fa_enabled', 'value' => '0', 'group' => 'security', 'type' => 'boolean'],
            ['key' => 'session_timeout', 'value' => '30', 'group' => 'security', 'type' => 'integer'],
            ['key' => 'max_login_attempts', 'value' => '5', 'group' => 'security', 'type' => 'integer'],
            ['key' => 'pass_min_length', 'value' => '8', 'group' => 'security', 'type' => 'integer'],
            ['key' => 'pass_special_chars', 'value' => '1', 'group' => 'security', 'type' => 'boolean'],

            // ==========================================
            // Data Management
            // ==========================================
            ['key' => 'retention_policy', 'value' => '1year', 'group' => 'data', 'type' => 'string'],
        ];

        foreach ($settings as $setting) {
            Setting::firstOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
