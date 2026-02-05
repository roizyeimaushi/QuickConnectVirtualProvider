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
            $table->boolean('attendance_required')->default(true)->after('status');
            $table->string('session_type')->default('Normal')->after('attendance_required'); // Normal, Emergency, Holiday, etc.
            $table->string('completion_reason')->nullable()->after('session_type');
            $table->timestamp('locked_at')->nullable()->after('completion_reason');
            $table->foreignId('locked_by')->nullable()->constrained('users')->onDelete('set null')->after('locked_at');
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
