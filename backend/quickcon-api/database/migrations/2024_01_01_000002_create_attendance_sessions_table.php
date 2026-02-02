<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained('schedules')->onDelete('restrict');
            $table->date('date');
            $table->enum('status', ['pending', 'active', 'locked', 'completed'])->default('pending');
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->dateTime('auto_lock_time')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->timestamps();

            $table->unique(['schedule_id', 'date'], 'unique_schedule_date');
            $table->index('date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
