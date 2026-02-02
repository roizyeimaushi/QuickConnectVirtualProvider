<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'session_id',
        'transaction_id',
        'action',
        'model_type',
        'model_id',
        'description',
        'status',
        'severity',
        'old_values',
        'new_values',
        'ip_address',
        'country',
        'city',
        'user_agent',
        'device_type',
        'browser',
        'browser_version',
        'os',
        'os_version',
        'hash',
        'previous_hash',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Severity levels for action classification
     */
    const SEVERITY_INFO = 'info';
    const SEVERITY_LOW = 'low';
    const SEVERITY_MEDIUM = 'medium';
    const SEVERITY_HIGH = 'high';
    const SEVERITY_CRITICAL = 'critical';

    /**
     * Status values
     */
    const STATUS_SUCCESS = 'success';
    const STATUS_FAILED = 'failed';
    const STATUS_WARNING = 'warning';

    /**
     * Action severity mappings - critical actions are flagged
     */
    protected static $actionSeverityMap = [
        // Critical Security Actions
        'login_failed' => self::SEVERITY_HIGH,
        'password_change' => self::SEVERITY_MEDIUM,
        'permission_change' => self::SEVERITY_CRITICAL,
        'role_change' => self::SEVERITY_CRITICAL,
        'system_restore' => self::SEVERITY_CRITICAL,
        'system_reset' => self::SEVERITY_CRITICAL,
        'clear_audit_logs' => self::SEVERITY_CRITICAL,
        
        // High importance admin actions
        'activate_employee' => self::SEVERITY_HIGH,
        'deactivate_employee' => self::SEVERITY_HIGH,
        'delete_employee' => self::SEVERITY_HIGH,
        'delete_schedule' => self::SEVERITY_HIGH,
        'delete_session' => self::SEVERITY_HIGH,
        
        // Medium importance
        'create_employee' => self::SEVERITY_MEDIUM,
        'update_employee' => self::SEVERITY_MEDIUM,
        'create_schedule' => self::SEVERITY_MEDIUM,
        'update_schedule' => self::SEVERITY_MEDIUM,
        'lock_session' => self::SEVERITY_MEDIUM,
        'unlock_session' => self::SEVERITY_MEDIUM,
        'update_settings' => self::SEVERITY_MEDIUM,
        
        // Low importance
        'create_session' => self::SEVERITY_LOW,
        'export_report' => self::SEVERITY_LOW,
        'update' => self::SEVERITY_LOW,
        
        // Standard actions
        'login' => self::SEVERITY_INFO,
        'logout' => self::SEVERITY_INFO,
    ];

    /**
     * Enhanced logging method with comprehensive data capture.
     *
     * @param string $action Action type (login, create_employee, etc.)
     * @param string $description Human-readable description
     * @param string $status 'success', 'failed', or 'warning'
     * @param int|null $userId User performing the action
     * @param string|null $modelType Related model class name
     * @param int|null $modelId Related model ID
     * @param array|null $oldValues Previous values (for updates)
     * @param array|null $newValues New values (for creates/updates)
     * @param string|null $severity Override auto-detected severity
     * @return self
     */
    public static function log(
        string $action,
        string $description,
        string $status = self::STATUS_SUCCESS,
        ?int $userId = null,
        ?string $modelType = null,
        ?int $modelId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?string $severity = null
    ): self {
        $request = request();
        
        // Parse User Agent for device info
        $userAgent = $request->userAgent() ?? 'Unknown';
        $deviceInfo = self::parseUserAgent($userAgent);
        
        // Get or create session ID for tracking
        $sessionId = session()->getId() ?: ($request->header('X-Session-ID') ?: null);
        
        // Auto-detect severity if not provided
        $severity = $severity ?? (self::$actionSeverityMap[$action] ?? self::SEVERITY_INFO);
        
        // Elevate severity for failed actions
        if ($status === self::STATUS_FAILED && $severity === self::SEVERITY_INFO) {
            $severity = self::SEVERITY_LOW;
        }
        
        // Get the last log's hash for chain integrity
        $lastLog = self::orderBy('id', 'desc')->first();
        $previousHash = $lastLog?->hash;
        
        // Build log data
        $logData = [
            'user_id' => $userId ?? auth()->id(),
            'session_id' => $sessionId,
            'transaction_id' => Str::uuid()->toString(),
            'action' => $action,
            'model_type' => $modelType,
            'model_id' => $modelId,
            'description' => $description,
            'status' => $status,
            'severity' => $severity,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => self::getClientIp($request),
            'user_agent' => $userAgent,
            'device_type' => $deviceInfo['device_type'],
            'browser' => $deviceInfo['browser'],
            'browser_version' => $deviceInfo['browser_version'],
            'os' => $deviceInfo['os'],
            'os_version' => $deviceInfo['os_version'],
            'previous_hash' => $previousHash,
            'created_at' => now(),
        ];
        
        // Generate tamper-proof hash
        $logData['hash'] = self::generateHash($logData);
        
        return self::create($logData);
    }

    /**
     * Legacy log method for backward compatibility.
     * Redirects to enhanced log method.
     */
    public static function logLegacy(
        string $action,
        string $description,
        ?int $userId = null,
        ?string $modelType = null,
        ?int $modelId = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): self {
        return self::log(
            $action,
            $description,
            self::STATUS_SUCCESS,
            $userId,
            $modelType,
            $modelId,
            $oldValues,
            $newValues
        );
    }

    /**
     * Log a failed action (e.g., failed login, failed permission check).
     */
    public static function logFailed(
        string $action,
        string $description,
        ?int $userId = null,
        ?string $modelType = null,
        ?int $modelId = null,
        ?array $details = null
    ): self {
        return self::log(
            $action,
            $description,
            self::STATUS_FAILED,
            $userId,
            $modelType,
            $modelId,
            null,
            $details
        );
    }

    /**
     * Get the real client IP address, handling proxies and load balancers.
     */
    protected static function getClientIp($request): string
    {
        // Check for forwarded headers (in order of preference)
        $headers = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_X_FORWARDED_FOR',      // Standard proxy
            'HTTP_X_REAL_IP',            // Nginx proxy
            'HTTP_CLIENT_IP',            // General
            'HTTP_X_CLUSTER_CLIENT_IP',  // Cluster
        ];

        foreach ($headers as $header) {
            $ip = $request->server($header);
            if ($ip) {
                // X-Forwarded-For may contain multiple IPs, get the first one
                $ips = explode(',', $ip);
                $clientIp = trim($ips[0]);
                
                // Validate IP
                if (filter_var($clientIp, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $clientIp;
                }
            }
        }

        // Fall back to direct IP
        return $request->ip() ?? '0.0.0.0';
    }

    /**
     * Parse User-Agent string to extract device, browser, and OS information.
     */
    protected static function parseUserAgent(string $userAgent): array
    {
        $result = [
            'device_type' => 'desktop',
            'browser' => 'Unknown',
            'browser_version' => null,
            'os' => 'Unknown',
            'os_version' => null,
        ];

        // Device type detection
        $mobileKeywords = ['Mobile', 'Android', 'iPhone', 'iPad', 'iPod', 'webOS', 'BlackBerry', 'Opera Mini', 'IEMobile'];
        $tabletKeywords = ['iPad', 'Tablet', 'PlayBook', 'Silk'];

        foreach ($tabletKeywords as $keyword) {
            if (stripos($userAgent, $keyword) !== false) {
                $result['device_type'] = 'tablet';
                break;
            }
        }

        if ($result['device_type'] !== 'tablet') {
            foreach ($mobileKeywords as $keyword) {
                if (stripos($userAgent, $keyword) !== false) {
                    $result['device_type'] = 'mobile';
                    break;
                }
            }
        }

        // Browser detection
        $browsers = [
            'Edge' => '/Edge\/(\d+[\.\d]+)/',
            'Edg' => '/Edg\/(\d+[\.\d]+)/',       // Chromium Edge
            'Chrome' => '/Chrome\/(\d+[\.\d]+)/',
            'Firefox' => '/Firefox\/(\d+[\.\d]+)/',
            'Safari' => '/Safari\/(\d+[\.\d]+)/',
            'Opera' => '/Opera\/(\d+[\.\d]+)/',
            'OPR' => '/OPR\/(\d+[\.\d]+)/',       // Opera new
            'MSIE' => '/MSIE (\d+[\.\d]+)/',
            'Trident' => '/Trident.*rv:(\d+[\.\d]+)/', // IE 11
        ];

        foreach ($browsers as $browser => $pattern) {
            if (preg_match($pattern, $userAgent, $matches)) {
                $result['browser'] = ($browser === 'Edg') ? 'Edge' : (($browser === 'OPR') ? 'Opera' : (($browser === 'Trident') ? 'IE' : $browser));
                $result['browser_version'] = $matches[1] ?? null;
                break;
            }
        }

        // OS detection
        $osPatterns = [
            'Windows 11' => '/Windows NT 10\.0.*Win64/',
            'Windows 10' => '/Windows NT 10\.0/',
            'Windows 8.1' => '/Windows NT 6\.3/',
            'Windows 8' => '/Windows NT 6\.2/',
            'Windows 7' => '/Windows NT 6\.1/',
            'Mac OS X' => '/Mac OS X (\d+[_\.]\d+[_\.\d]*)/',
            'iOS' => '/OS (\d+[_\.]\d+)/',
            'Android' => '/Android (\d+[\.\d]*)/',
            'Linux' => '/Linux/',
            'Ubuntu' => '/Ubuntu/',
            'Chrome OS' => '/CrOS/',
        ];

        foreach ($osPatterns as $os => $pattern) {
            if (preg_match($pattern, $userAgent, $matches)) {
                $result['os'] = $os;
                if (isset($matches[1])) {
                    $result['os_version'] = str_replace('_', '.', $matches[1]);
                }
                break;
            }
        }

        return $result;
    }

    /**
     * Generate SHA-256 hash for tamper detection.
     * Includes previous hash for chain integrity.
     */
    protected static function generateHash(array $data): string
    {
        $hashData = [
            'user_id' => $data['user_id'],
            'action' => $data['action'],
            'description' => $data['description'],
            'status' => $data['status'],
            'ip_address' => $data['ip_address'],
            'created_at' => $data['created_at']->toIso8601String(),
            'previous_hash' => $data['previous_hash'],
        ];

        return hash('sha256', json_encode($hashData));
    }

    /**
     * Verify the integrity of a log entry by checking its hash.
     */
    public function verifyIntegrity(): bool
    {
        $data = [
            'user_id' => $this->user_id,
            'action' => $this->action,
            'description' => $this->description,
            'status' => $this->status,
            'ip_address' => $this->ip_address,
            'created_at' => $this->created_at->toIso8601String(),
            'previous_hash' => $this->previous_hash,
        ];

        return hash('sha256', json_encode($data)) === $this->hash;
    }

    /**
     * Check integrity of entire audit log chain.
     */
    public static function verifyChainIntegrity(): array
    {
        $logs = self::orderBy('id', 'asc')->get();
        $results = ['valid' => true, 'broken_at' => null, 'checked' => 0];
        $previousHash = null;

        foreach ($logs as $log) {
            $results['checked']++;
            
            // Verify individual log integrity
            if (!$log->verifyIntegrity()) {
                $results['valid'] = false;
                $results['broken_at'] = $log->id;
                break;
            }

            // Verify chain link
            if ($previousHash !== null && $log->previous_hash !== $previousHash) {
                $results['valid'] = false;
                $results['broken_at'] = $log->id;
                break;
            }

            $previousHash = $log->hash;
        }

        return $results;
    }

    /**
     * Scope: Filter by severity levels.
     */
    public function scopeCritical($query)
    {
        return $query->whereIn('severity', [self::SEVERITY_HIGH, self::SEVERITY_CRITICAL]);
    }

    /**
     * Scope: Filter failed actions only.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    /**
     * Scope: Filter by action type.
     */
    public function scopeOfAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope: Filter by date range.
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Get formatted device info string.
     */
    public function getDeviceInfoAttribute(): string
    {
        $parts = [];
        
        if ($this->browser) {
            $browser = $this->browser;
            if ($this->browser_version) {
                $browser .= ' ' . explode('.', $this->browser_version)[0]; // Just major version
            }
            $parts[] = $browser;
        }
        
        if ($this->os) {
            $os = $this->os;
            if ($this->os_version) {
                $os .= ' ' . $this->os_version;
            }
            $parts[] = $os;
        }
        
        if ($this->device_type && $this->device_type !== 'desktop') {
            $parts[] = ucfirst($this->device_type);
        }
        
        return implode(' / ', $parts) ?: 'Unknown Device';
    }

    /**
     * Get severity badge color class.
     */
    public function getSeverityColorAttribute(): string
    {
        return match ($this->severity) {
            self::SEVERITY_CRITICAL => 'bg-red-500',
            self::SEVERITY_HIGH => 'bg-orange-500',
            self::SEVERITY_MEDIUM => 'bg-yellow-500',
            self::SEVERITY_LOW => 'bg-blue-500',
            default => 'bg-gray-500',
        };
    }
}
