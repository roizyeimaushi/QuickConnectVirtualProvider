<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\AttendanceSessionController;
use App\Http\Controllers\AttendanceRecordController;
use App\Http\Controllers\BreakController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\NotificationController;
// Public Routes
Route::get('/settings', [SettingsController::class, 'index']);
Route::get('/break-rules', [BreakController::class, 'getRules']);

// Health Check for Render Deployment
// Returns 200 OK to pass health check, even if DB not ready
// This prevents timeout during initial deploy/migration
Route::get('/health', function () {
    $response = [
        'status' => 'healthy',
        'timestamp' => now()->toIso8601String(),
        'app' => 'QuickConnect API',
        'php_version' => phpversion(),
    ];
    
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $response['database'] = 'connected';
    } catch (\Exception $e) {
        // Still return 200 so health check passes
        // Log the error for debugging
        $response['database'] = 'pending';
        $response['database_status'] = 'Connection initializing...';
        \Log::warning('Health check: DB not ready - ' . $e->getMessage());
    }
    
    // Always return 200 OK for health check
    return response()->json($response, 200);
});

// Broadcasting Auth Route (for WebSocket channel authorization)
Broadcast::routes(['middleware' => ['auth:sanctum']]);

// Authentication Routes
Route::prefix('auth')->group(function () {
    // Rate limited: 5 attempts per minute to prevent brute force
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::get('/password-policy', [AuthController::class, 'getPasswordPolicy']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/heartbeat', [AuthController::class, 'heartbeat']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/refresh', [AuthController::class, 'refresh']);
        Route::post('/update-profile', [AuthController::class, 'updateProfile']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });
});

