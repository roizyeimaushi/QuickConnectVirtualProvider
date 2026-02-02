<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $query = Schedule::query();

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'time_in' => 'required|date_format:H:i',
            'break_time' => 'required|date_format:H:i',
            'time_out' => 'required|date_format:H:i',
            'grace_period_minutes' => 'integer|min:0|max:60',
            'late_threshold_minutes' => 'integer|min:0|max:120',
            'is_overnight' => 'boolean',
        ]);

        $validated['status'] = 'active';

        $schedule = Schedule::create($validated);

        AuditLog::log(
            'create_schedule',
            "Created schedule {$schedule->name}",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'Schedule',
            $schedule->id,
            null,
            $schedule->toArray()
        );

        return response()->json($schedule, 201);
    }

    public function show(Schedule $schedule)
    {
        return response()->json($schedule);
    }

    public function update(Request $request, Schedule $schedule)
    {
        $validated = $request->validate([
            'name' => 'string|max:100',
            'time_in' => 'date_format:H:i',
            'break_time' => 'date_format:H:i',
            'time_out' => 'date_format:H:i',
            'grace_period_minutes' => 'integer|min:0|max:60',
            'late_threshold_minutes' => 'integer|min:0|max:120',
            'is_overnight' => 'boolean',
            'status' => 'in:active,inactive',
        ]);

        $oldValues = $schedule->toArray();
        $schedule->update($validated);

        AuditLog::log(
            'update_schedule',
            "Updated schedule {$schedule->name}",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'Schedule',
            $schedule->id,
            $oldValues,
            $schedule->fresh()->toArray()
        );

        return response()->json($schedule);
    }

    public function destroy(Schedule $schedule)
    {
        // Check removed to allow soft deletes
        // if ($schedule->attendanceSessions()->exists()) { ... }

        AuditLog::log(
            'delete_schedule',
            "Deleted schedule {$schedule->name}",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'Schedule',
            $schedule->id,
            $schedule->toArray(),
            null
        );

        $schedule->delete();

        return response()->json(['message' => 'Schedule deleted successfully']);
    }

    public function toggleStatus(Schedule $schedule)
    {
        $oldStatus = $schedule->status;
        $schedule->status = $schedule->status === 'active' ? 'inactive' : 'active';
        $schedule->save();

        AuditLog::log(
            $schedule->status === 'active' ? 'activate_schedule' : 'deactivate_schedule',
            ($schedule->status === 'active' ? 'Activated' : 'Deactivated') . " schedule {$schedule->name}",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'Schedule',
            $schedule->id,
            ['status' => $oldStatus],
            ['status' => $schedule->status]
        );

        return response()->json($schedule);
    }
}
