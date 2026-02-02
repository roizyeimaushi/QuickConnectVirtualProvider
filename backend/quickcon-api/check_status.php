<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "--- SETTINGS ---\n";
$settings = \App\Models\Setting::all();
foreach ($settings as $setting) {
    echo $setting->key . ": " . $setting->value . "\n";
}

echo "\n--- NOTIFICATIONS COUNT ---\n";
try {
    echo \Illuminate\Support\Facades\DB::table('notifications')->count();
} catch (\Exception $e) {
    echo "Error counting notifications: " . $e->getMessage();
}

echo "\n";
