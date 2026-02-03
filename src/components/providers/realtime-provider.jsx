'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './auth-provider';
import { initializeEcho, disconnectEcho, getEcho } from '@/lib/echo';
import { useSWRConfig } from 'swr';

const RealTimeContext = createContext(null);

/**
 * Real-time provider that manages WebSocket connections and event subscriptions
 * Integrates with SWR for automatic cache invalidation on real-time updates
 */
export function RealTimeProvider({ children }) {
    const { isAuthenticated, token, user } = useAuth();
    const { mutate } = useSWRConfig();
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const channelsRef = useRef({});
    const echoRef = useRef(null);

    // Initialize Echo when authenticated
    useEffect(() => {
        if (!isAuthenticated || !token) {
            if (echoRef.current) {
                disconnectEcho();
                echoRef.current = null;
                setIsConnected(false);
                setConnectionStatus('disconnected');
            }
            return;
        }

        // Initialize Echo
        const echo = initializeEcho(token);
        if (echo) {
            echoRef.current = echo;
            setIsConnected(true);
            setConnectionStatus('connected');
            console.log('[RealTime] Connected to WebSocket server');
        }

        return () => {
            disconnectEcho();
            echoRef.current = null;
            setIsConnected(false);
        };
    }, [isAuthenticated, token]);

    // Subscribe to public attendance channel
    useEffect(() => {
        const echo = getEcho();
        if (!echo || !isConnected) return;

        // Public attendance channel - everyone can listen
        const attendanceChannel = echo.channel('attendance');
        channelsRef.current.attendance = attendanceChannel;

        attendanceChannel
            .listen('.attendance.updated', (data) => {
                console.log('[RealTime] Attendance updated:', data);
                // Invalidate SWR cache for attendance-related data
                mutate('/attendance/today');
                mutate('/attendance');
                mutate((key) => typeof key === 'string' && key.includes('/attendance'), undefined, { revalidate: true });
                mutate((key) => typeof key === 'string' && key.includes('/reports'), undefined, { revalidate: true });
            })
            .listen('.break.updated', (data) => {
                console.log('[RealTime] Break updated:', data);
                // Invalidate break-related data
                mutate('/breaks/status');
                mutate('/attendance/today');
                mutate((key) => typeof key === 'string' && key.includes('/attendance'), undefined, { revalidate: true });
            });

        // Public sessions channel
        const sessionsChannel = echo.channel('sessions');
        channelsRef.current.sessions = sessionsChannel;

        sessionsChannel
            .listen('.session.updated', (data) => {
                console.log('[RealTime] Session updated:', data);
                // Invalidate session-related data
                mutate('/sessions/active');
                mutate('/sessions/today');
                mutate('/sessions');
                mutate((key) => typeof key === 'string' && key.includes('/sessions'), undefined, { revalidate: true });
            });

        return () => {
            echo.leave('attendance');
            echo.leave('sessions');
        };
    }, [isConnected, mutate]);

    // Subscribe to user-specific private channel
    useEffect(() => {
        const echo = getEcho();
        if (!echo || !isConnected || !user?.id) return;

        // Private user channel - for user-specific updates
        const userChannel = echo.private(`user.${user.id}`);
        channelsRef.current[`user.${user.id}`] = userChannel;

        userChannel
            .listen('.attendance.updated', (data) => {
                console.log('[RealTime] My attendance updated:', data);
                mutate('/attendance/today');
                mutate('/attendance/me');
            })
            .listen('.break.updated', (data) => {
                console.log('[RealTime] My break updated:', data);
                mutate('/breaks/status');
                mutate('/attendance/today');
            })
            .listen('.notification.created', (data) => {
                console.log('[RealTime] New notification:', data);
                mutate('/notifications');
                mutate((key) => typeof key === 'string' && key.includes('/notifications'), undefined, { revalidate: true });
            });

        return () => {
            echo.leave(`user.${user.id}`);
        };
    }, [isConnected, user?.id, mutate]);

    // Subscribe to admin-only channels
    useEffect(() => {
        const echo = getEcho();
        if (!echo || !isConnected || user?.role !== 'admin') return;

        // Admin dashboard channel
        const dashboardChannel = echo.private('admin.dashboard');
        channelsRef.current['admin.dashboard'] = dashboardChannel;

        dashboardChannel
            .listen('.dashboard.updated', (data) => {
                console.log('[RealTime] Dashboard stats updated:', data);
                mutate('/reports/dashboard');
                mutate((key) => typeof key === 'string' && key.includes('/reports'), undefined, { revalidate: true });
            });

        // Admin employees channel
        const employeesChannel = echo.private('admin.employees');
        channelsRef.current['admin.employees'] = employeesChannel;

        employeesChannel
            .listen('.employee.updated', (data) => {
                console.log('[RealTime] Employee updated:', data);
                mutate('/users');
                mutate((key) => typeof key === 'string' && key.includes('/users'), undefined, { revalidate: true });
            });

        return () => {
            echo.leave('admin.dashboard');
            echo.leave('admin.employees');
        };
    }, [isConnected, user?.role, mutate]);

    // Manual refresh function
    const refreshAll = useCallback(() => {
        // Trigger revalidation of all cached data
        mutate(() => true, undefined, { revalidate: true });
    }, [mutate]);

    const value = {
        isConnected,
        connectionStatus,
        refreshAll,
    };

    return (
        <RealTimeContext.Provider value={value}>
            {children}
        </RealTimeContext.Provider>
    );
}

/**
 * Hook to access real-time context
 */
export function useRealTime() {
    const context = useContext(RealTimeContext);
    if (!context) {
        throw new Error('useRealTime must be used within a RealTimeProvider');
    }
    return context;
}

/**
 * Hook for subscribing to custom channels with callbacks
 * @param {string} channelName - Channel name (without private- prefix)
 * @param {string} eventName - Event name (with . prefix)
 * @param {function} callback - Callback function
 * @param {boolean} isPrivate - Whether this is a private channel
 */
export function useChannel(channelName, eventName, callback, isPrivate = false) {
    const { isConnected } = useRealTime();
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        const echo = getEcho();
        if (!echo || !isConnected) return;

        const channel = isPrivate
            ? echo.private(channelName)
            : echo.channel(channelName);

        channel.listen(eventName, (data) => {
            callbackRef.current(data);
        });

        return () => {
            echo.leave(channelName);
        };
    }, [channelName, eventName, isPrivate, isConnected]);
}

export default RealTimeProvider;
