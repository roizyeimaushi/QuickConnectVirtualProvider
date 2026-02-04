try {
    $updated = App\Models\AttendanceRecord::where('status', 'pending')
        ->where(function($q) { $q->whereNotNull('break_start')->orWhereNotNull('break_end'); })
        ->update(['break_start' => null, 'break_end' => null]);
    echo "Updated AttendanceRecords: " . $updated . "\n";

    $pendingIds = App\Models\AttendanceRecord::where('status', 'pending')->pluck('id');
    $deleted = App\Models\EmployeeBreak::whereIn('attendance_id', $pendingIds)->delete();
    echo "Deleted EmployeeBreaks: " . $deleted . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
