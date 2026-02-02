<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AttendanceSession;
use App\Models\User;
use Carbon\Carbon;

$user = User::where('role', 'employee')->first();
if (!$user) {
    echo "No employee found.\n";
    exit;
}
echo "Testing with User: " . $user->first_name . " (ID: " . $user->id . ")\n";

$now = Carbon::now();
echo "Current Server Time: " . $now->format('Y-m-d H:i:s') . "\n";

// 1. Check Active Session
$today = Carbon::today();
$session = AttendanceSession::with('schedule')
    ->where('status', 'active')
    ->whereDate('date', $today)
    ->first();

if (!$session) {
    echo "NO ACTIVE SESSION FOUND for today ($today).\n";
    $anySession = AttendanceSession::where('status', 'active')->first();
    if ($anySession) {
        echo "Found an active session for " . $anySession->date . " (ID: " . $anySession->id . ")\n";
    } else {
        echo "No active sessions at all.\n";
    }
} else {
    echo "Active Session Found: ID " . $session->id . " (" . $session->date->format('Y-m-d') . ")\n";
    echo "Schedule: " . $session->schedule->name . "\n";
    echo "  Time In: " . $session->schedule->time_in . "\n";
    echo "  Time Out: " . $session->schedule->time_out . "\n";

    // 2. Simulate Logic
    $scheduleTimeIn = $session->schedule->time_in;
    $scheduleTimeOut = $session->schedule->time_out;
    
    $shiftStart = Carbon::parse($session->date->format('Y-m-d') . ' ' . $scheduleTimeIn);
    $shiftEnd = Carbon::parse($session->date->format('Y-m-d') . ' ' . $scheduleTimeOut);
    
    // Handle overnight
    if ($shiftEnd->lt($shiftStart)) {
        $shiftEnd->addDay();
    }

    echo "  Shift Start: " . $shiftStart->format('Y-m-d H:i:s') . "\n";
    echo "  Shift End:   " . $shiftEnd->format('Y-m-d H:i:s') . "\n";

    if ($now->lt($shiftStart)) {
        echo "RESULT: TOO EARLY (Check-in opens at " . $shiftStart->format('h:i A') . ")\n";
    } elseif ($now->gt($shiftEnd)) {
        echo "RESULT: TOO LATE (Check-in closed at " . $shiftEnd->format('h:i A') . ")\n"; // Fix format call
    } else {
        echo "RESULT: ALLOWED\n";
    }
}
