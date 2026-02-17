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
        // Use try-catch for each index to make migration idempotent
        // (indexes may already exist from a previous partial run)
        try {
            Schema::table('user_sessions', function (Blueprint $table) {
                $table->index(['user_id', 'last_activity'], 'idx_user_last_activity');
            });
        } catch (\Exception $e) {
            // Index already exists, skip
        }

        try {
            Schema::table('attendance_records', function (Blueprint $table) {
                $table->index(['user_id', 'status', 'attendance_date'], 'idx_user_status_date');
            });
        } catch (\Exception $e) {
            // Index already exists, skip
        }
        
        try {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->index('action');
                $table->index(['auditable_type', 'auditable_id']);
            });
        } catch (\Exception $e) {
            // Index already exists, skip
        }
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
