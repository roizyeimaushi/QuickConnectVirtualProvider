<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Schedule extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'time_in',
        'break_time',
        'time_out',
        'grace_period_minutes',
        'late_threshold_minutes',
        'is_overnight',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'is_overnight' => 'boolean',
            'grace_period_minutes' => 'integer',
            'late_threshold_minutes' => 'integer',
        ];
    }

    public function attendanceSessions()
    {
        return $this->hasMany(AttendanceSession::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
