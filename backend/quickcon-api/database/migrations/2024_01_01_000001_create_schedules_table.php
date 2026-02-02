<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->time('time_in')->comment('24-hour format HH:mm');
            $table->time('break_time')->comment('24-hour format HH:mm');
            $table->time('time_out')->comment('24-hour format HH:mm');
            $table->unsignedInteger('grace_period_minutes')->default(15);
            $table->unsignedInteger('late_threshold_minutes')->default(30);
            $table->boolean('is_overnight')->default(false)->comment('For night shifts crossing midnight');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
