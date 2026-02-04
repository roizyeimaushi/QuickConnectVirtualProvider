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
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->date('attendance_date')->nullable()->after('user_id');
            $table->index('attendance_date');
        });

        // Backfill existing records with the session date (PostgreSQL syntax)
        DB::statement("
            UPDATE attendance_records
            SET attendance_date = s.date
            FROM attendance_sessions s
            WHERE attendance_records.session_id = s.id
            AND attendance_records.attendance_date IS NULL
        ");

        // Now make it not nullable and add unique constraint
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->date('attendance_date')->nullable(false)->change();
        });

        // Add unique constraint for one attendance per employee per date
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->unique(['user_id', 'attendance_date'], 'unique_user_attendance_date');
        });
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
