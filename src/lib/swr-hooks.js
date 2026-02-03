"use client";

import useSWR, { mutate as globalMutate } from 'swr';
import { API_BASE_URL } from './constants';
import Cookies from 'js-cookie';

/**
 * SWR Configuration & Custom Hooks for Real-Time Data
 * 
 * Features:
 * - Auto-revalidation on focus
 * - Auto-revalidation on reconnect
 * - Polling intervals for critical data
 * - Optimistic updates
 * - Error retry with exponential backoff
 */

// ============================================
// FETCHER FUNCTION
// ============================================

/**
 * Universal fetcher for SWR that uses auth token
 */
const fetcher = async (url) => {
    const token = typeof window !== 'undefined'
        ? (localStorage.getItem('quickcon_token') || Cookies.get('quickcon_token'))
        : null;

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, {
        headers,
        credentials: 'include',
    });

    if (!response.ok) {
        const error = new Error('An error occurred while fetching the data.');
        error.info = await response.json().catch(() => ({}));
        error.status = response.status;
        throw error;
    }

    return response.json();
};

// ============================================
// SWR DEFAULT OPTIONS
// ============================================

export const swrDefaultOptions = {
    fetcher,
    revalidateOnFocus: true,           // Refetch when tab gains focus
    revalidateOnReconnect: true,       // Refetch when network reconnects
    shouldRetryOnError: true,          // Retry on error
    errorRetryCount: 3,                // Max retries
    errorRetryInterval: 5000,          // Wait 5s between retries
    dedupingInterval: 2000,            // Dedupe requests within 2s
    focusThrottleInterval: 5000,       // Throttle focus revalidation
};

// Polling intervals (in milliseconds)
// NOTE: With WebSocket real-time updates active, polling serves as FALLBACK only
// Real-time updates are pushed via Laravel Reverb WebSocket, polling catches edge cases
export const POLLING_INTERVALS = {
    FAST: 30000,     // 30 seconds - fallback for live attendance status (WebSocket primary)
    NORMAL: 60000,   // 60 seconds - fallback for dashboard data (WebSocket primary)
    SLOW: 120000,    // 2 minutes - fallback for lists/reports
    NONE: 0,         // No polling (fully rely on WebSocket)
};

// ============================================
// ATTENDANCE HOOKS
// ============================================

/**
 * Get today's attendance record for current user
 * Polls frequently for live status
 */
