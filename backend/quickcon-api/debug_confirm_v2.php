<?php
try {
    $user = \App\Models\User::where('email', 'daniellorca@quickcon.net')->firstOrFail();
    $session = \App\Models\AttendanceSession::firstOrFail();
    $now = \Carbon\Carbon::now();
    $schedule = $session->schedule;
    
    echo "User: " . $user->id . "\n";
    echo "Session: " . $session->id . "\n";
    echo "Schedule: " . $schedule->id . "\n";
    
    $scheduledTimeIn = \Carbon\Carbon::parse($session->date->format('Y-m-d') . ' ' . $schedule->time_in);
    echo "Scheduled: " . $scheduledTimeIn . "\n";
    
    $record = \App\Models\AttendanceRecord::create([
        'session_id' => $session->id,
        'user_id' => $user->id,
        'time_in' => $now,
        'status' => 'present',
        'minutes_late' => 0,
        'ip_address' => '127.0.0.1',
        'confirmed_at' => $now,
    ]);
    
    echo "Record Created: " . $record->id . "\n";
    
    \App\Models\AuditLog::log(
        'confirm_attendance',
        "{$user->first_name} {$user->last_name} confirmed attendance (present)",
        $user->id,
        'AttendanceRecord',
        $record->id
    );
    
    echo "Audit Logged\n";
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
