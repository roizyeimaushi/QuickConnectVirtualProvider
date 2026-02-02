<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        // Robust check: trim whitespace and lower case both values
        if (!$request->user() || trim(strtolower($request->user()->role)) !== trim(strtolower($role))) {
            
            \Illuminate\Support\Facades\Log::warning('RoleMiddleware: Access Denied', [
                'user_id' => $request->user() ? $request->user()->id : 'null',
                'user_role' => $request->user() ? $request->user()->role : 'null',
                'required_role' => $role,
                'path' => $request->path()
            ]);
            
            return response()->json([
                'message' => 'Access denied - You do not have permission to access this resource'
            ], 403);
        }

        return $next($request);
    }
}
