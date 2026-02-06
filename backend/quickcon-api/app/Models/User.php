<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'employee_id',
        'first_name',
        'last_name',
        'email',
        'password',
        'role',
        'position',
        'department',
        'employee_type',
        'avatar',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function attendanceRecords()
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function createdSessions()
    {
        return $this->hasMany(AttendanceSession::class, 'created_by');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isEmployee(): bool
    {
        return $this->role === 'employee';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function getAvatarAttribute($value)
    {
        if (empty($value)) {
            return 'https://ui-avatars.com/api/?name=' . urlencode($this->first_name . ' ' . $this->last_name) . '&background=0D8ABC&color=fff';
        }

        // Dynamically replace localhost/127.0.0.1 with the actual server IP for mobile device compatibility
        $requestHost = request()->getHost();
        if ($requestHost !== 'localhost' && $requestHost !== '127.0.0.1') {
            if (str_contains($value, 'localhost')) {
                return str_replace('localhost', $requestHost, $value);
            } elseif (str_contains($value, '127.0.0.1')) {
                return str_replace('127.0.0.1', $requestHost, $value);
            }
        }

        return $value;
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }
}
