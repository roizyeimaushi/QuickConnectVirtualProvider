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
     */
    public function stream(Request $request)
    {
        $user = $request->user();
        
        return new StreamedResponse(function() use ($user) {
            // Set headers for SSE
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');
            header('X-Accel-Buffering: no');
            
            // Keep track of last notification count
            $lastUnreadCount = -1;
            $lastNotificationId = null;
            
            // Send initial connection message
            echo "event: connected\n";
            echo "data: " . json_encode(['status' => 'connected', 'timestamp' => now()->toISOString()]) . "\n\n";
            ob_flush();
            flush();
            
            // Keep connection alive and check for new notifications
            $iterations = 0;
            $maxIterations = 30; // 5 minutes max (checking every 10 seconds)
            
            while ($iterations < $maxIterations) {
                // Refresh user model to get latest notifications
                $user->refresh();
                
                $currentUnreadCount = $user->unreadNotifications->count();
                $latestNotification = $user->notifications()->first();
                $currentLatestId = $latestNotification ? $latestNotification->id : null;
                
                // Check if there are new notifications
                if ($currentUnreadCount !== $lastUnreadCount || $currentLatestId !== $lastNotificationId) {
                    $notifications = $user->notifications()->limit(20)->get();
                    
                    echo "event: notification\n";
                    echo "data: " . json_encode([
                        'notifications' => $notifications,
                        'unreadCount' => $currentUnreadCount,
                        'timestamp' => now()->toISOString()
                    ]) . "\n\n";
                    ob_flush();
                    flush();
                    
                    $lastUnreadCount = $currentUnreadCount;
                    $lastNotificationId = $currentLatestId;
                }
                
                // Send heartbeat every 3 iterations (30 seconds)
                if ($iterations % 3 === 0 && $iterations > 0) {
                    echo "event: heartbeat\n";
                    echo "data: " . json_encode(['timestamp' => now()->toISOString()]) . "\n\n";
                    ob_flush();
                    flush();
                }
                
                // Check connection is still alive
                if (connection_aborted()) {
                    break;
                }
                
                $iterations++;
                sleep(10); // Check every 10 seconds to reduce PHP worker blocking
            }
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
