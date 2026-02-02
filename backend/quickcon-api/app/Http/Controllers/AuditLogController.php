<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Get all audit logs with enhanced data.
     */
    public function index(Request $request)
    {
        $query = AuditLog::with('user');

        // Filter by action
        if ($request->has('action') && $request->action) {
            $query->where('action', $request->action);
        }

        // Filter by user
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by model type
        if ($request->has('model_type') && $request->model_type) {
            $query->where('model_type', $request->model_type);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('created_at', [$request->start_date, $request->end_date]);
        }

        // Filter by status (success/failed/warning)
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by severity (info/low/medium/high/critical)
        if ($request->has('severity') && $request->severity) {
            $query->where('severity', $request->severity);
        }

        // Filter critical actions only
        if ($request->boolean('critical_only')) {
            $query->whereIn('severity', [AuditLog::SEVERITY_HIGH, AuditLog::SEVERITY_CRITICAL]);
        }

        // Filter failed actions only
        if ($request->boolean('failed_only')) {
            $query->where('status', AuditLog::STATUS_FAILED);
        }

        // Search in description
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhereHas('user', function($userQuery) use ($search) {
                      $userQuery->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = $request->input('per_page', 20);
        
        return response()->json($query->orderBy('created_at', 'desc')->paginate($perPage));
    }

    /**
     * Get a single audit log with full details.
     */
    public function show(AuditLog $auditLog)
    {
        $auditLog->load('user');
        
        // Add computed attributes
        $data = $auditLog->toArray();
        $data['device_info'] = $auditLog->device_info;
        $data['integrity_valid'] = $auditLog->verifyIntegrity();
        
        return response()->json($data);
    }

    /**
     * Get logs for a specific user.
     */
    public function byUser($userId, Request $request)
    {
        $query = AuditLog::with('user')->where('user_id', $userId);

        if ($request->has('action') && $request->action) {
            $query->where('action', $request->action);
        }
        
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    /**
     * Get admin actions only.
     */
    public function adminActions(Request $request)
    {
        $adminActions = [
            'create_employee', 'update_employee', 'delete_employee',
            'activate_employee', 'deactivate_employee',
            'create_schedule', 'update_schedule', 'delete_schedule',
            'create_session', 'update_session', 'delete_session', 'lock_session', 'unlock_session',
            'system_restore', 'system_reset', 'clear_audit_logs', 'update_settings',
        ];

        $query = AuditLog::with('user')
                         ->whereIn('action', $adminActions);

        if ($request->has('search') && $request->search) {
            $query->where('description', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    /**
     * Get attendance-related changes.
     */
    public function attendanceChanges(Request $request)
    {
        $query = AuditLog::with('user')
                         ->where(function($q) {
                             $q->where('action', 'like', '%attendance%')
                               ->orWhere('model_type', 'AttendanceRecord')
                               ->orWhere('model_type', 'AttendanceSession');
                         });

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    /**
     * Get login activity (including failed attempts).
     */
    public function loginActivity(Request $request)
    {
        $query = AuditLog::with('user')
                         ->whereIn('action', ['login', 'logout', 'login_failed', 'login_rate_limited']);

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }
        
        // Filter to show failed only
        if ($request->boolean('failed_only')) {
            $query->where('status', AuditLog::STATUS_FAILED);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    /**
     * Get failed actions (security concerns).
     */
    public function failedActions(Request $request)
    {
        $query = AuditLog::with('user')
                         ->where('status', AuditLog::STATUS_FAILED);

        if ($request->has('action') && $request->action) {
            $query->where('action', $request->action);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    /**
     * Get critical security events.
     */
    public function criticalEvents(Request $request)
    {
        $query = AuditLog::with('user')
                         ->whereIn('severity', [AuditLog::SEVERITY_HIGH, AuditLog::SEVERITY_CRITICAL]);

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    /**
     * Get audit log statistics.
     */
    public function statistics(Request $request)
    {
        $startDate = $request->input('start_date', now()->subDays(30));
        $endDate = $request->input('end_date', now());

        $stats = [
            'total' => AuditLog::whereBetween('created_at', [$startDate, $endDate])->count(),
            'by_status' => [
                'success' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                     ->where('status', 'success')->count(),
                'failed' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                    ->where('status', 'failed')->count(),
                'warning' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                     ->where('status', 'warning')->count(),
            ],
            'by_severity' => [
                'critical' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                      ->where('severity', 'critical')->count(),
                'high' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                  ->where('severity', 'high')->count(),
                'medium' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                    ->where('severity', 'medium')->count(),
                'low' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                 ->where('severity', 'low')->count(),
                'info' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                  ->where('severity', 'info')->count(),
            ],
            'failed_logins' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                       ->where('action', 'login_failed')->count(),
            'unique_ips' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                    ->distinct('ip_address')->count('ip_address'),
            'top_actions' => AuditLog::whereBetween('created_at', [$startDate, $endDate])
                                     ->selectRaw('action, count(*) as count')
                                     ->groupBy('action')
                                     ->orderByDesc('count')
                                     ->limit(10)
                                     ->get(),
        ];

        return response()->json($stats);
    }

    /**
     * Verify audit log chain integrity.
     */
    public function verifyIntegrity()
    {
        $result = AuditLog::verifyChainIntegrity();
        
        return response()->json([
            'chain_valid' => $result['valid'],
            'logs_checked' => $result['checked'],
            'broken_at_id' => $result['broken_at'],
            'verified_at' => now()->toIso8601String(),
        ]);
    }
}
