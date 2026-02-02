<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Using raw SQL because Schema builder support for modifying ENUMs is limited/tricky across drivers
        DB::statement("ALTER TABLE attendance_records MODIFY COLUMN status ENUM('present', 'late', 'absent', 'excused', 'left_early', 'pending') NOT NULL DEFAULT 'absent'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE attendance_records MODIFY COLUMN status ENUM('present', 'late', 'absent') NOT NULL");
    }
};
