<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

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
        try {
            // Try native Laravel column modification first
            Schema::table('users', function (Blueprint $table) {
                $table->longText('avatar')->nullable()->change();
            });
        } catch (\Exception $e) {
            // Fallback: Use raw SQL for TiDB/MySQL compatibility
            DB::statement('ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL');
        }
    }

    /**
     * Reverse the migration.
     */
    public function down(): void
    {
        try {
            Schema::table('users', function (Blueprint $table) {
                $table->string('avatar')->nullable()->change();
            });
        } catch (\Exception $e) {
            DB::statement('ALTER TABLE users MODIFY COLUMN avatar VARCHAR(255) NULL');
        }
    }
};
