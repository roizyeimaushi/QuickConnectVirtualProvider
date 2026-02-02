<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

// 1. Get Admin User
$admin = User::where('role', 'admin')->first();

if (!$admin) {
    echo "No admin user found!\n";
    exit(1);
}

// 2. Define a simple test notification class on the fly (or use a generic one if available)
// Since we can't define a class inside a script easily if it's not autoloaded, we'll manually insert into the DB
// mimicking what Laravel does.

$id = \Illuminate\Support\Str::uuid();
$data = [
    'type' => 'system_test',
    'title' => 'Test Notification',
    'message' => 'This is a test notification to verify the system works.',
    'time' => now(),
];

\Illuminate\Support\Facades\DB::table('notifications')->insert([
    'id' => $id,
    'type' => 'App\Notifications\SystemTestNotification',
    'notifiable_type' => 'App\Models\User',
    'notifiable_id' => $admin->id,
    'data' => json_encode($data),
    'created_at' => now(),
    'updated_at' => now(),
]);

echo "Test notification created for Admin: " . $admin->first_name . "\n";
