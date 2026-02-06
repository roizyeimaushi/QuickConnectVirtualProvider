<?php
require 'backend/quickcon-api/vendor/autoload.php';
$app = require_once 'backend/quickcon-api/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create('/api/reports/employee/QCV-002', 'GET');

try {
    $employeeId = 'QCV-002';
    // Emulate the controller logic
    $employee = \App\Models\User::where('employee_id', $employeeId)->first();
    if (!$employee) {
        echo "Employee not found\n";
        exit;
    }
    echo "Found employee: " . $employee->id . "\n";
    
    $recordsQuery = \App\Models\AttendanceRecord::with(['session.schedule'])
            ->where('user_id', $employee->id)
            ->orderBy('attendance_date', 'desc');

    $paginatedRecords = $recordsQuery->paginate(10);
    echo "Paginated records count: " . $paginatedRecords->count() . "\n";
    
    $allRecords = \App\Models\AttendanceRecord::where('user_id', $employee->id)->get();
    echo "All records count: " . $allRecords->count() . "\n";
    
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
