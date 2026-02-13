<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('user_sessions', function (Blueprint $table) {
            // Speed up "is_online" lookup in EmployeeController
            $table->index(['user_id', 'last_activity'], 'idx_user_last_activity');
        });

        Schema::table('attendance_records', function (Blueprint $table) {
            // Speed up "last_attendance" subqueries in EmployeeController
            // Note: idx_user_attendance_date already exists, but adding status covers more ground
            $table->index(['user_id', 'status', 'attendance_date'], 'idx_user_status_date');
        });
        
        Schema::table('audit_logs', function (Blueprint $table) {
            // Audit logs can grow huge, indexes on common filter columns are vital
            $table->index('action');
            $table->index(['auditable_type', 'auditable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_sessions', function (Blueprint $table) {
            $table->dropIndex('idx_user_last_activity');
        });

        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropIndex('idx_user_status_date');
        });
        
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['action']);
            $table->dropIndex(['auditable_type', 'auditable_id']);
        });
    }
};
