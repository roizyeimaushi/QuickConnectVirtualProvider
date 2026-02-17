<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ==========================================
// Scheduled Tasks
// ==========================================

// ── PRIMARY: Auto-finalize at 7:05 AM ──
// Locks the active session (shift ends at 7:00 AM), marks absent employees,
// then auto-creates the next day's session — fully automated daily cycle
Schedule::command('attendance:auto-finalize-and-create')->dailyAt('07:05');

// ── FALLBACK: Reset daily session at 5:30 PM ──
// Safety net in case the 7:05 AM run missed (e.g., server downtime).
// The create logic is idempotent — won't duplicate if the session already exists.
Schedule::command('attendance:reset-daily-session')->dailyAt('17:30');

// Auto checkout - runs every hour to check for employees who forgot to check out
// For night shifts (20:00 - 07:00), this will properly handle overnight timing
Schedule::command('attendance:auto-checkout')->hourly();

// Mark employees as absent if they haven't checked in by cutoff (01:00 AM)
Schedule::command('attendance:mark-absent')->everyThirtyMinutes();

// Auto-end expired breaks - runs every minute to enforce break time limits
Schedule::command('attendance:end-expired-breaks')->everyMinute();

// Clean up old data based on retention policy
Schedule::command('system:cleanup-data')->daily();

