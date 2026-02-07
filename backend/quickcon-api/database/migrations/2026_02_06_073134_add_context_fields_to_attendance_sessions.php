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
        Schema::table('attendance_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance_sessions', 'attendance_required')) {
                $table->boolean('attendance_required')->default(true)->after('status');
            }
            if (!Schema::hasColumn('attendance_sessions', 'session_type')) {
                $table->string('session_type')->default('Normal')->after('attendance_required');
            }
            if (!Schema::hasColumn('attendance_sessions', 'completion_reason')) {
                $table->string('completion_reason')->nullable()->after('session_type');
            }
            if (!Schema::hasColumn('attendance_sessions', 'locked_at')) {
                $table->timestamp('locked_at')->nullable()->after('completion_reason');
            }
            if (!Schema::hasColumn('attendance_sessions', 'locked_by')) {
                $table->foreignId('locked_by')->nullable()->constrained('users')->onDelete('set null')->after('locked_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_sessions', function (Blueprint $table) {
            $table->dropForeign(['locked_by']);
            $table->dropColumn(['attendance_required', 'session_type', 'completion_reason', 'locked_at', 'locked_by']);
        });
    }
};
