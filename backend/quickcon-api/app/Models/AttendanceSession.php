<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedule_id',
        'date',
        'status',
        'attendance_required',
        'session_type',
        'completion_reason',
        'opened_at',
        'locked_at',
        'locked_by',
        'auto_lock_time',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'attendance_required' => 'boolean',
            'opened_at' => 'datetime',
            'locked_at' => 'datetime',
            'auto_lock_time' => 'datetime',
        ];
    }

    public function schedule()
    {
        return $this->belongsTo(Schedule::class)->withTrashed();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lockedBy()
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    public function records()
    {
        return $this->hasMany(AttendanceRecord::class, 'session_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isLocked(): bool
    {
        return $this->status === 'locked';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}
