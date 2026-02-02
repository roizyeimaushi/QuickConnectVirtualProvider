<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds device info and location tracking to attendance records.
     */
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            // Device Information
            $table->string('device_type', 50)->nullable()->after('ip_address'); // laptop, desktop, mobile, tablet
            $table->string('device_name', 100)->nullable()->after('device_type'); // e.g., "Fujitsu Laptop", "iPhone 15"
            $table->string('browser', 100)->nullable()->after('device_name'); // e.g., "Chrome 120", "Safari 17"
            $table->string('os', 100)->nullable()->after('browser'); // e.g., "Windows 11", "macOS Sonoma"
            
            // Location Information
            $table->decimal('latitude', 10, 8)->nullable()->after('os');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
            $table->string('location_address', 255)->nullable()->after('longitude'); // Reverse geocoded address
            $table->string('location_city', 100)->nullable()->after('location_address');
            $table->string('location_country', 100)->nullable()->after('location_city');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->dropColumn([
                'device_type',
                'device_name',
                'browser',
                'os',
                'latitude',
                'longitude',
                'location_address',
                'location_city',
                'location_country',
            ]);
        });
    }
};
