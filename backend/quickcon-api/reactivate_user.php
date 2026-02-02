<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

if ($argc < 2) {
    echo "Usage: php reactivate_user.php <email>\n";
    exit(1);
}

$email = $argv[1];
$user = User::where('email', $email)->first();

if (!$user) {
    echo "User not found with email: $email\n";
    exit(1);
}

$user->status = 'active';
$user->save();

echo "User {$user->email} has been reactivated successfully.\n";
