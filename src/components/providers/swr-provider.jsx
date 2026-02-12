"use client";

import { SWRConfig } from 'swr';
import { swrDefaultOptions } from '@/lib/swr-hooks';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

/**
 * SWR Provider with global configuration
 * Wraps the entire app to provide SWR context with error handling
 */
export function SWRProvider({ children }) {
    const { toast } = useToast();

    // Global error handler for SWR
    const onError = useCallback((error, key) => {
        // Don't show toast for 401 errors (handled by auth)
        if (error?.status === 401) {
            return;
        }

        // Don't show toast for aborted requests
        if (error?.name === 'AbortError') {
            return;
        }

        // Show toast for other errors
        console.error(`SWR Error [${key}]:`, error);

        // Only show toast for persistent errors (after retries)
        if (error?.status >= 500) {
            toast({
                title: "Connection Error",
                description: "Having trouble connecting to the server. Data will refresh automatically when connection is restored.",
                variant: "destructive",
            });
        }
    }, [toast]);

    // Global success handler - called when data is successfully fetched
    // Dispatches a custom event so ConnectionStatus can track real sync times
    const onSuccess = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('swr:sync'));
        }
    }, []);

    return (
        <SWRConfig
            value={{
                ...swrDefaultOptions,
                onError,
                onSuccess,
                // Provider-level configuration
                provider: () => new Map(), // In-memory cache
            }}
        >
            {children}
        </SWRConfig>
    );
}
