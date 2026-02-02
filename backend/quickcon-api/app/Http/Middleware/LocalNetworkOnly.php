<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LocalNetworkOnly
{
    /**
     * Handle an incoming request.
     * Restricts access to only local network IPs or whitelisted IPs.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $clientIp = $request->ip();
        
        // Get whitelisted IPs from environment (comma-separated)
        $allowedIps = array_filter(array_map('trim', explode(',', env('ALLOWED_IPS', ''))));
        
        // Always allow localhost and private network ranges
        $localPatterns = [
            '127.0.0.1',
            '::1',
            // Private network ranges
            '10.*',
            '172.16.*', '172.17.*', '172.18.*', '172.19.*', '172.20.*', '172.21.*',
            '172.22.*', '172.23.*', '172.24.*', '172.25.*', '172.26.*', '172.27.*',
            '172.28.*', '172.29.*', '172.30.*', '172.31.*',
            '192.168.*',
        ];
        
        // Check if IP matches local patterns
        foreach ($localPatterns as $pattern) {
            if ($this->ipMatchesPattern($clientIp, $pattern)) {
                return $next($request);
            }
        }
        
        // Check if IP is in the allowed list
        if (in_array($clientIp, $allowedIps)) {
            return $next($request);
        }
        
        // Check environment - allow access if local restriction is disabled
        if (env('ALLOW_EXTERNAL_ACCESS', false)) {
            return $next($request);
        }
        
        // Block access
        return response()->json([
            'error' => 'Access denied',
            'message' => 'This application is restricted to local network access only.',
            'your_ip' => $clientIp,
        ], 403);
    }
    
    /**
     * Check if IP matches a pattern (supports wildcards)
     */
    private function ipMatchesPattern(string $ip, string $pattern): bool
    {
        if ($pattern === $ip) {
            return true;
        }
        
        // Handle wildcard patterns
        if (str_contains($pattern, '*')) {
            $regex = '/^' . str_replace(['*', '.'], ['.*', '\.'], $pattern) . '$/';
            return preg_match($regex, $ip) === 1;
        }
        
        return false;
    }
}
