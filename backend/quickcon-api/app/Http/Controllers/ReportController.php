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
        $boundary = (int) Setting::getCached('shift_boundary_hour', 14);
        $today = $now->hour < $boundary ? Carbon::yesterday()->toDateString() : Carbon::today()->toDateString();
        $realToday = Carbon::today()->toDateString();
        
        // Performance: Cache dashboard data for 30 seconds
        $cacheKey = 'admin_dashboard_' . $today . '_' . floor(time() / 30);
        
        return Cache::remember($cacheKey, 30, function() use ($today, $realToday, $now) {
            $totalEmployees = User::where('role', 'employee')
                                  ->where('status', 'active')
                                  ->count();

            // 2. Find the most relevant session for the dashboard focus
            // Priority: Active > Locked > Pending > Completed
            $allTodaySessions = AttendanceSession::with(['schedule', 'creator'])
                ->withCount(['records as total_count', 'records as confirmed_count' => function ($q) {
                    $q->whereNotNull('time_in');
                }])
                ->whereDate('date', $today)
                ->get();
                
            $todaySession = $allTodaySessions->where('status', 'active')->where('attendance_required', true)->first()
                         ?? $allTodaySessions->where('status', 'active')->where('total_count', '>', 0)->first()
                         ?? $allTodaySessions->where('status', 'active')->where('confirmed_count', '>', 0)->first()
                         ?? $allTodaySessions->where('status', 'locked')->first()
                         ?? $allTodaySessions->where('status', 'pending')->where('attendance_required', true)->first()
                         ?? $allTodaySessions->where('status', 'pending')->where('total_count', '>', 0)->first()
                         ?? $allTodaySessions->where('status', 'completed')->first();

            // Fallback: Check if there's an active session on REAL today if logical today is yesterday (overnight)
            if (!$todaySession && $today !== $realToday) {
                $realTodaySessions = AttendanceSession::with(['schedule', 'creator'])
                    ->withCount(['records as total_count', 'records as confirmed_count' => function ($q) {
                        $q->whereNotNull('time_in');
                    }])
                    ->whereDate('date', $realToday)
                    ->get();
                $todaySession = $realTodaySessions->where('status', 'active')->where('attendance_required', true)->first()
                             ?? $realTodaySessions->where('status', 'active')->where('confirmed_count', '>', 0)->first()
                             ?? $realTodaySessions->where('status', 'pending')->where('attendance_required', true)->first();
            }

            // Check for active overnight session from yesterday if still no session
            if (!$todaySession) {
                $yesterday = Carbon::yesterday();
                $overnightSession = AttendanceSession::with('schedule')
                    ->withCount(['records as total_count', 'records as confirmed_count' => function ($q) {
                        $q->whereNotNull('time_in');
                    }])
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

            // 3. WEEKEND ENFORCEMENT
            // If it's physically a weekend (Saturday/Sunday)
            // AND we don't have an ACTIVE or PENDING session
            // Then we should switch to the REAL date so statistics for today are clean (0)
            $isWeekend = $now->isWeekend();
            if ($isWeekend && (!$todaySession || !in_array($todaySession->status, ['active', 'pending']))) {
                $today = $realToday;
                
                // Refresh session search for physical today
                $allTodaySessions = AttendanceSession::with(['schedule', 'creator'])
                    ->withCount(['records as total_count', 'records as confirmed_count' => function ($q) {
                        $q->whereNotNull('time_in');
                    }])
                    ->whereDate('date', $today)
                    ->get();
                $todaySession = $allTodaySessions->where('status', 'active')->first()
                             ?? $allTodaySessions->where('status', 'pending')->where('total_count', '>', 0)->first();
            }

            $counts = AttendanceRecord::where('attendance_date', $today)
                ->selectRaw("count(case when status in ('present', 'left_early') then 1 end) as present")
                ->selectRaw("count(case when status = 'late' then 1 end) as late")
                ->selectRaw("count(case when status in ('absent', 'excused') then 1 end) as absent")
                ->selectRaw("count(case when status not in ('pending', 'optional') then 1 end) as processed")
                ->first();

            $presentToday = $counts->present;
            $lateToday = $counts->late;
            $manualAbsentToday = $counts->absent;
            $totalProcessed = $counts->processed;
                                         
            // 4. RESET STATS ON WEEKENDS
            // If it's a weekend and there's no active session, stats should be zero
            if ($isWeekend && (!$todaySession || !in_array($todaySession->status, ['active', 'pending']))) {
                $presentToday = 0;
                $lateToday = 0;
                $absentToday = 0;
                $pendingToday = 0;
                $totalProcessed = 0;
            } else {
                $absentToday = $manualAbsentToday;
                $pendingToday = max(0, $totalEmployees - $totalProcessed);
            }

            $activeSessions = AttendanceSession::where('status', 'active')
                ->where(function($q) {
                    $q->where('attendance_required', true)
                      ->orWhereHas('records', function($r) {
                          $r->whereNotNull('time_in');
                      });
                })
                ->count();

            $sessionsList = $allTodaySessions
                ->filter(function($session) {
                    // Show all sessions that were either required OR have activity OR have assigned employees
                    return $session->attendance_required || $session->confirmed_count > 0 || $session->total_count > 0;
                })
                ->map(function($session) {
                    return [
                        'id' => $session->id,
                        'status' => $session->status,
                        'schedule' => $session->schedule,
                        'confirmed_count' => $session->confirmed_count,
                        'total_count' => $session->total_count,
                        'date' => $session->date->toDateString(),
                        'attendance_required' => $session->attendance_required,
                    ];
                });

            if ($todaySession) {
                $todaySession->confirmed_count = $todaySession->confirmed_count;
                $todaySession->total_count = $todaySession->total_count;
            }

            $attendanceRate = $totalEmployees > 0 
                ? round(($presentToday / $totalEmployees) * 100, 1)
                : 0;

            $dayName = Carbon::parse($today)->format('l');

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
                'is_weekend' => $isWeekend,
                'day_name' => $dayName,
                'attendance_date' => $today
            ]);
        });
    }

    public function employeeDashboard(Request $request)
    {
        $user = $request->user();
        $now = Carbon::now();
        $boundary = (int) Setting::getCached('shift_boundary_hour', 14);
        
        $today = $now->hour < $boundary ? Carbon::yesterday()->toDateString() : Carbon::today()->toDateString();
        $realToday = Carbon::today()->toDateString();
        
        // Performance: Cache employee dashboard data for 30 seconds per user
        $cacheKey = 'employee_dashboard_' . $user->id . '_' . $today . '_' . floor(time() / 30);
        
        return Cache::remember($cacheKey, 30, function() use ($user, $today, $realToday, $now) {
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
                $todayString = $activeRecord->attendance_date->toDateString();
                $todaySession = $activeRecord->session;
            } else {
                $todayString = $today;
                // B. Try to find a session (Active, Locked, OR Pending if it belongs to today)
                $todaySession = AttendanceSession::whereDate('date', $todayString)
                    ->whereIn('status', ['active', 'locked', 'pending'])
                    ->whereHas('records', function($q) use ($user) {
                        $q->where('user_id', $user->id);
                    })
                    ->with('schedule')
                    ->first();

                if (!$todaySession) {
                    $fallbackSession = AttendanceSession::with('schedule')
                        ->whereDate('date', $todayString)
                        ->whereIn('status', ['active', 'locked', 'pending'])
                        ->first();
                    
                    if ($fallbackSession) {
                        if ($fallbackSession->attendance_required) {
                            $todaySession = $fallbackSession;
                        } else {
                            $isUserInSession = \App\Models\AttendanceRecord::where('session_id', $fallbackSession->id)
                                ->where('user_id', $user->id)
                                ->exists();
                            
                            if ($isUserInSession) {
                                $todaySession = $fallbackSession;
                            }
                        }
                    }
                }

                if (!$todaySession && $todayString !== $realToday) {
                     $todaySession = AttendanceSession::whereDate('date', $realToday)
                        ->whereIn('status', ['active', 'locked', 'pending'])
                        ->whereHas('records', function($q) use ($user) {
                            $q->where('user_id', $user->id);
                        })
                        ->first() ?: AttendanceSession::whereDate('date', $realToday)
                            ->whereIn('status', ['active', 'locked', 'pending'])
                            ->first();
                    
                    if ($todaySession) {
                        $todayString = $realToday;
                    }
                }
            }

            // WEEKEND CHECK
            $logicalDate = Carbon::parse($todayString);
            $isWeekend = $logicalDate->isWeekend();
            if (!$isWeekend && Carbon::now()->isWeekend() && !$activeRecord) {
                $isWeekend = true;
                $todayString = Carbon::now()->toDateString();
            }

            if ($isWeekend && (!$todaySession || !$todaySession->attendance_required) && !$activeRecord) {
                $dayName = Carbon::parse($todayString)->format('l');
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
                        'present' => $monthlyStats['present'] ?? 0, 'late' => $monthlyStats['late'] ?? 0, 'absent' => $monthlyStats['absent'] ?? 0,
                    ],
                    'recent_records' => $recentRecords,
                    'can_confirm' => false,
                    'check_in_message' => "No work scheduled for {$dayName}. Enjoy your day off!",
                    'attendance_date' => $todayString,
                    'break_status' => ['is_on_break' => false, 'can_start_break' => false, 'break_message' => 'No work today.'],
                ]);
            }

            // AUTO-CREATE / DETECT LOGIC FALLBACK
            if (!$todaySession) {
                $allSchedules = \App\Models\Schedule::where('status', 'active')->get();
                $adminId = User::where('role', 'admin')->value('id') ?: $user->id;
                
                foreach ($allSchedules as $schedule) {
                    $shiftStart = Carbon::parse($todayString . ' ' . $schedule->time_in);
                    $shiftEnd = Carbon::parse($todayString . ' ' . $schedule->time_out);
                    if ($schedule->is_overnight || $shiftEnd->lt($shiftStart)) $shiftEnd->addDay();

                    $windowStart = $shiftStart->copy()->subHours(3);
                    if ($now->between($windowStart, $shiftEnd)) {
                        $todaySession = AttendanceSession::firstOrCreate(
                            ['schedule_id' => $schedule->id, 'date' => $todayString],
                            ['status' => 'active', 'opened_at' => $now, 'created_by' => $adminId]
                        );
                        $todaySession->load('schedule');
                        break;
                    }
                }
            }

            $todayRecordSummary = null;
            if ($todaySession) {
                $todayRecordSummary = AttendanceRecord::with(['session.schedule'])
                    ->where('user_id', $user->id)
                    ->where('session_id', $todaySession->id)
                    ->first();
            }
            
            if (!$todayRecordSummary && $activeRecord) {
                 $todayRecordSummary = $activeRecord;
            }

            $thisMonth = Carbon::now()->startOfMonth();
            $monthlyStats = AttendanceRecord::where('user_id', $user->id)
                ->where('attendance_date', '>=', $thisMonth)
                ->selectRaw('status, count(*) as count')
                ->groupBy('status')
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
            
            if ($todayRecordSummary && $todayRecordSummary->time_out) {
                $canConfirm = false;
                $checkInMessage = "You have already completed your shift.";
                $checkInReason = "already_checked_out";
            } elseif ($todayRecordSummary && $todayRecordSummary->time_in) {
                $canConfirm = false;
                $checkInMessage = "You are already checked in.";
                $checkInReason = "already_checked_in";
            } elseif ($todaySession) {
                $schedule = $todaySession->schedule;
                $sessionDate = Carbon::parse($todaySession->date->format('Y-m-d'));
                $windowOpen = $sessionDate->copy()->setTime(18, 0, 0); 
                $shiftEnd = Carbon::parse($sessionDate->format('Y-m-d') . ' ' . $schedule->time_out);
                if ($schedule->is_overnight) $shiftEnd->addDay();
                $checkInClose = $shiftEnd;

                if ($now->lt($windowOpen)) {
                    $checkInMessage = "Check-in opens at " . $windowOpen->format('H:i'); $checkInReason = "too_early";
                } elseif ($now->gt($checkInClose)) {
                    $checkInMessage = "Check-in closed at " . $checkInClose->format('H:i'); $checkInReason = "too_late";
                } elseif ($todaySession->status === 'locked') {
                    $checkInMessage = "Session is locked."; $checkInReason = "session_locked";
                } else {
                    $canConfirm = true;
                }
            } else {
                $checkInMessage = "No active session available."; $checkInReason = "no_session";
            }

            $activeBreak = EmployeeBreak::where('attendance_id', $todayRecordSummary?->id)->whereNull('break_end')->first();
            $breakStatus = [
                'is_on_break' => !!$activeBreak,
                'can_start_break' => $todayRecordSummary && !$todayRecordSummary->time_out && !$activeBreak,
                'can_end_break' => !!$activeBreak,
                'break_message' => $activeBreak ? "You are on break." : "Break available.",
                'break_remaining_seconds' => $activeBreak ? $activeBreak->getRemainingSeconds() : 5400,
            ];

            if ($todayRecordSummary) {
                $todayRecordSummary->hours_worked = $todayRecordSummary->calculateHoursWorked();
            }

            $recentRecords->transform(function ($record) {
                $record->hours_worked = $record->calculateHoursWorked();
                return $record;
            });

            return response()->json([
                'active_session' => $todaySession,
                'today_record' => $todayRecordSummary,
                'monthly_stats' => [
                    'present' => $monthlyStats['present'] ?? 0, 'late' => $monthlyStats['late'] ?? 0, 'absent' => $monthlyStats['absent'] ?? 0,
                ],
                'recent_records' => $recentRecords,
                'can_confirm' => $canConfirm,
                'check_in_message' => $checkInMessage,
                'check_in_reason' => $checkInReason,
                'attendance_date' => $todayString,
                'break_status' => $breakStatus,
            ]);
        });
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
        // Eager load breaks to avoid N+1 queries during hours calculation
        $existingRecords = AttendanceRecord::with(['user', 'session.schedule', 'breaks'])
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
                    // Department removed as requested
                    'employee_type' => $u->employee_type,
                    'schedule' => $record->session?->schedule?->name ?? 'Default',
                    'time_in' => $record->time_in ? $record->time_in->format('H:i') : null,
                    'break_start' => $record->break_start ? $record->break_start->format('H:i') : null,
                    'break_end' => $record->break_end ? $record->break_end->format('H:i') : null,
                    'time_out' => $record->time_out ? $record->time_out->format('H:i') : null,
                    'hours' => $record->calculateHoursWorked(),
                    'late_duration' => $record->minutes_late ? "{$record->minutes_late}m" : null,
                    'overtime' => $record->overtime_minutes ? "{$record->overtime_minutes}m" : null,
                    'status' => $record->status,
                ];
            } elseif ($includeMissing) {
                // Determine if it's a weekend (Standard)
                $isWeekend = $reportDate->isWeekend();
                
                // If it's a weekend, they aren't "Pending" or "Absent", they are "Optional"
                $status = $isWeekend ? 'optional' : ($reportDate->lessThan($today) ? 'absent' : 'pending');
                return [
                    'id' => 'p-' . $employee->id,
                    'user_id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'name' => "{$employee->first_name} {$employee->last_name}",
                    // Department removed as requested
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

        // Initialize summary counts
        $summary = [
            'total' => $mergedData->count(),
            'present' => 0,
            'late' => 0,
            'absent' => 0,
            'excused' => 0,
            'pending' => 0,
            'optional' => 0,
        ];

        // Process summary in a single pass with robust status matching
        foreach ($mergedData as $item) {
            $rawStatus = $item['status'] ?? '';
            $status = strtolower(trim((string)$rawStatus));

            if ($status === 'late') {
                $summary['late']++;
            } elseif ($status === 'absent') {
                $summary['absent']++;
            } elseif ($status === 'excused') {
                $summary['excused']++;
            } elseif ($status === 'pending') {
                $summary['pending']++;
            } elseif ($status === 'optional') {
                $summary['optional']++;
            } else {
                // Default: Treat 'present', 'left_early', and any unknown/empty status as present
                $summary['present']++;
            }
        }

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

        $employeeIds = $allEmployees->pluck('id');

        // Optimization: Fetch all records for the month in ONE query
        // Selecting only necessary columns to reduce memory footprint
        $allRecords = AttendanceRecord::whereIn('user_id', $employeeIds)
            ->whereBetween('attendance_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->select('id', 'user_id', 'status', 'attendance_date')
            ->get()
            ->groupBy('user_id');

        $summary = $allEmployees->map(function($employee) use ($allRecords, $workingDays) {
            $records = $allRecords->get($employee->id, collect());
            
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
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date',
            'user_id' => 'nullable|integer',
            'include_present' => 'nullable',
            'include_late' => 'nullable',
            'include_absent' => 'nullable',
            'include_times' => 'nullable',
            'include_breaks' => 'nullable',
        ]);

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $userId = $request->input('user_id');
        
        // Helper to handle mixed checkbox/bool inputs from frontend
        $toBool = function($val, $default = true) {
            if ($val === null) return $default;
            if (is_bool($val)) return $val;
            return filter_var($val, FILTER_VALIDATE_BOOLEAN);
        };

        $options = [
            'include_present' => $toBool($request->input('include_present')),
            'include_late' => $toBool($request->input('include_late')),
            'include_absent' => $toBool($request->input('include_absent')),
            'include_times' => $toBool($request->input('include_times')),
            'include_breaks' => $toBool($request->input('include_breaks')),
        ];

        $fileName = "attendance_report_{$startDate}_to_{$endDate}.xlsx";

        // Audit the export action
        AuditLog::log(
            'export_excel',
            "Admin exported attendance records from {$startDate} to {$endDate}",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'AttendanceRecord',
            null,
            null,
            ['start_date' => $startDate, 'end_date' => $endDate, 'filters' => $options]
        );
        
        return Excel::download(new AttendanceExport($startDate, $endDate, $userId, $options), $fileName);
    }

    public function reconcileDatabaseHours()
    {
        // Cleanup logic to fix hours worked discrepancies
        $records = AttendanceRecord::whereNotNull('time_in')->whereNotNull('time_out')->get();
        $fixed = 0;
        
        foreach ($records as $record) {
            $correctHours = $record->calculateHoursWorked();
            
            if ((float) $record->hours_worked !== (float) $correctHours) {
                $record->update(['hours_worked' => $correctHours]);
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

    private function syncAllSessionStatuses()
    {
        AttendanceSession::syncStatuses();
    }
}

