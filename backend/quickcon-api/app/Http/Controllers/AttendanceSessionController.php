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
        $query = AttendanceSession::with(['schedule', 'creator'])
            ->withCount(['records as confirmed_count' => function ($query) {
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

        $session = AttendanceSession::create([
            'schedule_id' => $validated['schedule_id'],
            'date' => $validated['date'],
            'status' => 'active',
            'opened_at' => now(),
            'created_by' => auth()->id(),
        ]);

        if (!empty($validated['employee_ids'])) {
            $employeeIds = array_unique($validated['employee_ids']); // Prevent duplicates
            $records = [];
            $sessionDate = $session->date->toDateString(); // Get session date for attendance_date
            foreach ($employeeIds as $userId) {
                $records[] = [
                    'session_id' => $session->id,
                    'user_id' => $userId,
                    'attendance_date' => $sessionDate, // REQUIRED: Date-scoped attendance
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
        }]);

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
            // If session is locked or completed, missing records are 'absent'
            // If active, checks if shift has ended to mark 'absent' automatically
            $status = in_array($attendanceSession->status, ['locked', 'completed']) ? 'absent' : 'pending';
            
            // Auto-Absent logic for Active sessions:
            // If the current time is past the shift end time, the employee is Absent
            if ($status === 'pending' && $attendanceSession->schedule) {
                $schedule = $attendanceSession->schedule;
                $sessionDate = $attendanceSession->date->format('Y-m-d');
                
                // Parse times
                $shiftStart = Carbon::parse("$sessionDate {$schedule->time_in}");
                $shiftEnd = Carbon::parse("$sessionDate {$schedule->time_out}");
                
                // Handle overnight shifts
                if ($shiftEnd->lt($shiftStart)) {
                    $shiftEnd->addDay();
                }
                
                // If now > shift_end, they missed the shift completely
                if (Carbon::now()->gt($shiftEnd)) {
                    $status = 'absent';
                }
            }

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

    public function lock(AttendanceSession $attendanceSession)
    {
        if ($attendanceSession->status === 'locked') {
            return response()->json(['message' => 'Session is already locked'], 422);
        }

        $oldStatus = $attendanceSession->status;
        $attendanceSession->update([
            'status' => 'locked',
            'locked_at' => now(),
        ]);

        AuditLog::log(
            'lock_session',
            "Locked attendance session for {$attendanceSession->date->format('Y-m-d')}",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'AttendanceSession',
            $attendanceSession->id,
            ['status' => $oldStatus],
            ['status' => 'locked']
        );

        // Broadcast real-time session update
        event(new SessionUpdated($attendanceSession, 'locked'));

        return response()->json($attendanceSession->load(['schedule', 'creator']));
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
        $sessions = AttendanceSession::with(['schedule', 'creator'])
                                     ->where('status', 'active')
                                     ->orderBy('date', 'desc')
                                     ->get();

        return response()->json($sessions);
    }

    public function getToday()
    {
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
}
