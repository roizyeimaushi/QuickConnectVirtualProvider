<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AuditLog;
use App\Events\AttendanceUpdated;
use App\Events\BreakUpdated;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Setting;

class AttendanceRecordController extends Controller
{
    /**
     * Store a new attendance record manually (Admin only).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'session_id' => 'required|exists:attendance_sessions,id',
            'attendance_date' => 'required|date',
            'status' => 'required|in:present,late,absent,excused,left_early',
            'time_in' => 'nullable|date',
            'time_out' => 'nullable|date',
            'break_start' => 'nullable|date',
            'break_end' => 'nullable|date',
            'reason' => 'required|string|min:5',
        ]);

        // Check if record already exists
        $exists = AttendanceRecord::where('user_id', $validated['user_id'])
            ->where('attendance_date', $validated['attendance_date'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'An attendance record already exists for this user on this date.',
                'error_code' => 'DUPLICATE_RECORD'
            ], 409);
        }

        $record = AttendanceRecord::create([
            'user_id' => $validated['user_id'],
            'session_id' => $validated['session_id'],
            'attendance_date' => $validated['attendance_date'],
            'status' => $validated['status'],
            'time_in' => $validated['time_in'] ? Carbon::parse($validated['time_in']) : null,
            'time_out' => $validated['time_out'] ? Carbon::parse($validated['time_out']) : null,
            'break_start' => $validated['break_start'] ? Carbon::parse($validated['break_start']) : null,
            'break_end' => $validated['break_end'] ? Carbon::parse($validated['break_end']) : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        AuditLog::log(
            'create_attendance',
            "Admin {$request->user()->first_name} created manual record ({$record->status}) for user #{$record->user_id}. Reason: {$validated['reason']}",
            AuditLog::STATUS_SUCCESS,
            $request->user()->id,
            'AttendanceRecord',
            $record->id
        );

        return response()->json([
            'message' => 'Attendance record created successfully',
            'record' => $record->load(['session.schedule', 'user'])
        ], 201);
    }
    /**
     * Get today's date string (SERVER-SIDE ONLY).
     * This is the single source of truth for date-scoped attendance.
     */
    private function getToday(): string
    {
        $now = Carbon::now();
        // Customizable Shift Boundary (Default 14:00 for Night Shift Agencies)
        // If current hour < Boundary, it counts as Previous Day
        $boundary = (int) (Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
        
        if ($now->hour < $boundary) {
            return Carbon::yesterday()->toDateString();
        }
        return Carbon::today()->toDateString();
    }

    /**
     * Get today's attendance record for a user.
     * CRITICAL: Only looks at today's date, never previous days.
     */
    private function getTodayAttendance(int $userId): ?AttendanceRecord
    {
        return AttendanceRecord::where('user_id', $userId)
            ->where('attendance_date', $this->getToday())
            ->first();
    }

    /**
     * List all attendance records with filters.
     */
    public function index(Request $request)
    {
        // Include soft-deleted users to prevent "Unknown User" for historical records
        $query = AttendanceRecord::with(['session.schedule', 'user' => function ($q) {
            $q->withTrashed();
        }]);

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('date') && $request->date) {
            $query->where('attendance_date', $request->date);
        }

        // Support date range filtering for reports
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('attendance_date', [$request->start_date, $request->end_date]);
        }

