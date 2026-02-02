<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AttendanceSession;

$s = AttendanceSession::with('schedule')->find(3);
if ($s) {
    echo "Session 3: " . $s->date->format('Y-m-d') . " | Status: " . $s->status . "\n";
    echo "Schedule: " . $s->schedule->time_in . " - " . $s->schedule->time_out . "\n";
} else {
    echo "Session 3 NOT FOUND\n";
}
