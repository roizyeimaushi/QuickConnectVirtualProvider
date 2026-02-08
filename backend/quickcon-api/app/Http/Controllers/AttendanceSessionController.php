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

        // Smart Attendance Required Logic
        $dayOfWeek = $sessionDate->dayOfWeek;
        $schedule = \App\Models\Schedule::find($validated['schedule_id']);
        $isOvernight = $schedule ? $schedule->is_overnight : false;
        
        $isWeekendOffline = false;
        if ($isOvernight) {
             $isWeekendOffline = ($dayOfWeek === Carbon::SATURDAY);
        } else {
             $isWeekendOffline = ($dayOfWeek === Carbon::SATURDAY || $dayOfWeek === Carbon::SUNDAY);
        }
        $isRequired = !$isWeekendOffline;

        $session = AttendanceSession::create([
            'schedule_id' => $validated['schedule_id'],
            'date' => $validated['date'],
            'status' => $initialStatus,
            'attendance_required' => $isRequired,
            'session_type' => $isRequired ? 'Normal' : 'Weekend',
            'opened_at' => now(),
            'created_by' => auth()->id(),
        ]);

        if (empty($validated['employee_ids'])) {
            // Only auto-create records if attendance is required
            // On weekends, we leave it empty so it shows as 0/0 and "Optional" in detailed view
            // Default: Assign all active employees so they see the session in their dashboard
            $employeeIds = \App\Models\User::where('role', 'employee')
                ->where('status', 'active')
                ->pluck('id')
                ->toArray();
        } else {
            $employeeIds = array_unique($validated['employee_ids']);
        }

        if (!empty($employeeIds)) {
            $records = [];
            $sessionDateStr = $session->date->toDateString();
            foreach ($employeeIds as $userId) {
                $records[] = [
                    'session_id' => $session->id,
                    'user_id' => $userId,
                    'attendance_date' => $sessionDateStr,
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
        $attendanceSession->load(['schedule', 'creator', 'lockedByUser', 'records.user' => function ($query) {
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
                // Ensure hours are calculated correctly
                $existingRecord->hours_worked = $existingRecord->calculateHoursWorked();
                return $existingRecord;
            }

            // Determine status based on session state
            $isWeekend = $attendanceSession->date->isWeekend();
            $isRequired = $attendanceSession->attendance_required ?? true;
            
            // If it's a weekend or attendance is not required, mark as 'optional'
            // This prevents employees from appearing as "Pending" when they aren't supposed to work.
            $status = (!$isRequired || $isWeekend) ? 'optional' : 'pending';

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
            'session_type' => 'nullable|string',
        ]);

        try {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $attendanceSession, $validated) {
                $oldStatus = $attendanceSession->status;
                
                $rawType = $validated['session_type'] ?? 'Regular';
                $sessionType = in_array($rawType, ['Regular', 'Special', 'Overtime', 'Remote/WFH', 'Excused']) ? $rawType : 'Regular';

                $updateData = ['status' => 'locked'];

                // Defensive check: Only update context fields if columns exist in DB
                if (\Illuminate\Support\Facades\Schema::hasColumn('attendance_sessions', 'attendance_required')) {
                    $updateData['attendance_required'] = $validated['attendance_required'] ?? $attendanceSession->attendance_required;
                }
                
                if (\Illuminate\Support\Facades\Schema::hasColumn('attendance_sessions', 'session_type')) {
                    $updateData['session_type'] = $sessionType;
                }
                
                if (\Illuminate\Support\Facades\Schema::hasColumn('attendance_sessions', 'locked_at')) {
                    $updateData['locked_at'] = now();
                }
                
                if (\Illuminate\Support\Facades\Schema::hasColumn('attendance_sessions', 'locked_by')) {
                    $updateData['locked_by'] = auth()->id();
                }

                $attendanceSession->update($updateData);

                // Log action
                try {
                    AuditLog::log(
                        'lock_session',
                        "Locked attendance session for {$attendanceSession->date->format('Y-m-d')}. Type: {$sessionType}",
                        AuditLog::STATUS_SUCCESS,
                        auth()->id(),
                        'AttendanceSession',
                        $attendanceSession->id,
                        ['status' => $oldStatus],
                        $attendanceSession->fresh()->toArray()
                    );
                } catch (\Exception $e) {
                    \Log::warning("Lock Session: Audit Log failed - " . $e->getMessage());
                }

                $isAttendanceRequired = true;
                if (\Illuminate\Support\Facades\Schema::hasColumn('attendance_sessions', 'attendance_required')) {
                    $isAttendanceRequired = $attendanceSession->attendance_required;
                }

                $finalStatus = $isAttendanceRequired ? 'absent' : 'excused';
                $reason = ($sessionType ?: "Session") . " Finalization";
                $sessionDate = $attendanceSession->date->toDateString();

                $activeEmployees = \App\Models\User::where('role', 'employee')
                    ->where('status', 'active')
                    ->get();
                
                foreach ($activeEmployees as $employee) {
                    // Check for existing record for this user and date
                    $existingRecord = \App\Models\AttendanceRecord::where('user_id', $employee->id)
                        ->where('attendance_date', $sessionDate)
                        ->first();

                    if (!$existingRecord) {
                        // Create new record for missing employee
                        \App\Models\AttendanceRecord::create([
                            'user_id' => $employee->id,
                            'attendance_date' => $sessionDate,
                            'session_id' => $attendanceSession->id,
                            'status' => $finalStatus,
                            'excuse_reason' => ($finalStatus === 'excused') ? $reason : null,
                        ]);
                    } elseif (in_array($existingRecord->status, ['pending', 'absent'])) {
                        // Update status only if it's not a "completed" status
                        $existingRecord->update([
                            'status' => $finalStatus,
                            'excuse_reason' => ($finalStatus === 'excused') ? $reason : $existingRecord->excuse_reason,
                            // Ensure session_id is linked if it wasn't
                            'session_id' => $existingRecord->session_id ?: $attendanceSession->id,
                        ]);
                    }
                }

                $attendanceSession->refresh();
                
                // Broadcast - wrap in try/catch to prevent 500 if broadcast driver is missing
                try {
                    event(new SessionUpdated($attendanceSession, 'locked'));
                } catch (\Exception $e) {
                    \Log::warning("Lock Session: Broadcasting failed - " . $e->getMessage());
                }

                return response()->json($attendanceSession->load(['schedule', 'creator', 'lockedByUser']));
            });
        } catch (\Exception $e) {
            \Log::error("Lock Session Critical Failure: " . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to lock session. ' . $e->getMessage(),
                'error_type' => get_class($e)
            ], 500);
        }
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
