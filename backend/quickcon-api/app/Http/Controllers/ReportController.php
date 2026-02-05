<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\BreakRule;
use App\Models\EmployeeBreak;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\AttendanceExport;

class ReportController extends Controller
{
    public function dashboard()
    {
        $today = Carbon::today()->toDateString();
        
        // Cache dashboard data for 30 seconds to reduce database load
        $cacheKey = 'admin_dashboard_' . $today . '_' . floor(time() / 30);
        
        return Cache::remember($cacheKey, 30, function() use ($today) {
            $totalEmployees = User::where('role', 'employee')
                                  ->where('status', 'active')
                                  ->count();

            $todaySession = AttendanceSession::with('schedule')
                                             ->whereDate('date', $today)
                                             ->whereIn('status', ['active', 'locked'])
                                             ->first();

            // Check for active overnight session from yesterday if no session today
            // IMPORTANT: Skip this if yesterday was a weekend (no work on Sat/Sun)
            if (!$todaySession) {
                $yesterday = Carbon::yesterday();
                $yesterdayDayOfWeek = $yesterday->dayOfWeek;
                $isYesterdayWeekend = ($yesterdayDayOfWeek === Carbon::SATURDAY || $yesterdayDayOfWeek === Carbon::SUNDAY);
                
                if (!$isYesterdayWeekend) {
                    $overnightSession = AttendanceSession::with('schedule')
                        ->whereDate('date', $yesterday->toDateString())
                        ->whereIn('status', ['active', 'locked'])
                        ->whereHas('schedule', function ($q) {
                            $q->where('is_overnight', true);
                        })
                        ->first();

                    if ($overnightSession) {
                        // Check if still within valid window (e.g. 4 hours after shift end)
                        $schedule = $overnightSession->schedule;
                        $sessionEnd = Carbon::parse($overnightSession->date->format('Y-m-d') . ' ' . $schedule->time_out)->addDay();
                        $cutoffTime = $sessionEnd->copy()->addHours(4); 
                        
                        if (Carbon::now()->lt($cutoffTime)) {
                            $todaySession = $overnightSession;
                        }
                    }
                }
            }

            // FIX: Calculate stats based on DATE, not just the active session
            // Fetch all records for today once to avoid multiple queries
            $todayRecords = AttendanceRecord::where('attendance_date', $today)->get();
            
            $presentToday = $todayRecords->whereIn('status', ['present', 'left_early'])->count();
            $lateToday = $todayRecords->where('status', 'late')->count();
            $manualAbsentToday = $todayRecords->whereIn('status', ['absent', 'excused'])->count();
                                         
            $confirmedCount = $presentToday + $lateToday + $manualAbsentToday;
            
            // --- ABSENT vs PENDING Logic ---
            
            $absentToday = 0;
            $pendingToday = 0;
            $remainingCount = max(0, $totalEmployees - $confirmedCount);

            // Official Rule: Absent cutoff at 01:00 AM (Next Day)
            $windowClose = Carbon::parse($today)->addDay()->setTime(1, 0, 0);
            
            $isSessionActive = $todaySession && $todaySession->status === 'active';

            if ($isSessionActive) {
                // Session is open -> Everyone remaining is PENDING
                $autoAbsent = 0;
                $pendingToday = $remainingCount;
            } elseif (Carbon::now()->gt($windowClose)) {
                // Window Closed AND No Active Session -> Everyone remaining is ABSENT
                $autoAbsent = $remainingCount;
                $pendingToday = 0;
            } else {
                // Window still valid -> Everyone remaining is PENDING
                $autoAbsent = 0;
                $pendingToday = $remainingCount;
            }
            
            // Total Absent = Manual Absent + Auto Absent
            $absentToday = $manualAbsentToday + $autoAbsent;

            $activeSessions = AttendanceSession::where('status', 'active')->count();

            // Attendance Rate (Current Month)
            // Logic: Present / Total Records (Simpler approximation)
            // Or strictly: Present / (Working Days * Total Employees)
            // Keeping it tied to records for now but could be refined
            $thisMonth = Carbon::now()->startOfMonth();
            $monthlyRecords = AttendanceRecord::whereHas('session', function ($q) use ($thisMonth) {
                $q->where('date', '>=', $thisMonth);
            })->count();

            $monthlyPresent = AttendanceRecord::whereHas('session', function ($q) use ($thisMonth) {
                $q->where('date', '>=', $thisMonth);
            })->where('status', 'present')->count();
            
            // Simple Presentation Rate for Dashboard
            $attendanceRate = $totalEmployees > 0 
                ? round(($presentToday / $totalEmployees) * 100, 1)
                : 0;

            return response()->json([
                'total_employees' => $totalEmployees,
                'present_today' => $presentToday,
                'late_today' => $lateToday,
                'absent_today' => $absentToday,
                'pending_today' => $pendingToday,
                'active_sessions' => $activeSessions,
                'attendance_rate' => $attendanceRate,
                'has_active_session' => $todaySession !== null,
                'active_session' => $todaySession ? [
                    'id' => $todaySession->id,
                    'schedule' => $todaySession->schedule,
                    'confirmed_count' => $confirmedCount,
                    'pending_count' => $pendingToday
                ] : null,
            ]);
        });
    }


