<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Schedule;
use App\Models\AttendanceSession;
use App\Models\AttendanceRecord;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing data to prevent duplicates
        \Illuminate\Support\Facades\Schema::disableForeignKeyConstraints();
        User::truncate();
        Schedule::truncate();
        AttendanceSession::truncate();
        AttendanceRecord::truncate();
        \Illuminate\Support\Facades\Schema::enableForeignKeyConstraints();

        // Create Admin User
        $admin = User::create([
            'employee_id' => 'SYSADM-001',
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@quickconn.net',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'position' => 'System Administrator',
            'status' => 'active',
        ]);

        // Create Sample Employees
        $employeeData = [
            ['QCV-001', 'John', 'Doe', 'john.doe@quickconn.net', 'Software Engineer'],
            ['QCV-002', 'Jane', 'Smith', 'jane.smith@quickconn.net', 'Product Manager'],
            ['QCV-003', 'Robert', 'Johnson', 'robert.johnson@quickconn.net', 'UI/UX Designer'],
            ['QCV-004', 'Emily', 'Davis', 'emily.davis@quickconn.net', 'QA Engineer'],
            ['QCV-005', 'Ronald', 'Abajon', 'ronaldabajon@quickconn.net', 'Project Manager'],
        ];

        $employees = [];
        foreach ($employeeData as $emp) {
            $employees[] = User::create([
                'employee_id' => $emp[0],
                'first_name' => $emp[1],
                'last_name' => $emp[2],
                'email' => $emp[3],
                'password' => Hash::make('password123'),
                'role' => 'employee',
                'position' => $emp[4],
                'status' => 'active',
            ]);
        }

        // Create Sample Schedule
        // Official Night Shift: 23:00 - 07:00 (next day)
        $nightShift = Schedule::create([
            'name' => 'Night Shift',
            'time_in' => '23:00',
            'break_time' => '00:00',
            'time_out' => '07:00',
            'grace_period_minutes' => 15,
            'late_threshold_minutes' => 15,
            'is_overnight' => true,
            'status' => 'active',
        ]);

        // Create Sample Attendance Sessions and Records for the past 30 days
        // Only for weekdays (Monday-Friday nights)
        $today = Carbon::today();
        $sessionsCreated = 0;
        
        for ($i = 30; $i >= 0; $i--) {
            $date = $today->copy()->subDays($i);
            
            // Skip weekends (Saturday=6, Sunday=0 - these nights don't have shifts)
            // Night shift on Friday night works into Saturday morning, so we skip Saturday and Sunday dates
            if ($date->isSaturday() || $date->isSunday()) {
                continue;
            }
            
            // Create attendance session for this date
            $session = AttendanceSession::create([
                'schedule_id' => $nightShift->id,
                'created_by' => $admin->id,
                'date' => $date->toDateString(),
                'status' => $date->isToday() ? 'active' : 'locked',
            ]);
            
            $sessionsCreated++;
            
            // Skip creating records for today's session (employees haven't checked in yet)
            if ($date->isToday()) {
                continue;
            }
            
            // Create attendance records for each employee
            foreach ($employees as $index => $employee) {
                // Simulate varied attendance patterns
                $rand = rand(1, 100);
                
                // 75% present on time, 15% late, 10% absent
                if ($rand <= 10) {
                    // Absent
                    AttendanceRecord::create([
                        'session_id' => $session->id,
                        'user_id' => $employee->id,
                        'attendance_date' => $date->toDateString(),
                        'status' => 'absent',
                        'time_in' => null,
                        'time_out' => null,
                        'break_start' => null,
                        'break_end' => null,
                        'minutes_late' => 0,
                        'hours_worked' => 0,
                    ]);
                } elseif ($rand <= 25) {
                    // Late (checked in after 23:15)
                    $lateMinutes = rand(16, 45);
                    $timeIn = $date->copy()->setTime(23, $lateMinutes, 0);
                    $timeOut = $date->copy()->addDay()->setTime(7, rand(0, 15), 0);
                    
                    // Fixed Break Time: 00:00 to 01:30 (1.5 hours)
                    $breakStart = $date->copy()->addDay()->setTime(0, 0, 0);
                    $breakEnd = $date->copy()->addDay()->setTime(1, 30, 0);
                    
                    $hoursWorked = round($timeOut->diffInMinutes($timeIn) / 60, 2);
                    
                    AttendanceRecord::create([
                        'session_id' => $session->id,
                        'user_id' => $employee->id,
                        'attendance_date' => $date->toDateString(),
                        'status' => 'late',
                        'time_in' => $timeIn,
                        'time_out' => $timeOut,
                        'break_start' => $breakStart,
                        'break_end' => $breakEnd,
                        'minutes_late' => max(0, $lateMinutes - 15), // After grace period (clamped to 0 min)
                        'hours_worked' => $hoursWorked,
                    ]);
                } else {
                    // Present on time (checked in between 22:00 and 23:15)
                    $timeIn = $date->copy()->setTime(22, rand(30, 59), rand(0, 59)); // Between 22:30 and 22:59
                    $timeOut = $date->copy()->addDay()->setTime(7, rand(0, 10), 0);
                    
                    // Fixed Break Time: 00:00 to 01:30 (1.5 hours)
                    $breakStart = $date->copy()->addDay()->setTime(0, 0, 0);
                    $breakEnd = $date->copy()->addDay()->setTime(1, 30, 0);
                    
                    $hoursWorked = round($timeOut->diffInMinutes($timeIn) / 60, 2);
                    
                    AttendanceRecord::create([
                        'session_id' => $session->id,
                        'user_id' => $employee->id,
                        'attendance_date' => $date->toDateString(),
                        'status' => 'present',
                        'time_in' => $timeIn,
                        'time_out' => $timeOut,
                        'break_start' => $breakStart,
                        'break_end' => $breakEnd,
                        'minutes_late' => 0,
                        'hours_worked' => $hoursWorked,
                    ]);
                }
            }
        }

        // Seed All Settings
        $this->call([
            SettingsSeeder::class,
        ]);
        
        $this->command->info("Database seeded successfully!");
        $this->command->info("- 1 Admin user created");
        $this->command->info("- " . count($employees) . " employees created");
        $this->command->info("- {$sessionsCreated} attendance sessions created (past 30 weekdays)");
        $this->command->info("- Sample attendance records created for export testing");
    }
}

