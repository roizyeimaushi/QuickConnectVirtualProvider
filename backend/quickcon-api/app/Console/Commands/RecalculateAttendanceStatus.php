<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\AttendanceRecord;
use Carbon\Carbon;

class RecalculateAttendanceStatus extends Command
{
    protected $signature = 'attendance:recalculate-status';
    protected $description = 'Recalculates status and minutes late for all attendance records based on schedule';

    public function handle()
    {
        $this->info('Starting recalculation...');

        $records = AttendanceRecord::with(['session.schedule'])
            ->whereNotNull('time_in')
            ->get();

        $count = 0;

        foreach ($records as $record) {
            try {
                $session = $record->session;

                if (!$session) {
                    $this->warn("Record {$record->id} has no session. Skipping.");
                    continue;
                }

                $schedule = $session->schedule;

                if (!$schedule) {
                    $this->warn("Record {$record->id} (Session {$session->id}) has no schedule. Skipping.");
                    continue;
                }

                $sessionDate = $session->date->format('Y-m-d');
                $scheduleTimeIn = $schedule->time_in;
                $shiftStart = Carbon::parse($sessionDate . ' ' . $scheduleTimeIn);
                
                $graceMinutes = $schedule->grace_period_minutes ?? 0;
                $lateStart = $shiftStart->copy()->addMinutes($graceMinutes);

                $timeIn = Carbon::parse($record->time_in);
                
                $status = 'present';
                $minutesLate = 0;

                if ($timeIn->gt($lateStart)) {
                    $status = 'late';
                    $minutesLate = $timeIn->diffInMinutes($shiftStart);
                }

                // Preserving existing logic if it was absent? No, we are recalculating Late vs Present.
                // If it was 'absent' but has time_in, it shouldn't be absent.

                if ($record->status !== $status || $record->minutes_late !== $minutesLate) {
                    $record->status = $status;
                    $record->minutes_late = (int) $minutesLate;
                    $record->save();
                    $count++;
                }
            } catch (\Exception $e) {
                $this->error("Error recalculating ID {$record->id}: " . $e->getMessage());
            }
        }

        $this->info("Recalculation complete. Updated {$count} records.");
    }
}
