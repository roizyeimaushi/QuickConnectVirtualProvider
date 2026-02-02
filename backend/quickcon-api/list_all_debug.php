<?php

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\User;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "--- DEBUG START ---\n";

$count = AttendanceRecord::count();
echo "Total Records: $count\n";

$records = AttendanceRecord::with('user')->get();
foreach ($records as $r) {
    echo "Record #{$r->id} | User: " . ($r->user ? $r->user->first_name : 'Unknown') . " (ID: {$r->user_id}) | In: {$r->time_in} | Created: {$r->created_at}\n";
}

$sessions = AttendanceSession::all();
echo "Total Sessions: " . $sessions->count() . "\n";
foreach ($sessions as $s) {
    echo "Session #{$s->id} | Date: {$s->date} | Status: {$s->status} | Created: {$s->created_at}\n";
}

echo "--- DEBUG END ---\n";
