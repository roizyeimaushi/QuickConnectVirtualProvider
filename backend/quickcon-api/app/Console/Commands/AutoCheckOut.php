<?php

namespace App\Console\Commands;

use App\Models\AttendanceRecord;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoCheckOut extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:auto-checkout';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically check out employees who forgot to check out after their shift ends';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Check if auto checkout is enabled
        $autoCheckoutEnabled = filter_var(
            Setting::where('key', 'auto_checkout')->value('value'),
            FILTER_VALIDATE_BOOLEAN
        );

        if (!$autoCheckoutEnabled) {
            $this->info('Auto checkout is disabled in settings.');
            return 0;
        }

        $now = Carbon::now();
        $this->info("Running auto checkout at: {$now->toDateTimeString()}");

        // Find all open attendance records (no time_out)
        $openRecords = AttendanceRecord::with(['session.schedule'])
            ->whereNull('time_out')
            ->whereIn('status', ['present', 'late'])
            ->get();

        $checkedOut = 0;

        foreach ($openRecords as $record) {
            $schedule = $record->session?->schedule;
            
            if (!$schedule) {
                continue;
            }

            // Calculate when the shift should have ended
            $sessionDate = $record->session->date->format('Y-m-d');
            $shiftStart = Carbon::parse($sessionDate . ' ' . $schedule->time_in);
            $shiftEnd = Carbon::parse($sessionDate . ' ' . $schedule->time_out);

            // Handle overnight shifts (e.g., 20:00 to 07:00)
            if ($shiftEnd->lt($shiftStart)) {
                $shiftEnd->addDay();
            }

            // Auto checkout 1 hour after shift end (grace period)
            $autoCheckoutTime = $shiftEnd->copy()->addHour();

            // If current time is past the auto checkout time, force checkout
            if ($now->gt($autoCheckoutTime)) {
                $record->update([
                    'time_out' => $shiftEnd,
                    'auto_checkout' => true,
                    'notes' => ($record->notes ? $record->notes . ' | ' : '') . 'Auto checked out by system'
                ]);

                $checkedOut++;

                Log::info("Auto checkout: User {$record->user_id} for session {$record->session_id}");
            }
        }

        $this->info("Auto checked out {$checkedOut} employee(s).");
        return 0;
    }
}
