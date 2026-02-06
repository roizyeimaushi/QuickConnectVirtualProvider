<?php
require 'backend/quickcon-api/vendor/autoload.php';
$app = require_once 'backend/quickcon-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\AttendanceSession;
use Carbon\Carbon;

$today = Carbon::today()->toDateString();
$sessions = AttendanceSession::whereDate('date', $today)->get();

echo "Today is: " . $today . "\n";
echo "Found " . $sessions->count() . " sessions for today:\n";

foreach ($sessions as $s) {
    echo "ID: {$s->id}, Status: {$s->status}, Date: {$s->date->toDateString()}\n";
}

$activeOrLocked = AttendanceSession::whereDate('date', $today)
    ->whereIn('status', ['active', 'locked'])
    ->first();

if ($activeOrLocked) {
    echo "Found active/locked session: ID {$activeOrLocked->id}\n";
} else {
    echo "NO active/locked session found for today.\n";
}
