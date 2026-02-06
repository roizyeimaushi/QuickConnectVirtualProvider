<?php
require 'backend/quickcon-api/vendor/autoload.php';
$app = require_once 'backend/quickcon-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\AttendanceSession;
use Carbon\Carbon;

echo "Current Server Time: " . Carbon::now()->toDateTimeString() . "\n";
echo "Current Date: " . Carbon::now()->toDateString() . "\n";

$sessions = AttendanceSession::where('date', '>=', Carbon::now()->subDays(2)->toDateString())->get();

echo "Found " . $sessions->count() . " sessions in last 2 days:\n";
foreach ($sessions as $s) {
    echo "ID: {$s->id}, Date: " . ($s->date ? $s->date->toDateString() : 'NULL') . ", Status: {$s->status}, Schedule ID: {$s->schedule_id}\n";
}
