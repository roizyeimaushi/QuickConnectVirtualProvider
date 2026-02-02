<?php

use App\Models\User;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = User::where('email', 'emily.davis@quickconn.net')->first();

if (!$user) {
    echo "User Emily not found!\n";
    exit;
}

echo "Checking records for Emily (ID: {$user->id})...\n";

$records = AttendanceRecord::where('user_id', $user->id)->get();



if ($records->isEmpty()) {
    echo "No attendance records found for Emily.\n";
} else {
    echo "Found " . $records->count() . " records.\n";
    foreach ($records as $r) {
        echo "\n--------------------------------------------------\n";
        echo "Record ID: " . $r->id . "\n";
        echo "User ID: " . $r->user_id . "\n";
        echo "Session ID: " . $r->session_id . "\n";
        echo "Time In: " . $r->time_in . "\n";
        echo "Time Out: " . $r->time_out . "\n";
        echo "Status: " . $r->status . "\n";
        echo "Record Created At: " . $r->created_at . "\n";
        echo "User Created At:   " . $user->created_at . "\n";
        echo "Session Created At:" . ($r->session ? $r->session->created_at : 'N/A') . "\n";
        echo "--------------------------------------------------\n";
    }
}

$session = AttendanceSession::whereDate('date', now()->toDateString())->first();
if ($session) {
    echo "\nActive Session found for today: ID " . $session->id . " Status: " . $session->status . "\n";
} else {
    echo "\nNo active session for today.\n";
}
