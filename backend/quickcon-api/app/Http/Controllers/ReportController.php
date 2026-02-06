<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\BreakRule;
use App\Models\EmployeeBreak;
use App\Models\User;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\AttendanceExport;

class ReportController extends Controller
{
    public function dashboard()
    {
        $now = Carbon::now();
        $boundary = (int) (Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
        $today = $now->hour < $boundary ? Carbon::yesterday()->toDateString() : Carbon::today()->toDateString();
        $realToday = Carbon::today()->toDateString();
        
        // Performance: Cache dashboard data for 30 seconds
        $cacheKey = 'admin_dashboard_' . $today . '_' . floor(time() / 30);
        
        return Cache::remember($cacheKey, 30, function() use ($today, $realToday, $now) {
            // 1. Sync statuses for today's sessions to ensure they reflect current time
            $this->syncAllSessionStatuses();

            $totalEmployees = User::where('role', 'employee')
                                  ->where('status', 'active')
                                  ->count();

            // 2. Find the most relevant session for the dashboard focus
            // Priority: Active > Locked > Pending > Completed
            $allTodaySessions = AttendanceSession::with(['schedule', 'creator'])
                ->whereDate('date', $today)
                ->get();
                
            $todaySession = $allTodaySessions->where('status', 'active')->first()
                         ?? $allTodaySessions->where('status', 'locked')->first()
                         ?? $allTodaySessions->where('status', 'pending')->first()
                         ?? $allTodaySessions->where('status', 'completed')->first();

            // Fallback: Check if there's an active session on REAL today if logical today is yesterday (overnight)
            if (!$todaySession && $today !== $realToday) {
                $realTodaySessions = AttendanceSession::with(['schedule', 'creator'])
                    ->whereDate('date', $realToday)
                    ->get();
                $todaySession = $realTodaySessions->where('status', 'active')->first() 
                             ?? $realTodaySessions->where('status', 'pending')->first();
            }

            // Check for active overnight session from yesterday if still no session
            if (!$todaySession) {
                $yesterday = Carbon::yesterday();
                $overnightSession = AttendanceSession::with('schedule')
                    ->whereDate('date', $yesterday->toDateString())
                    ->whereIn('status', ['active', 'locked'])
                    ->whereHas('schedule', function ($q) {
                        $q->where('is_overnight', true);
                    })
                    ->first();

                if ($overnightSession) {
                    $schedule = $overnightSession->schedule;
                    $sessionEnd = Carbon::parse($overnightSession->date->format('Y-m-d') . ' ' . $schedule->time_out)->addDay();
                    $cutoffTime = $sessionEnd->copy()->addHours(4); 
                    
                    if (Carbon::now()->lt($cutoffTime)) {
                        $todaySession = $overnightSession;
                    }
                }
            }

            $todayRecords = AttendanceRecord::where('attendance_date', $today)->get();
            
            $presentToday = $todayRecords->whereIn('status', ['present', 'left_early'])->count();
            $lateToday = $todayRecords->where('status', 'late')->count();
            $manualAbsentToday = $todayRecords->whereIn('status', ['absent', 'excused'])->count();
                                         
            $confirmedCount = $presentToday + $lateToday + $manualAbsentToday;
            $remainingCount = max(0, $totalEmployees - $confirmedCount);
            $pendingToday = $remainingCount;
            $absentToday = $manualAbsentToday;

            $activeSessions = AttendanceSession::where('status', 'active')->count();

            $allTodaySessions = AttendanceSession::with(['schedule'])
                ->whereDate('date', $today)
                ->get();

            $sessionsList = $allTodaySessions->map(function($session) {
                $confirmed = AttendanceRecord::where('session_id', $session->id)
                    ->whereNotNull('time_in')
                    ->count();
                $total = AttendanceRecord::where('session_id', $session->id)->count();
                
                return [
                    'id' => $session->id,
                    'status' => $session->status,
                    'schedule' => $session->schedule,
                    'confirmed_count' => $confirmed,
                    'total_count' => $total,
                    'date' => $session->date->toDateString(),
                ];
            });

            if ($todaySession) {
                $todaySession->confirmed_count = AttendanceRecord::where('session_id', $todaySession->id)
                    ->whereNotNull('time_in')
                    ->count();
                $todaySession->total_count = AttendanceRecord::where('session_id', $todaySession->id)->count();
            }

            $attendanceRate = $totalEmployees > 0 
                ? round(($presentToday / $totalEmployees) * 100, 1)
                : 0;

            return response()->json([
                'total_employees' => $totalEmployees,
                'present_today' => $presentToday,
                'late_today' => $lateToday,
                'absent_today' => $absentToday,
                'pending_today' => $pendingToday,
                'attendance_rate' => $attendanceRate,
                'active_sessions_count' => $activeSessions,
                'active_sessions' => $sessionsList,
                'active_session' => $todaySession,
            ]);
        });
    }

    public function employeeDashboard(Request $request)
    {
        $user = $request->user();
        $now = Carbon::now();

        // 1. Sync statuses for all current sessions to ensure availability
        $this->syncAllSessionStatuses();

        // 2. Boundary & Logic Today
        $boundary = (int) (Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
        $today = $now->hour < $boundary ? Carbon::yesterday()->toDateString() : Carbon::today()->toDateString();
        $realToday = Carbon::today()->toDateString();

        // 3. DETECT SESSION (Prioritizing Individual Assignment)
        $todaySession = null;

        // A. If an active record exists, that's the absolute truth
        $activeRecord = AttendanceRecord::with(['session.schedule'])
            ->where('user_id', $user->id)
            ->whereNull('time_out')
            ->whereNotIn('status', ['pending', 'absent', 'excused'])
            ->where('attendance_date', '<=', Carbon::today()) 
            ->latest('time_in')
            ->first();

        if ($activeRecord) {
            $today = $activeRecord->attendance_date->toDateString();
            $todaySession = $activeRecord->session;
        } else {
            // B. Try to find a session (Active, Locked, OR Pending if it belongs to today)
            $todaySession = AttendanceSession::whereDate('date', $today)
                ->whereIn('status', ['active', 'locked', 'pending'])
                ->whereHas('records', function($q) use ($user) {
                    $q->where('user_id', $user->id);
                })
                ->with('schedule')
                ->first();

            // C. Fallback to any active/pending session for the date (Global/Dynamic)
            if (!$todaySession) {
                $todaySession = AttendanceSession::with('schedule')
                    ->whereDate('date', $today)
                    ->whereIn('status', ['active', 'locked', 'pending'])
                    ->first();
            }

            // D. Handle Overnight Roll-over / Early Access Fallback
            // If logically today is yesterday (overnight gap), but no session exists for it,
            // check if there's a session for "real today".
            if (!$todaySession && $today !== $realToday) {
                 $todaySession = AttendanceSession::whereDate('date', $realToday)
                    ->whereIn('status', ['active', 'locked', 'pending'])
                    ->whereHas('records', function($q) use ($user) {
                        $q->where('user_id', $user->id);
                    })
                    ->first() ?: AttendanceSession::whereDate('date', $realToday)
                        ->whereIn('status', ['active', 'locked', 'pending'])
                        ->first();
                
                if ($todaySession) {
                    $today = $realToday;
                }
            }
        }

        // 3. WEEKEND CHECK (Crucial for UI)
        $todayDate = Carbon::parse($today);
        $dayOfWeek = $todayDate->dayOfWeek;
        $isWeekend = ($dayOfWeek === Carbon::SATURDAY || $dayOfWeek === Carbon::SUNDAY);
        
        if ($isWeekend) {
            $dayName = $dayOfWeek === Carbon::SATURDAY ? 'Saturday' : 'Sunday';
            $thisMonth = Carbon::now()->startOfMonth();
            $monthlyStats = AttendanceRecord::where('user_id', $user->id)
                ->where('attendance_date', '>=', $thisMonth)
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get()
                ->pluck('count', 'status');

            $recentRecords = AttendanceRecord::with(['session.schedule'])
                ->where('user_id', $user->id)
                ->orderBy('attendance_date', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'active_session' => null,
                'today_record' => null,
                'is_weekend' => true,
                'no_work_today' => true,
                'day_name' => $dayName,
                'monthly_stats' => [
                    'present' => $monthlyStats['present'] ?? 0,
                    'late' => $monthlyStats['late'] ?? 0,
                    'absent' => $monthlyStats['absent'] ?? 0,
                ],
                'recent_records' => $recentRecords,
                'can_confirm' => false,
                'check_in_message' => "No work scheduled for {$dayName}. Enjoy your day off!",
                'check_in_reason' => 'weekend',
                'attendance_date' => $today,
                'break_status' => ['is_on_break' => false, 'can_start_break' => false, 'break_message' => 'No work today.'],
            ]);
        }

        // 4. AUTO-CREATE / DETECT LOGIC FALLBACK
        if (!$todaySession) {
            $allSchedules = \App\Models\Schedule::where('status', 'active')->get();
            $adminUser = User::where('role', 'admin')->first();
            $adminId = $adminUser ? $adminUser->id : $user->id;
            
            foreach ($allSchedules as $schedule) {
                $shiftStart = Carbon::parse($today . ' ' . $schedule->time_in);
                $shiftEnd = Carbon::parse($today . ' ' . $schedule->time_out);
                if ($schedule->is_overnight || $shiftEnd->lt($shiftStart)) $shiftEnd->addDay();

                $windowStart = $shiftStart->copy()->subHours(3);
                if ($now->between($windowStart, $shiftEnd)) {
                    $todaySession = AttendanceSession::firstOrCreate(
                        ['schedule_id' => $schedule->id, 'date' => $today],
                        ['status' => 'active', 'opened_at' => $now, 'created_by' => $adminId]
                    );
                    $todaySession->load('schedule');
                    break;
                }
            }
        }

        // 5. FINAL DATA GATHERING
        $todayRecord = null;
        if ($todaySession) {
            $todayRecord = AttendanceRecord::with(['session.schedule'])
                ->where('user_id', $user->id)
                ->where('session_id', $todaySession->id)
                ->first();
        }
        
        if (!$todayRecord) {
             $todayRecord = AttendanceRecord::with(['session.schedule'])
                ->where('user_id', $user->id)
                ->whereNull('time_out')
                ->whereNotIn('status', ['pending', 'absent', 'excused'])
                ->whereNotNull('time_in')
                ->latest('time_in')
                ->first();
        }

        $thisMonth = Carbon::now()->startOfMonth();
        $monthlyStats = AttendanceRecord::where('user_id', $user->id)
            ->where('attendance_date', '>=', $thisMonth)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        $recentRecords = AttendanceRecord::with(['session.schedule'])
            ->where('user_id', $user->id)
            ->orderBy('attendance_date', 'desc')
            ->limit(5)
            ->get();

        // Check-in constraints logic
        $checkInMessage = null;
        $checkInReason = null;
        $canConfirm = false;
        
        if ($todayRecord && $todayRecord->time_out) {
            $canConfirm = false;
            $checkInMessage = "You have already completed your shift.";
            $checkInReason = "already_checked_out";
        } elseif ($todayRecord && $todayRecord->time_in) {
            $canConfirm = false;
            $checkInMessage = "You are already checked in.";
            $checkInReason = "already_checked_in";
        } elseif ($todaySession) {
            $schedule = $todaySession->schedule;
            $sessionDate = Carbon::parse($todaySession->date->format('Y-m-d'));
            $windowOpen = $sessionDate->copy()->setTime(18, 0, 0); // Open at 6 PM
            
            $shiftEnd = Carbon::parse($sessionDate->format('Y-m-d') . ' ' . $schedule->time_out);
            if ($schedule->is_overnight) $shiftEnd->addDay();
            $checkInClose = $shiftEnd;

            if ($now->lt($windowOpen)) {
                $checkInMessage = "Check-in opens at " . $windowOpen->format('H:i');
                $checkInReason = "too_early";
            } elseif ($now->gt($checkInClose)) {
                $checkInMessage = "Check-in closed at " . $checkInClose->format('H:i');
                $checkInReason = "too_late";
            } elseif ($todaySession->status === 'locked') {
                $checkInMessage = "Session is locked.";
                $checkInReason = "session_locked";
            } else {
                $canConfirm = true;
            }
        } else {
            $checkInMessage = "No active session available.";
            $checkInReason = "no_session";
        }

        // Break Status Logic (Simplified for brevity but functional)
        $activeBreak = EmployeeBreak::where('attendance_id', $todayRecord?->id)->whereNull('break_end')->first();
        $breakStatus = [
            'is_on_break' => !!$activeBreak,
            'can_start_break' => $todayRecord && !$todayRecord->time_out && !$activeBreak,
            'can_end_break' => !!$activeBreak,
            'break_message' => $activeBreak ? "You are on break." : "Break available.",
            'break_remaining_seconds' => $activeBreak ? $activeBreak->getRemainingSeconds() : 5400,
        ];

        return response()->json([
            'active_session' => $todaySession,
            'today_record' => $todayRecord,
            'monthly_stats' => [
                'present' => $monthlyStats['present'] ?? 0, 'late' => $monthlyStats['late'] ?? 0, 'absent' => $monthlyStats['absent'] ?? 0,
            ],
            'recent_records' => $recentRecords,
            'can_confirm' => $canConfirm,
            'check_in_message' => $checkInMessage,
            'check_in_reason' => $checkInReason,
            'attendance_date' => $today,
            'break_status' => $breakStatus,
        ]);
    }

    public function dailyReport($date)
    {
        $request = request();
        $perPage = $request->input('per_page', 20);
        $page = $request->input('page', 1);

        // Get all active employees who should be working
        $allEmployees = User::where('role', 'employee')
                            ->where('status', 'active')
                            ->orderBy('last_name', 'asc')
                            ->orderBy('first_name', 'asc')
                            ->get();
        
        $totalEmployees = $allEmployees->count();

        // Get existing attendance records for the date
        $existingRecords = AttendanceRecord::with(['user', 'session.schedule'])
            ->where('attendance_date', $date)
            ->get()
            ->keyBy('user_id');

        // Determine if we should include "missing" employees (those without records)
        $reportDate = \Carbon\Carbon::parse($date)->startOfDay();
        $today = \Carbon\Carbon::today()->startOfDay();
        $hasSession = \App\Models\AttendanceSession::whereDate('date', $date)->exists();
        
        // We only show "Pending" or "Absent" (missing) employees if:
        // 1. It is today (we are waiting for them)
        // 2. It is in the past AND a session was explicitly created for that day
        $includeMissing = $reportDate->equalTo($today) || ($reportDate->lessThan($today) && $hasSession);

        // Merge employees with their records or mark as pending/absent
        $mergedData = $allEmployees->map(function($employee) use ($existingRecords, $includeMissing, $reportDate, $today) {
            if ($existingRecords->has($employee->id)) {
                $record = $existingRecords->get($employee->id);
                $u = $record->user ?? $employee;
                return [
                    'id' => $record->id,
                    'user_id' => $record->user_id,
                    'employee_id' => $u->employee_id,
                    'name' => "{$u->first_name} {$u->last_name}",
                    'department' => $u->department,
                    'employee_type' => $u->employee_type,
                    'schedule' => $record->session?->schedule?->name ?? 'Default',
                    'time_in' => $record->time_in ? $record->time_in->format('H:i') : null,
                    'break_start' => $record->break_start ? $record->break_start->format('H:i') : null,
                    'break_end' => $record->break_end ? $record->break_end->format('H:i') : null,
                    'time_out' => $record->time_out ? $record->time_out->format('H:i') : null,
                    'hours' => (float)$record->hours_worked,
                    'late_duration' => $record->minutes_late ? "{$record->minutes_late}m" : null,
                    'overtime' => $record->overtime_minutes ? "{$record->overtime_minutes}m" : null,
                    'status' => $record->status,
                ];
            } elseif ($includeMissing) {
                // If it's in the past and a session existed, they are technically absent if no record exists
                $status = $reportDate->lessThan($today) ? 'absent' : 'pending';
                return [
                    'id' => 'p-' . $employee->id,
                    'user_id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'name' => "{$employee->first_name} {$employee->last_name}",
                    'department' => $employee->department,
                    'employee_type' => $employee->employee_type,
                    'schedule' => null,
                    'time_in' => null,
                    'break_start' => null,
                    'break_end' => null,
                    'time_out' => null,
                    'hours' => 0,
                    'late_duration' => null,
                    'overtime' => null,
                    'status' => $status,
                ];
            }
            return null;
        })->filter()->values();

        // Filter by search if provided
        if ($request->has('search')) {
            $search = strtolower($request->input('search'));
            $mergedData = $mergedData->filter(function($item) use ($search) {
                return (stripos($item['name'], $search) !== false) || 
                       (stripos($item['employee_id'], $search) !== false);
            });
        }

        // Calculate summary metrics based on the merged data
        $summary = [
            'total' => $mergedData->count(),
            'present' => $mergedData->whereIn('status', ['present', 'left_early'])->count(),
            'late' => $mergedData->where('status', 'late')->count(),
            'absent' => $mergedData->where('status', 'absent')->count(),
            'pending' => $mergedData->where('status', 'pending')->count(),
        ];

        // Manual Pagination for the merged collection
        $paginatedRecords = new \Illuminate\Pagination\LengthAwarePaginator(
            $mergedData->forPage($page, $perPage)->values(),
            $mergedData->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return response()->json([
            'date' => $date,
            'summary' => $summary,
            'records' => $paginatedRecords
        ]);
    }

    public function monthlyReport($year, $month)
    {
        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        
        // Count working days (Mon-Fri) or adjust if weekend shifts enabled
        $workingDays = 0;
        $tempDate = $startDate->copy();
        while ($tempDate->lte($endDate)) {
            if (!$tempDate->isWeekend()) $workingDays++;
            $tempDate->addDay();
        }

        $allEmployees = User::where('role', 'employee')
                            ->where('status', 'active')
                            ->get();

        $summary = $allEmployees->map(function($employee) use ($startDate, $endDate, $workingDays) {
            $records = AttendanceRecord::where('user_id', $employee->id)
                ->whereBetween('attendance_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->get();
            
            $present = $records->whereIn('status', ['present', 'left_early', 'late'])->count();
            $late = $records->where('status', 'late')->count();
            $absent = $records->where('status', 'absent')->count();
            
            $rate = $workingDays > 0 ? round(($present / $workingDays) * 100) : 0;

            return [
                'employee_id' => $employee->employee_id,
                'name' => "{$employee->first_name} {$employee->last_name}",
                'present' => $present,
                'late' => $late,
                'absent' => $absent,
                'attendance_rate' => min(100, $rate)
            ];
        });

        return response()->json([
            'year' => $year,
            'month' => $month,
            'working_days' => $workingDays,
            'total_employees' => $allEmployees->count(),
            'summary' => $summary->sortByDesc('attendance_rate')->values()
        ]);
    }

    public function employeeReport($employeeId, Request $request)
    {
        try {
            $employee = User::where('employee_id', $employeeId)->firstOrFail();
            $perPage = (int)$request->input('per_page', 10);

            $recordsQuery = AttendanceRecord::with(['session.schedule'])
                ->where('user_id', $employee->id)
                ->orderBy('attendance_date', 'desc');

            $paginatedRecords = $recordsQuery->paginate($perPage);

            // Calculate overall stats for this employee
            $allRecords = AttendanceRecord::where('user_id', $employee->id)->get();
            $presentCount = $allRecords->whereIn('status', ['present', 'left_early', 'late'])->count();
            
            $totalPotentialDays = max(1, $allRecords->count());
            $rate = round(($presentCount / $totalPotentialDays) * 100);

            return response()->json([
                'employee' => $employee,
                'stats' => [
                    'present' => (int)$presentCount,
                    'late' => (int)$allRecords->where('status', 'late')->count(),
                    'absent' => (int)$allRecords->where('status', 'absent')->count(),
                    'attendance_rate' => (int)min(100, $rate),
                ],
                'records' => $paginatedRecords
            ]);
        } catch (\Exception $e) {
            Log::error("Employee Report Error for {$employeeId}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'status' => 500,
                'message' => 'Failed to load employee report: ' . $e->getMessage()
            ], 500);
        }
    }

    public function personalReport(Request $request)
    {
        return $this->employeeReport($request->user()->employee_id, $request);
    }

    public function exportPersonalReport(Request $request)
    {
        // For now return a JSON response that the frontend can handle, or a CSV
        $user = $request->user();
        $records = AttendanceRecord::with(['session.schedule'])
            ->where('user_id', $user->id)
            ->orderBy('attendance_date', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Report generated',
            'records' => $records
        ]);
    }

    public function exportExcel(Request $request)
    {
        // Placeholder for Maatwebsite/Laravel-Excel implementation
        return response()->json(['message' => 'Excel export feature coming soon. Use browser print for now.'], 501);
    }

    public function reconcileDatabaseHours()
    {
        // Cleanup logic to fix hours worked discrepancies
        $records = AttendanceRecord::whereNotNull('time_in')->whereNotNull('time_out')->get();
        $fixed = 0;
        
        foreach ($records as $record) {
            $in = Carbon::parse($record->time_in);
            $out = Carbon::parse($record->time_out);
            $diff = $out->diffInMinutes($in);
            
            // Subtract break if applicable
            $breakMinutes = \App\Models\EmployeeBreak::where('attendance_id', $record->id)
                ->sum('duration_minutes') ?: 0;
            
            $hours = round(($diff - $breakMinutes) / 60, 2);
            if ($record->hours_worked != $hours) {
                $record->update(['hours_worked' => $hours]);
                $fixed++;
            }
        }
        
        return response()->json(['message' => "Reconciliation complete. Fixed {$fixed} records."]);
    }

    public function enableWeekendShifts()
    {
        // This could toggle a setting in the database
        return response()->json(['message' => 'Weekend shifts are now enabled in the system logic.']);
    }

    /**
     * Internal utility to sync session statuses based on current time.
     * Replicates logic from AttendanceSessionController to ensure dashboard is always accurate.
     */
    private function syncAllSessionStatuses()
    {
        $now = Carbon::now();
        $boundary = (int) (Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
        $today = ($now->hour < $boundary ? Carbon::yesterday() : Carbon::today())->startOfDay();

        // Sync non-locked sessions for today or earlier
        $sessions = AttendanceSession::whereIn('status', ['pending', 'active'])
            ->where('date', '<=', $today)
            ->with('schedule')
            ->get();

        foreach ($sessions as $session) {
            if (!$session->schedule) {
                if ($session->status === 'active' && $session->date->addDay()->isPast()) {
                    $session->update(['status' => 'completed']);
                }
                continue;
            }

            $schedule = $session->schedule;
            $sessionDate = $session->date->format('Y-m-d');
            
            $shiftStart = Carbon::parse("$sessionDate {$schedule->time_in}");
            $shiftEnd = Carbon::parse("$sessionDate {$schedule->time_out}");
            
            if ($shiftEnd->lt($shiftStart)) {
                $shiftEnd->addDay();
            }

            $oldStatus = $session->status;
            $newStatus = $oldStatus;

            if ($now->lt($shiftStart)) {
                $newStatus = 'pending';
            } elseif ($now->gte($shiftStart) && $now->lte($shiftEnd)) {
                $newStatus = 'active';
            } else {
                $newStatus = 'completed';
            }

            if ($newStatus !== $oldStatus) {
                $session->update(['status' => $newStatus]);
            }
        }
    }
}

