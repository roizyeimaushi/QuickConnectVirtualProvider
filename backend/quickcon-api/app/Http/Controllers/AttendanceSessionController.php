<?php

namespace App\Http\Controllers;

use App\Models\AttendanceSession;
use App\Models\AuditLog;
use App\Events\SessionUpdated;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AttendanceSessionController extends Controller
{
    public function index(Request $request)
    {
        // Rule 1 & 3: Ensure session statuses are current
        $this->syncSessionStatuses();

        $query = AttendanceSession::with(['schedule', 'creator'])
            ->withCount(['records as confirmed_count' => function ($query) {
                // Meaning of Confirmed: Actually timed in
                $query->whereNotNull('time_in');
            }])
            ->withCount('records as total_employees_count');

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('date') && $request->date) {
            $query->whereDate('date', $request->date);
        }

        if ($request->has('schedule_id') && $request->schedule_id) {
            $query->where('schedule_id', $request->schedule_id);
        }

        return response()->json(
            $query->orderBy('date', 'desc')
                  ->orderBy('created_at', 'desc')
                  ->paginate(20)
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'schedule_id' => 'required|exists:schedules,id',
            'date' => 'required|date',
            'employee_ids' => 'nullable|array',
            'employee_ids.*' => 'exists:users,id',
        ]);

        $exists = AttendanceSession::where('schedule_id', $validated['schedule_id'])
                                   ->whereDate('date', $validated['date'])
                                   ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A session already exists for this schedule and date'
            ], 422);
        }

        // Rule 3: Only the current day should be Active by default
        $boundary = (int) (\App\Models\Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
        $sessionDate = Carbon::parse($validated['date'])->startOfDay();
        $targetToday = (Carbon::now()->hour < $boundary ? Carbon::yesterday() : Carbon::today())->startOfDay();
        
        $initialStatus = $sessionDate->equalTo($targetToday) ? 'active' : 'pending';

        $session = AttendanceSession::create([
            'schedule_id' => $validated['schedule_id'],
            'date' => $validated['date'],
            'status' => $initialStatus,
            'opened_at' => now(),
            'created_by' => auth()->id(),
        ]);

        if (empty($validated['employee_ids'])) {
            // Fix the 0/0 error: Default to all active employees
            $employeeIds = \App\Models\User::where('role', 'employee')
                ->where('status', 'active')
                ->pluck('id')
                ->toArray();
        } else {
            $employeeIds = array_unique($validated['employee_ids']);
        }

        if (!empty($employeeIds)) {
            $records = [];
            $sessionDate = $session->date->toDateString();
            foreach ($employeeIds as $userId) {
                $records[] = [
                    'session_id' => $session->id,
                    'user_id' => $userId,
                    'attendance_date' => $sessionDate,
                    'status' => 'pending', 
                    'created_at' => now(),
                    'updated_at' => now(),
                    'minutes_late' => 0,
                    'hours_worked' => 0,
                ];
            }
            \App\Models\AttendanceRecord::insert($records);
        }

        $session->load(['schedule', 'creator']);

        AuditLog::log(
            'create_session',
            "Created attendance session for {$session->date->format('Y-m-d')}" . (!empty($validated['employee_ids']) ? " with " . count($validated['employee_ids']) . " assigned employees" : ""),
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'AttendanceSession',
            $session->id,
            null,
            $session->toArray()
        );

        // Broadcast real-time session update
        event(new SessionUpdated($session, 'created'));

        return response()->json($session, 201);
    }

    public function show(AttendanceSession $attendanceSession)
    {
        $attendanceSession->load(['schedule', 'creator', 'records.user' => function ($query) {
            $query->withTrashed();
        }, 'records.breaks']);

        // Fetch all active employees to ensure everyone is listed
        $allEmployees = \App\Models\User::where('role', 'employee')
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get();

        $mergedRecords = $allEmployees->map(function ($employee) use ($attendanceSession) {
            // Check if this employee already has a record for this session
            $existingRecord = $attendanceSession->records->firstWhere('user_id', $employee->id);

            if ($existingRecord) {
                return $existingRecord;
            }

            // Determine status based on session state
            // Status stays 'pending' even if session is completed, until admin explicitly marks it.
            // Only 'locked' sessions might imply a final state, but per user request, we keep them pending.
            $status = in_array($attendanceSession->status, ['locked']) ? 'pending' : 'pending';
            
            // Re-evaluating: If the user wants "Pending -> stays Pending", then status is always pending 
            // unless a real record exists.
            $status = 'pending';

            // Create Virtual Record
            return [
                'id' => 'virtual_' . $employee->id,
                'session_id' => $attendanceSession->id,
                'user_id' => $employee->id,
                'attendance_date' => $attendanceSession->date->toDateString(),
                'status' => $status,
                'time_in' => null,
                'time_out' => null,
                'break_start' => null,
                'break_end' => null,
                'minutes_late' => 0,
                'hours_worked' => 0,
                'user' => $employee, // Embed full user object for frontend display
                'device_type' => null,
                'location_city' => null,
            ];
        });

        // Override the records collection with our complete list
        $attendanceSession->setRelation('records', $mergedRecords);

        return response()->json($attendanceSession);
    }

    public function update(Request $request, AttendanceSession $attendanceSession)
    {
        $validated = $request->validate([
            'status' => 'in:pending,active,locked,completed',
        ]);

        $oldValues = $attendanceSession->toArray();
        $attendanceSession->update($validated);

        AuditLog::log(
            'update_session',
            "Updated attendance session for {$attendanceSession->date->format('Y-m-d')}",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'AttendanceSession',
            $attendanceSession->id,
            $oldValues,
            $attendanceSession->fresh()->toArray()
        );

        // Broadcast real-time session update
        event(new SessionUpdated($attendanceSession, 'updated'));

        return response()->json($attendanceSession->load(['schedule', 'creator']));
    }

    public function destroy(AttendanceSession $attendanceSession)
    {
        // First, delete any associated attendance records
        $recordCount = $attendanceSession->records()->count();
        
        // Also delete any breaks associated with those records
        $recordIds = $attendanceSession->records()->pluck('id');
        \App\Models\EmployeeBreak::whereIn('attendance_id', $recordIds)->delete();
        
        // Delete the attendance records
        $attendanceSession->records()->delete();

        AuditLog::log(
            'delete_session',
            "Deleted attendance session for {$attendanceSession->date->format('Y-m-d')}" . ($recordCount > 0 ? " (including {$recordCount} attendance records)" : ""),
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'AttendanceSession',
            $attendanceSession->id,
            $attendanceSession->toArray(),
            null
        );

        $attendanceSession->delete();

        return response()->json(['message' => 'Session and associated records deleted successfully']);
    }

    public function lock(Request $request, AttendanceSession $attendanceSession)
    {
        if ($attendanceSession->status === 'locked') {
            return response()->json(['message' => 'Session is already locked'], 422);
        }

        $validated = $request->validate([
            'attendance_required' => 'nullable|boolean',
            'session_type' => 'nullable|string|in:Normal,Emergency,Holiday,Maintenance',
            'completion_reason' => 'nullable|string|max:255',
        ]);

        $oldStatus = $attendanceSession->status;
        $attendanceSession->update([
            'status' => 'locked',
            'attendance_required' => $validated['attendance_required'] ?? $attendanceSession->attendance_required,
            'session_type' => $validated['session_type'] ?? $attendanceSession->session_type,
            'completion_reason' => $validated['completion_reason'] ?? $attendanceSession->completion_reason,
            'locked_at' => now(),
            'locked_by' => auth()->id(),
        ]);

        AuditLog::log(
            'lock_session',
            "Locked attendance session for {$attendanceSession->date->format('Y-m-d')}. Type: {$attendanceSession->session_type}, Required: " . ($attendanceSession->attendance_required ? 'Yes' : 'No'),
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'AttendanceSession',
            $attendanceSession->id,
            ['status' => $oldStatus],
            ['status' => 'locked', 'type' => $attendanceSession->session_type]
        );

        // 3. Finalize Employee Statuses
        $finalStatus = $attendanceSession->attendance_required ? 'absent' : 'excused';
        $reason = $attendanceSession->completion_reason ?: ($attendanceSession->session_type . " Finalization");

        // Use a loop to ensure audit logs/events are triggered if necessary, 
        // but for performance, bulk update is better for large teams.
        // We'll update only those who are still 'pending' or have no record (virtual)
        
        // First, get all employees who SHOULD have been there
        $activeEmployees = \App\Models\User::where('role', 'employee')->where('status', 'active')->get();
        
        foreach ($activeEmployees as $employee) {
            // Check if user already has a record for this DATE (Global unique constraint)
            $record = \App\Models\AttendanceRecord::where('user_id', $employee->id)
                ->where('attendance_date', $attendanceSession->date->toDateString())
                ->first();

            // Case A: No record exists AT ALL for this day
            if (!$record) {
                \App\Models\AttendanceRecord::create([
                    'user_id' => $employee->id,
                    'session_id' => $attendanceSession->id,
                    'attendance_date' => $attendanceSession->date->toDateString(),
                    'status' => $finalStatus,
                    'excuse_reason' => $finalStatus === 'excused' ? $reason : null,
                ]);
                continue;
            }

            // Case B: Record exists but it's still 'pending' or was never finalized
            if ($record->status === 'pending') {
                $record->update([
                    'status' => $finalStatus,
                    'excuse_reason' => ($finalStatus === 'excused' && !$record->excuse_reason) ? $reason : $record->excuse_reason,
                    'session_id' => $attendanceSession->id, // Attribute this record to the locking session
                ]);
            }
            
            // Case C: Record is already 'present', 'late', etc. -> LEAVE ALONE
        }

        // Broadcast real-time session update
        event(new SessionUpdated($attendanceSession, 'locked'));

        return response()->json($attendanceSession->load(['schedule', 'creator', 'lockedBy']));
    }

    public function unlock(AttendanceSession $attendanceSession)
    {
        if ($attendanceSession->status !== 'locked') {
            return response()->json(['message' => 'Session is not locked'], 422);
        }

        $oldStatus = $attendanceSession->status;
        $attendanceSession->update([
            'status' => 'active',
            'locked_at' => null,
        ]);

        AuditLog::log(
            'unlock_session',
            "Unlocked attendance session for {$attendanceSession->date->format('Y-m-d')}",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'AttendanceSession',
            $attendanceSession->id,
            ['status' => $oldStatus],
            ['status' => 'active']
        );

        // Broadcast real-time session update
        event(new SessionUpdated($attendanceSession, 'unlocked'));

        return response()->json($attendanceSession->load(['schedule', 'creator']));
    }

    public function getActive()
    {
        $this->syncSessionStatuses();
        
        $sessions = AttendanceSession::with(['schedule', 'creator'])
                                     ->where('status', 'active')
                                     ->orderBy('date', 'desc')
                                     ->get();

        return response()->json($sessions);
    }

    public function getToday()
    {
        $this->syncSessionStatuses();

        // Customizable Shift Boundary (Default 14:00)
        $boundary = (int) (\App\Models\Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
        
        $now = Carbon::now();
        $today = $now->hour < $boundary 
            ? Carbon::yesterday()->toDateString() 
            : Carbon::today()->toDateString();
            
        $sessions = AttendanceSession::with(['schedule', 'creator'])
                                     ->whereDate('date', $today)
                                     ->get();

        return response()->json($sessions);
    }

    public function locked(Request $request)
    {
        $query = AttendanceSession::with(['schedule', 'creator'])
                                  ->where('status', 'locked');

        return response()->json($query->orderBy('locked_at', 'desc')->paginate(20));
    }
    /**
     * Rule 1 & 3: Automated Lifecycle Management
     * Synchronizes Active/Pending/Completed states based on wall-clock time and schedules.
     */
    private function syncSessionStatuses()
    {
        $now = Carbon::now();
        $boundary = (int) (\App\Models\Setting::where('key', 'shift_boundary_hour')->value('value') ?: 14);
        $today = ($now->hour < $boundary ? Carbon::yesterday() : Carbon::today())->startOfDay();

        // Fetch all non-locked sessions for today or earlier that are not yet completed correctly.
        $sessions = AttendanceSession::whereIn('status', ['pending', 'active'])
            ->where('date', '<=', $today)
            ->with('schedule')
            ->get();

        foreach ($sessions as $session) {
            if (!$session->schedule) {
                // Heuristic for sessions without a schedule: If active and date is past, complete it.
                if ($session->status === 'active' && $session->date->addDay()->isPast()) {
                    $session->update(['status' => 'completed']);
                }
                continue;
            }

            $schedule = $session->schedule;
            $sessionDate = $session->date->format('Y-m-d');
            
            // Calculate exact start and end times
            $shiftStart = Carbon::parse("$sessionDate {$schedule->time_in}");
            $shiftEnd = Carbon::parse("$sessionDate {$schedule->time_out}");
            
            // Handle overnight shifts
            if ($shiftEnd->lt($shiftStart)) {
                $shiftEnd->addDay();
            }

            $oldStatus = $session->status;
            $newStatus = $oldStatus;

            if ($now->lt($shiftStart)) {
                // 1. Upcoming Phase
                $newStatus = 'pending';
            } elseif ($now->gte($shiftStart) && $now->lte($shiftEnd)) {
                // 2. Live Phase
                $newStatus = 'active';
            } else {
                // 3. Completed Phase
                $newStatus = 'completed';
            }

            if ($newStatus !== $oldStatus) {
                $session->update(['status' => $newStatus]);
                
                // Optional: Broadcast or Log transitions
                if ($newStatus === 'active') {
                    event(new SessionUpdated($session, 'opened'));
                } elseif ($newStatus === 'completed') {
                    event(new SessionUpdated($session, 'completed'));
                }
            }
        }
    }
}
