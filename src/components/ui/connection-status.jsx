'use client';

import { useRealTime } from '@/components/providers/realtime-provider';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Real-time connection status indicator
 * Shows green dot when connected, red when disconnected
 */
export function ConnectionStatus({ className, showLabel = false }) {
    const { isConnected, connectionStatus, refreshAll } = useRealTime();

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity",
                            className
                        )}
                        onClick={refreshAll}
                        role="button"
                        aria-label={isConnected ? "Real-time connected" : "Real-time disconnected"}
                    >
                        <div className="relative">
                            {isConnected ? (
                                <Wifi className="h-4 w-4 text-emerald-500" />
                            ) : (
                                <WifiOff className="h-4 w-4 text-red-500" />
                            )}
                            <span
                                className={cn(
                                    "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
                                    isConnected
                                        ? "bg-emerald-500 animate-pulse"
                                        : "bg-red-500"
                                )}
                            />
                        </div>
                        {showLabel && (
                            <span className={cn(
                                "text-xs font-medium",
                                isConnected ? "text-emerald-600" : "text-red-600"
                            )}>
                                {isConnected ? "Live" : "Offline"}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <>
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span>Real-time updates active</span>
                            </>
                        ) : (
                            <>
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                <span>Not connected - click to refresh</span>
                            </>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Floating refresh button for manual data refresh
 */
export function RefreshButton({ className }) {
    const { refreshAll, isConnected } = useRealTime();

    return (
        <button
            onClick={refreshAll}
            className={cn(
                "p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors",
                "text-primary hover:text-primary/80",
                className
            )}
            aria-label="Refresh all data"
        >
            <RefreshCw className="h-4 w-4" />
        </button>
    );
}

export default ConnectionStatus;
