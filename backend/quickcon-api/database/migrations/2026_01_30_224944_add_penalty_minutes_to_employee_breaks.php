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
            $table->integer('penalty_minutes')->default(0)->after('duration_minutes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('breaks', function (Blueprint $table) {
            $table->dropColumn('penalty_minutes');
        });
    }
};
