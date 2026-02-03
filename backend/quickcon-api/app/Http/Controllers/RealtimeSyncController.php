<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Employee;
use App\Models\BreakRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Real-Time Sync Controller
 * 
 * Provides efficient polling endpoints for real-time data synchronization.
 * Uses timestamps to allow clients to check if data has changed without
 * fetching full datasets.
 */
class RealtimeSyncController extends Controller
{
    /**
     * Cache keys for tracking last updates
     */
    private const CACHE_KEY_ATTENDANCE = 'realtime:attendance_updated_at';
    private const CACHE_KEY_SESSIONS = 'realtime:sessions_updated_at';
    private const CACHE_KEY_EMPLOYEES = 'realtime:employees_updated_at';
    private const CACHE_KEY_BREAKS = 'realtime:breaks_updated_at';
    
    /**
     * Get current sync status - lightweight endpoint for polling
     * Returns timestamps of last updates for each data type
     */
    public function getSyncStatus()
    {
        $now = now()->timestamp;
        
        return response()->json([
            'success' => true,
            'data' => [
                'timestamps' => [
                    'attendance' => Cache::get(self::CACHE_KEY_ATTENDANCE, $now),
                    'sessions' => Cache::get(self::CACHE_KEY_SESSIONS, $now),
                    'employees' => Cache::get(self::CACHE_KEY_EMPLOYEES, $now),
                    'breaks' => Cache::get(self::CACHE_KEY_BREAKS, $now),
                ],
                'server_time' => $now,
            ]
        ]);
    }
    
    /**
     * Get recent activity feed for admin dashboard
     * Returns last N attendance actions
     */
    public function getRecentActivity(Request $request)
    {
        $limit = min($request->get('limit', 10), 50);
        $since = $request->get('since'); // Unix timestamp
        
        $query = AttendanceRecord::with(['employee:id,first_name,last_name,employee_id'])
            ->select('id', 'employee_id', 'time_in', 'time_out', 'status', 'created_at', 'updated_at')
            ->orderBy('updated_at', 'desc')
            ->limit($limit);
            
        if ($since) {
            $query->where('updated_at', '>', date('Y-m-d H:i:s', $since));
        }
        
        $records = $query->get()->map(function ($record) {
            $action = 'unknown';
            $actionTime = $record->updated_at;
            
            if ($record->time_out) {
                $action = 'checked_out';
                $actionTime = $record->time_out;
            } elseif ($record->time_in) {
                $action = 'checked_in';
                $actionTime = $record->time_in;
            }
            
            return [
                'id' => $record->id,
                'employee' => $record->employee ? [
                    'id' => $record->employee->id,
                    'name' => $record->employee->first_name . ' ' . $record->employee->last_name,
                    'employee_id' => $record->employee->employee_id,
                ] : null,
                'action' => $action,
                'action_time' => $actionTime,
                'status' => $record->status,
                'updated_at' => $record->updated_at,
            ];
        });
        
        return response()->json([
            'success' => true,
            'data' => $records,
            'meta' => [
                'server_time' => now()->timestamp,
            ]
        ]);
    }
    
    /**
     * Get live dashboard stats for admin
     * Optimized for frequent polling
     */
    public function getLiveDashboardStats()
    {
        $today = now()->toDateString();
        
        // Cache for 5 seconds to handle burst requests
        $stats = Cache::remember('dashboard:live_stats:' . $today, 5, function () use ($today) {
            $totalEmployees = Employee::where('status', 'active')->count();
            
            $presentToday = AttendanceRecord::whereDate('date', $today)
                ->whereNotNull('time_in')
                ->distinct('employee_id')
                ->count('employee_id');
                
            $checkedOutToday = AttendanceRecord::whereDate('date', $today)
                ->whereNotNull('time_out')
                ->distinct('employee_id')
                ->count('employee_id');
                
            $onBreakNow = BreakRecord::whereDate('break_start', $today)
                ->whereNull('break_end')
                ->count();
                
            $lateToday = AttendanceRecord::whereDate('date', $today)
                ->where('status', 'late')
                ->count();
                
            return [
                'total_employees' => $totalEmployees,
                'present_today' => $presentToday,
                'checked_out_today' => $checkedOutToday,
                'on_break_now' => $onBreakNow,
                'late_today' => $lateToday,
                'absent_today' => $totalEmployees - $presentToday,
                'attendance_rate' => $totalEmployees > 0 
                    ? round(($presentToday / $totalEmployees) * 100, 1) 
                    : 0,
            ];
        });
        
        return response()->json([
            'success' => true,
            'data' => $stats,
            'meta' => [
                'server_time' => now()->timestamp,
                'last_attendance_update' => Cache::get(self::CACHE_KEY_ATTENDANCE, now()->timestamp),
            ]
        ]);
    }
    
    /**
     * Static method to mark attendance data as updated
     * Call this from AttendanceRecord model events or controller
     */
    public static function markAttendanceUpdated()
    {
        Cache::put(self::CACHE_KEY_ATTENDANCE, now()->timestamp, 3600);
    }
    
    /**
     * Static method to mark session data as updated
     */
    public static function markSessionsUpdated()
    {
        Cache::put(self::CACHE_KEY_SESSIONS, now()->timestamp, 3600);
    }
    
    /**
     * Static method to mark employee data as updated
     */
    public static function markEmployeesUpdated()
    {
        Cache::put(self::CACHE_KEY_EMPLOYEES, now()->timestamp, 3600);
    }
    
    /**
     * Static method to mark break data as updated
     */
    public static function markBreaksUpdated()
    {
        Cache::put(self::CACHE_KEY_BREAKS, now()->timestamp, 3600);
    }
}