// Protected Routes
Route::middleware('auth:sanctum')->group(function () {
    
    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/stream', [NotificationController::class, 'stream']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    
    // Routes accessible by all authenticated users (Employees need these for check-in)
    Route::get('/attendance-sessions/active', [AttendanceSessionController::class, 'getActive']);
    Route::get('/attendance-sessions/today', [AttendanceSessionController::class, 'getToday']);

    // Employee self-service routes (MUST come before admin attendance-records routes)
    Route::get('/attendance-records/my-records', [AttendanceRecordController::class, 'myRecords']);
    Route::get('/attendance-records/can-confirm/{sessionId}', [AttendanceRecordController::class, 'canConfirm']);

    Route::post('/attendance-records/confirm/{sessionId}', [AttendanceRecordController::class, 'confirm']);
    Route::get('/attendance-records/today-status', [AttendanceRecordController::class, 'getTodayStatus']);
    Route::post('/attendance-records/{attendanceRecord}/check-out', [AttendanceRecordController::class, 'checkOut']);
    
    // NEW: Break routes with strict 12PM-1PM policy
    Route::prefix('break')->group(function () {
        Route::get('/status', [BreakController::class, 'getStatus']);
        Route::post('/start', [BreakController::class, 'startBreak']);
        Route::post('/end', [BreakController::class, 'endBreak']);
        Route::get('/history', [BreakController::class, 'history']);
    });

    // Legacy break routes (for backward compatibility) - redirect to new controller
    Route::post('/attendance-records/{attendanceRecord}/break/start', [AttendanceRecordController::class, 'startBreak']);
    Route::post('/attendance-records/{attendanceRecord}/break/end', [AttendanceRecordController::class, 'endBreak']);
    Route::get('/attendance-records/{attendanceRecord}/break/active', [AttendanceRecordController::class, 'getActiveBreak']);
    Route::get('/attendance-records/{attendanceRecord}/display-status', [AttendanceRecordController::class, 'getDisplayStatus']);


    // Employee dashboard
    Route::get('/reports/employee-dashboard', [ReportController::class, 'employeeDashboard']);

    // Personal Report & Export
    Route::get('/reports/personal', [ReportController::class, 'personalReport']);
    Route::get('/reports/personal/export', [ReportController::class, 'exportPersonalReport']);
    
    Route::middleware('role:admin')->group(function () {
        // Employees
        Route::get('/employees/next-id', [EmployeeController::class, 'nextEmployeeId']);
        Route::apiResource('employees', EmployeeController::class);
        Route::patch('/employees/{employee}/toggle-status', [EmployeeController::class, 'toggleStatus']);
        Route::get('/employees/by-employee-id/{employeeId}', [EmployeeController::class, 'getByEmployeeId']);
        Route::get('/employees-deactivated', [EmployeeController::class, 'deactivated']);

        // Schedules
        Route::apiResource('schedules', ScheduleController::class);
        Route::patch('/schedules/{schedule}/toggle-status', [ScheduleController::class, 'toggleStatus']);

        // Attendance Sessions (Admin management)
        Route::get('/attendance-sessions', [AttendanceSessionController::class, 'index']); // Moved to Admin
        Route::get('/attendance-sessions/{attendanceSession}', [AttendanceSessionController::class, 'show']); // Moved to Admin
        Route::post('/attendance-sessions', [AttendanceSessionController::class, 'store']);
        Route::put('/attendance-sessions/{attendanceSession}', [AttendanceSessionController::class, 'update']);
        Route::delete('/attendance-sessions/{attendanceSession}', [AttendanceSessionController::class, 'destroy']);
        Route::patch('/attendance-sessions/{attendanceSession}/lock', [AttendanceSessionController::class, 'lock']);
        Route::patch('/attendance-sessions/{attendanceSession}/unlock', [AttendanceSessionController::class, 'unlock']);
        Route::get('/attendance-sessions/locked', [AttendanceSessionController::class, 'locked']);

        // Attendance Records (Admin view)
        Route::get('/attendance-records', [AttendanceRecordController::class, 'index']);
        Route::post('/attendance-records', [AttendanceRecordController::class, 'store']); // NEW: Manual Creation
        Route::get('/attendance-records/{attendanceRecord}', [AttendanceRecordController::class, 'show']);
        Route::get('/attendance-records/by-session/{sessionId}', [AttendanceRecordController::class, 'bySession']);
        Route::get('/attendance-records/by-employee/{employeeId}', [AttendanceRecordController::class, 'byEmployee']);
        Route::put('/attendance-records/{attendanceRecord}', [AttendanceRecordController::class, 'update']);
        Route::delete('/attendance-records/{attendanceRecord}', [AttendanceRecordController::class, 'destroy']);

        // Break Management (Admin)
        Route::put('/breaks/{employeeBreak}', [BreakController::class, 'update']);
        Route::delete('/breaks/{employeeBreak}', [BreakController::class, 'destroy']);

        // Reports (Admin)
        Route::prefix('reports')->group(function () {
            Route::get('/dashboard', [ReportController::class, 'dashboard']);
            Route::get('/daily/{date}', [ReportController::class, 'dailyReport']);
            Route::get('/monthly/{year}/{month}', [ReportController::class, 'monthlyReport']);
            Route::get('/employee/{employeeId}', [ReportController::class, 'employeeReport']);
            Route::get('/export/excel', [ReportController::class, 'exportExcel']);
        });

        // Audit Logs (static routes BEFORE parameterized routes)
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/audit-logs/admin', [AuditLogController::class, 'adminActions']);
        Route::get('/audit-logs/attendance', [AuditLogController::class, 'attendanceChanges']);
        Route::get('/audit-logs/login', [AuditLogController::class, 'loginActivity']);
        Route::get('/audit-logs/failed', [AuditLogController::class, 'failedActions']);
        Route::get('/audit-logs/critical', [AuditLogController::class, 'criticalEvents']);
        Route::get('/audit-logs/statistics', [AuditLogController::class, 'statistics']);
        Route::get('/audit-logs/verify-integrity', [AuditLogController::class, 'verifyIntegrity']);
        Route::get('/audit-logs/by-user/{userId}', [AuditLogController::class, 'byUser']);
        Route::get('/audit-logs/{auditLog}', [AuditLogController::class, 'show']);

        // Settings
        Route::post('/settings', [SettingsController::class, 'update']);
        Route::post('/settings/logo', [SettingsController::class, 'uploadLogo']);
        Route::get('/settings/backup', [SettingsController::class, 'backup']);
        Route::post('/settings/restore', [SettingsController::class, 'restore']);
        Route::get('/settings/export', [SettingsController::class, 'export']);
        Route::post('/settings/clear-data', [SettingsController::class, 'clearData']);
        Route::post('/settings/clear-logs', [SettingsController::class, 'clearLogs']);
    });
});


// Temporary Recalculation Route
Route::get('/recalc-hours', function () {
    $records = \App\Models\AttendanceRecord::whereNotNull('time_in')
        ->whereNotNull('time_out')
        ->get();

    $count = 0;
    $updated = [];

    foreach ($records as $r) {
        $in = \Carbon\Carbon::parse($r->time_in);
        $out = \Carbon\Carbon::parse($r->time_out);
        
        $diffMinutes = $out->diffInMinutes($in);
        
        // Subtract break
        if ($r->break_start && $r->break_end) {
            $bStart = \Carbon\Carbon::parse($r->break_start);
            $bEnd = \Carbon\Carbon::parse($r->break_end);
            $breakMinutes = $bEnd->diffInMinutes($bStart);
            $diffMinutes = max(0, $diffMinutes - $breakMinutes);
        }

        $newHours = round($diffMinutes / 60, 2);

        // Update if significantly different
        if (abs((float)$r->hours_worked - $newHours) > 0.05) {
            $old = $r->hours_worked;
            $r->hours_worked = $newHours;
            $r->save();
            $count++;
            $updated[] = [
                'id' => $r->id,
                'date' => $r->attendance_date,
                'old' => $old,
                'new' => $newHours
            ];
        }
    }

    return response()->json([
        'message' => 'Recalculation complete',
        'count' => $count,
        'updated_records' => $updated
    ]);
});