    public function employeeDashboard(Request $request)
    {
        $user = $request->user();
        $now = Carbon::now();

        // ============================================================
        // DATE LOGIC FIX: Respect Shift Boundary Setting
        // ============================================================
        // If current hour < Boundary (e.g., 14:00), we are still effectively in "Yesterday's" shift cycle.
        // We must prioritize "Yesterday" even if a session exists for "Today" (e.g., a Morning shift session).
        
        $boundary = (int) (\App\Models\Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
        
        // Logical "Today" based on shift rules
        $today = $now->hour < $boundary ? Carbon::yesterday()->toDateString() : Carbon::today()->toDateString();
        $realToday = Carbon::today()->toDateString();

        // 1. Try to find session for the Logical Today (Shift Date)
        $todaySession = AttendanceSession::with('schedule')
            ->whereDate('date', $today)
            ->whereIn('status', ['active', 'locked'])
            ->first();

        // 2. If NO session on Shift Date, and Shift Date != Real Date, check Real Date?
        // Actually, no. If we are in the < 14:00 window, we strictly want the previous date context.
        // Checking Real Date here causes the "Morning Shift Hijack" bug where night shifters see the next day's empty dashboard.
        
        // However, if we are in the < 14:00 window, but the User is NOT working overnight, 
        // maybe they are an early morning shifter (e.g. 6am starts)?
        // If they start at 6am, $today is Yesterday. $todaySession (Yesterday) might be null.
        // But they need to see Today's (Feb 5) 6am session!
        
        // Refined Logic:
        // A. If the user has an ACTIVE RECORD (Time In, No Time Out), anchor to THAT record's date.
        // B. If no active record, use the Session that matches the current time best.
        
        // Check for active record first (Truth Source)
        // Fix: Exclude 'pending'/'absent' records (they have no time_out but aren't active work)
        // Fix: Exclude FUTURE records (prevent testing/ghost data from hijacking today)
        $activeRecord = AttendanceRecord::with(['session.schedule'])
            ->where('user_id', $user->id)
            ->whereNull('time_out')
            ->whereNotIn('status', ['pending', 'absent', 'excused'])
            ->where('attendance_date', '<=', Carbon::today()) 
            ->latest('time_in')
            ->first();

        if ($activeRecord) {
            // If user is actively working, the Dashboard Date IS the Record Date
            $today = $activeRecord->attendance_date->toDateString();
            $todaySession = AttendanceSession::with('schedule')->find($activeRecord->session_id);
        } else {
            // No active work.
            // Check if we are defaulting to "Yesterday" (today != realToday) but have ALREADY COMPLETED that shift.
            if ($today !== $realToday) {
                 $completedYesterday = AttendanceRecord::where('user_id', $user->id)
                     ->where('attendance_date', $today)
                     ->whereNotNull('time_out')
                     ->exists();
                     
                 if ($completedYesterday) {
                     // We finished yesterday's shift. Roll over to REAL TODAY.
                     $today = $realToday;
                     $todaySession = AttendanceSession::with('schedule')
                        ->whereDate('date', $today)
                        ->whereIn('status', ['active', 'locked'])
                        ->first();
                 }
            }

            if (!$todaySession && $today !== $realToday) {
                // User is not working, and we defaulted to Yesterday.
                // But if Yesterday has no session, check if Today (Real) has a relevant morning session?
                
                $potentialRealSession = AttendanceSession::with('schedule')
                    ->whereDate('date', $realToday)
                    ->whereIn('status', ['active', 'locked'])
                    ->first();
                    
                if ($potentialRealSession) {
                    $today = $realToday;
                    $todaySession = $potentialRealSession;
                }
            }
        }

        // ============================================================
        // WEEKEND CHECK: No work on Saturday & Sunday
        // ============================================================
        $todayDate = Carbon::parse($today);
        $dayOfWeek = $todayDate->dayOfWeek;
        $isWeekend = ($dayOfWeek === Carbon::SATURDAY || $dayOfWeek === Carbon::SUNDAY);
        
        if ($isWeekend) {
            // Return a special response for weekends - no attendance expected
            $dayName = $dayOfWeek === Carbon::SATURDAY ? 'Saturday' : 'Sunday';
            
            // Get monthly stats even on weekends
            $thisMonth = Carbon::now()->startOfMonth();
            $monthlyStats = AttendanceRecord::where('user_id', $user->id)
                ->where('attendance_date', '>=', $thisMonth)
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get()
                ->pluck('count', 'status');

            // Get recent records
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
                'break_status' => [
                    'break_window' => ['start_time_formatted' => 'N/A', 'end_time_formatted' => 'N/A'],
                    'is_within_break_window' => false,
                    'can_start_break' => false,
                    'can_end_break' => false,
                    'is_on_break' => false,
                    'break_already_used' => false,
                    'break_remaining_seconds' => 0,
                    'break_message' => 'No work scheduled today.',
                ],
            ]);
        }

