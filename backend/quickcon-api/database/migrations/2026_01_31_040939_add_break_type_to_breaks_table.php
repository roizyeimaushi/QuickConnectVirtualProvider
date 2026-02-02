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
            $table->string('break_type')->nullable()->after('break_date'); // 'Coffee' or 'Meal'
            $table->integer('duration_limit')->nullable()->after('break_type'); // Stored limit in minutes (15 or 60)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('breaks', function (Blueprint $table) {
            $table->dropColumn(['break_type', 'duration_limit']);
        });
    }
};
