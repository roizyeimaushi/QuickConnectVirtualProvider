<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = User::where('role', 'employee')
            ->select('users.*')
            // Get last real attendance date using subquery (ignore pending/optional gaps)
            ->addSelect(['last_attendance_date' => \App\Models\AttendanceRecord::select('attendance_date')
                ->whereColumn('user_id', 'users.id')
                ->whereNotIn('status', ['pending', 'optional'])
                ->orderBy('attendance_date', 'desc')
                ->limit(1)
            ])
            ->addSelect(['last_attendance_status' => \App\Models\AttendanceRecord::select('status')
                ->whereColumn('user_id', 'users.id')
                ->whereNotIn('status', ['pending', 'optional'])
                ->orderBy('attendance_date', 'desc')
                ->limit(1)
            ])
            ->addSelect(['is_online' => \App\Models\UserSession::select('is_online')
                ->whereColumn('user_id', 'users.id')
                ->orderBy('last_activity', 'desc')
                ->limit(1)
            ]);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%$search%")
                  ->orWhere('last_name', 'like', "%$search%")
                  ->orWhere('employee_id', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%");
            });
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        $perPage = $request->get('per_page', 20);
        $paginated = $query->orderBy('employee_id', 'asc')->paginate($perPage);

        // Add summary counts to the response
        $summary = [
            'total' => User::where('role', 'employee')->count(),
            'active' => User::where('role', 'employee')->where('status', 'active')->count(),
            'inactive' => User::where('role', 'employee')->where('status', 'inactive')->count(),
        ];

        return response()->json(array_merge($paginated->toArray(), ['summary' => $summary]));
    }

    public function store(Request $request)
    {
        // Get password policy settings
        $minLength = (int) (\App\Models\Setting::where('key', 'pass_min_length')->value('value') ?: 8);
        $requireSpecialChar = filter_var(\App\Models\Setting::where('key', 'pass_special_chars')->value('value'), FILTER_VALIDATE_BOOLEAN);

        // Build password validation rules dynamically
        $passwordRules = ['required', 'string', 'min:' . $minLength, 'confirmed'];
        
        if ($requireSpecialChar) {
            $passwordRules[] = 'regex:/[!@#$%^&*(),.?":{}|<>]/';
        }

        $validated = $request->validate([
            'employee_id' => 'required|string|max:20|unique:users,employee_id',
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => $passwordRules,
            'position' => 'required|string|max:100',
            'department' => 'nullable|string|max:100',
            'employee_type' => 'nullable|string|max:100',
        ], [
            'password.regex' => 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>).',
            'password.min' => "Password must be at least {$minLength} characters long.",
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['role'] = 'employee';
        $validated['status'] = 'active';

        $employee = User::create($validated);

        AuditLog::log(
            'create_employee',
            "Created employee {$employee->first_name} {$employee->last_name} ({$employee->employee_id})",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'User',
            $employee->id,
            null,
            collect($employee->toArray())->except(['password'])->toArray()
        );

        return response()->json($employee, 201);
    }

    public function show(User $employee)
    {
        return response()->json($employee);
    }

    public function update(Request $request, User $employee)
    {
        $validated = $request->validate([
            'employee_id' => 'string|max:20|unique:users,employee_id,' . $employee->id,
            'first_name' => 'string|max:100',
            'last_name' => 'string|max:100',
            'email' => 'email|unique:users,email,' . $employee->id,
            'position' => 'string|max:100',
            'department' => 'nullable|string|max:100',
            'employee_type' => 'nullable|string|max:100',
            'status' => 'in:active,inactive',
            'password' => 'nullable|string|min:8|confirmed',
        ]);
        
        $oldValues = $employee->toArray();
        
        // Hash password if provided
        if (!empty($validated['password'])) {
            $validated['password'] = \Illuminate\Support\Facades\Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }
        
        $employee->update($validated);

        // Revoke tokens if status changed to inactive (force logout)
        if (isset($validated['status']) && $validated['status'] === 'inactive') {
            $employee->tokens()->delete();
        }

        AuditLog::log(
            'update_employee',
            "Updated employee {$employee->first_name} {$employee->last_name}",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'User',
            $employee->id,
            collect($oldValues)->except(['password'])->toArray(),
            collect($employee->fresh()->toArray())->except(['password'])->toArray()
        );

        return response()->json($employee);
    }

    public function destroy(User $employee)
    {
        AuditLog::log(
            'delete_employee',
            "Deleted employee {$employee->first_name} {$employee->last_name} ({$employee->employee_id})",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'User',
            $employee->id,
            collect($employee->toArray())->except(['password'])->toArray(),
            null
        );

        // Scramble unique fields to allow reuse of ID and Email
        // We append a timestamp to ensure uniqueness of the deleted record
        // Handle max length for employee_id (20 chars)
        $timestamp = time();
        $suffix = '-' . $timestamp;
        
        // Truncate original ID if needed to fit the suffix
        if (strlen($employee->employee_id) + strlen($suffix) > 20) {
            $employee->employee_id = substr($employee->employee_id, 0, 20 - strlen($suffix)) . $suffix;
        } else {
            $employee->employee_id = $employee->employee_id . $suffix;
        }

        // Scramble email (sufficient length usually available)
        $employee->email = "deleted_{$timestamp}_" . $employee->email;
        $employee->save();

        $employee->delete();

        return response()->json(['message' => 'Employee deleted successfully']);
    }

    public function toggleStatus(User $employee)
    {
        $oldStatus = $employee->status;
        $employee->status = $employee->status === 'active' ? 'inactive' : 'active';
        $employee->save();

        // Revoke tokens if deactivated (force logout)
        if ($employee->status === 'inactive') {
            $employee->tokens()->delete();
        }

        $action = $employee->status === 'active' ? 'activate_employee' : 'deactivate_employee';
        $actionText = $employee->status === 'active' ? 'Activated' : 'Deactivated';

        AuditLog::log(
            $action,
            "{$actionText} employee {$employee->first_name} {$employee->last_name}",
            AuditLog::STATUS_SUCCESS,
            auth()->id(),
            'User',
            $employee->id,
            ['status' => $oldStatus],
            ['status' => $employee->status]
        );

        return response()->json($employee);
    }

    public function getByEmployeeId(string $employeeId)
    {
        $employee = User::where('employee_id', $employeeId)->firstOrFail();
        return response()->json($employee);
    }

    public function deactivated(Request $request)
    {
        $query = User::where('role', 'employee')->where('status', 'inactive');

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%$search%")
                  ->orWhere('last_name', 'like', "%$search%")
                  ->orWhere('employee_id', 'like', "%$search%");
            });
        }

        return response()->json($query->orderBy('updated_at', 'desc')->paginate(20));
    }

    public function nextEmployeeId()
    {
        // Get the highest employee_id number from the database
        // Use PostgreSQL-compatible syntax (SUBSTRING returns text, cast to integer)
        $lastEmployee = User::where('employee_id', 'like', 'QCV-%')
            ->orderByRaw("CAST(SUBSTRING(employee_id FROM 5) AS INTEGER) DESC")
            ->first();

        if ($lastEmployee) {
            // Extract the number from QCV-XXX format
            $lastNumber = (int) substr($lastEmployee->employee_id, 4);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        // Format as QCV-001, QCV-002, etc.
        $nextId = 'QCV-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        return response()->json(['next_employee_id' => $nextId]);
    }
}
