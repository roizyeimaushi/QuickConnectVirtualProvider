<?php

namespace App\Console\Commands;

use App\Models\AttendanceSession;
use App\Models\AttendanceRecord;
use App\Models\Schedule;
use App\Models\User;
use App\Models\AuditLog;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class AutoFinalizeAndCreateSession extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:auto-finalize-and-create';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Auto-lock (finalize) the active session at 7:05 AM, mark absent employees, then auto-create the next session';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $now = Carbon::now();
        $this->info("=== Auto Finalize & Create Session | {$now->toDateTimeString()} ===");

        // ============================================================
        // STEP 1: AUTO-LOCK (FINALIZE) any active/completed sessions
        // ============================================================
        $this->finalizeActiveSessions($now);

        // ============================================================
        // STEP 2: AUTO-CREATE today's session if it doesn't exist
        // ============================================================
        $this->createTodaySession($now);

        $this->info('=== Auto Finalize & Create completed! ===');
        return 0;
    }

    /**
     * Finalize (lock) any active or completed sessions.
     * This marks pending employees as absent and locks the session.
     */
    private function finalizeActiveSessions(Carbon $now)
    {
        $sessions = AttendanceSession::whereIn('status', ['active', 'completed'])
            ->with('schedule')
            ->get();

        if ($sessions->isEmpty()) {
            $this->info('No active/completed sessions to finalize.');
            return;
        }

        foreach ($sessions as $session) {
            $schedule = $session->schedule;
            if (!$schedule) {
                $this->warn("Session #{$session->id} has no schedule. Skipping.");
                continue;
            }

            // Calculate shift end time
            $sessionDate = $session->date->format('Y-m-d');
            $shiftStart = Carbon::parse("$sessionDate {$schedule->time_in}");
            $shiftEnd = Carbon::parse("$sessionDate {$schedule->time_out}");

            // Handle overnight shifts (e.g., 23:00 -> 07:00)
            if ($shiftEnd->lt($shiftStart)) {
                $shiftEnd->addDay();
            }

            // Auto-lock 5 minutes after shift end (configurable via setting)
            $autoLockMinutes = (int) Setting::getCached('auto_lock_minutes_after_shift', 5);
            $autoLockTime = $shiftEnd->copy()->addMinutes($autoLockMinutes);

            if ($now->lt($autoLockTime)) {
                $this->info("Session #{$session->id} ({$sessionDate}): Not yet past auto-lock time ({$autoLockTime->format('Y-m-d H:i')}). Skipping.");
                continue;
            }

            // Already locked? Skip
            if ($session->status === 'locked') {
                continue;
            }

            $this->info("Finalizing Session #{$session->id} for {$sessionDate}...");

            DB::transaction(function () use ($session, $sessionDate, $now) {
                $oldStatus = $session->status;
                $isAttendanceRequired = $session->attendance_required;

                // ── Mark pending employees as absent (for required sessions) ──
                $finalStatus = $isAttendanceRequired ? 'absent' : 'excused';
                $reason = ($session->session_type ?: 'Session') . ' Auto-Finalization';

                $activeEmployees = User::where('role', 'employee')
                    ->where('status', 'active')
                    ->get();

                $employeeIds = $activeEmployees->pluck('id');
                $existingRecords = AttendanceRecord::whereIn('user_id', $employeeIds)
                    ->where('attendance_date', $sessionDate)
                    ->get()
                    ->keyBy('user_id');

                $absentCount = 0;

                foreach ($activeEmployees as $employee) {
                    $existingRecord = $existingRecords->get($employee->id);

                    if (!$isAttendanceRequired) {
                        // For non-required sessions (weekends), delete ghost pending records
                        if ($existingRecord && $existingRecord->status === 'pending') {
                            $existingRecord->delete();
                        }
                        continue;
                    }

                    // For REQUIRED sessions, ensure everyone has a status
                    if (!$existingRecord) {
                        AttendanceRecord::create([
                            'user_id' => $employee->id,
                            'attendance_date' => $sessionDate,
                            'session_id' => $session->id,
                            'status' => $finalStatus,
                            'excuse_reason' => ($finalStatus === 'excused') ? $reason : null,
                        ]);
                        $absentCount++;
                    } elseif (in_array($existingRecord->status, ['pending', 'absent'])) {
                        $existingRecord->update([
                            'status' => $finalStatus,
                            'excuse_reason' => ($finalStatus === 'excused') ? $reason : null,
                        ]);
                        $absentCount++;
                    }
                }

                // ── Send absent notifications ──
                $absentAlerts = filter_var(Setting::where('key', 'absent_alerts')->value('value'), FILTER_VALIDATE_BOOLEAN);
                if ($absentAlerts && $absentCount > 0) {
                    $admins = User::where('role', 'admin')->get();
                    if ($admins->isNotEmpty()) {
                        // Get all newly absent records for notification
                        $absentRecords = AttendanceRecord::where('session_id', $session->id)
                            ->where('status', 'absent')
                            ->get();
                        foreach ($absentRecords as $absentRecord) {
                            try {
                                Notification::send($admins, new \App\Notifications\AbsentNotification($absentRecord));
                            } catch (\Exception $e) {
                                Log::warning("Auto-finalize: Absent notification failed - " . $e->getMessage());
                            }
                        }
                    }
                }

                // ── Lock the session ──
                $session->update([
                    'status' => 'locked',
                    'locked_at' => $now,
                    'completion_reason' => 'auto_finalized',
                ]);

                // ── Audit log ──
                AuditLog::log(
                    'auto_lock_session',
                    "System auto-finalized session for {$sessionDate} at 7:05 AM. {$absentCount} employee(s) marked absent. Status: {$oldStatus} → locked",
                    null, // System action
                    'AttendanceSession',
                    $session->id,
                    ['status' => $oldStatus],
                    ['status' => 'locked']
                );

                // ── Broadcast real-time update ──
                try {
                    event(new \App\Events\SessionUpdated($session, 'auto_finalized'));
                } catch (\Exception $e) {
                    Log::warning("Auto-finalize: Event broadcast failed - " . $e->getMessage());
                }

                $this->info("  ✓ Session #{$session->id} locked. {$absentCount} marked absent.");
            });
        }
    }

    /**
     * Auto-create today's session if it doesn't already exist.
     */
    private function createTodaySession(Carbon $now)
    {
        // Get the active schedule
        $schedule = Schedule::where('status', 'active')->first();

        if (!$schedule) {
            $this->error('No active schedule found. Cannot create session.');
            return;
        }

        $today = Carbon::today();

        // ── Weekend check ──
        $dayOfWeek = $today->dayOfWeek;
        $allowWeekend = filter_var(Setting::where('key', 'weekend_checkin')->value('value'), FILTER_VALIDATE_BOOLEAN);
        $isTrueWeekend = ($dayOfWeek === Carbon::SATURDAY || $dayOfWeek === Carbon::SUNDAY);

        if (!$allowWeekend && $isTrueWeekend) {
            $dayName = $today->format('l');
            $this->info("Today is {$dayName}. Weekend check-in disabled. Skipping session creation.");
            return;
        }

        $attendanceRequired = !$isTrueWeekend;

        // ── Check if session already exists for today ──
        $existingSession = AttendanceSession::where('schedule_id', $schedule->id)
            ->whereDate('date', $today)
            ->first();

        if ($existingSession) {
            $this->info("Session already exists for today ({$today->format('Y-m-d')}). Skipping creation.");
            return;
        }

        // ── Get admin user for system-created sessions ──
        $adminUser = User::where('role', 'admin')->first();
        if (!$adminUser) {
            $this->error('No admin user found. Cannot create session.');
            return;
        }

        // ── Create new session ──
        $newSession = AttendanceSession::create([
            'schedule_id' => $schedule->id,
            'date' => $today,
            'status' => 'active',
            'attendance_required' => $attendanceRequired,
            'session_type' => $attendanceRequired ? 'Normal' : 'Weekend',
            'opened_at' => now(),
            'created_by' => $adminUser->id,
        ]);

        // ── Create pending attendance records for all active employees ──
        $employees = User::where('role', 'employee')
            ->where('status', 'active')
            ->get();

        $records = [];
        foreach ($employees as $employee) {
            $records[] = [
                'session_id' => $newSession->id,
                'user_id' => $employee->id,
                'attendance_date' => $today->toDateString(),
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

        // ── Audit log ──
        AuditLog::log(
            'auto_create_session',
            "System auto-created attendance session for {$today->format('Y-m-d')} with " . count($records) . " employees (auto-finalize cycle)",
            null,
            'AttendanceSession',
            $newSession->id,
            null,
            $newSession->toArray()
        );

        // ── Broadcast real-time update ──
        try {
            event(new \App\Events\SessionUpdated($newSession, 'auto_created'));
        } catch (\Exception $e) {
            Log::warning("Auto-create session: Event broadcast failed - " . $e->getMessage());
        }

        $this->info("  ✓ Created Session #{$newSession->id} for {$today->format('Y-m-d')} with " . count($records) . " employees.");
    }
}
