<?php
// Script to insert test attendance record

require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\AttendanceRecord;
use App\Models\User;
use Carbon\Carbon;

// Find Daniel (user_id 2) or the employee
$employee = User::where('role', 'employee')->first();

if (!$employee) {
    echo "No employee found\n";
    exit(1);
}

echo "Employee: {$employee->first_name} {$employee->last_name} (ID: {$employee->id})\n";

// Find today's record for session 2
$record = AttendanceRecord::where('session_id', 2)
                          ->where('user_id', $employee->id)
                          ->first();

if ($record) {
    // Update the existing record
    $record->time_in = Carbon::parse('2026-01-23 19:53:00');
    $record->status = 'present'; // 7:53 PM is before 8:00 PM, so Present
    $record->confirmed_at = Carbon::parse('2026-01-23 19:53:00');
    $record->minutes_late = 0;
    $record->save();
    echo "Updated record ID: {$record->id}\n";
} else {
    // Create new record
    $record = AttendanceRecord::create([
        'session_id' => 2,
        'user_id' => $employee->id,
        'time_in' => Carbon::parse('2026-01-23 19:53:00'),
        'status' => 'present',
        'confirmed_at' => Carbon::parse('2026-01-23 19:53:00'),
        'minutes_late' => 0,
    ]);
    echo "Created record ID: {$record->id}\n";
}

echo "Time In: {$record->time_in}\n";
echo "Status: {$record->status}\n";

// Calculate hours from 7:53 PM to 10:49 PM
$timeIn = Carbon::parse('2026-01-23 19:53:00');
$now = Carbon::parse('2026-01-23 22:49:00');
$diffMinutes = $now->diffInMinutes($timeIn);
$hours = round($diffMinutes / 60, 2);
echo "Total Hours (7:53 PM to 10:49 PM): {$hours} hrs\n";
