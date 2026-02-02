<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$s = App\Models\AttendanceSession::where('status', 'active')->first();
echo $s ? $s->id : "NONE";
