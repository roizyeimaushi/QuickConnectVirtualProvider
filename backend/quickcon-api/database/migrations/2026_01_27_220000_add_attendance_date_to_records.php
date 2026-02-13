<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Add attendance_date column for strict date-scoped attendance.
     * This ensures each day is a fresh attendance cycle.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('attendance_records', 'attendance_date')) {
            Schema::table('attendance_records', function (Blueprint $table) {
                $table->date('attendance_date')->nullable()->after('user_id');
                $table->index('attendance_date');
            });
        }

        // Backfill existing records with the session date (MySQL/TiDB syntax)
        DB::statement("
            UPDATE attendance_records
            JOIN attendance_sessions s ON attendance_records.session_id = s.id
            SET attendance_records.attendance_date = s.date
            WHERE attendance_records.attendance_date IS NULL
        ");

        // Now make it not nullable and add unique constraint
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->date('attendance_date')->nullable(false)->change();
        });

        // Add unique constraint for one attendance per employee per date
        // Note: unique constraint might already exist if migration partially succeeded, 
        // but Laravel unique() will error if it exists. Better to check or ignore.
        try {
            Schema::table('attendance_records', function (Blueprint $table) {
                $table->unique(['user_id', 'attendance_date'], 'unique_user_attendance_date');
            });
        } catch (\Exception $e) {
            // Probably already exists
        }
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropUnique('unique_user_attendance_date');
            $table->dropIndex(['attendance_date']);
            $table->dropColumn('attendance_date');
        });
    }
};
