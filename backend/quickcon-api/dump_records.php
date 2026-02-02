<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\AttendanceRecord;
use App\Models\User;

$user = User::where('role', 'employee')->first();
echo "User ID: " . $user->id . "\n";

$records = AttendanceRecord::where('user_id', $user->id)->get();
echo "Total Records: " . $records->count() . "\n";

foreach ($records as $r) {
    echo "ID: " . $r->id . " | Session: " . $r->session_id . " | Status: " . $r->status . " | Created: " . $r->created_at . "\n";
}
