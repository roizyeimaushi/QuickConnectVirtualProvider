"use client";

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnlineStatus, invalidateAllCache } from '@/lib/swr-hooks';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Connection Status Indicator
 * Shows real-time connection status and provides manual refresh option
 */
export function ConnectionStatus({ className }) {
    const isOnline = useOnlineStatus();
    const [lastSync, setLastSync] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Update last sync time when page becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setLastSync(new Date());
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Update sync time periodically
    useEffect(() => {
        const interval = setInterval(() => {
            setLastSync(new Date());
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
    }, []);

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        invalidateAllCache();
        setLastSync(new Date());

        // Visual feedback
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1000);
    };

    const formatSyncTime = (date) => {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 5) return 'Just now';
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <TooltipProvider>
            <div className={cn("flex items-center gap-2", className)}>
                {/* Connection Status */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                            {isOnline ? (
                                <>
                                    <Wifi className="h-3.5 w-3.5 text-green-500" />
                                    <span className="text-xs text-muted-foreground hidden sm:inline">
                                        Live
                                    </span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="h-3.5 w-3.5 text-red-500" />
                                    <span className="text-xs text-red-500 hidden sm:inline">
                                        Offline
                                    </span>
                                </>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>
                            {isOnline
                                ? `Connected • Last sync: ${formatSyncTime(lastSync)}`
                                : 'No internet connection. Data may be stale.'
                            }
                        </p>
                    </TooltipContent>
                </Tooltip>

                {/* Manual Refresh Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleManualRefresh}
                            disabled={isRefreshing || !isOnline}
                        >
                            <RefreshCw
                                className={cn(
                                    "h-3.5 w-3.5",
                                    isRefreshing && "animate-spin"
                                )}
                            />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Refresh all data</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
