<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$users = User::all();
echo sprintf("%-5s %-30s %-10s %-10s\n", "ID", "Email", "Status", "Role");
echo str_repeat("-", 60) . "\n";

foreach ($users as $user) {
    echo sprintf("%-5d %-30s %-10s %-10s\n", $user->id, $user->email, $user->status, $user->role);
}
