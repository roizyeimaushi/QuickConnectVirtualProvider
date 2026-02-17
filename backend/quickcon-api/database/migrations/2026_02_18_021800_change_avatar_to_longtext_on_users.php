<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migration.
     * 
     * Changes the avatar column from VARCHAR(255) to LONGTEXT
     * to support base64 data URI storage for profile pictures.
     * This is needed because Railway/Render have ephemeral filesystems
     * that wipe local storage on every redeploy.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->longText('avatar')->nullable()->change();
        });
    }

    /**
     * Reverse the migration.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar')->nullable()->change();
        });
    }
};
