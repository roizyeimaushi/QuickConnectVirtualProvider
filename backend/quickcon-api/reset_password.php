<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

if ($argc < 2) {
    echo "Usage: php reset_password.php <email> [new_password]\n";
    echo "If no password provided, defaults to 'password'\n";
    exit(1);
}

$email = $argv[1];
$newPassword = $argv[2] ?? 'password';

$user = User::where('email', $email)->first();

if (!$user) {
    echo "User not found with email: $email\n";
    exit(1);
}

$user->password = Hash::make($newPassword);
$user->save();

echo "Password for {$user->email} has been reset to: $newPassword\n";
