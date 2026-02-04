<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\User;
use App\Models\Setting;
use Carbon\Carbon;

// Get an employee
$user = User::where('role', 'employee')->first();
if (!$user) {
    echo "No employee found.\n";
    exit;
}

echo "=== Night Shift Debug ===\n";
echo "User: {$user->first_name} (ID: {$user->id})\n";
echo "Server Time: " . Carbon::now()->format('Y-m-d H:i:s') . "\n";

// Check boundary setting
$boundary = (int) (Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
echo "\nBoundary Hour Setting: {$boundary}:00\n";

$now = Carbon::now();
$logicalToday = $now->hour < $boundary ? Carbon::yesterday()->toDateString() : Carbon::today()->toDateString();
$realToday = Carbon::today()->toDateString();

echo "Real Today: {$realToday}\n";
echo "Logical Today (shift date): {$logicalToday}\n";

// 1. Check for ACTIVE record (no time_out, not pending/absent)
echo "\n=== ACTIVE RECORD CHECK ===\n";
$activeRecord = AttendanceRecord::with(['session.schedule'])
    ->where('user_id', $user->id)
    ->whereNull('time_out')
    ->whereNotIn('status', ['pending', 'absent', 'excused'])
    ->orderBy('time_in', 'desc')
    ->first();

if ($activeRecord) {
    echo "FOUND ACTIVE RECORD:\n";
    echo "  ID: {$activeRecord->id}\n";
    echo "  Attendance Date: {$activeRecord->attendance_date->format('Y-m-d')}\n";
    echo "  Time In: " . ($activeRecord->time_in ? $activeRecord->time_in->format('Y-m-d H:i:s') : 'NULL') . "\n";
    echo "  Time Out: " . ($activeRecord->time_out ? $activeRecord->time_out->format('Y-m-d H:i:s') : 'NULL') . "\n";
    echo "  Status: {$activeRecord->status}\n";
    echo "  Session ID: {$activeRecord->session_id}\n";
} else {
    echo "NO ACTIVE RECORD FOUND.\n";
}

// 2. Check all recent records for this user
echo "\n=== RECENT RECORDS (Last 5) ===\n";
$recentRecords = AttendanceRecord::where('user_id', $user->id)
    ->orderBy('attendance_date', 'desc')
    ->orderBy('time_in', 'desc')
    ->limit(5)
    ->get();

foreach ($recentRecords as $rec) {
    $timeIn = $rec->time_in ? $rec->time_in->format('H:i') : '-';
    $timeOut = $rec->time_out ? $rec->time_out->format('H:i') : '-';
    echo "  {$rec->attendance_date->format('Y-m-d')} | In: {$timeIn} | Out: {$timeOut} | Status: {$rec->status}\n";
}

// 3. Check session for logical today
echo "\n=== SESSION CHECK FOR {$logicalToday} ===\n";
$session = AttendanceSession::with('schedule')
    ->whereDate('date', $logicalToday)
    ->whereIn('status', ['active', 'locked'])
    ->first();

if ($session) {
    echo "FOUND SESSION:\n";
    echo "  ID: {$session->id}\n";
    echo "  Date: {$session->date->format('Y-m-d')}\n";
    echo "  Schedule: {$session->schedule->name}\n";
    echo "  Time In: {$session->schedule->time_in}\n";
    echo "  Time Out: {$session->schedule->time_out}\n";
    echo "  Is Overnight: " . ($session->schedule->is_overnight ? 'YES' : 'NO') . "\n";
    echo "  Status: {$session->status}\n";
} else {
    echo "NO SESSION FOUND for {$logicalToday}\n";
    
    // Check if there's one for real today
    $realSession = AttendanceSession::with('schedule')
        ->whereDate('date', $realToday)
        ->whereIn('status', ['active', 'locked'])
        ->first();
        
    if ($realSession) {
        echo "  BUT found session for real today ({$realToday}): {$realSession->schedule->name}\n";
    }
}

echo "\n=== VERDICT ===\n";
if ($activeRecord) {
    echo "Employee has an ACTIVE shift (timed in, not timed out).\n";
    echo "Dashboard should show this record and allow Break/Time Out.\n";
    
    // Verify break status
    $hasActiveBreak = \App\Models\EmployeeBreak::where('attendance_id', $activeRecord->id)
        ->whereNull('break_end')
        ->exists();
    echo "Has Active Break: " . ($hasActiveBreak ? 'YES' : 'NO') . "\n";
} else {
    echo "No active shift. Employee may have already timed out or not timed in.\n";
}

echo "\n";