export function useMyAttendanceToday(options = {}) {
    const { data, error, isLoading, mutate } = useSWR(
        '/attendance/today',
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.FAST,
            ...options,
        }
    );

    return {
        attendance: data?.data || data,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

/**
 * Get attendance records (admin)
 */
export function useAttendanceRecords(params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const key = `/attendance${queryString ? `?${queryString}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.NORMAL,
            ...options,
        }
    );

    return {
        records: data?.data || [],
        pagination: data?.meta || data?.pagination,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

// ============================================
// SESSION HOOKS
// ============================================

/**
 * Get today's session for current user
 */
export function useSessionToday(options = {}) {
    const { data, error, isLoading, mutate } = useSWR(
        '/sessions/today',
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.FAST,
            ...options,
        }
    );

    return {
        session: data?.data || data?.session || data,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

/**
 * Get all sessions (admin)
 */
export function useSessions(params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const key = `/sessions${queryString ? `?${queryString}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.NORMAL,
            ...options,
        }
    );

    return {
        sessions: data?.data || [],
        pagination: data?.meta,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

// ============================================
// BREAK HOOKS
// ============================================

/**
 * Get today's break status for current user
 */
export function useMyBreakToday(options = {}) {
    const { data, error, isLoading, mutate } = useSWR(
        '/breaks/today',
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.FAST,
            ...options,
        }
    );

    return {
        breakData: data?.data || data,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

// ============================================
// EMPLOYEE HOOKS
// ============================================

/**
 * Get all employees
 */
export function useEmployees(params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const key = `/employees${queryString ? `?${queryString}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.SLOW,
            ...options,
        }
    );

    return {
        employees: data?.data || [],
        pagination: data?.meta,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

/**
 * Get single employee
 */
export function useEmployee(id, options = {}) {
    const { data, error, isLoading, mutate } = useSWR(
        id ? `/employees/${id}` : null,
        fetcher,
        {
            ...swrDefaultOptions,
            ...options,
        }
    );

    return {
        employee: data?.data || data,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

// ============================================
// SCHEDULE HOOKS
// ============================================

/**
 * Get all schedules
 */
export function useSchedules(params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const key = `/schedules${queryString ? `?${queryString}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.SLOW,
            ...options,
        }
    );

    return {
        schedules: data?.data || [],
        pagination: data?.meta,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

// ============================================
// DASHBOARD HOOKS
// ============================================

/**
 * Get dashboard stats
 */
export function useDashboardStats(options = {}) {
    const { data, error, isLoading, mutate } = useSWR(
        '/dashboard/stats',
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.NORMAL,
            ...options,
        }
    );

    return {
        stats: data?.data || data,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

/**
 * Get employee dashboard data
 */
export function useEmployeeDashboard(options = {}) {
    const { data, error, isLoading, mutate } = useSWR(
        '/dashboard/employee',
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.NORMAL,
            ...options,
        }
    );

    return {
        dashboard: data?.data || data,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

// ============================================
// REPORTS HOOKS
// ============================================

/**
 * Get daily report
 */
export function useDailyReport(date, options = {}) {
    const { data, error, isLoading, mutate } = useSWR(
        date ? `/reports/daily?date=${date}` : null,
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.SLOW,
            ...options,
        }
    );

    return {
        report: data?.data || data,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

// ============================================
// NOTIFICATIONS HOOKS
// ============================================

/**
 * Get notifications
 */
export function useNotifications(options = {}) {
    const { data, error, isLoading, mutate } = useSWR(
        '/notifications',
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.NORMAL,
            ...options,
        }
    );

    return {
        notifications: data?.data || [],
        unreadCount: data?.unread_count || 0,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

// ============================================
// AUDIT LOG HOOKS
// ============================================

/**
 * Get audit logs (admin)
 */
export function useAuditLogs(params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const key = `/audit-logs${queryString ? `?${queryString}` : ''}`;

    const { data, error, isLoading, mutate } = useSWR(
        key,
        fetcher,
        {
            ...swrDefaultOptions,
            refreshInterval: options.polling ?? POLLING_INTERVALS.SLOW,
            ...options,
        }
    );

    return {
        logs: data?.data || [],
        pagination: data?.meta,
        isLoading,
        isError: error,
        mutate,
        refresh: () => mutate(),
    };
}

// ============================================
// GLOBAL CACHE UTILITIES
// ============================================

/**
 * Invalidate all cached data (useful after mutations)
 */
export function invalidateAllCache() {
    globalMutate(() => true, undefined, { revalidate: true });
}

/**
 * Invalidate specific cache key
 */
export function invalidateCache(key) {
    globalMutate(key);
}

/**
 * Invalidate all attendance-related caches
 */
export function invalidateAttendanceCache() {
    globalMutate((key) => typeof key === 'string' && key.includes('/attendance'));
    globalMutate('/sessions/today');
    globalMutate('/breaks/today');
}

/**
 * Invalidate all session-related caches
 */
export function invalidateSessionCache() {
    globalMutate((key) => typeof key === 'string' && key.includes('/sessions'));
}

/**
 * Invalidate all employee-related caches
 */
export function invalidateEmployeeCache() {
    globalMutate((key) => typeof key === 'string' && key.includes('/employees'));
}

// ============================================
// VISIBILITY-BASED REFRESH HOOK
// ============================================

import { useEffect, useCallback } from 'react';

/**
 * Hook that triggers refresh when page becomes visible
 */
export function useVisibilityRefresh(refreshFn) {
    const handleVisibilityChange = useCallback(() => {
        if (document.visibilityState === 'visible' && refreshFn) {
            refreshFn();
        }
    }, [refreshFn]);

    useEffect(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [handleVisibilityChange]);
}

// ============================================
// ONLINE STATUS HOOK
// ============================================

import { useState } from 'react';

/**
 * Hook that tracks online/offline status
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

export { useSWR, globalMutate as mutate };
