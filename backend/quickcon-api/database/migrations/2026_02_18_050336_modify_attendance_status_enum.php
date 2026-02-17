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
        // Modify the ENUM column to include 'incomplete'
        // Using raw statement for maximum compatibility across MySQL/MariaDB versions
        // The previous values were: 'present', 'late', 'absent', 'excused', 'left_early', 'pending'
        DB::statement("ALTER TABLE attendance_records MODIFY COLUMN status ENUM('present', 'late', 'absent', 'excused', 'left_early', 'pending', 'incomplete') NOT NULL DEFAULT 'absent'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original ENUM values
        // WARNING: This will fail if there are records with 'incomplete' status.
        // In a real production rollback, you'd update them first.
        DB::statement("UPDATE attendance_records SET status = 'present' WHERE status = 'incomplete'");
        DB::statement("ALTER TABLE attendance_records MODIFY COLUMN status ENUM('present', 'late', 'absent', 'excused', 'left_early', 'pending') NOT NULL DEFAULT 'absent'");
    }
};
