<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'user_id',
        'attendance_date',
        'time_in',
        'break_start',
        'break_end',
        'time_out',
        'status',
        'excuse_reason',
        'minutes_late',
        'hours_worked',
        'notes',
        'ip_address',
        'confirmed_at',
        'overtime_minutes',
        'overtime_status',
        'device_type',
        'device_name',
        'browser',
        'os',
        'latitude',
        'longitude',
        'location_address',
        'location_city',
        'location_country',
    ];

    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'time_in' => 'datetime',
            'break_start' => 'datetime',
            'break_end' => 'datetime',
            'time_out' => 'datetime',
            'confirmed_at' => 'datetime',
            'minutes_late' => 'integer',
            'hours_worked' => 'decimal:2',
        ];
    }

    /**
     * Scope to filter by today's date only.
     */
    public function scopeToday($query)
    {
        return $query->whereDate('attendance_date', now()->toDateString());
    }

    /**
     * Scope to filter by a specific date.
     */
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('attendance_date', $date);
    }

    public function session()
    {
        return $this->belongsTo(AttendanceSession::class, 'session_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationship to employee breaks.
     */
    public function breaks()
    {
        return $this->hasMany(EmployeeBreak::class, 'attendance_id');
    }

    /**
     * Get active break for this attendance record.
     */
    public function activeBreak()
    {
        return $this->hasOne(EmployeeBreak::class, 'attendance_id')
                    ->whereNull('break_end')
                    ->latest();
    }

    public function isPresent(): bool
    {
        return $this->status === 'present';
    }

    public function isLate(): bool
    {
        return $this->status === 'late';
    }

    public function isAbsent(): bool
    {
        return $this->status === 'absent';
    }

    /**
     * Calculate total break duration in minutes.
     * Performance: Uses loaded collection if available to avoid extra DB queries.
     */
    public function getTotalBreakMinutes(): int
    {
        // If breaks are already eager-loaded, use the collection sum
        if ($this->relationLoaded('breaks')) {
            $breakMins = (int) $this->breaks->sum('duration_minutes');
        } else {
            // Prioritize structured breaks table
            $breakMins = (int) $this->breaks()->sum('duration_minutes');
        }
        
        // Fallback to legacy break_start/break_end columns if no structured breaks exist
        if ($breakMins === 0 && $this->break_start && $this->break_end) {
            $diff = $this->break_start->diffInMinutes($this->break_end, false);
            $breakMins = $diff < 0 ? $diff + 1440 : $diff;
        }
        
        return $breakMins;
    }

    /**
     * Calculate net hours worked (Gross - Breaks).
     * @param int|null $providedBreakMinutes Optional override to avoid recalc
     */
    public function calculateHoursWorked(?int $providedBreakMinutes = null): float
    {
        if (!$this->time_in || !$this->time_out || in_array($this->status, ['pending', 'absent'])) {
            return 0.00;
        }

        $grossMinutes = $this->time_in->diffInMinutes($this->time_out, false);
        if ($grossMinutes < 0) {
            $grossMinutes += 1440; // Handle overnight rollover
        }

        $breakMinutes = $providedBreakMinutes ?? $this->getTotalBreakMinutes();
        $netMinutes = max(0, $grossMinutes - $breakMinutes);

        return round($netMinutes / 60, 2);
    }
}
