<?php

namespace App\Console\Commands;

use App\Models\AttendanceRecord;
use App\Models\EmployeeBreak;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Console\Command;

class EndExpiredBreaks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:end-expired-breaks';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically ends breaks that have exceeded their time limit';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for expired breaks...');

        $endedCount = 0;
        $now = Carbon::now();

        // ============================================================
        // PART 1: Handle NEW EmployeeBreak table (typed breaks)
        // ============================================================
        $activeBreaks = EmployeeBreak::whereNotNull('break_start')
                                     ->whereNull('break_end')
                                     ->get();

        foreach ($activeBreaks as $break) {
            $breakStart = Carbon::parse($break->break_start);
            $limit = $break->duration_limit ?? 60; // Default to 60 mins if not set
            $maxEndTime = $breakStart->copy()->addMinutes($limit);

            if ($now->gte($maxEndTime)) {
                // Break exceeded its limit - auto-end it
                $break->update([
                    'break_end' => $maxEndTime,
                    'duration_minutes' => $limit,
                    'updated_at' => now(),
                ]);

                // Also update the legacy break_end in AttendanceRecord for compatibility
                $attendance = $break->attendance;
                if ($attendance) {
                    $attendance->update([
                        'break_end' => $maxEndTime,
                    ]);
                }

                AuditLog::log(
                    'auto_end_break',
                    "System automatically ended {$break->break_type} break for employee (User ID: {$break->user_id}) after {$limit} minute limit",
                    null,
                    'EmployeeBreak',
                    $break->id,
                    ['break_end' => null],
                    ['break_end' => $maxEndTime->toDateTimeString()]
                );

                $this->info("Auto-ended break ID: {$break->id} (Type: {$break->break_type}, Limit: {$limit} mins)");
                $endedCount++;
            }
        }

        // ============================================================
        // PART 2: Handle LEGACY AttendanceRecord break fields
        // (For records that don't have corresponding EmployeeBreak entries)
        // ============================================================
        $oneHourAgo = Carbon::now()->subHour();

        $expiredLegacyBreaks = AttendanceRecord::whereNotNull('break_start')
                                               ->whereNull('break_end')
                                               ->where('break_start', '<=', $oneHourAgo)
                                               ->get();

        foreach ($expiredLegacyBreaks as $record) {
            // Check if this record has a corresponding EmployeeBreak entry
            $hasBreakEntry = EmployeeBreak::where('attendance_id', $record->id)
                                          ->whereNull('break_end')
                                          ->exists();

            // Only process if there's no corresponding EmployeeBreak entry
            if (!$hasBreakEntry) {
                $autoEndTime = Carbon::parse($record->break_start)->addHour();
                
                $record->update([
                    'break_end' => $autoEndTime,
                    'updated_at' => now(),
                ]);

                AuditLog::log(
                    'auto_end_break',
                    "System automatically ended break for employee (User ID: {$record->user_id}) after 1 hour limit (legacy)",
                    null,
                    'AttendanceRecord',
                    $record->id,
                    ['break_end' => null],
                    ['break_end' => $autoEndTime->toDateTimeString()]
                );

                $this->info("Auto-ended legacy break for Record ID: {$record->id}");
                $endedCount++;
            }
        }

        $this->info("Auto-ended {$endedCount} expired breaks.");
        return 0;
    }
}

