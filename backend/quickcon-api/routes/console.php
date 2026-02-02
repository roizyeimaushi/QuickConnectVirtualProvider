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

// Reset daily session - runs at 5:30 PM (before 6PM check-in window opens)
// This creates a new session and locks old ones from the previous day
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

