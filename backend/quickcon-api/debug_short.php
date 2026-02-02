<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AttendanceSession;
use Carbon\Carbon;

$now = Carbon::now();
echo "NOW: " . $now->toDateTimeString() . "\n";

$session = AttendanceSession::with('schedule')
    ->where('status', 'active')
    ->whereDate('date', Carbon::today())
    ->first();

if (!$session) {
    echo "NO SESSION\n";
    exit;
}

echo "SCHED_IN: " . $session->schedule->time_in . "\n";
echo "SCHED_OUT: " . $session->schedule->time_out . "\n";

$start = Carbon::parse($session->date->format('Y-m-d') . ' ' . $session->schedule->time_in);
$end = Carbon::parse($session->date->format('Y-m-d') . ' ' . $session->schedule->time_out);
if ($end->lt($start)) $end->addDay();

echo "START: " . $start->toDateTimeString() . "\n";
echo "END: " . $end->toDateTimeString() . "\n";

if ($now->lt($start)) echo "STATUS: EARLY\n";
elseif ($now->gt($end)) echo "STATUS: LATE\n";
else echo "STATUS: OK\n";
