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
        Schema::table('breaks', function (Blueprint $table) {
            // Drop Foreign Keys first to free up the indices
            $table->dropForeign(['attendance_id']);
            $table->dropForeign(['user_id']);

            // Drop Unique Constraints
            $table->dropUnique('unique_attendance_break_per_day');
            $table->dropUnique('unique_user_break_per_day');

            // Add standard indices for performance
            $table->index('attendance_id');
            $table->index('user_id');

            // Restore Foreign Keys
            $table->foreign('attendance_id')->references('id')->on('attendance_records')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('breaks', function (Blueprint $table) {
            // Drop Foreign Keys
            $table->dropForeign(['attendance_id']);
            $table->dropForeign(['user_id']);

            // Drop standard indices
            $table->dropIndex(['attendance_id']);
            $table->dropIndex(['user_id']);

            // Restore Unique Constraints
            $table->unique(['attendance_id', 'break_date'], 'unique_attendance_break_per_day');
            $table->unique(['user_id', 'break_date'], 'unique_user_break_per_day');

            // Restore Foreign Keys
            $table->foreign('attendance_id')->references('id')->on('attendance_records')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
