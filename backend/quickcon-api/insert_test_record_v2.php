<?php
// Script to insert test attendance record with correct UTC time

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

// We want 7:53 PM Local Time (+8:00)
// This is 11:53 AM UTC
$localTimeCheckIn = '2026-01-23 19:53:00'; // 7:53 PM
$utcTimeCheckIn = '2026-01-23 11:53:00'; // 11:53 AM

// Find today's record for session 2
$record = AttendanceRecord::where('session_id', 2)
                          ->where('user_id', $employee->id)
                          ->first();

if ($record) {
    // Update the existing record
    $record->time_in = Carbon::parse($utcTimeCheckIn);
    $record->status = 'present'; 
    $record->confirmed_at = Carbon::parse($utcTimeCheckIn);
    $record->minutes_late = 0;
    // Reset any checkout
    $record->time_out = null; 
    $record->hours_worked = 0;
    $record->save();
    echo "Updated record ID: {$record->id}\n";
} else {
    // Create new record
    $record = AttendanceRecord::create([
        'session_id' => 2,
        'user_id' => $employee->id,
        'time_in' => Carbon::parse($utcTimeCheckIn),
        'status' => 'present',
        'confirmed_at' => Carbon::parse($utcTimeCheckIn),
        'minutes_late' => 0,
    ]);
    echo "Created record ID: {$record->id}\n";
}

echo "Time In (UTC): {$record->time_in}\n";
echo "Status: {$record->status}\n";

// Verification calculation (Server Side)
// Current Time (Simulated)
// 10:49 PM Local = 14:49 UTC
$currentLocal = '2026-01-23 22:49:00';
$currentUtc = '2026-01-23 14:49:00';

$timeIn = Carbon::parse($utcTimeCheckIn); // 11:53
$now = Carbon::parse($currentUtc); // 14:49

if ($now->greaterThan($timeIn)) {
    $diffMinutes = $now->diffInMinutes($timeIn);
    $hours = round($diffMinutes / 60, 2);
    echo "Total Hours (7:53 PM to 10:49 PM): {$hours} hrs\n";
} else {
    echo "Error: Current time is before Check In time\n";
}
