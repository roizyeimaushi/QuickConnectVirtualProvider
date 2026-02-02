<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Create break_rules table for configurable break policy.
     * Create breaks table for tracking employee break usage.
     */
    public function up(): void
    {
        // Break Rules Table - Configurable break policy
        Schema::create('break_rules', function (Blueprint $table) {
            $table->id();
            $table->time('start_time')->default('12:00:00'); // 12:00 PM
            $table->time('end_time')->default('13:00:00');   // 1:00 PM
            $table->integer('max_minutes')->default(60);      // 60 minutes max
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Breaks Table - Track employee break usage per day
        Schema::create('breaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->constrained('attendance_records')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('break_date');
            $table->dateTime('break_start');
            $table->dateTime('break_end')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->timestamps();

            // One break per attendance record per day
            $table->unique(['attendance_id', 'break_date'], 'unique_attendance_break_per_day');
            // One break per user per day
            $table->unique(['user_id', 'break_date'], 'unique_user_break_per_day');
            
            $table->index('break_date');
        });

        // Insert default break rule
        DB::table('break_rules')->insert([
            'start_time' => '12:00:00',
            'end_time' => '13:00:00',
            'max_minutes' => 60,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('breaks');
        Schema::dropIfExists('break_rules');
    }
};
