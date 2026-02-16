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

    public function lockedByUser()
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

    /**
     * Synchronize session statuses based on current time and schedules.
     * Logic centralizes state transitions (Pending -> Active -> Completed).
     */
    public static function syncStatuses()
    {
        // THROTTLE: Only run this heavy sync once every 5 minutes globally
        $syncKey = 'global_session_sync_lock';
        if (\Illuminate\Support\Facades\Cache::has($syncKey)) {
            return;
        }
        \Illuminate\Support\Facades\Cache::put($syncKey, true, 300); // 5 minutes

        $now = \Carbon\Carbon::now();
        $boundary = (int) Setting::getCached('shift_boundary_hour', 14);
        $today = ($now->hour < $boundary ? \Carbon\Carbon::yesterday() : \Carbon\Carbon::today())->startOfDay();

        // Sync non-locked sessions for today or earlier
        $sessions = self::whereIn('status', ['pending', 'active'])
            ->where('date', '<=', $today)
            ->with('schedule')
            ->get();

        foreach ($sessions as $session) {
            if (!$session->schedule) {
                // Fail-safe: if active and a day old, mark completed
                if ($session->status === 'active' && $session->date->addDay()->isPast()) {
                    $session->update(['status' => 'completed']);
                }
                continue;
            }

            $schedule = $session->schedule;
            $sessionDate = $session->date->format('Y-m-d');
            
            $shiftStart = \Carbon\Carbon::parse("$sessionDate {$schedule->time_in}");
            $shiftEnd = \Carbon\Carbon::parse("$sessionDate {$schedule->time_out}");
            
            // Handle overnight shifts
            if ($shiftEnd->lt($shiftStart)) {
                $shiftEnd->addDay();
            }

            $oldStatus = $session->status;
            $newStatus = $oldStatus;

            if ($now->lt($shiftStart)) {
                $newStatus = 'pending';
            } elseif ($now->gte($shiftStart) && $now->lte($shiftEnd)) {
                $newStatus = 'active';
            } else {
                $newStatus = 'completed';
            }

            if ($newStatus !== $oldStatus) {
                $session->update(['status' => $newStatus]);
                
                // Fire event for real-time UI updates
                try {
                    event(new \App\Events\SessionUpdated($session, 'status_synced'));
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning("Session Sync: Event broadcast failed - " . $e->getMessage());
                }

                \Illuminate\Support\Facades\Log::info("Session #{$session->id} status auto-synced: {$oldStatus} -> {$newStatus}");
            }
        }
    }

    /**
     * Get the sequential number for display (e.g. Session #23).
     */
    public function getSequenceNumberAttribute()
    {
        return self::where('date', '<', $this->date)
            ->orWhere(function ($query) {
                $query->where('date', $this->date)
                      ->where('created_at', '<', $this->created_at);
            })
            ->count() + 1;
    }
    
    protected $appends = ['sequence_number'];
}
