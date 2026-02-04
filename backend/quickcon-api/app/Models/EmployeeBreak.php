<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class EmployeeBreak extends Model
{
    use HasFactory;

    protected $table = 'breaks';

    protected $fillable = [
        'attendance_id',
        'user_id',
        'break_date',
        'break_start',
        'break_end',
        'duration_minutes',
        'penalty_minutes',
        'break_type',
        'duration_limit',
    ];

    protected function casts(): array
    {
        return [
            'break_date' => 'date',
            'break_start' => 'datetime',
            'break_end' => 'datetime',
            'duration_minutes' => 'integer',
            'penalty_minutes' => 'integer',
        ];
    }

    /**
     * Relationship to attendance record.
     */
    public function attendance()
    {
        return $this->belongsTo(AttendanceRecord::class, 'attendance_id');
    }

    /**
     * Relationship to user.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to get today's break for a user.
     */
    public function scopeToday($query, int $userId)
    {
        return $query->where('user_id', $userId)
                    ->where('break_date', now()->toDateString());
    }

    /**
     * Scope to get break for a specific date.
     */
    public function scopeForDate($query, int $userId, string $date)
    {
        return $query->where('user_id', $userId)
                    ->where('break_date', $date);
    }

    /**
     * Check if break is currently active (started but not ended).
     */
    public function isActive(): bool
    {
        return $this->break_start && !$this->break_end;
    }

    /**
     * Calculate and save break duration when ending break.
     */
    public function endBreak(): void
    {
        // Guard clause: ensure break has actually started
        if (!$this->break_start) {
            \Illuminate\Support\Facades\Log::warning("Attempted to end break without break_start", [
                'break_id' => $this->id,
                'user_id' => $this->user_id,
            ]);
            $this->break_end = now();
            $this->duration_minutes = 0;
            $this->save();
            return;
        }

        $this->break_end = now();
        // CRITICAL: Cast to integer to prevent PostgreSQL "invalid input syntax for type integer" error
        // Use abs() for overnight shifts
        $this->duration_minutes = (int) abs(Carbon::parse($this->break_start)->diffInMinutes($this->break_end));
        $this->save();
    }

    /**
     * Get remaining break count for the day (seconds).
     * Respects both Global Limit (90m) and Segment Limit (15m/60m).
     */
    /**
     * Get remaining break count for the day (seconds).
     */
    public function getRemainingSeconds(): int
    {
        // Check if strict limit is set
        if ($this->duration_limit && $this->duration_limit > 0) {
            $limitSeconds = $this->duration_limit * 60;
            
            $currentElapsedSeconds = 0;
            if ($this->isActive()) {
                $currentElapsedSeconds = Carbon::parse($this->break_start)->diffInSeconds(now());
            }
            
            $remainingSeconds = max(0, $limitSeconds - $currentElapsedSeconds);
             
            // AUTO-END
            if ($remainingSeconds <= 0 && $this->isActive()) {
                $this->autoEndBreak();
            }
            return $remainingSeconds;
        }

        // FALLBACK: Legacy Global Logic (90m)
        $totalUsedMinutes = \App\Models\EmployeeBreak::where('attendance_id', $this->attendance_id)
            ->whereNotNull('break_end')
            ->where('id', '!=', $this->id) 
            ->sum('duration_minutes');
            
        $globalLimit = 90;
        $globalRemaining = max(0, $globalLimit - $totalUsedMinutes);
        
        $limitSeconds = $globalRemaining * 60;
        
        $currentElapsedSeconds = 0;
        if ($this->isActive()) {
            $currentElapsedSeconds = Carbon::parse($this->break_start)->diffInSeconds(now());
        }
        
        $remainingSeconds = max(0, $limitSeconds - $currentElapsedSeconds);
        
        if ($remainingSeconds <= 0 && $this->isActive()) {
            $this->autoEndBreak();
        }
        
        return $remainingSeconds;
    }

    /**
     * Automatically end break when time expires.
     */
    public function autoEndBreak(): void
    {
        if (!$this->isActive()) {
            return;
        }

        // Determine correct duration
        $finalDuration = 0;
        
        if ($this->duration_limit && $this->duration_limit > 0) {
            // Strict limit
            $finalDuration = $this->duration_limit;
        } else {
            // Fallback Global
            $previouslyUsedMinutes = \App\Models\EmployeeBreak::where('attendance_id', $this->attendance_id)
                ->whereNotNull('break_end')
                ->where('id', '!=', $this->id)
                ->sum('duration_minutes');
                
            $globalLimit = 90;
            $globalRemaining = max(0, $globalLimit - $previouslyUsedMinutes);
            $finalDuration = $globalRemaining;
        }

        // Set End Time
        $this->break_end = Carbon::parse($this->break_start)->addMinutes($finalDuration);
        $this->duration_minutes = $finalDuration;
        $this->save();

        // Update Legacy Attendance Record
        $attendance = $this->attendance;
        if ($attendance) {
            $attendance->update([
                'break_end' => $this->break_end,
            ]);
        }

        \Illuminate\Support\Facades\Log::info("Break auto-ended", [
            'break_id' => $this->id,
            'duration' => $this->duration_minutes
        ]);
    }
}