        // ============================================================
        // STEP 1: Auto-Detect & Create Session (Virtual / Dynamic)
        // ============================================================
        
        // 1. Only lookup session if we don't already have one from the active record check above
        // CRITICAL FIX: Preserve $todaySession from active overnight record (line 192)
        if (!$todaySession) {
            $todaySession = AttendanceSession::with('schedule')
                ->whereDate('date', $today)
                ->whereIn('status', ['active', 'locked'])
                ->first();
        }

        // Check Overnight from Yesterday
        // IMPORTANT: Skip this if yesterday was a weekend (no work on Sat/Sun)
        if (!$todaySession) {
            $yesterday = Carbon::yesterday();
            $yesterdayDayOfWeek = $yesterday->dayOfWeek;
            $isYesterdayWeekend = ($yesterdayDayOfWeek === Carbon::SATURDAY || $yesterdayDayOfWeek === Carbon::SUNDAY);
            
            // Only look for overnight sessions from Friday (which ends Saturday morning)
            // Skip if yesterday was Saturday or Sunday - no work those days
            if (!$isYesterdayWeekend) {
                $overnightSession = AttendanceSession::with('schedule')
                    ->whereDate('date', $yesterday->toDateString())
                    ->whereIn('status', ['active', 'locked'])
                    ->whereHas('schedule', function ($q) {
                        $q->where('is_overnight', true);
                    })
                    ->first();

                if ($overnightSession) {
                    // Validate if it's still relevant (same 4-hour buffer logic)
                    $schedule = $overnightSession->schedule;
                    $sessionEnd = Carbon::parse($overnightSession->date->format('Y-m-d') . ' ' . $schedule->time_out)->addDay();
                    $cutoffTime = $sessionEnd->copy()->addHours(4); 
                    
                    $hasActiveRecord = AttendanceRecord::where('session_id', $overnightSession->id)
                        ->where('user_id', $user->id)
                        ->whereNull('time_out')
                        ->exists();

                    if ($hasActiveRecord || Carbon::now()->lt($cutoffTime)) {
                        $todaySession = $overnightSession;
                    }
                }
            }
        }

        // 2. If NO session exists, Try to Auto-Create/Detect one based on Schedules
        // IMPORTANT: Do NOT auto-create sessions for weekend dates
        if (!$todaySession) {
            // Find a schedule that SHOULD be active right now
            $allSchedules = \App\Models\Schedule::where('status', 'active')->get();
            $now = Carbon::now();
            
            // Get admin ID for session creation (use first admin, or fallback to current user)
            $adminUser = User::where('role', 'admin')->first();
            $adminId = $adminUser ? $adminUser->id : $user->id;
            
            foreach ($allSchedules as $schedule) {
                // Calculate Shift Window for TODAY
                $shiftStart = Carbon::parse($today . ' ' . $schedule->time_in);
                $shiftEnd = Carbon::parse($today . ' ' . $schedule->time_out);
                
                $isOvernight = $schedule->is_overnight ?? ($schedule->time_out < $schedule->time_in);
                if ($isOvernight) {
                    $shiftEnd->addDay(); // Shift ends tomorrow
                }

                // Window: Starts 3 hours BEFORE shift (Early Check-In)
                $windowStart = $shiftStart->copy()->subHours(3);
                
                // Allow detection if we are in [WindowStart ... ShiftEnd]
                // Note: For overnight, ShiftEnd is tomorrow, so it covers the whole night
                if ($now->between($windowStart, $shiftEnd)) {
                    // MATCH FOUND! Auto-Create Session
                    // Today is already confirmed NOT a weekend (checked at the start)
                    
                    // Double check unique constraint race
                    $todaySession = AttendanceSession::firstOrCreate(
                        [
                            'schedule_id' => $schedule->id,
                            'date' => $today // Always use today's date for the session
                        ],
                        [
                            'status' => 'active',
                            'opened_at' => $now,
                            'created_by' => $adminId,
                        ]
                    );
                    
                    // Reload relations
                    $todaySession->load('schedule');
                    break; // Stop after first match (priority to first schedule found)
                }
                
                // Special Case: You might be logging in at 01:00 AM for a shift that started YESTERDAY
                // CRITICAL FIX: Skip this entirely if yesterday was a weekend
                if ($isOvernight) {
                    $yesterday = Carbon::yesterday();
                    $yesterdayDayOfWeek = $yesterday->dayOfWeek;
                    $isYesterdayWeekend = ($yesterdayDayOfWeek === Carbon::SATURDAY || $yesterdayDayOfWeek === Carbon::SUNDAY);
                    
                    // Only create session for yesterday if yesterday was NOT a weekend
                    if (!$isYesterdayWeekend) {
                        // Check Yesterday's instance of this schedule
                        $yShiftStart = Carbon::parse($yesterday->toDateString() . ' ' . $schedule->time_in);
                        $yShiftEnd = Carbon::parse($yesterday->toDateString() . ' ' . $schedule->time_out)->addDay(); // Ends today morning
                        
                        $yWindowStart = $yShiftStart->copy()->subHours(3);
                        
                        if ($now->between($yWindowStart, $yShiftEnd)) {
                             $todaySession = AttendanceSession::firstOrCreate(
                                [
                                    'schedule_id' => $schedule->id,
                                    'date' => $yesterday->toDateString() // It belongs to YESTERDAY's cycle
                                ],
                                [
                                    'status' => 'active',
                                    'opened_at' => $now,
                                    'created_by' => $adminId, 
                                ]
                            );
                            $todaySession->load('schedule');
                            break;
                        }
                    }
                }
            }
        }

