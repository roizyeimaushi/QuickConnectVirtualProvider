<?php

namespace App\Console\Commands;

use App\Models\AttendanceSession;
use App\Models\AttendanceRecord;
use App\Models\Schedule;
use App\Models\User;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ResetDailyAttendanceSession extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:reset-daily-session';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically opens a new attendance session at 8:00 PM daily and locks the previous session';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting daily attendance session reset...');

        // Get the default/active schedule (Night Shift: 23:00 - 07:00)
        $schedule = Schedule::where('status', 'active')->first();

        if (!$schedule) {
            $this->error('No active schedule found. Please create a schedule first.');
            return 1;
        }

        $today = Carbon::today();
        
        // ============================================================
        // WEEKEND CHECK: No sessions on Saturday and Sunday
        // ============================================================
        // Night shift runs Mon-Fri only:
        // - Session created at 17:30 runs that night (e.g., Mon 17:30 -> Mon 23:00 shift)
        // - Saturday: Skip (would be Saturday night shift ending Sunday)
        // - Sunday: Skip (would be Sunday night shift ending Monday)
        $dayOfWeek = $today->dayOfWeek;
        
        if ($dayOfWeek === Carbon::SATURDAY) {
            $this->info('Today is Saturday. No shift scheduled for Saturday nights. Skipping session creation.');
            return 0;
        }
        
        if ($dayOfWeek === Carbon::SUNDAY) {
            $this->info('Today is Sunday. No shift scheduled for Sunday nights. Skipping session creation.');
            return 0;
        }
        
        // Check if a session already exists for today
        $existingSession = AttendanceSession::where('schedule_id', $schedule->id)
                                            ->whereDate('date', $today)
                                            ->first();

        if ($existingSession) {
            $this->warn("Session already exists for today ({$today->format('Y-m-d')}). Skipping creation.");
            return 0;
        }

        // Lock any previous active sessions
        $previousSessions = AttendanceSession::where('status', 'active')
                                             ->whereDate('date', '<', $today)
                                             ->get();

        foreach ($previousSessions as $prevSession) {
            $prevSession->update([
                'status' => 'locked',
                'locked_at' => now(),
            ]);

            AuditLog::log(
                'auto_lock_session',
                "System automatically locked session for {$prevSession->date->format('Y-m-d')} (daily reset)",
                null, // System action, no user
                'AttendanceSession',
                $prevSession->id,
                ['status' => 'active'],
                ['status' => 'locked']
            );

            $this->info("Locked previous session ID: {$prevSession->id}");
        }

        // Get the first admin user for system-created sessions
        $adminUser = User::where('role', 'admin')->first();
        if (!$adminUser) {
            $this->error('No admin user found. Cannot create session.');
            return 1;
        }

        // Create new session for today
        $newSession = AttendanceSession::create([
            'schedule_id' => $schedule->id,
            'date' => $today,
            'status' => 'active',
            'opened_at' => now(),
            'created_by' => $adminUser->id, // System-created (using admin account)
        ]);

        // Get all active employees and create pending records for them
        $employees = User::where('role', 'employee')
                         ->where('status', 'active')
                         ->get();

        $records = [];
        foreach ($employees as $employee) {
            $records[] = [
                'session_id' => $newSession->id,
                'user_id' => $employee->id,
                'attendance_date' => $today->toDateString(), // REQUIRED: Date-scoped attendance for filtering
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
                'minutes_late' => 0,
                'hours_worked' => 0,
            ];
        }

        if (!empty($records)) {
            AttendanceRecord::insert($records);
        }

        AuditLog::log(
            'auto_create_session',
            "System automatically created attendance session for {$today->format('Y-m-d')} with " . count($records) . " employees (8:00 PM daily reset)",
            null, // System action
            'AttendanceSession',
            $newSession->id,
            null,
            $newSession->toArray()
        );

        $this->info("Created new session ID: {$newSession->id} for {$today->format('Y-m-d')} with " . count($records) . " employees.");
        $this->info('Daily attendance session reset completed successfully!');

        return 0;
    }
}
