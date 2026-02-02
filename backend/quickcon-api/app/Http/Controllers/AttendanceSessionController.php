<?php

namespace App\Http\Controllers;

use App\Models\AttendanceSession;
use App\Models\AuditLog;
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
            $records = [];
            $sessionDate = $session->date->toDateString(); // Get session date for attendance_date
            foreach ($validated['employee_ids'] as $userId) {
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

        return response()->json($session, 201);
    }

    public function show(AttendanceSession $attendanceSession)
    {
        return response()->json(
            $attendanceSession->load(['schedule', 'creator', 'records.user'])
        );
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
        $sessions = AttendanceSession::with(['schedule', 'creator'])
                                     ->whereDate('date', Carbon::today())
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
