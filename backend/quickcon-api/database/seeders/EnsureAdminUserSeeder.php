<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class EnsureAdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminEmail = 'admin@quickconn.net';
        
        $exists = User::where('email', $adminEmail)->exists();

        if (!$exists) {
            User::create([
                'employee_id' => 'SYSADM-001',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'email' => $adminEmail,
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'position' => 'System Administrator',
                'status' => 'active',
            ]);
            
            $this->command->info('Default Admin user created successfully.');
        } else {
            $this->command->info('Admin user already exists. Skipping.');
        }

        // ==========================================
        // Ensure Default Night Shift Schedule
        // ==========================================
        $schedule = \App\Models\Schedule::firstOrCreate(
            ['name' => 'Night Shift'],
            [
                'time_in' => '23:00',
                'time_out' => '07:00',
                'break_time' => '00:00',
                'grace_period_minutes' => 15,
                'late_threshold_minutes' => 30,
                'is_overnight' => true,
                'status' => 'active',
            ]
        );

        // ==========================================
        // Ensure Active Session for Today
        // ==========================================
        // Logic: If before 2PM, it belongs to yesterday's shift. If after 2PM, today's shift.
        $now = \Carbon\Carbon::now();
        $date = $now->hour < 14 ? \Carbon\Carbon::yesterday() : \Carbon\Carbon::today();
        
        // Get Admin ID safely
        $adminUser = User::where('email', $adminEmail)->first();
        if (!$adminUser) return; // Should not happen as we just ensured it

        // Skip weekend check for seeding safety (just create it so it works)
        \App\Models\AttendanceSession::firstOrCreate(
            [
                'date' => $date->toDateString(), 
                'schedule_id' => $schedule->id
            ],
            [
                'status' => 'active', 
                'created_by' => $adminUser->id
            ]
        );
        
        $this->command->info('Ensured default Schedule and active Session exist.');
    }
}
