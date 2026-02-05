<?php
/**
 * Recalculate hours_worked for all attendance records
 * This fixes incorrect values caused by the overnight shift calculation bug
 * 
 * Run: php recalculate_hours.php
 */

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AttendanceRecord;
use Carbon\Carbon;

echo "=== Recalculating Hours Worked for All Records ===\n\n";

$records = AttendanceRecord::whereNotNull('time_in')
    ->whereNotNull('time_out')
    ->get();

echo "Found {$records->count()} records with time_in and time_out.\n\n";

$fixed = 0;
$errors = 0;

foreach ($records as $record) {
    try {
        $oldHours = $record->hours_worked;
        
        // Recalculate (handle overnight shifts)
        $totalMinutes = $record->time_in->diffInMinutes($record->time_out, false);
        if ($totalMinutes < 0) $totalMinutes += 1440;
        
        // Subtract break time from EmployeeBreak table
        $breakMinutes = $record->breaks()->sum('duration_minutes');
        
        // Fallback to legacy break columns
        if ($breakMinutes == 0 && $record->break_start && $record->break_end) {
            $breakMinutes = $record->break_start->diffInMinutes($record->break_end, false);
            if ($breakMinutes < 0) $breakMinutes += 1440;
        }
        
        $netMinutes = max(0, $totalMinutes - $breakMinutes);
        $newHours = round($netMinutes / 60, 2);
        
        // Only update if different
        if (abs($newHours - $oldHours) > 0.01) {
            $record->hours_worked = $newHours;
            $record->save();
            
            $fixed++;
            echo "Fixed Record #{$record->id}: {$record->attendance_date->format('Y-m-d')} "
               . "| {$record->time_in->format('H:i')} - {$record->time_out->format('H:i')} "
               . "| Old: {$oldHours}h -> New: {$newHours}h\n";
        }
    } catch (Exception $e) {
        $errors++;
        echo "Error Record #{$record->id}: {$e->getMessage()}\n";
    }
}

echo "\n=== Summary ===\n";
echo "Total records processed: {$records->count()}\n";
echo "Records fixed: {$fixed}\n";
echo "Errors: {$errors}\n";
echo "\nDone!\n";
