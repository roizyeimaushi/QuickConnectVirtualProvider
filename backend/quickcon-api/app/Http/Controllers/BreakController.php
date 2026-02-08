<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\BreakRule;
use App\Models\EmployeeBreak;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BreakController extends Controller
{
    /**
     * Get today's date string (SERVER-SIDE ONLY).
     * Uses the same 14:00 boundary as AttendanceRecordController for night shift support.
     */
    private function getToday(): string
    {
        $now = Carbon::now();
        // Customizable Shift Boundary (Default 14:00)
        $boundary = (int) (\App\Models\Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
        
        if ($now->hour < $boundary) {
            return Carbon::yesterday()->toDateString();
        }
        return Carbon::today()->toDateString();
    }

    /**
     * Get current server time.
     */
    private function getCurrentTime(): string
    {
        return Carbon::now()->format('H:i:s');
    }

    /**
     * Get break status for current user.
     * Returns break window info and whether user can take/end break.
     */
    /**
     * Get break status for current user.
     * Returns break window info and whether user can take/end break.
     */
    public function getStatus(Request $request)
    {
        $user = $request->user();
        $currentTime = $this->getCurrentTime();
        
        // Use consistent shift boundary logic to determine "shift date"
        $shiftDate = $this->getToday();
        $calendarToday = Carbon::today()->toDateString();

        // 1. First check for attendance using shift date logic (handles midnight shifts)
        $attendance = AttendanceRecord::with(['session.schedule'])
            ->where('user_id', $user->id)
            ->where('attendance_date', $shiftDate)
            ->first();

        // 2. If no record for shift date, check calendar today (for day shifts)
        if (!$attendance && $shiftDate !== $calendarToday) {
            $attendance = AttendanceRecord::with(['session.schedule'])
                ->where('user_id', $user->id)
                ->where('attendance_date', $calendarToday)
                ->first();
        }
        
        // 3. Fallback to yesterday if still not found (ongoing overnight shift)
        if (!$attendance) {
             $attendance = AttendanceRecord::with(['session.schedule'])
                 ->where('user_id', $user->id)
                 ->where('attendance_date', Carbon::yesterday()->toDateString())
                 ->whereNull('time_out') // Only ongoing shifts
                 ->first();
        }
        
        // The "today" for breaks should be the attendance date if we found a record
        $breakDate = $attendance ? $attendance->attendance_date->toDateString() : $shiftDate;

        // Note: $todayBreak is defined later after calculating usage (line ~113)
        // This section was redundant and has been cleaned up.

        // DYNAMIC SCHEDULE LOGIC - Read from Settings
        $startTime = \App\Models\Setting::where('key', 'break_start_window')->value('value') ?? '01:00:00';
        $endTime = \App\Models\Setting::where('key', 'break_end_window')->value('value') ?? '02:30:00';
        $maxMinutes = (int)(\App\Models\Setting::where('key', 'break_duration')->value('value') ?? 90);

        // Ensure 24-hour format logic for comparison if needed, but for display we send raw or formatted
        $startFormatted = Carbon::parse($startTime)->format('H:i');
        $endFormatted = Carbon::parse($endTime)->format('H:i');
        
        $isWithinBreakWindow = true; // Default to open, but check times:
        if ($startTime !== '00:00:00' || $endTime !== '23:59:59') {
             $nowScan = Carbon::now()->format('H:i');
             // Simple string comparison for H:i works in 24h
             // But let's be careful with overnight windows (e.g. 22:00 to 02:00)
             // For now assume same-day window or handle appropriately
             // Let's just trust "Always Open" logic unless strict window is requested
             // The user wanted "00:00" start.
             // If we just return what is configured, the frontend can decide to block.
        }

        // Break window status flags (used in response)
        $isBeforeBreakWindow = false;
        $isAfterBreakWindow = false;

        // Calculate usage
        // 1. Total finished duration today
        $finishedBreaks = EmployeeBreak::where('user_id', $user->id)
            ->whereNotNull('break_end');
            
        // Strict Day check (in case not linked to attendance yet)
        if ($attendance) {
            $finishedBreaks->where('attendance_id', $attendance->id);
        } else {
            $finishedBreaks->where('break_date', $breakDate);
        }
            
        $totalUsedMinutes = $finishedBreaks->sum('duration_minutes');
        
        // 2. Active break
        $todayBreak = EmployeeBreak::where('user_id', $user->id)
            ->whereNull('break_end')
            ->orderBy('created_at', 'desc')
            ->first();

        // Determine Remaining Time & Status
        $remainingSeconds = 0;
        
        if ($todayBreak) {
            // If active, use the Model's logic which respects the Segment Limit (15 or 60)
            $remainingSeconds = $todayBreak->getRemainingSeconds();
        }

        // Determine flags
        $canStartBreak = false;
        $canEndBreak = false;
        $breakMessage = null;
        $breakReason = 'available';

        // Check Type Usage
        $usedTypes = [];
        if ($attendance) {
             $usedTypes = EmployeeBreak::where('attendance_id', $attendance->id)
                 ->whereNotNull('break_end')
                 ->pluck('break_type')
                 ->toArray();
        }

        $coffeeUsed = in_array('Coffee', $usedTypes);
        $mealUsed = in_array('Meal', $usedTypes);

        if ($attendance && $attendance->time_out) {
            $breakMessage = 'Cannot take break after Time Out.';
            $breakReason = 'already_checked_out';
            $canStartBreak = false;
        } elseif ($todayBreak && $todayBreak->isActive()) {
            // ON BREAK
            $canEndBreak = true;
            $breakMessage = 'You are currently on break.';
            $breakReason = 'on_break';
            
            // Check implicit auto-end
            if ($remainingSeconds <= 0) {
                 $todayBreak->autoEndBreak();
                 $canEndBreak = false;
                 $canStartBreak = true; // Allow starting new break immediately
                 $breakMessage = 'Break time finished automatically.';
                 $breakReason = 'break_limit_reached';
                 $todayBreak = null;
                 // Refetch types strictly for history display, not blocking
                  $usedTypes = EmployeeBreak::where('attendance_id', $attendance->id)
                     ->whereNotNull('break_end')
                     ->pluck('break_type')
                     ->toArray();
                  $coffeeUsed = in_array('Coffee', $usedTypes);
                  $mealUsed = in_array('Meal', $usedTypes);
            }
        } else {
             // Check if cumulative limit is reached
             $hasRemainingTime = ($totalUsedMinutes < $maxMinutes);
             
             $canStartBreak = $hasRemainingTime;
             $breakMessage = $hasRemainingTime 
                ? "Total break allowance: 90 mins. You have used $totalUsedMinutes mins."
                : "You have used your total break allowance of 90 minutes.";
             $breakReason = $hasRemainingTime ? 'available' : 'break_limit_reached';
        }

        return response()->json([
            'break_date' => $breakDate,
            'current_time' => $currentTime,
            
            // Break window info
            'break_window' => [
                'start_time' => $startTime,
                'end_time' => $endTime,
                'start_time_formatted' => $startFormatted,
                'end_time_formatted' => $endFormatted,
                'max_minutes' => $maxMinutes,
            ],
            
            // Window status
            'is_within_break_window' => $isWithinBreakWindow,
            'is_before_break_window' => $isBeforeBreakWindow,
            'is_after_break_window' => $isAfterBreakWindow,
            
            'break_message' => $breakMessage,
            'break_reason' => $breakReason,
            'can_start_break' => $canStartBreak,
            'can_end_break' => $canEndBreak,
            'has_checked_in' => !!$attendance,
            'has_checked_out' => $attendance ? ($attendance->time_out !== null) : false,
            
            // Usage
            'break_used_minutes' => (int)$totalUsedMinutes,
            'break_remaining_seconds' => $remainingSeconds,
            'break_already_used' => ($totalUsedMinutes >= $maxMinutes), // Only blocked when total limit hit
            'is_on_break' => ($todayBreak && $todayBreak->isActive()),
            'has_break_today' => ($totalUsedMinutes > 0),
            
            // Active break info
            'current_break' => $todayBreak,
            'attendance_id' => $attendance?->id,
            'coffee_used' => $coffeeUsed ?? false,
            'meal_used' => $mealUsed ?? false,
        ]);
    }

    /**
     * Start break.
     */
    public function startBreak(Request $request)
    {
        $user = $request->user();
        $now = Carbon::now();
        $today = Carbon::today()->toDateString();
        $currentTime = $this->getCurrentTime();

        // Default to 'Regular' type
        $type = $request->input('type', 'Regular');

        // ============================================================
        // STEP 1: Verify Attendance (Anchor to ACTIVE Session)
        // ============================================================
        
        // Fix: Don't just check "Today" or "Yesterday". Check for an ONGOING shift first.
        // This ensures if I am working the Feb 4th shift (started 23:00), 
        // and it is now Feb 5th 02:00, I attach the break to the Feb 4th record.
        
        $attendance = AttendanceRecord::with(['session.schedule'])
            ->where('user_id', $user->id)
            ->whereNull('time_out') // Active shift only
            ->whereNotNull('time_in') // Must have started
            ->whereNotIn('status', ['pending', 'absent', 'excused'])
            ->orderBy('time_in', 'desc') // Get latest active
            ->first();

        // Fallback: If no active shift found (maybe just clocked in?), try strict date matching
        if (!$attendance) {
             // Try shift date (incorporating the 14:00 boundary logic if needed, or just standard lookups)
             $attendance = AttendanceRecord::with(['session.schedule'])
                 ->where('user_id', $user->id)
                 ->where('attendance_date', $today)
                 ->first();
                 
             if (!$attendance) {
                 $attendance = AttendanceRecord::with(['session.schedule'])
                     ->where('user_id', $user->id)
                     ->where('attendance_date', Carbon::yesterday()->toDateString())
                     ->first();
             }
        }
        
        // Auto-create: REMOVED. User must explicitly Time In first.
        if (!$attendance || !$attendance->time_in) {
             return response()->json([
                'message' => 'You must Time In before starting a break.',
                'error_code' => 'NOT_TIMED_IN'
             ], 400);
        }

        if ($attendance->time_out) {
            return response()->json([
                'message' => 'Cannot take break after Time Out.',
                'error_code' => 'ALREADY_CHECKED_OUT'
            ], 400);
        }
        
        // ============================================================
        // STEP 2: Check Allowance (Cumulative 90 min Limit)
        // ============================================================
        $globalLimit = (int)(\App\Models\Setting::where('key', 'break_duration')->value('value') ?? 90);
        
        $alreadyUsedMinutes = EmployeeBreak::where('attendance_id', $attendance->id)
            ->whereNotNull('break_end')
            ->sum('duration_minutes');
            
        $remainingMinutes = max(0, $globalLimit - $alreadyUsedMinutes);
        
        if ($remainingMinutes <= 0) {
             return response()->json([
                'message' => 'You have already used your total break allowance of 90 minutes.',
                'error_code' => 'BREAK_LIMIT_REACHED'
            ], 400);
        }

        // Set the limit for this specific break segment
        $segmentLimit = $remainingMinutes;
        
        // Check if already active
        $activeBreak = EmployeeBreak::where('attendance_id', $attendance->id)
            ->whereNull('break_end')
            ->first();
            
        if ($activeBreak) {
             return response()->json([
                'message' => 'You are already on break.',
                'error_code' => 'ALREADY_ON_BREAK'
            ], 400);
        }

        // ============================================================
        // STEP 3: Start break (Wrapped in Transaction for Race Safety)
        // ============================================================
        $break = \Illuminate\Support\Facades\DB::transaction(function () use ($attendance, $user, $now, $type, $segmentLimit) {
            // Double-check active break inside transaction with lock
            $stillActive = EmployeeBreak::where('attendance_id', $attendance->id)
                ->whereNull('break_end')
                ->lockForUpdate()
                ->exists();
                
            if ($stillActive) {
                throw new \Exception('ALREADY_ON_BREAK');
            }
            
            $break = EmployeeBreak::create([
                'attendance_id' => $attendance->id,
                'user_id' => $user->id,
                'break_date' => $attendance->attendance_date->format('Y-m-d'), // Strict: Link to SHIFT date, not calendar date
                'break_start' => $now,
                'break_type' => $type,
                'duration_limit' => $segmentLimit,
            ]);

            $attendance->update([
                'break_start' => $now, 
                'break_end' => null,
            ]);
            
            return $break;
        });

        AuditLog::log(
            'break_start',
            "{$user->first_name} {$user->last_name} started $type break",
            AuditLog::STATUS_SUCCESS,
            $user->id,
            'EmployeeBreak',
            $break->id
        );

        return response()->json([
            'message' => "$type Break started successfully.",
            'break' => $break,
            'break_remaining_seconds' => $break->getRemainingSeconds(),
        ]);
    }

    /**
     * End break manually.
     */
    /**
     * End break manually.
     */
    public function endBreak(Request $request)
    {
        try {
            $user = $request->user();
            
            // Log attempt
            Log::info("Break end attempt for user: {$user->id}");

            // 1. Find active break
            $break = EmployeeBreak::where('user_id', $user->id)
                ->whereNull('break_end')
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$break) {
                return response()->json([
                    'message' => 'No active break found.',
                    'error_code' => 'NO_BREAK_FOUND'
                ], 400);
            }

            // 2. End the break (Model method)
            try {
                $break->endBreak();
            } catch (\Exception $e) {
                Log::error("Failed to call break->endBreak(): " . $e->getMessage());
                throw $e;
            }

            // 3. Update Legacy Attendance Record
            try {
                $attendance = $break->attendance;
                if ($attendance) {
                    $attendance->update([
                        'break_end' => $break->break_end,
                    ]);
                }
            } catch (\Exception $e) {
                 Log::warning("Legacy attendance update failed in endBreak: " . $e->getMessage());
            }

            // 4. Validate Duration Rules
            $message = 'Break ended successfully.';
            $warning = null;
            $duration = $break->duration_minutes;
            
            if ($break->break_type === 'Meal') {
                // Meal: 30-60 mins
                if ($duration < 30) {
                    $warning = "You took a short Meal break ($duration mins). Minimum is 30 mins.";
                } elseif ($duration > 60) {
                    $warning = "You exceeded the max Meal break ($duration mins > 60 mins).";
                }
            } elseif ($break->break_type === 'Coffee') {
                // Coffee: 15-30 mins
                if ($duration < 15) {
                    $warning = "You took a short Coffee break ($duration mins). Minimum is 15 mins.";
                } elseif ($duration > 30) {
                    $warning = "You exceeded the max Coffee break ($duration mins > 30 mins).";
                }
            }

            // 5. Audit Log
            try {
                AuditLog::log(
                    'break_end',
                    "{$user->first_name} {$user->last_name} ended break ({$duration}m)",
                    AuditLog::STATUS_SUCCESS,
                    $user->id,
                    'EmployeeBreak',
                    $break->id
                );
            } catch (\Exception $e) {
                Log::warning("Audit log failed in endBreak: " . $e->getMessage());
            }

            return response()->json([
                'message' => $warning ?: $message,
                'status' => $warning ? 'warning' : 'success',
                'break' => $break,
                'duration_minutes' => $break->duration_minutes,
                'warning' => $warning
            ]);

        } catch (\Throwable $e) {
            // Catch ALL errors including TypeErrors
            Log::error("Critical 500 in endBreak: " . $e->getMessage());
            
            return response()->json([
                 'message' => 'System error ending break: ' . $e->getMessage(),
                 'error_code' => 'SYSTEM_ERROR',
            ], 500);
        }
    }

    /**
     * Auto-end break when time expires.
     */
    private function autoEndBreak(EmployeeBreak $break, BreakRule $breakRule): void
    {
        if (!$break->isActive()) {
            return;
        }

        $now = Carbon::now();
        $breakStart = Carbon::parse($break->break_start);
        
        // Determine end time: either max duration or break window end
        $maxEndTime = $breakStart->copy()->addMinutes($breakRule->max_minutes);
        $windowEndTime = Carbon::parse($break->break_date->format('Y-m-d') . ' ' . $breakRule->end_time);
        
        // Use the earlier of the two
        $endTime = $maxEndTime->lt($windowEndTime) ? $maxEndTime : $windowEndTime;
        
        $break->break_end = $endTime;
        $diff = $breakStart->diffInMinutes($endTime, false);
        $break->duration_minutes = $diff < 0 ? $diff + 1440 : $diff;
        $break->save();

        // Also update the legacy break fields in attendance_records
        $attendance = $break->attendance;
        if ($attendance) {
            $attendance->update([
                'break_end' => $endTime,
            ]);
        }

        Log::info("Break auto-ended", [
            'break_id' => $break->id,
            'duration' => $break->duration_minutes,
        ]);
    }

    /**
     * Get break history for current user.
     */
    public function history(Request $request)
    {
        $user = $request->user();
        $perPage = $request->get('per_page', 20);

        $query = EmployeeBreak::with(['user', 'attendance'])
            ->orderBy('created_at', 'desc');

        // If not admin, restrict to own records
        if ($user->role !== 'admin') {
            $query->where('user_id', $user->id);
        }

        // Support search/filters if needed
        if ($request->has('user_id') && $user->role === 'admin') {
            $query->where('user_id', $request->user_id);
        }
        
        $paginator = $query->paginate($perPage);

        // LAZY CLEANUP: Check displayed records for expiration
        // This ensures that when an admin views the history, any "stuck" breaks are auto-closed
        foreach ($paginator->items() as $breakRecord) {
            if ($breakRecord->isActive()) {
                 // The getRemainingSeconds() method in the model contains the logic 
                 // to check time limits and call autoEndBreak() if expired.
                 $breakRecord->getRemainingSeconds(); 
            }
        }

        return response()->json($paginator);
    }

    /**
     * Get break rules (for admin or display).
     */
    public function getRules()
    {
        $breakRule = BreakRule::getActive();

        if (!$breakRule) {
            return response()->json([
                'configured' => false,
                'message' => 'No break policy configured.',
            ]);
        }

        return response()->json([
            'configured' => true,
            'start_time' => $breakRule->start_time,
            'end_time' => $breakRule->end_time,
            'start_time_formatted' => $breakRule->formatted_start_time,
            'end_time_formatted' => $breakRule->formatted_end_time,
            'max_minutes' => $breakRule->max_minutes,
        ]);
    }
    /**
     * Update a break record (Admin only).
     */
    public function update(Request $request, EmployeeBreak $employeeBreak)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'break_start' => 'required|date',
            'break_end' => 'nullable|date|after:break_start',
            'break_type' => 'required|string',
        ]);

        $start = Carbon::parse($request->input('break_start'));
        $end = $request->input('break_end') ? Carbon::parse($request->input('break_end')) : null;
        
        $employeeBreak->break_start = $start;
        $employeeBreak->break_end = $end;
        $employeeBreak->break_type = $request->input('break_type');
        
        if ($end) {
            $diff = $start->diffInMinutes($end, false);
            $employeeBreak->duration_minutes = $diff < 0 ? $diff + 1440 : $diff;
        } else {
            $employeeBreak->duration_minutes = 0;
        }

        $employeeBreak->save();

        AuditLog::log(
            'break_update',
            "Admin {$user->first_name} updated break for {$employeeBreak->user->full_name}",
            AuditLog::STATUS_SUCCESS,
            $user->id,
            'EmployeeBreak',
            $employeeBreak->id
        );

        return response()->json([
            'message' => 'Break record updated successfully',
            'break' => $employeeBreak
        ]);
    }

    /**
     * Delete a break record (Admin only).
     */
    public function destroy(Request $request, EmployeeBreak $employeeBreak)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $employeeBreak->delete();

        AuditLog::log(
            'break_delete',
            "Admin {$user->first_name} deleted break for {$employeeBreak->user->full_name}",
            AuditLog::STATUS_SUCCESS,
            $user->id,
            'EmployeeBreak',
            $employeeBreak->id
        );

        return response()->json(['message' => 'Break record deleted successfully']);
    }
}
