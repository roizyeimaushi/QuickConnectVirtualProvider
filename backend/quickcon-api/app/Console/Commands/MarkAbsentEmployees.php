<?php

namespace App\Console\Commands;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Console\Command;

class MarkAbsentEmployees extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:mark-absent';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark employees as absent if they have not checked in by 1:00 AM (cutoff time)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for employees who should be marked absent...');

        $now = Carbon::now();
        
        // ============================================================
        // WEEKEND CHECK: Based on 'weekend_checkin' setting
        // ============================================================
        $dayOfWeek = Carbon::today()->dayOfWeek;
        $allowWeekend = filter_var(\App\Models\Setting::where('key', 'weekend_checkin')->value('value'), FILTER_VALIDATE_BOOLEAN);
        
        if (!$allowWeekend && ($dayOfWeek === Carbon::SATURDAY || $dayOfWeek === Carbon::SUNDAY)) {
            $dayName = $dayOfWeek === Carbon::SATURDAY ? 'Saturday' : 'Sunday';
            $this->info("Today is {$dayName}. 'weekend_checkin' is disabled. Skipping absent marking.");
            return 0;
        }
        
        // Find all active sessions where the cutoff time has passed
        $sessions = AttendanceSession::where('status', 'active')
                                    ->with('schedule')
                                    ->get();

        if ($sessions->isEmpty()) {
            $this->info('No active sessions found.');
            return 0;
        }

        $totalAbsent = 0;

        foreach ($sessions as $session) {
            $schedule = $session->schedule;
            if (!$schedule) continue;

            $sessionDate = $session->date->format('Y-m-d');
            $shiftStart = Carbon::parse($sessionDate . ' ' . $schedule->time_in);
            
            // Define Absent Cutoff Logic (Official Rule: 01:00 AM)
            $autoAbsentTimeStr = '01:00';
            
            $cutoff = Carbon::parse($sessionDate . ' ' . $autoAbsentTimeStr);
            if ($cutoff->lte($shiftStart)) {
                $cutoff->addDay(); // Handle overnight - 01:00 is next day after 20:00 shift
            }

            if ($now->lt($cutoff)) {
                $this->info("Session {$session->id}: Not yet past cutoff ({$cutoff->format('H:i')}). Skipping.");
                continue;
            }

            // Mark pending records as absent
            $pendingRecords = AttendanceRecord::where('session_id', $session->id)
                                            ->where('status', 'pending')
                                            ->whereNull('time_in')
                                            ->get();
            
            // Check Notification Settings
            $absentAlerts = filter_var(\App\Models\Setting::where('key', 'absent_alerts')->value('value'), FILTER_VALIDATE_BOOLEAN);

            foreach ($pendingRecords as $record) {
                $record->update([
                    'status' => 'absent',
                    'attendance_date' => $sessionDate, // Ensure date is set
                    'updated_at' => now(),
                ]);

                // Send Alert
                if ($absentAlerts) {
                    $admins = \App\Models\User::where('role', 'admin')->get();
                    \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\AbsentNotification($record));
                }

                AuditLog::log(
                    'auto_mark_absent',
                    "System automatically marked employee (User ID: {$record->user_id}) as absent - no check-in by cutoff time",
                    null,
                    'AttendanceRecord',
                    $record->id,
                    ['status' => 'pending'],
                    ['status' => 'absent']
                );

                $totalAbsent++;
            }
        }

        $this->info("Marked {$totalAbsent} employees as absent.");
        return 0;
    }
}
