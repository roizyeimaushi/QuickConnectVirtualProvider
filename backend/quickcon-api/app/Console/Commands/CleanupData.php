<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CleanupData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'system:cleanup-data';
    protected $description = 'Remove old data based on retention policy';

    public function handle()
    {
        $policy = \App\Models\Setting::where('key', 'retention_policy')->value('value') ?: '1year';
        $cutoff = null;

        switch ($policy) {
            case '1month':
                $cutoff = now()->subMonth();
                break;
            case '3months':
                $cutoff = now()->subMonths(3);
                break;
            case '6months':
                $cutoff = now()->subMonths(6);
                break;
            case '1year':
                $cutoff = now()->subYear();
                break;
            case 'forever':
                $this->info('Retention policy set to forever. Skipping cleanup.');
                return 0;
            default:
                $cutoff = now()->subYear();
        }

        $this->info("Cleaning up data older than: " . $cutoff->toDateString());

        // Cleanup Logic
        $records = \App\Models\AttendanceRecord::where('attendance_date', '<', $cutoff)->delete();
        $sessions = \App\Models\AttendanceSession::where('date', '<', $cutoff)->delete();
        $breaks = \App\Models\EmployeeBreak::where('break_date', '<', $cutoff)->delete();
        $notifications = \Illuminate\Support\Facades\DB::table('notifications')->where('created_at', '<', $cutoff)->delete();
        $auditLogs = \App\Models\AuditLog::where('created_at', '<', $cutoff)->delete();

        $this->info("Deleted $records attendance records.");
        $this->info("Deleted $sessions sessions.");
        $this->info("Deleted $breaks breaks.");
        $this->info("Deleted $notifications notifications.");
        $this->info("Deleted $auditLogs audit logs.");

        \App\Models\AuditLog::log('system_cleanup', "Auto-cleanup executed (Policy: $policy)", null);
    }
}
