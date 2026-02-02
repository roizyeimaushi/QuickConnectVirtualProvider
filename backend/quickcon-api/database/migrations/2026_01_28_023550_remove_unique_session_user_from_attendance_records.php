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
        Schema::table('attendance_records', function (Blueprint $table) {
            // Add a regular index for session_id to satisfy the FK constraint
            $table->index('session_id', 'attendance_records_session_id_index');
            // Now we can drop the unique constraint
            $table->dropUnique('unique_session_user');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->unique(['session_id', 'user_id'], 'unique_session_user');
        });
    }
};