        // ============================================================
        // STEP 2: Get TODAY's attendance record (or Active Overnight Record)
        // ============================================================
        // Ensure accurate lookup for the specific user
        
        // Priority 1: Record linked to the detected session
        $todayRecord = null;
        if ($todaySession) {
            $todayRecord = AttendanceRecord::with(['session.schedule'])
                ->where('user_id', $user->id)
                ->where('session_id', $todaySession->id)
                ->first();
        }
        
        // Priority 2: Any active record (fallback) - must be actual work, not pending/absent
        if (!$todayRecord) {
             $todayRecord = AttendanceRecord::with(['session.schedule'])
                ->where('user_id', $user->id)
                ->whereNull('time_out')
                ->whereNotIn('status', ['pending', 'absent', 'excused']) // Exclude non-work records
                ->whereNotNull('time_in') // Must have actually timed in
                ->latest('time_in')
                ->first();
        }

        \Illuminate\Support\Facades\Log::info('Dashboard lookup', [
            'user_id' => $user->id,
            'today_date' => $today,
            'found_record_id' => $todayRecord?->id,
            'found_record_date' => $todayRecord?->attendance_date?->toDateString(),
            'is_overnight' => $todayRecord && $todayRecord->attendance_date->toDateString() !== $today
        ]);

        // ============================================================
        // STEP 3: Calculate monthly stats
        // ============================================================
        $thisMonth = Carbon::now()->startOfMonth();
        $monthlyStats = AttendanceRecord::where('user_id', $user->id)
            ->where('attendance_date', '>=', $thisMonth)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        // ============================================================
        // STEP 4: Get recent records
        // ============================================================
        $recentRecords = AttendanceRecord::with(['session.schedule'])
            ->where('user_id', $user->id)
            ->orderBy('attendance_date', 'desc')
            ->limit(5)
            ->get();

        // ============================================================
        // STEP 5: Determine check-in availability (STRICT)
        // ============================================================
        
        $checkInMessage = null;
        $checkInReason = null;
        $canConfirm = false; // Default to false unless proven otherwise
        
        // Official Rule: 
        // Open: 18:00
        // Close: 01:30 (Next Day)
        
        // 1. First, validation checks (Record Status)
        $isRecordClear = true;
        if ($todayRecord) {
            if ($todayRecord->time_out) {
                $isRecordClear = false;
                $checkInMessage = "You have already completed your shift.";
                $checkInReason = "already_checked_out";
            } elseif ($todayRecord->time_in) {
                $isRecordClear = false;
                $checkInMessage = "You are already checked in.";
                $checkInReason = "already_checked_in";
            }
        }
        
        // 2. Time Validation (Dynamic Window based on Schedule)
        if ($isRecordClear && $todaySession) {
            $now = Carbon::now();
            $sessionDate = Carbon::parse($todaySession->date->format('Y-m-d'));
            
            // Get Schedule Times
            $schedule = $todaySession->schedule;
            
            // Start: Official 18:00 Opening
            // Use static 18:00 start to match AttendanceRecordController rule (overriding dynamic shift-3h logic)
            $windowOpen = $sessionDate->copy()->setTime(18, 0, 0);
            
            // End: Shift End + Grace (e.g. 4 hours after shift end)
            // Handle Overnight
            $shiftEnd = Carbon::parse($sessionDate->format('Y-m-d') . ' ' . $schedule->time_out);
            if ($schedule->is_overnight || $shiftEnd->lt($shiftStart)) {
                $shiftEnd->addDay();
            }
            // Strict Check-In Limit: Allow check-in until shift ends (or +4 hours if you want lenient)
            // For now, let's say you can check IN until the shift ends. 
            $checkInClose = $shiftEnd->copy(); 

            if ($now->lt($windowOpen)) {
                $canConfirm = false;
                $checkInMessage = "Check-in opens at " . $windowOpen->format('H:i');
                $checkInReason = "too_early";
            } elseif ($now->gt($checkInClose)) {
                $canConfirm = false;
                $checkInMessage = "Check-in closed at " . $checkInClose->format('H:i');
                $checkInReason = "too_late";
            } else {
                // We are inside the window!
                // Final Check: Is session locked?
                if ($todaySession->status === 'locked') {
                    $canConfirm = false;
                    $checkInMessage = "Session is locked.";
                     $checkInReason = "session_locked";
                } else {
                    $canConfirm = true;
                }
            }
        } else {
             // No valid session found OR record blocked
             if ($isRecordClear && !$todaySession) {
                 $checkInMessage = "No active session available.";
                 $checkInReason = "no_session";
             }
        }

