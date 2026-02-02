<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AttendanceRecord;
use App\Models\User;
use Carbon\Carbon;

$user = User::where('role', 'employee')->first();
$today = Carbon::today();

echo "Checking records for user: " . $user->id . "\n";
echo "Date: " . $today->toDateString() . "\n";

$record = AttendanceRecord::where('user_id', $user->id)
    ->whereDate('created_at', $today)
    ->first();

if ($record) {
    echo "RECORD FOUND: ID " . $record->id . "\n";
    echo "Time In: " . $record->time_in . "\n";
    echo "Time Out: " . $record->time_out . "\n";
    echo "Status: " . $record->status . "\n";
} else {
    echo "NO RECORDS FOR TODAY\n";
}
