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
                        $schedule = $overnightSession->schedule;
                        $sessionEnd = Carbon::parse($overnightSession->date->format('Y-m-d') . ' ' . $schedule->time_out)->addDay();
                        $cutoffTime = $sessionEnd->copy()->addHours(4); 
                        
                        if (Carbon::now()->lt($cutoffTime)) {
                            $todaySession = $overnightSession;
                        }
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

        // 1. Boundary & Logic Today
        $boundary = (int) (Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
        $today = $now->hour < $boundary ? Carbon::yesterday()->toDateString() : Carbon::today()->toDateString();
        $realToday = Carbon::today()->toDateString();

        // 2. DETECT SESSION (Prioritizing Individual Assignment)
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
            // B. Try to find a session where the user has a pending record (Pre-assigned)
            $todaySession = AttendanceSession::whereDate('date', $today)
                ->whereIn('status', ['active', 'locked'])
                ->whereHas('records', function($q) use ($user) {
                    $q->where('user_id', $user->id);
                })
                ->with('schedule')
                ->first();

            // C. Fallback to any active session for the date (Global/Dynamic)
            if (!$todaySession) {
                $todaySession = AttendanceSession::with('schedule')
                    ->whereDate('date', $today)
                    ->whereIn('status', ['active', 'locked'])
                    ->first();
            }

            // D. Handle Overnight Roll-over Fallback
            if (!$todaySession && $today !== $realToday) {
                 $completedYesterday = AttendanceRecord::where('user_id', $user->id)
                     ->where('attendance_date', $today)
                     ->whereNotNull('time_out')
                     ->exists();
                     
                 if ($completedYesterday) {
                     $today = $realToday;
                     $todaySession = AttendanceSession::whereDate('date', $today)
                        ->whereIn('status', ['active', 'locked'])
                        ->whereHas('records', function($q) use ($user) {
                            $q->where('user_id', $user->id);
                        })
                        ->first() ?: AttendanceSession::whereDate('date', $today)
                            ->whereIn('status', ['active', 'locked'])
                            ->first();
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
        $baseRecordsQuery = AttendanceRecord::where('attendance_date', $date);
        $totalEmployees = User::where('role', 'employee')->where('status', 'active')->count();
        $records = (clone $baseRecordsQuery)->get();

        return response()->json([
            'summary' => [
                'total' => $totalEmployees,
                'present' => $records->whereIn('status', ['present', 'left_early'])->count(),
                'late' => $records->where('status', 'late')->count(),
                'absent' => $records->where('status', 'absent')->count(),
                'pending' => max(0, $totalEmployees - $records->count()),
            ],
            'records' => AttendanceRecord::with(['user', 'session.schedule'])->where('attendance_date', $date)->get()
        ]);
    }
}