        // ============================================================
        // STEP 6: Get break status (Dynamic based on Schedule)
        // ============================================================
        $todayBreak = $todayRecord ? EmployeeBreak::where('attendance_id', $todayRecord->id)->whereNull('break_end')->first() : null;
        
        // Determine relevant session (prefer the one the user is checked into)
        $relevantSession = $todayRecord ? $todayRecord->session : $todaySession;
        
        // Defaults
        $breakStartFormatted = '12:00';
        $breakEndFormatted = '13:00';
        $isWithinBreakWindow = false;
        $isAfterBreakWindow = false;
        $isBeforeBreakWindow = false;
        
        // DYNAMIC SCHEDULE LOGIC - "Always Open" Mode (Match BreakController)
        $startTime = '00:00:00';
        $endTime = '23:59:59';
        
        $breakStartFormatted = 'Anytime';
        $breakEndFormatted = 'Anytime';
        $isWithinBreakWindow = true;
        // $isAfterBreakWindow = false; // Not needed if always open
        // $isBeforeBreakWindow = false;

        $breakStatus = [
            'break_window' => [
                'start_time_formatted' => $breakStartFormatted,
                'end_time_formatted' => $breakEndFormatted,
            ],
            'is_within_break_window' => $isWithinBreakWindow,
            'can_start_break' => false,
            'can_end_break' => false,
            'is_on_break' => false,
            'break_already_used' => false,
            'break_message' => null,
            'break_remaining_seconds' => 0,
        ];
        
        // Calculate Cumulative Usage properly
        $totalUsedSeconds = 0;
        if ($todayRecord) {
             $completedBreaks = EmployeeBreak::where('attendance_id', $todayRecord->id)
                 ->whereNotNull('break_end')
                 ->sum('duration_minutes');
             $totalUsedSeconds = $completedBreaks * 60;
        }

        // Add current active break time
        $currentSegmentSeconds = 0;
        $activeBreak = null;
        
        // Find if there is an ACTIVE break
        if ($todayRecord) {
            $activeBreak = EmployeeBreak::where('attendance_id', $todayRecord->id)
                ->whereNull('break_end')
                ->first();
                
            if ($activeBreak) {
                $currentSegmentSeconds = Carbon::parse($activeBreak->break_start)->diffInSeconds(now());
            }
        }

        $maxMinutes = 90;
        
        if ($activeBreak) {
            // Use strict segment limit from the model helper
            $remainingSeconds = $activeBreak->getRemainingSeconds();
        } else {
            // Use global limit fallback
            $limitSeconds = $maxMinutes * 60;
            $totalConsumedSeconds = $totalUsedSeconds; 
            $remainingSeconds = max(0, $limitSeconds - $totalConsumedSeconds);
        }

        // Populate Status Logic
        if (!$todayRecord) {
            // Allow break for auto-check-in if window is open
            if ($isWithinBreakWindow) {
                 $breakStatus['can_start_break'] = true;
                 $breakStatus['break_message'] = 'Starting break will auto-check you in.';
            } else {
                 $breakStatus['break_message'] = 'Check in first to take a break.';
            }
        } elseif ($todayRecord->time_out) {
            $breakStatus['break_message'] = 'Cannot take break after checking out.';
        } elseif ($remainingSeconds <= 0 && !$activeBreak) {
            // No time left and not currently on break
            $breakStatus['break_already_used'] = true;
            $breakStatus['break_remaining_seconds'] = 0;
            $breakStatus['break_message'] = 'You have used your full 1h 30m break allowance.';
        } elseif ($activeBreak) {
            // Currently on break
            $breakStatus['is_on_break'] = true;
            $breakStatus['can_end_break'] = true;
            $breakStatus['break_remaining_seconds'] = $remainingSeconds;
            $breakStatus['break_message'] = 'You are currently on break.';
            
            // Auto-End check for display consistency (simulated)
            if ($remainingSeconds <= 0) {
                 $breakStatus['break_message'] = 'Break time limit reached.';
            }
        } elseif ($isAfterBreakWindow) {
             // Window closed but maybe they have allowance? 
             // Usually window closes break availability too
            $breakStatus['break_message'] = "Break time ended at {$breakEndFormatted}.";
        } elseif ($isWithinBreakWindow) {
            // Window OPEN and has allowance
            $breakStatus['can_start_break'] = true;
            $breakStatus['break_remaining_seconds'] = $remainingSeconds;
            $breakStatus['break_message'] = "Break available until {$breakEndFormatted}.";
        } else {
            // Before window
            $breakStatus['break_message'] = "Break time starts at {$breakStartFormatted}.";
        }