        // Support search by employee name or ID
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            // Use whereHas but explicitly allow trashed users
            $query->whereHas('user', function ($q) use ($search) {
                $q->withTrashed()
                  ->where(function($subQ) use ($search) {
                       $subQ->where('first_name', 'like', "%$search%")
                            ->orWhere('last_name', 'like', "%$search%")
                            ->orWhere('employee_id', 'like', "%$search%");
                  });
            });
        }

        $perPage = $request->get('per_page', 50);

        return response()->json($query->orderBy('created_at', 'desc')->paginate($perPage));
    }

    /**
     * Show a single attendance record.
     */
    public function show(AttendanceRecord $attendanceRecord)
    {
        return response()->json($attendanceRecord->load(['session.schedule', 'user' => function ($q) {
            $q->withTrashed();
        }]));
    }

    /**
     * Confirm attendance (Check-In) for a session.
     * 
     * CRITICAL DATE-SCOPED LOGIC:
     * - Only allows ONE check-in per employee per calendar DATE
     * - Yesterday's attendance NEVER blocks today
     * - Date is the source of truth, not session or time
     */
    public function confirm(Request $request, $sessionId)
    {
        $session = AttendanceSession::with('schedule')->find($sessionId);
        
        // Return a clear error if session doesn't exist (instead of 500 error)
        if (!$session) {
            return response()->json([
                'message' => 'Attendance session not found. Please ask your administrator to create a session for today.',
                'error_code' => 'SESSION_NOT_FOUND',
                'session_id' => $sessionId,
                '_debug' => [
                    'total_sessions' => AttendanceSession::count(),
                    'active_sessions' => AttendanceSession::where('status', 'active')->count(),
                ]
            ], 404);
        }
        
        // Validate schedule exists
        if (!$session->schedule) {
            return response()->json([
                'message' => 'This session has no schedule attached. Please contact your administrator.',
                'error_code' => 'NO_SCHEDULE',
                'session_id' => $sessionId,
            ], 400);
        }
        
        $user = $request->user();
        $today = $this->getToday();
        $now = Carbon::now();

        // ============================================================
        // SETTINGS: Fetch Global Rules (consolidated into single query)
        // ============================================================
        $settings = Setting::whereIn('key', ['allow_multi_checkin', 'grace_period', 'prevent_duplicate_checkin'])
            ->pluck('value', 'key');
        
        $allowMultiCheckin = filter_var($settings->get('allow_multi_checkin', false), FILTER_VALIDATE_BOOLEAN);
        $globalGracePeriod = (int) ($settings->get('grace_period', 15) ?: 15);
        $preventDuplicate = filter_var($settings->get('prevent_duplicate_checkin', true), FILTER_VALIDATE_BOOLEAN);

        // ============================================================
        // RULE 0.5: Prevent Duplicate Time-ins (Block rapid clicks)
        // ============================================================
        if ($preventDuplicate) {
            $recentConfirm = AttendanceRecord::where('user_id', $user->id)
                ->where('attendance_date', $today)
                ->where('confirmed_at', '>=', $now->copy()->subSeconds(30))
                ->exists();
            
            if ($recentConfirm) {
                return response()->json([
                    'message' => 'Please wait before confirming again.',
                    'error_code' => 'DUPLICATE_REQUEST'
                ], 429);
            }
        }

        // ============================================================
        // RULE 0.6: Time-in Window (Official Rule)
        // ============================================================
        // Check-in Window: Opens 18:00, Closes 01:00 (auto-absent), Unavailable 01:30
        // Shift Start: 23:00 (Official Time-in)
        // Grace Period: 15 minutes (23:00 - 23:15 = on-time)
        // Late: After 23:15
        // Shift End: 07:00 (next day)
        // Weekend: No work Saturday morning (Friday night ends Sat 07:00) and Sunday
        
        // ============================================================
        // RULE 0.6: Time-in Window (Dynamic based on Schedule)
        // ============================================================
        $baseDate = Carbon::parse($today);
        
        // Get Schedule Start Time from the Session (or default to 23:00 if missing)
        $scheduleTimeIn = $session->schedule ? $session->schedule->time_in : '23:00:00';
        $shiftStart = Carbon::parse($today . ' ' . $scheduleTimeIn);
        
        // Define Windows Relative to Shift Start
        // Mimic legacy logic: 23:00 Start -> 18:00 Open (-5h), 01:30 Close (+2.5h)
        $windowStart = $shiftStart->copy()->subHours(5);
        $windowClose = $shiftStart->copy()->addHours(2)->addMinutes(30);
        
        // Grace Period
        $gracePeriodEnd = $shiftStart->copy()->addMinutes($globalGracePeriod);
        
        // Shift End (Usually +8/9 hours, but we rely on schedule time_out)
        // This variable was unused in logic but useful for context
        // $shiftEnd = ...
        
        // ============================================================
        // WEEKEND CHECK: No work Saturday morning & Sunday
        // ============================================================
        // Night shift runs Mon-Fri nights only:
        // - Monday 23:00 -> Tuesday 07:00
        // - Tuesday 23:00 -> Wednesday 07:00
        // - Wednesday 23:00 -> Thursday 07:00
        // - Thursday 23:00 -> Friday 07:00
        // - Friday 23:00 -> Saturday 07:00 (LAST SHIFT)
        // - Saturday night: NO WORK (would end Sunday)
        // - Sunday night: NO WORK (would end Monday, but let admins decide to open)
        
        $dayOfWeek = $baseDate->dayOfWeek; // 0 = Sunday, 6 = Saturday
        
        // If today is Saturday (6) - no shift, as it would end Sunday
        if ($dayOfWeek === Carbon::SATURDAY) {
            return response()->json([
                'message' => 'No shift scheduled for Saturday nights.',
                'error_code' => 'NO_WEEKEND_SHIFT'
            ], 403);
        }
        
        // If today is Sunday (0) - no shift (admins can override by creating session)
        if ($dayOfWeek === Carbon::SUNDAY) {
            return response()->json([
                'message' => 'No shift scheduled for Sunday nights.',
                'error_code' => 'NO_WEEKEND_SHIFT'
            ], 403);
        }
        
        // VALIDATION: Too Early
        if ($now->lt($windowStart)) {
             return response()->json([
                'message' => 'Check-in opens at ' . $windowStart->format('h:i A'),
                'error_code' => 'TOO_EARLY'
            ], 403);
        }
        
        // VALIDATION: Check-in Closed (Strict 01:30 cutoff)
        if ($now->gt($windowClose)) {
             return response()->json([
                'message' => 'Check-in closed at ' . $windowClose->format('h:i A'),
                'error_code' => 'TOO_LATE'
            ], 403);
        }

        // ============================================================
        // RULE 1: Check if already has attendance record for THIS SESSION
        // ============================================================
        // Prioritize finding record by specific session first
        $latestRecord = AttendanceRecord::where('user_id', $user->id)
            ->where('session_id', $sessionId)
            ->first();
            
        // If not found by session, fall back to Date check (legacy / fail-safe)
        if (!$latestRecord) {
            $latestRecord = AttendanceRecord::where('user_id', $user->id)
                ->where('attendance_date', $today)
                ->orderBy('created_at', 'desc')
                ->first();
        }
        
        if ($latestRecord && !in_array($latestRecord->status, ['pending', 'absent'])) {
            // Case A: User is currently checked in (no time_out)
            if (is_null($latestRecord->time_out)) {
                return response()->json([
                    'message' => 'You are currently checked in. Please check out first.',
                    'error_code' => 'CURRENTLY_CHECKED_IN'
                ], 400);
            }

            // Case B: User has checked out, but Multi-Checkin is DISABLED
            if (!$allowMultiCheckin) {
                 return response()->json([
                    'message' => 'You have already completed your attendance for today.',
                    'error_code' => 'ALREADY_CHECKED_IN_TODAY'
                ], 400);
            }

            // Case C: User checked out, Multi-Checkin ENABLED -> Allow proceed
        }

        // ============================================================
        // RULE 2: Session must be active
        // ============================================================
        if ($session->status !== 'active') {
            return response()->json([
                'message' => 'This session is not accepting attendance confirmations.',
                'error_code' => 'SESSION_INACTIVE'
            ], 403);
        }

        // ============================================================
        // RULE 4: Determine status (present vs late)
        // ============================================================
        // Present: Check-in between 18:00 and 23:15 (includes 15-min grace period)
        // Late: Check-in after 23:15
        $status = 'present';
        $minutesLate = 0;
        
        // Check if after grace period (23:15) = LATE
        if ($now->gt($gracePeriodEnd)) {
            $status = 'late';
            // Calculate minutes late from grace period end
            $minutesLate = max(0, $gracePeriodEnd->diffInMinutes($now, false));
        }

        // ============================================================
        // RULE 5: Create or update attendance record
        // ============================================================
        // DB has unique (user_id, attendance_date): only one record per user per day.
        // When multi-checkin is enabled and user already has a record for today with time_out,
        // reuse (update) that record instead of creating to avoid duplicate key error.
        try {
            DB::beginTransaction();

            $record = null;
            
            // Case 1: Multi-checkin enabled and user already has a completed record (has time_out)
            if ($allowMultiCheckin && $latestRecord && $latestRecord->time_out) {
                $latestRecord->update([
                    'session_id' => $sessionId,
                    'time_in' => $now,
                    'time_out' => null,
                    'break_start' => null,
                    'break_end' => null,
                    'status' => $status,
                    'minutes_late' => (int) $minutesLate,
                    'hours_worked' => 0,
                    'ip_address' => $request->ip(),
                    'device_type' => $request->input('device_type'),
                    'device_name' => $request->input('device_name'),
                    'browser' => $request->input('browser'),
                    'os' => $request->input('os'),
                    'latitude' => $request->input('latitude'),
                    'longitude' => $request->input('longitude'),
                    'location_address' => $request->input('location_address'),
                    'location_city' => $request->input('location_city'),
                    'location_country' => $request->input('location_country'),
                    'confirmed_at' => $now,
                ]);
                $record = $latestRecord->fresh();
            }
            
            // Case 2: User has a pending/absent record for today - UPDATE it instead of creating new
            if (!$record && $latestRecord && in_array($latestRecord->status, ['pending', 'absent'])) {
                $latestRecord->update([
                    'session_id' => $sessionId,
                    'time_in' => $now,
                    'time_out' => null,
                    // Preserve existing break data if present (e.g. if break started before check-in, though that should be blocked)
                    'break_start' => $latestRecord->break_start, 
                    'break_end' => $latestRecord->break_end,
                    'status' => $status,
                    'minutes_late' => (int) $minutesLate,
                    'hours_worked' => 0,
                    'ip_address' => $request->ip(),
                    'device_type' => $request->input('device_type'),
                    'device_name' => $request->input('device_name'),
                    'browser' => $request->input('browser'),
                    'os' => $request->input('os'),
                    'latitude' => $request->input('latitude'),
                    'longitude' => $request->input('longitude'),
                    'location_address' => $request->input('location_address'),
                    'location_city' => $request->input('location_city'),
                    'location_country' => $request->input('location_country'),
                    'confirmed_at' => $now,
                ]);
                $record = $latestRecord->fresh();
            }
            
            // Case 3: Fallback - Update any existing record for today (handles race conditions/edge cases)
            if (!$record && $latestRecord) {
                // If we have any existing record for today but haven't handled it yet,
                // update it instead of creating a new one to avoid duplicate key error
                $latestRecord->update([
                    'session_id' => $sessionId,
                    'time_in' => $now,
                    'time_out' => null,
                    'break_start' => null,
                    'break_end' => null,
                    'status' => $status,
                    'minutes_late' => (int) $minutesLate,
                    'hours_worked' => 0,
                    'ip_address' => $request->ip(),
                    'device_type' => $request->input('device_type'),
                    'device_name' => $request->input('device_name'),
                    'browser' => $request->input('browser'),
                    'os' => $request->input('os'),
                    'latitude' => $request->input('latitude'),
                    'longitude' => $request->input('longitude'),
                    'location_address' => $request->input('location_address'),
                    'location_city' => $request->input('location_city'),
                    'location_country' => $request->input('location_country'),
                    'confirmed_at' => $now,
                ]);
                $record = $latestRecord->fresh();
            }
            
            // Case 4: No existing record at all - create new
            if (!$record) {
                $record = AttendanceRecord::create([
                    'session_id' => $sessionId,
                    'user_id' => $user->id,
                    'attendance_date' => $today,
                    'time_in' => $now,
                    'status' => $status,
                    'minutes_late' => (int) $minutesLate,
                    'ip_address' => $request->ip(),
                    'device_type' => $request->input('device_type'),
                    'device_name' => $request->input('device_name'),
                    'browser' => $request->input('browser'),
                    'os' => $request->input('os'),
                    'latitude' => $request->input('latitude'),
                    'longitude' => $request->input('longitude'),
                    'location_address' => $request->input('location_address'),
                    'location_city' => $request->input('location_city'),
                    'location_country' => $request->input('location_country'),
                    'confirmed_at' => $now,
                ]);
            }

            // ============================================================
            // NOTIFICATIONS: Late Arrival
            // ============================================================
            if ($status === 'late') {
                $lateAlerts = filter_var(Setting::where('key', 'late_alerts')->value('value'), FILTER_VALIDATE_BOOLEAN);
                if ($lateAlerts) {
                    $admins = \App\Models\User::where('role', 'admin')->get();
                    \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\LateArrivalNotification($record));
                }
            }

            AuditLog::log(
                'confirm_attendance',
                "{$user->first_name} {$user->last_name} confirmed attendance ({$status})",
                AuditLog::STATUS_SUCCESS,
                $user->id,
                'AttendanceRecord',
                $record->id
            );

            DB::commit();

            // Broadcast real-time update to all connected clients
            event(new AttendanceUpdated($record, 'confirmed'));

            return response()->json([
                'message' => 'Attendance confirmed successfully',
                'record' => $record->load(['session.schedule', 'user']),
            ]);

        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            Log::error('Database Error in Confirm: ' . $e->getMessage());
            
            // Check for duplicate key error
            if (str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), 'UNIQUE constraint')) {
                return response()->json([
                    'message' => 'You already have an attendance record for today. Please refresh the page.',
                    'error_code' => 'DUPLICATE_RECORD',
                    'error' => $e->getMessage()
                ], 409);
            }
            
            return response()->json([
                'message' => 'Database error occurred. Please try again.',
                'error_code' => 'DATABASE_ERROR',
                'error' => $e->getMessage()
            ], 500);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Confirmation Error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to confirm attendance. Please try again.',
                'error_code' => 'SYSTEM_ERROR',
                'error' => $e->getMessage(),
                '_debug' => [
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ]
            ], 500);
        }
    }

    /**
     * Get employee's own attendance records.
     */
    public function myRecords(Request $request)
    {
        $userId = $request->user()->id;
        \Illuminate\Support\Facades\Log::info("Fetching myRecords for User ID: {$userId}");

        $query = AttendanceRecord::with(['session.schedule'])
            ->where('user_id', $userId);

        if ($request->has('status') && $request->status && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('attendance_date', [$request->start_date, $request->end_date]);
        }

        if ($request->has('month') && $request->has('year')) {
            $query->whereMonth('attendance_date', $request->month)
                  ->whereYear('attendance_date', $request->year);
        }

        $count = $query->count();
        \Illuminate\Support\Facades\Log::info("Found {$count} records for User ID: {$userId}");

        return response()->json($query->orderBy('attendance_date', 'desc')->paginate($request->get('per_page', 20)));
    }

    /**
     * Check if user can confirm attendance for a session.
     * 
     * DATE-SCOPED: Only checks today's date, not previous days.
     */
    public function canConfirm(Request $request, $sessionId)
    {
        $session = AttendanceSession::with('schedule')->find($sessionId);
        $user = $request->user();
        $today = $this->getToday();

        // Check settings
        $allowMultiCheckin = filter_var(Setting::where('key', 'allow_multi_checkin')->value('value'), FILTER_VALIDATE_BOOLEAN);

        // Check if already has attendance for TODAY
        $latestRecord = AttendanceRecord::where('user_id', $user->id)
            ->where('attendance_date', $today)
            ->orderBy('created_at', 'desc')
            ->first();
        
        if ($latestRecord && !in_array($latestRecord->status, ['pending', 'absent'])) {
             // If currently checked in, cannot check in again
            if (is_null($latestRecord->time_out)) {
                return response()->json([
                    'can_confirm' => false, 
                    'reason' => 'currently_checked_in',
                    'message' => 'You must check out first'
                ]);
            }

            // If checked out, check setting
            if (!$allowMultiCheckin) {
                return response()->json([
                    'can_confirm' => false, 
                    'reason' => 'already_confirmed',
                    'message' => 'You have already completed attendance today'
                ]);
            }
        }

        if (!$session) {
            return response()->json([
                'can_confirm' => false, 
                'reason' => 'session_not_found',
                'message' => 'Session not found'
            ]);
        }

        if ($session->status !== 'active') {
            return response()->json([
                'can_confirm' => false, 
                'reason' => 'session_inactive',
                'message' => 'Session is not active'
            ]);
        }



        // Time Constraints (Official Rules - Dynamic)
        $baseDate = Carbon::parse($today);
        
        $scheduleTimeIn = $session->schedule ? $session->schedule->time_in : '23:00:00';
        $shiftStart = Carbon::parse($today . ' ' . $scheduleTimeIn);
        
        $windowStart = $shiftStart->copy()->subHours(5);
        $windowClose = $shiftStart->copy()->addHours(2)->addMinutes(30);
        
        $now = Carbon::now();
        
        // Weekend Check
        $dayOfWeek = $baseDate->dayOfWeek;
        if ($dayOfWeek === Carbon::SATURDAY || $dayOfWeek === Carbon::SUNDAY) {
            return response()->json([
                'can_confirm' => false,
                'reason' => 'no_weekend_shift',
                'message' => 'No shift scheduled for weekends'
            ]);
        }

        if ($now->lt($windowStart)) {
            return response()->json([
                'can_confirm' => false,
                'reason' => 'too_early',
                'message' => 'Check-in opens at ' . $windowStart->format('H:i')
            ]);
        }
        
        if ($now->gt($windowClose)) {
            return response()->json([
                'can_confirm' => false,
                'reason' => 'too_late',
                'message' => 'Check-in closed at ' . $windowClose->format('H:i')
            ]);
        }

        return response()->json(['can_confirm' => true]);
    }

    /**
     * Get attendance records by session.
     */
    public function bySession($sessionId)
    {
        $records = AttendanceRecord::with(['user' => function ($q) {
                $q->withTrashed();
            }])
                                   ->where('session_id', $sessionId)
                                   ->orderBy('time_in', 'asc')
                                   ->get();

        return response()->json($records);
    }

    /**
     * Get attendance records by employee.
     */
    public function byEmployee($employeeId, Request $request)
    {
        $query = AttendanceRecord::with(['session.schedule'])
                                 ->where('user_id', $employeeId);

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('attendance_date', [$request->start_date, $request->end_date]);
        }

        return response()->json($query->orderBy('attendance_date', 'desc')->paginate(20));
    }

    /**
     * Check-Out for an attendance record.
     * 
     * CRITICAL DATE-SCOPED LOGIC:
     * - Can only check out for TODAY's attendance
     * - Yesterday's record cannot be checked out today
     */
    public function checkOut(Request $request, AttendanceRecord $attendanceRecord)
    {
        $today = $this->getToday();
        $user = $request->user();
        $now = Carbon::now(); // CRITICAL: Define $now early as it's used throughout

        // Verify ownership
        if ($attendanceRecord->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // CRITICAL: Validation for date scope
        // We allow checking out records from Today, Yesterday, or even slightly older if they were left open.
        // The strict "same day" check caused issues with the 2PM day-boundary logic.
        // New Logic: Allow checkout if record is within the last 48 hours.
        
        $recordDate = $attendanceRecord->attendance_date->toDateString();
        $recordCarbon = Carbon::parse($recordDate);
        $todayCarbon = Carbon::parse($today);
        
        // Use absolute difference to handle edge cases around the 14:00 split
        $daysDiff = $recordCarbon->diffInDays($todayCarbon, false); // can be negative if record is "future" (unlikely) or positive "past"

        // Allow if diff is between -1 and 2 (covering yesterday, today, and "tomorrow" edge cases)
        if ($daysDiff > 2 || $daysDiff < -1) {
             return response()->json([
                'message' => 'Cannot check out. This record is from ' . $attendanceRecord->attendance_date->format('M d, Y') . ' and is too old.',
                'error_code' => 'RECORD_TOO_OLD'
            ], 400);
        }

        if ($attendanceRecord->time_out) {
            return response()->json([
                'message' => 'Already checked out',
                'error_code' => 'ALREADY_CHECKED_OUT'
            ], 400);
        }

        // CRITICAL: Cannot check out if never checked in (e.g. absent/pending records)
        if (!$attendanceRecord->time_in) {
            return response()->json([
                'message' => 'Cannot check out without checking in first',
                'error_code' => 'NOT_CHECKED_IN'
            ], 400);
        }

        // AUTO-END BREAK: If on break (EmployeeBreak logic), end it now
        $activeBreak = $attendanceRecord->activeBreak;
        if ($activeBreak) {
             $activeBreak->update([
                 'break_end' => $now,
                 'duration_minutes' => (int) Carbon::parse($activeBreak->break_start)->diffInMinutes($now)
             ]);
             // Sync legacy columns just in case
             $attendanceRecord->break_end = $now;
        } elseif ($attendanceRecord->break_start && !$attendanceRecord->break_end) {
             // Fallback for purely legacy records
             $attendanceRecord->break_end = $now;
        }

        $attendanceRecord->time_out = $now;
        $attendanceRecord->save(); // Save time_out immediately to prevent race conditions
        
        // Calculate hours worked (subtracting break)
        $timeIn = Carbon::parse($attendanceRecord->time_in);
        $grossMinutes = $now->diffInMinutes($timeIn);
        
        // Calculate Total Break Duration from EmployeeBreak table (Single Source of Truth)
        // This ensures multiple breaks and admin-edited breaks are accounted for.
        $totalBreakMinutes = $attendanceRecord->breaks()->sum('duration_minutes');
        
        // Fallback: If no EmployeeBreaks found but Legacy columns exist (Old records), use Legacy
        if ($totalBreakMinutes == 0 && $attendanceRecord->break_start && $attendanceRecord->break_end) {
             $start = Carbon::parse($attendanceRecord->break_start);
             $end = Carbon::parse($attendanceRecord->break_end);
             $totalBreakMinutes = $end->diffInMinutes($start);
        }

        $netMinutes = max(0, $grossMinutes - $totalBreakMinutes);
        $hoursWorked = round($netMinutes / 60, 2);
        
        $attendanceRecord->hours_worked = $hoursWorked;

        // ============================================================
        // OVERTIME CALCULATION
        // ============================================================
        $allowOvertime = filter_var(\App\Models\Setting::where('key', 'allow_overtime')->value('value'), FILTER_VALIDATE_BOOLEAN);
        
        if ($allowOvertime && $attendanceRecord->session && $attendanceRecord->session->schedule) {
            $schedule = $attendanceRecord->session->schedule;
            // Determine Shift End (handle overnight)
            $dateStr = $attendanceRecord->attendance_date->format('Y-m-d');
            $shiftStart = Carbon::parse($dateStr . ' ' . $schedule->time_in);
            $shiftEnd = Carbon::parse($dateStr . ' ' . $schedule->time_out);
            
            if ($shiftEnd->lt($shiftStart)) {
                $shiftEnd->addDay();
            }

            // Only calculate OT if checkout is AFTER shift end
            if ($now->gt($shiftEnd)) {
                $rawOtMinutes = $shiftEnd->diffInMinutes($now);
                
                // Get OT Rules
                $minOtMinutes = (int) (\App\Models\Setting::where('key', 'min_overtime_minutes')->value('value') ?: 60);
                $roundingRule = \App\Models\Setting::where('key', 'ot_rounding')->value('value') ?: 'none';
                $requireApproval = filter_var(\App\Models\Setting::where('key', 'require_ot_approval')->value('value'), FILTER_VALIDATE_BOOLEAN);

                if ($rawOtMinutes >= $minOtMinutes) {
                    $finalOtMinutes = $rawOtMinutes;

                    // Apply Rounding
                    // Example: 'down_30' -> floor to nearest 30 mins, 'up_30' -> ceil, 'nearest_15', etc.
                    // For now supporting 'none', 'down_15', 'down_30', 'down_60'
                    if (str_starts_with($roundingRule, 'down_')) {
                        $interval = (int) explode('_', $roundingRule)[1];
                        if ($interval > 0) {
                            $finalOtMinutes = floor($rawOtMinutes / $interval) * $interval;
                        }
                    }

                    $attendanceRecord->overtime_minutes = $finalOtMinutes;
                    $attendanceRecord->overtime_status = $requireApproval ? 'pending' : 'approved';
                }
            }
        }

        $attendanceRecord->save();

        // Broadcast real-time update
        event(new AttendanceUpdated($attendanceRecord, 'checked_out'));

        AuditLog::log(
            'check_out',
            "{$user->first_name} checked out",
            AuditLog::STATUS_SUCCESS,
            $user->id,
            'AttendanceRecord',
            $attendanceRecord->id
        );

        return response()->json([
            'message' => 'Checked out successfully',
            'record' => $attendanceRecord
        ]);
    }

    /**
     * Start a break (LEGACY route - now enforces 12PM-1PM policy).
     * 
     * DATE-SCOPED: Only allowed for TODAY's attendance.
     * TIME-SCOPED: Only allowed between 12:00 PM and 1:00 PM.
     */
    public function startBreak(Request $request, AttendanceRecord $attendanceRecord)
    {
        $today = $this->getToday();
        $now = Carbon::now();
        $currentTime = $now->format('H:i:s');
        $user = $request->user();

        if ($attendanceRecord->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // CRITICAL: Verify this is TODAY's record
        if ($attendanceRecord->attendance_date->toDateString() !== $today) {
            return response()->json([
                'message' => 'Cannot start break for a different day',
                'error_code' => 'WRONG_DATE'
            ], 400);
        }

        if ($attendanceRecord->time_out) {
            return response()->json([
                'message' => 'Cannot start break after check out',
                'error_code' => 'ALREADY_CHECKED_OUT'
            ], 400);
        }

        // ============================================================
        // DYNAMIC BREAK WINDOW BASED ON SCHEDULE
        // ============================================================
        // ============================================================
        // DYNAMIC BREAK WINDOW BASED ON SETTINGS
        // ============================================================
        $attendanceRecord->load('session');
        $session = $attendanceRecord->session;
        $sessionDate = $session->date->format('Y-m-d');
        
        // Fetch Break Window Settings
        $breakStartStr = Setting::where('key', 'break_start_window')->value('value') ?: '00:00';
        $breakEndStr = Setting::where('key', 'break_end_window')->value('value') ?: '01:00';
        
        // Parse Window Times relative to Session Date
        $breakStartDt = Carbon::parse($sessionDate . ' ' . $breakStartStr);
        $breakEndDt = Carbon::parse($sessionDate . ' ' . $breakEndStr);
        
        // Handle overnight window (e.g. 23:00 to 02:00)
        // If end time is before start time, assume it ends the next day
        if ($breakEndDt->lt($breakStartDt)) {
            $breakEndDt->addDay();
        }

        // Also handle if the Session itself was overnight and we are currently in "next day" real time
        // If the shift started yesterday 22:00, and break is 02:00, the $sessionDate is yesterday.
        // so 02:00 parsed with yesterday's date is "yesterday 02:00" (passed).
        // We need to check if the Break Window should be projected to the "next day" relative to session date.
        // Logic: If BreakStart is significantly before ShiftStart (e.g. Shift 22:00, Break 02:00), it's likely next day.
        $schedule = $session->schedule;
        if ($schedule) {
            $shiftStart = Carbon::parse($sessionDate . ' ' . $schedule->time_in);
            // If break start is more than 12 hours earlier than shift start, it's probably next day
            // Or simpler: If shift is overnight and break start < shift start
            if ($schedule->is_overnight && $breakStartDt->lt($shiftStart)) {
                $breakStartDt->addDay();
                $breakEndDt->addDay();
            }
        }

        if ($now->lt($breakStartDt)) {
            return response()->json([
                'message' => 'Break time opens at ' . $breakStartDt->format('h:i A'),
                'error_code' => 'TOO_EARLY'
            ], 403);
        }

        if ($now->gte($breakEndDt)) {
            return response()->json([
                'message' => 'Break check-in closed at ' . $breakEndDt->format('h:i A'),
                'error_code' => 'TOO_LATE'
            ], 403);
        }

        // Check if break limit reached
        $maxBreaks = (int) (Setting::where('key', 'max_breaks')->value('value') ?: 1);
        $todaysBreaksCount = \App\Models\EmployeeBreak::where('user_id', $user->id)
            ->where('break_date', $today)
            ->count();

        if ($todaysBreaksCount >= $maxBreaks) {
            return response()->json([
                'message' => "You have already used your allowed breaks ($maxBreaks) for today.",
                'error_code' => 'BREAK_LIMIT_REACHED'
            ], 400);
        }

        if ($attendanceRecord->break_start && !$attendanceRecord->break_end) {
            return response()->json([
                'message' => 'Already on break',
                'error_code' => 'ALREADY_ON_BREAK'
            ], 400);
        }

        // Start break
        $attendanceRecord->break_start = $now;
        $attendanceRecord->break_end = null;
        $attendanceRecord->save();

        // Also create entry in new breaks table
        \App\Models\EmployeeBreak::create([
            'attendance_id' => $attendanceRecord->id,
            'user_id' => $user->id,
            'break_date' => $today,
            'break_start' => $now,
        ]);

        // Broadcast real-time break update
        event(new BreakUpdated($attendanceRecord, 'started'));

        return response()->json([
            'message' => 'Break started',
            'record' => $attendanceRecord
        ]);
    }

    /**
     * End a break (LEGACY route - syncs with new breaks table).
     * 
     * DATE-SCOPED: Only allowed for TODAY's attendance.
     */
    public function endBreak(Request $request, AttendanceRecord $attendanceRecord)
    {
        $today = $this->getToday();
        $now = Carbon::now();
        $user = $request->user();

        if ($attendanceRecord->user_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // CRITICAL: Verify this is TODAY's record
        if ($attendanceRecord->attendance_date->toDateString() !== $today) {
            return response()->json([
                'message' => 'Cannot end break for a different day',
                'error_code' => 'WRONG_DATE'
            ], 400);
        }

        if (!$attendanceRecord->break_start) {
            return response()->json([
                'message' => 'Break was not started',
                'error_code' => 'NO_BREAK_STARTED'
            ], 400);
        }

        if ($attendanceRecord->break_end) {
            return response()->json([
                'message' => 'Break already ended',
                'error_code' => 'BREAK_ALREADY_ENDED'
            ], 400);
        }

        // End break in attendance record
        $attendanceRecord->break_end = $now;
        $attendanceRecord->save();

        // Also update entry in new breaks table
        $breakRecord = \App\Models\EmployeeBreak::where('attendance_id', $attendanceRecord->id)
            ->where('break_date', $today)
            ->whereNull('break_end')
            ->first();

        if ($breakRecord) {
            $breakRecord->break_end = $now;
            $duration = Carbon::parse($breakRecord->break_start)->diffInMinutes($now);
            $breakRecord->duration_minutes = $duration;
            $breakRecord->save();

            // ============================================================
            // NOTIFICATIONS: Break Overtime
            // ============================================================
            $breakLimit = (int) (Setting::where('key', 'break_duration')->value('value') ?: 60);

            if ($duration > $breakLimit) {
                $breakAlerts = filter_var(Setting::where('key', 'break_alerts')->value('value'), FILTER_VALIDATE_BOOLEAN);
                if ($breakAlerts) {
                    $excess = $duration - $breakLimit;
                    $admins = \App\Models\User::where('role', 'admin')->get();
                    \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\BreakExceededNotification($attendanceRecord, $excess));
                }

                // ============================================================
                // BREAK OVERTIME PENALTY
                // ============================================================
                $breakPenalty = filter_var(Setting::where('key', 'break_penalty')->value('value'), FILTER_VALIDATE_BOOLEAN);
                if ($breakPenalty) {
                    $excess = $duration - $breakLimit;
                    // Store penalty minutes on the break record
                    $breakRecord->penalty_minutes = $excess;
                    $breakRecord->save();
                    
                    // Update attendance record with penalty note
                    $attendanceRecord->notes = ($attendanceRecord->notes ? $attendanceRecord->notes . ' | ' : '') 
                                              . "Break overtime penalty: {$excess} min deducted";
                    $attendanceRecord->save();
                }
            }
        }

        // Broadcast real-time break update
        event(new BreakUpdated($attendanceRecord, 'ended'));

        return response()->json([
            'message' => 'Break ended',
            'record' => $attendanceRecord
        ]);
    }

    /**
     * Get active break status.
     */
    public function getActiveBreak(AttendanceRecord $attendanceRecord)
    {
        if ($attendanceRecord->break_start && !$attendanceRecord->break_end) {
            $start = Carbon::parse($attendanceRecord->break_start);
            $autoResume = filter_var(Setting::where('key', 'auto_resume')->value('value'), FILTER_VALIDATE_BOOLEAN);
            $breakDuration = (int) (Setting::where('key', 'break_duration')->value('value') ?: 60);

            if ($autoResume && Carbon::now()->diffInMinutes($start) > $breakDuration) {
                // Auto-end
                $endTime = $start->copy()->addMinutes($breakDuration);
                $attendanceRecord->break_end = $endTime;
                $attendanceRecord->save();
                
                // Sync with EmployeeBreak table
                \App\Models\EmployeeBreak::where('attendance_id', $attendanceRecord->id)
                    ->whereNull('break_end')
                    ->update(['break_end' => $endTime, 'duration_minutes' => $breakDuration]);

                return response()->json(['active' => false]);
            }

            return response()->json([
                'active' => true,
                'start_time' => $attendanceRecord->break_start
            ]);
        }

        return response()->json(['active' => false]);
    }

    /**
     * Admin update of attendance record.
     */
    public function update(Request $request, AttendanceRecord $attendanceRecord)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'nullable|string|in:present,late,absent,excused,left_early',
            'time_in' => 'nullable|date',
            'time_out' => 'nullable|date',
            'break_start' => 'nullable|date',
            'break_end' => 'nullable|date',
            'reason' => 'required|string|min:5',
        ]);

        $changes = [];

        if ($request->has('status')) {
            $attendanceRecord->status = $request->status;
            $changes[] = "status to {$request->status}";
        }

        if ($request->has('time_in')) {
            $attendanceRecord->time_in = $request->time_in ? Carbon::parse($request->time_in) : null;
            $changes[] = "time_in to {$request->time_in}";
        }

        if ($request->has('time_out')) {
            $attendanceRecord->time_out = $request->time_out ? Carbon::parse($request->time_out) : null;
            $changes[] = "time_out to {$request->time_out}";
        }

        if ($request->has('break_start')) {
            $attendanceRecord->break_start = $request->break_start ? Carbon::parse($request->break_start) : null;
            $changes[] = "break_start to {$request->break_start}";
        }

        if ($request->has('break_end')) {
            $attendanceRecord->break_end = $request->break_end ? Carbon::parse($request->break_end) : null;
            $changes[] = "break_end to {$request->break_end}";
        }

        // Recalculate hours worked if times changed
        if ($attendanceRecord->time_in && $attendanceRecord->time_out) {
            $timeIn = Carbon::parse($attendanceRecord->time_in);
            $timeOut = Carbon::parse($attendanceRecord->time_out);
            $diffInMinutes = $timeOut->diffInMinutes($timeIn);
            
            if ($attendanceRecord->break_start && $attendanceRecord->break_end) {
                $breakStart = Carbon::parse($attendanceRecord->break_start);
                $breakEnd = Carbon::parse($attendanceRecord->break_end);
                $breakMinutes = $breakEnd->diffInMinutes($breakStart);
                $diffInMinutes = max(0, $diffInMinutes - $breakMinutes);
            }
            
            $attendanceRecord->hours_worked = round($diffInMinutes / 60, 2);
        }

        $attendanceRecord->save();

        AuditLog::log(
            'update_attendance',
            "Admin {$request->user()->first_name} updated record: " . implode(', ', $changes) . ". Reason: {$request->reason}",
            AuditLog::STATUS_SUCCESS,
            $request->user()->id,
            'AttendanceRecord',
            $attendanceRecord->id
        );

        return response()->json([
            'message' => 'Attendance record updated successfully',
            'record' => $attendanceRecord->load(['session.schedule', 'user'])
        ]);
    }

    public function destroy(AttendanceRecord $attendanceRecord)
    {
        // Audit Log
        AuditLog::log(
            'delete_attendance',
            "Admin deleted attendance record for " . ($attendanceRecord->user ? $attendanceRecord->user->full_name : 'Unknown') . " ({$attendanceRecord->attendance_date->toDateString()})",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'AttendanceRecord',
            $attendanceRecord->id,
            $attendanceRecord->toArray(),
            null
        );

        $attendanceRecord->delete();

        return response()->json(['message' => 'Attendance record deleted successfully']);
    }

    /**
     * Get display status for an attendance record.
     */
    public function getDisplayStatus(AttendanceRecord $attendanceRecord)
    {
        $isOnBreak = $attendanceRecord->break_start && !$attendanceRecord->break_end;
        
        if ($isOnBreak) {
            $start = Carbon::parse($attendanceRecord->break_start);
            $autoResume = filter_var(Setting::where('key', 'auto_resume')->value('value'), FILTER_VALIDATE_BOOLEAN);
            $breakDuration = (int) (Setting::where('key', 'break_duration')->value('value') ?: 60);

            if ($autoResume && Carbon::now()->diffInMinutes($start) > $breakDuration) {
                // Auto-end
                $endTime = $start->copy()->addMinutes($breakDuration);
                $attendanceRecord->break_end = $endTime;
                $attendanceRecord->save();
                
                 // Sync with EmployeeBreak table
                \App\Models\EmployeeBreak::where('attendance_id', $attendanceRecord->id)
                    ->whereNull('break_end')
                    ->update(['break_end' => $endTime, 'duration_minutes' => $breakDuration]);

                $isOnBreak = false;
            }
        }
        
        return response()->json([
            'original_status' => $attendanceRecord->status,
            'display_status' => $isOnBreak ? 'on_break' : $attendanceRecord->status,
            'is_on_break' => $isOnBreak,
            'break_start' => $attendanceRecord->break_start,
            'break_end' => $attendanceRecord->break_end,
        ]);
    }

    /**
     * Get today's attendance status for the current user.
     * 
     * CRITICAL DATE-SCOPED LOGIC:
     * - ONLY looks at TODAY's date
     * - Yesterday's attendance NEVER affects today
     * - Each day is a fresh cycle
     */
    public function getTodayStatus(Request $request)
    {
        $user = $request->user();
        $today = $this->getToday();

        // Find today's active session
        $session = AttendanceSession::with('schedule')
                                    ->where('status', 'active')
                                    ->whereDate('date', $today)
                                    ->first();

        // FALLBACK: Check yesterday's active session (for overnight shifts)
        if (!$session) {
            $yesterday = Carbon::yesterday()->toDateString();
            $prevSession = AttendanceSession::with('schedule')
                ->where('status', 'active')
                ->whereDate('date', $yesterday)
                ->first();

            if ($prevSession && $prevSession->schedule) {
                // Check if this previous session is an overnight shift that covers NOW
                $schedule = $prevSession->schedule;
                $scheduleTimeIn = $schedule->time_in;
                $scheduleTimeOut = $schedule->time_out;
                
                $shiftStart = Carbon::parse($yesterday . ' ' . $scheduleTimeIn);
                $shiftEnd = Carbon::parse($yesterday . ' ' . $scheduleTimeOut);
                
                if ($shiftEnd->lt($shiftStart)) {
                    $shiftEnd->addDay(); // Overnight shift ending today
                }

                // If currently within this overnight shift window (including grace/late buffer)
                // We add buffer to shiftEnd just in case, but strictly strict check-in closes at shiftEnd
                $now = Carbon::now();
                if ($now->lte($shiftEnd)) {
                    $session = $prevSession;
                    // Use yesterday as the attendance date context logic if needed, 
                    // but for 'getTodayStatus', returning this session allows the UI to show check-in
                }
            }
        }

        if (!$session) {
            return response()->json([
                'has_record' => false,
                'message' => 'No active session for today',
                'session_status' => 'inactive',
                'attendance_date' => $today
            ]);
        }

        Log::info("getTodayStatus: User {$user->id}, Date {$today}, Session {$session->id}");

        // CRITICAL: Only get TODAY's record by DATE, not session
        $record = $this->getTodayAttendance($user->id);

        if (!$record) {
            $canCheckIn = true;
            $message = 'You have not checked in yet';

            // Check time constraints
            if ($session->schedule) {
                $now = Carbon::now();
                $scheduleTimeIn = $session->schedule->time_in;
                $scheduleTimeOut = $session->schedule->time_out;
                
                $shiftStart = Carbon::parse($session->date->format('Y-m-d') . ' ' . $scheduleTimeIn);
                $shiftEnd = Carbon::parse($session->date->format('Y-m-d') . ' ' . $scheduleTimeOut);
                
                if ($shiftEnd->lt($shiftStart)) {
                    $shiftEnd->addDay();
                }
                
                if ($now->lt($shiftStart)) {
                    $canCheckIn = false;
                    $message = 'Check-in opens at ' . $shiftStart->format('h:i A');
                } elseif ($now->gt($shiftEnd)) {
                    $canCheckIn = false;
                    $message = 'Check-in closed at ' . Carbon::parse($scheduleTimeOut)->format('h:i A');
                }
            }

            return response()->json([
                'has_record' => false,
                'session_id' => $session->id,
                'session_status' => 'active',
                'can_check_in' => $canCheckIn,
                'message' => $message,
                'attendance_date' => $today
            ]);
        }

        // Determine display status
        $isOnBreak = $record->break_start && !$record->break_end;
        $breakRemainingSeconds = 0;

        if ($isOnBreak) {
            $breakStart = Carbon::parse($record->break_start);
            $breakDurationSeconds = Carbon::now()->diffInSeconds($breakStart);
            $maxBreakSeconds = 3600; // 1 hour
            
            if ($breakDurationSeconds > $maxBreakSeconds) {
                $record->break_end = $breakStart->copy()->addSeconds($maxBreakSeconds);
                $record->save();
                
                $isOnBreak = false;
                $breakRemainingSeconds = 0;
            } else {
                $breakRemainingSeconds = max(0, $maxBreakSeconds - $breakDurationSeconds);
            }
        }

        return response()->json([
            'has_record' => true,
            'record_id' => $record->id,
            'session_id' => $session->id,
            'original_status' => $record->status,
            'display_status' => $isOnBreak ? 'on_break' : $record->status,
            'is_on_break' => $isOnBreak,
            'break_remaining_seconds' => $breakRemainingSeconds,
            'time_in' => $record->time_in,
            'time_out' => $record->time_out,
            'break_start' => $record->break_start,
            'break_end' => $record->break_end,
            'has_checked_out' => !is_null($record->time_out),
            'can_start_break' => $record->time_in && !$record->time_out && !$isOnBreak,
            'can_end_break' => $isOnBreak,
            'can_check_out' => $record->time_in && !$record->time_out && !$isOnBreak,
            'attendance_date' => $today
        ]);
    }
}
