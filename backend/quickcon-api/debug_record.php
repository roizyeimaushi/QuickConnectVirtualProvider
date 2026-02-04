<?php
$r = App\Models\AttendanceRecord::where('attendance_date', '2026-02-04')->where('hours_worked', '>', 15)->first();
if($r) {
    echo "ID: " . $r->id . "\n";
    echo "IN: " . $r->time_in . "\n";
    echo "OUT: " . $r->time_out . "\n";
    echo "B_START: " . $r->break_start . "\n";
    echo "B_END: " . $r->break_end . "\n";
    echo "HOURS: " . $r->hours_worked . "\n";
} else {
    echo "No matching record.\n";
}