        // Get all active schedules for debug
        $activeSchedulesCount = \App\Models\Schedule::where('status', 'active')->count();
        $allSessionsCount = AttendanceSession::count();
        $adminExists = User::where('role', 'admin')->exists();

        return response()->json([
            'active_session' => $todaySession,
            'today_record' => $todayRecord,
            'monthly_stats' => [
                'present' => $monthlyStats['present'] ?? 0,
                'late' => $monthlyStats['late'] ?? 0,
                'absent' => $monthlyStats['absent'] ?? 0,
            ],
            'recent_records' => $recentRecords,
            'can_confirm' => $canConfirm,
            'check_in_message' => $checkInMessage,
            'check_in_reason' => $checkInReason,
            'attendance_date' => $today,
            'break_status' => $breakStatus,
            // DEBUG INFO (remove in production)
            '_debug' => [
                'server_time' => Carbon::now()->toDateTimeString(),
                'today_date' => $today,
                'active_schedules_count' => $activeSchedulesCount,
                'total_sessions_count' => $allSessionsCount,
                'admin_exists' => $adminExists,
                'session_id' => $todaySession?->id,
            ],
        ]);
    }

    public function dailyReport($date)
    {
        // 1. Summary Stats (Keeping robust logic)
        $baseRecordsQuery = AttendanceRecord::where('attendance_date', $date);
        
        $totalEmployees = User::where('role', 'employee')->where('status', 'active')->count();
        $recordsCount = (clone $baseRecordsQuery)->count();

        $present = (clone $baseRecordsQuery)->whereIn('status', ['present', 'left_early'])->count();
        $late = (clone $baseRecordsQuery)->where('status', 'late')->count();
        $excused = (clone $baseRecordsQuery)->where('status', 'excused')->count();
        $explicitAbsent = (clone $baseRecordsQuery)->where('status', 'absent')->count();
        $explicitPending = (clone $baseRecordsQuery)->where('status', 'pending')->count();
        
        $unaccounted = max(0, $totalEmployees - $recordsCount);
        
        $isPast = Carbon::parse($date)->lt(Carbon::today());
        
        $finalAbsent = $explicitAbsent + ($isPast ? $unaccounted : 0);
        $finalPending = $explicitPending + (!$isPast ? $unaccounted : 0);

        $summary = [
            'total' => $totalEmployees, // Updated to show Total Expectation
            'total_employees' => $totalEmployees,
            'present' => $present,
            'late' => $late,
            'excused' => $excused,
            'absent' => $finalAbsent,
            'pending' => $finalPending,
        ];

        // 2. Fetch Employees List (Hydrated with Records)
        $perPage = request()->input('per_page', 20);
        
        $paginator = User::where('role', 'employee')
            ->where('status', 'active') // Show only active employees
            ->with(['attendanceRecords' => function ($query) use ($date) {
                $query->where('attendance_date', $date)
                      ->with('session.schedule');
            }])
            ->orderBy('first_name')
            ->paginate($perPage);

        // Transform logic
        $paginator->getCollection()->transform(function ($user) use ($date, $isPast) {
            $record = $user->attendanceRecords->first(); // Get record for this date
            
            if ($record) {
                // Calculate hours worked (Fixed for overnight shifts)
                $hours = null;
                if ($record->time_in && $record->time_out) {
                    // Calculate total duration
                    $totalMinutes = $record->time_in->diffInMinutes($record->time_out, false);
                    
                    // If negative, it means it's an overnight shift stored on same day date
                    if ($totalMinutes < 0) {
                        $totalMinutes += 1440; // Add 24 hours
                    }
                    
                    // Subtract break time
                    $breakMinutes = 0;
                    if ($record->breaks()->exists()) {
                        $breakMinutes = $record->breaks()->sum('duration_minutes');
                    } elseif ($record->break_start && $record->break_end) {
                        $breakMinutes = $record->break_start->diffInMinutes($record->break_end, false);
                        if ($breakMinutes < 0) $breakMinutes += 1440;
                    }
                    
                    $totalMinutes -= $breakMinutes;
                    
                    // Ensure non-negative
                    $totalMinutes = max(0, $totalMinutes);
                    
                    $hrs = floor($totalMinutes / 60);
                    $mins = $totalMinutes % 60;
                    $hours = sprintf('%d:%02d', $hrs, $mins);
                }
                
                return [
                    'id' => $record->id,
                    'is_virtual' => false,
                    'employee_id' => $user->employee_id ?? 'N/A',
                    'name' => $user->full_name,
                    'schedule' => $record->session?->schedule?->name ?? 'N/A',
                    'time_in' => $record->time_in?->format('H:i'),
                    // FIX: Hide break info for pending/absent records to prevent confusion (ghost data)
                    'break_time' => ($record->status === 'pending' || $record->status === 'absent') ? '-' : ($record->break_start?->format('H:i')),
                    'time_out' => $record->time_out?->format('H:i'),
                    'hours' => $hours,
                    'status' => ($record->status === 'pending' && $isPast) ? 'absent' : $record->status,
                    'minutes_late' => $record->minutes_late,
                    'attendance_date' => $record->attendance_date->toDateString(),
                ];
            } else {
                // Virtual Record for Pending/Absent
                $virtualStatus = $isPast ? 'absent' : 'pending';
                
                return [
                    'id' => 'virtual_' . hash('sha256', $user->id . config('app.key')),
                    'is_virtual' => true,
                    'employee_id' => $user->employee_id ?? 'N/A',
                    'name' => $user->full_name,
                    'schedule' => '-',
                    'time_in' => '-', // Or null? Frontend handles strings better usually
                    'break_time' => '-',
                    'time_out' => '-',
                    'hours' => '-',
                    'status' => $virtualStatus,
                    'minutes_late' => 0,
                    'attendance_date' => $date,
                ];
            }
        });

        return response()->json([
            'date' => $date,
            'summary' => $summary,
            'records' => $paginator, 
        ]);
    }

    public function monthlyReport($year, $month)
    {
        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $employees = User::withTrashed()
                         ->where('role', 'employee')
                         ->get();

        // Calculate total expected sessions (Working Days)
        $workingDays = AttendanceSession::whereBetween('date', [$startDate, $endDate])->where('status', '!=', 'cancelled')->count();

        $summary = [];

        foreach ($employees as $employee) {
            $records = AttendanceRecord::where('user_id', $employee->id)
                ->whereBetween('attendance_date', [$startDate, $endDate])
                ->get();

            // Status Counts
            $present = $records->whereIn('status', ['present', 'left_early'])->count();
            $late = $records->where('status', 'late')->count();
            $excused = $records->where('status', 'excused')->count();
            $explicitAbsent = $records->where('status', 'absent')->count();
            
            // Calculate missing records (Implicit Absent)
            // If an employee has no record for a working session, they are absent.
            $totalRecorded = $records->count();
            $missing = max(0, $workingDays - $totalRecorded);
            
            $totalAbsent = $explicitAbsent + $missing;

            // Attendance Rate Calculation
            // Rate = (Present + Late) / Working Days * 100
            // We include 'left_early' in $present. 
            // We exclude 'excused' from the numerator (they didn't attend), but keep in denominator (expected).
            
            $attendedCount = $present + $late;
            
            $attendanceRate = $workingDays > 0 
                ? round(($attendedCount / $workingDays) * 100, 1) 
                : ($totalRecorded > 0 ? 100 : 0); // Fallback if 0 working days defined but records exist

            $summary[] = [
                'employee_id' => $employee->employee_id,
                'name' => $employee->full_name,
                'present' => $present,
                'late' => $late,
                'excused' => $excused,
                'absent' => $totalAbsent,
                'attendance_rate' => $attendanceRate,
            ];
        }

        return response()->json([
            'year' => $year,
            'month' => $month,
            'working_days' => $workingDays,
            'total_employees' => count($employees),
            'summary' => $summary,
        ]);
    }

    public function employeeReport($employeeId, Request $request)
    {
        $employee = User::withTrashed()->where('employee_id', $employeeId)->firstOrFail();

        $baseQuery = AttendanceRecord::where('user_id', $employee->id);

        if ($request->has('start_date') && $request->has('end_date')) {
            $baseQuery->whereBetween('attendance_date', [$request->start_date, $request->end_date]);
        } else {
            // Default: Hide strictly future records (preserve "Today" for upcoming shifts)
            $baseQuery->where('attendance_date', '<=', Carbon::today()->toDateString());
        }
        
        // 1. Calculate Stats efficiently using aggregates
        $stats = [
            'present' => (clone $baseQuery)->where('status', 'present')->count(),
            'late' => (clone $baseQuery)->where('status', 'late')->count(),
            'absent' => (clone $baseQuery)->where('status', 'absent')->count(),
        ];

        $total = array_sum($stats);
        $stats['attendance_rate'] = $total > 0 
            ? round((($stats['present'] + $stats['late']) / $total) * 100, 1) 
            : 0;

        // 2. Paginate Records
        // Use per_page param or default to 20
        $perPage = $request->input('per_page', 20);
        
        $paginator = (clone $baseQuery)
            ->with(['session.schedule'])
            ->orderBy('attendance_date', 'desc')
            ->paginate($perPage);

        // Transform collection to hide ghost data
        $paginator->getCollection()->transform(function ($record) {
            // Hide break times for pending/absent records to prevent confusion
            if (in_array($record->status, ['pending', 'absent', 'excused'])) {
                $record->break_start = null;
                $record->break_end = null;
                $record->hours_worked = 0; // Ensure logic consistency
            }
            return $record;
        });

        return response()->json([
            'employee' => $employee,
            'stats' => $stats,
            'records' => $paginator, // Now returns a Paginator object
        ]);
    }

    public function exportExcel(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));
        
        $user = $request->user();
        $targetUserId = null;

        if ($user->role === 'employee') {
            // Regular employees can ONLY find their own records
            $targetUserId = $user->id;
        } elseif ($request->has('employee_id')) {
            // Admins can filter by specific employee_id (DB ID) if provided
            $targetUserId = $request->input('employee_id');
        }

        // Collect options with defaults
        $options = [
            'include_present' => $request->boolean('includePresent', true),
            'include_late' => $request->boolean('includeLate', true),
            'include_absent' => $request->boolean('includeAbsent', true),
            'include_times' => $request->boolean('includeTimes', true),
            'include_breaks' => $request->boolean('includeBreaks', true),
        ];

        $filename = "attendance_report_{$startDate}_to_{$endDate}.xlsx";

        return Excel::download(new AttendanceExport($startDate, $endDate, $targetUserId, $options), $filename);
    }

    /**
     * Get personal report stats and history for the authenticated employee.
     */
    public function personalReport(Request $request)
    {
        $user = $request->user();
        
        // 1. Get Stats (All Time)
        $stats = AttendanceRecord::where('user_id', $user->id)
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = "late" THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status = "absent" THEN 1 ELSE 0 END) as absent
            ')
            ->first();
            
        $present = $stats->present ?? 0;
        $late = $stats->late ?? 0;
        $absent = $stats->absent ?? 0;
        $total = $present + $late + $absent;
        
        $attendanceRate = $total > 0 
            ? round((($present + $late) / $total) * 100, 1) 
            : 0;
            
        // 2. Get Full History (Paginated)
        $history = AttendanceRecord::with(['session.schedule', 'breaks'])
            ->where('user_id', $user->id)
            ->orderBy('attendance_date', 'desc')
            ->get();
        
        // 3. Recalculate hours_worked for each record (fix for overnight shifts)
        $history->transform(function ($record) {
            if ($record->time_in && $record->time_out) {
                // Recalculate using absolute difference for overnight shifts
                $totalMinutes = abs($record->time_in->diffInMinutes($record->time_out));
                
                // Subtract break time from EmployeeBreak table
                $breakMinutes = $record->breaks()->sum('duration_minutes');
                
                // Fallback to legacy break columns
                if ($breakMinutes == 0 && $record->break_start && $record->break_end) {
                    $breakMinutes = abs($record->break_start->diffInMinutes($record->break_end));
                }
                
                $netMinutes = max(0, $totalMinutes - $breakMinutes);
                $record->hours_worked = round($netMinutes / 60, 2);
            }
            return $record;
        });
            
        return response()->json([
            'employee' => $user,
            'summary' => [
                'attendance_rate' => $attendanceRate,
                'present_days' => $present,
                'late_arrivals' => $late,
                'absences' => $absent,
            ],
            'history' => $history
        ]);
    }

    /**
     * Export personal report to Excel.
     */
    public function exportPersonalReport(Request $request)
    {
        $user = $request->user();
        $filename = "attendance-report-{$user->employee_id}.xlsx";
        
        return Excel::download(new \App\Exports\EmployeeHistoryExport($user), $filename);
    }

    /**
     * Fix all attendance records in the database (Cleanup Utility).
     * Since Shell is not available on Render Free Tier, this can be triggered via URL.
     */
    public function reconcileDatabaseHours(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $records = \App\Models\AttendanceRecord::whereNotNull('time_in')
            ->whereNotNull('time_out')
            ->get();

        $fixedCount = 0;
        foreach ($records as $record) {
            $timeIn = $record->time_in;
            $timeOut = $record->time_out;

            // Proper midnight-aware difference
            $grossMinutes = $timeIn->diffInMinutes($timeOut, false);
            if ($grossMinutes < 0) $grossMinutes += 1440;

            // Break calculation
            $breakMinutes = $record->breaks()->sum('duration_minutes');
            if ($breakMinutes == 0 && $record->break_start && $record->break_end) {
                $bDiff = $record->break_start->diffInMinutes($record->break_end, false);
                $breakMinutes = $bDiff < 0 ? $bDiff + 1440 : $bDiff;
            }

            $netHours = round(max(0, $grossMinutes - $breakMinutes) / 60, 2);

            // Update only if different
            if (abs($record->hours_worked - $netHours) > 0.01) {
                $record->hours_worked = $netHours;
                $record->save();
                $fixedCount++;
            }
        }

        return response()->json([
            'message' => "Successfully reconciled $fixedCount records.",
            'total_processed' => $records->count()
        ]);
    }
}
