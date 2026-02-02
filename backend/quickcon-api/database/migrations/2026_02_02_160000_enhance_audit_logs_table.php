<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Enhanced audit logging for security, compliance, and forensic readiness.
     * 
     * New fields:
     * - status: success/failed/warning
     * - severity: info/low/medium/high/critical
     * - session_id: unique session identifier for tracking multi-step actions
     * - transaction_id: UUID for grouping related actions
     * - device_type: desktop/mobile/tablet
     * - browser: Chrome, Firefox, Safari, etc.
     * - os: Windows, macOS, Linux, iOS, Android
     * - location: Country/City (if resolved)
     * - hash: SHA-256 hash for tamper detection
     */
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            // Status tracking (success/failed)
            $table->enum('status', ['success', 'failed', 'warning'])->default('success')->after('description');
            
            // Severity levels for critical action flagging
            $table->enum('severity', ['info', 'low', 'medium', 'high', 'critical'])->default('info')->after('status');
            
            // Session tracking for multi-step actions
            $table->string('session_id', 100)->nullable()->after('user_id');
            
            // Transaction ID for grouping related actions
            $table->uuid('transaction_id')->nullable()->after('session_id');
            
            // Enhanced device information
            $table->string('device_type', 20)->nullable()->after('user_agent'); // desktop, mobile, tablet
            $table->string('browser', 50)->nullable()->after('device_type');
            $table->string('browser_version', 20)->nullable()->after('browser');
            $table->string('os', 50)->nullable()->after('browser_version');
            $table->string('os_version', 20)->nullable()->after('os');
            
            // Geolocation (optional, requires IP lookup service)
            $table->string('country', 100)->nullable()->after('ip_address');
            $table->string('city', 100)->nullable()->after('country');
            
            // Tamper-proof hash (SHA-256 of log content)
            $table->string('hash', 64)->nullable()->after('created_at');
            
            // Previous log hash for chain integrity
            $table->string('previous_hash', 64)->nullable()->after('hash');
            
            // Additional indexes for performance
            $table->index('status');
            $table->index('severity');
            $table->index('session_id');
            $table->index('transaction_id');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn([
                'status',
                'severity',
                'session_id',
                'transaction_id',
                'device_type',
                'browser',
                'browser_version',
                'os',
                'os_version',
                'country',
                'city',
                'hash',
                'previous_hash',
            ]);
        });
    }
};
