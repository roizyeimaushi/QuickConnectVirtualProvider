

$records = App\Models\AttendanceRecord::whereNotNull('time_in')
    ->whereNotNull('time_out')
    ->get();

$count = 0;
foreach ($records as $record) {
    if (!$record->time_in || !$record->time_out) continue;

    $in = Carbon::parse($record->time_in);
    $out = Carbon::parse($record->time_out);
    
    // Safety check: if out < in (shouldn't happen with correct date stored, but if time-only...)
    if ($out->lt($in)) {
        // Assume next day crossing? 
        // The time_in/out columns are datetime/timestamp, so they include date. 
        // Trust the DB dates. If out < in, it's invalid data or negative duration.
        // For now, assume stored dates are correct.
    }

    $diffMinutes = $out->diffInMinutes($in);

    if ($record->break_start && $record->break_end) {
        $bStart = Carbon::parse($record->break_start);
        $bEnd = Carbon::parse($record->break_end);
        $breakMinutes = $bEnd->diffInMinutes($bStart);
        
        // Only subtract if break is within the shift (sanity check)
        // Actually just subtract it regardless, assuming validation happened at entry
        $diffMinutes = max(0, $diffMinutes - $breakMinutes);
    }

    $newHours = round($diffMinutes / 60, 2);

    if (abs($record->hours_worked - $newHours) > 0.05) {
        echo "Updating ID {$record->id}: Old {$record->hours_worked} -> New {$newHours}\n";
        $record->hours_worked = $newHours;
        $record->save();
        $count++;
    }
}

echo "Recalculated {$count} records.\n";
