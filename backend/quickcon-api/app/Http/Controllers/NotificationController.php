<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        // Return latest notifications
        return response()->json($request->user()->notifications()->limit(20)->get());
    }

    /**
     * Server-Sent Events endpoint for real-time notifications
     * 
     * SHORT-LIVED APPROACH: Holds the PHP worker for max ~30 seconds,
     * then ends the stream. The frontend auto-reconnects creating a
     * polling-like SSE pattern that doesn't exhaust the PHP-FPM worker pool.
     * 
     * For true long-lived connections, use WebSocket (Laravel Reverb) instead.
     */
    public function stream(Request $request)
    {
        $user = $request->user();
        
        return new StreamedResponse(function() use ($user) {
            // Keep track of last notification count
            $lastUnreadCount = -1;
            $lastNotificationId = null;
            
            // Send initial connection message
            echo "event: connected\n";
            echo "data: " . json_encode(['status' => 'connected', 'timestamp' => now()->toISOString()]) . "\n\n";
            if (ob_get_level()) ob_flush();
            flush();
            
            // Short-lived loop: only hold the worker for ~30 seconds (3 iterations × 10s)
            // The frontend auto-reconnects when the stream ends, creating effective polling
            $iterations = 0;
            $maxIterations = 3;
            
            while ($iterations < $maxIterations) {
                // Check connection is still alive before doing work
                if (connection_aborted()) {
                    break;
                }

                // Refresh user model to get latest notifications
                $user->refresh();
                
                $currentUnreadCount = $user->unreadNotifications->count();
                $latestNotification = $user->notifications()->first();
                $currentLatestId = $latestNotification ? $latestNotification->id : null;
                
                // Check if there are new or changed notifications
                if ($currentUnreadCount !== $lastUnreadCount || $currentLatestId !== $lastNotificationId) {
                    $notifications = $user->notifications()->limit(20)->get();
                    
                    echo "event: notification\n";
                    echo "data: " . json_encode([
                        'notifications' => $notifications,
                        'unreadCount' => $currentUnreadCount,
                        'timestamp' => now()->toISOString()
                    ]) . "\n\n";
                    if (ob_get_level()) ob_flush();
                    flush();
                    
                    $lastUnreadCount = $currentUnreadCount;
                    $lastNotificationId = $currentLatestId;
                }
                
                $iterations++;

                // Don't sleep after the last iteration — just end gracefully
                if ($iterations < $maxIterations) {
                    sleep(10);
                }
            }

            // Send end-of-stream so frontend knows to reconnect
            echo "event: end\n";
            echo "data: " . json_encode(['reason' => 'cycle_complete', 'timestamp' => now()->toISOString()]) . "\n\n";
            if (ob_get_level()) ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();
        if ($notification) {
            $notification->markAsRead();
        }
        return response()->json(['message' => 'Marked as read']);
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'All marked as read']);
    }
}
