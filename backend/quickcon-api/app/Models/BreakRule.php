<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BreakRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'start_time',
        'end_time',
        'max_minutes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'max_minutes' => 'integer',
        ];
    }

    /**
     * Get the active break rule.
     */
    public static function getActive(): ?self
    {
        return static::where('is_active', true)->first();
    }

    /**
     * Check if current time is within break window.
     */
    public function isWithinBreakWindow(): bool
    {
        $now = now();
        $currentTime = $now->format('H:i:s');
        
        return $currentTime >= $this->start_time && $currentTime < $this->end_time;
    }

    /**
     * Get formatted start time (12-hour format).
     */
    public function getFormattedStartTimeAttribute(): string
    {
        return \Carbon\Carbon::parse($this->start_time)->format('g:i A');
    }

    /**
     * Get formatted end time (12-hour format).
     */
    public function getFormattedEndTimeAttribute(): string
    {
        return \Carbon\Carbon::parse($this->end_time)->format('g:i A');
    }
}
