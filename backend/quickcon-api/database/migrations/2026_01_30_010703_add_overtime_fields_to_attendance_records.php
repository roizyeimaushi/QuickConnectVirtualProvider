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
            $table->unsignedInteger('overtime_minutes')->default(0)->after('hours_worked');
            $table->enum('overtime_status', ['pending', 'approved', 'rejected'])->nullable()->after('overtime_minutes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropColumn(['overtime_minutes', 'overtime_status']);
        });
    }
};
