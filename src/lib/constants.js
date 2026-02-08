// QuickConn Virtual - Constants and Configuration

// API URL Configuration:
// - Production Monolith: Set NEXT_PUBLIC_API_URL to "" (empty) or "/api"
// - Production Separate: Set NEXT_PUBLIC_API_URL to "https://your-backend.onrender.com/api"
// - Development: Falls back to same-hostname:8000/api (supports mobile/LAN access)
export const API_BASE_URL = (() => {
    let envUrl = process.env.NEXT_PUBLIC_API_URL;

    // If empty, undefined, or "/api"
    if (!envUrl || envUrl === '' || envUrl === '/api') {
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;

            // Development mode: localhost, 127.0.0.1, or LAN IP addresses (192.168.x.x, 10.x.x.x, etc.)
            // Use the same hostname with Laravel's port 8000
            const isLocalDev = hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.startsWith('172.16.') ||
                hostname.startsWith('172.17.') ||
                hostname.startsWith('172.18.') ||
                hostname.startsWith('172.19.') ||
                hostname.startsWith('172.2') ||
                hostname.startsWith('172.30.') ||
                hostname.startsWith('172.31.');

            if (isLocalDev) {
                // Use same hostname but Laravel's port (8000) for development
                return `${window.location.protocol}//${hostname}:8000/api`;
            }
        }
        // Production monolith: same-origin API
        return '/api';
    }

    // If set to a full URL or hostname = separate services mode
    if (envUrl) {
        // Fix Render internal hostname issue (e.g. "quickconn-backend-dzag" -> "quickconn-backend-dzag.onrender.com")
        if (!envUrl.includes('.') && !envUrl.includes('localhost') && !envUrl.startsWith('http')) {
            envUrl = `${envUrl}.onrender.com`;
        }

        // Ensure protocol
        if (!envUrl.startsWith('http')) {
            envUrl = `https://${envUrl}`;
        }

        // Ensure /api suffix
        if (!envUrl.endsWith('/api')) {
            envUrl = `${envUrl}/api`;
        }

        return envUrl;
    }

    // Default: development mode (same-hostname with port 8000) — client only
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:8000/api`;
    }
    // Server fallback when no env set (e.g. dev build)
    return 'http://localhost:8000/api';
})();

/**
 * Helper to resolve the correct logo URL based on settings
 * @param {string} settingsLogo - Logo path from settings
 * @returns {string} Resolved logo URL
 */
export const getLogoUrl = (settingsLogo) => {
    if (!settingsLogo) return "/quickconnect-logo.png";
    if (settingsLogo.startsWith("http")) return settingsLogo;

    // Handle Laravel storage paths - only if we have a valid backend root
    const backendRoot = API_BASE_URL.replace("/api", "").replace(/\/$/, "");
    if (backendRoot && backendRoot !== "" && backendRoot !== "/") {
        // If it's a root-relative path (starts with /) but NOT /storage, it's a local frontend asset
        if (settingsLogo.startsWith("/") && !settingsLogo.startsWith("/storage")) {
            return settingsLogo;
        }
        return `${backendRoot}/storage/${settingsLogo.replace(/^\/?storage\//, "")}`;
    }

    return "/quickconnect-logo.png";
};

/**
 * Helper to resolve the correct avatar URL
 * @param {string} avatarPath - Avatar path from user data
 * @returns {string} Resolved avatar URL or null
 */
export const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith("http") || avatarPath.startsWith("data:") || avatarPath.startsWith("blob:")) return avatarPath;

    // Handle Laravel storage paths
    const backendRoot = API_BASE_URL.replace("/api", "").replace(/\/$/, "");
    if (backendRoot && backendRoot !== "" && backendRoot !== "/") {
        // If it's a root-relative path (starts with /) but NOT /storage, it's a local frontend asset
        if (avatarPath.startsWith("/") && !avatarPath.startsWith("/storage")) {
            return avatarPath;
        }

        // Remove 'storage/' prefix if it's already there to avoid duplication
        const cleanPath = avatarPath.replace(/^\/?storage\//, "");
        return `${backendRoot}/storage/${cleanPath}`;
    }

    return avatarPath;
};

export const USER_ROLES = {
    ADMIN: 'admin',
    EMPLOYEE: 'employee',
};

export const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    LATE: 'late',
    ABSENT: 'absent',
};

export const SESSION_STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    LOCKED: 'locked',
    COMPLETED: 'completed',
};

export const ROUTES = {
    HOME: '/',
    LOGIN: '/auth/login',
    ADMIN_LOGIN: '/auth/admin/login',
    EMPLOYEE_LOGIN: '/auth/employee/login',
    LOGOUT: '/auth/logout',

    // Admin Routes
    ADMIN_DASHBOARD: '/dashboard/admin',
    ADMIN_EMPLOYEES: '/employees',
    ADMIN_EMPLOYEES_CREATE: '/employees/create',
    ADMIN_EMPLOYEES_EDIT: '/employees/edit',
    ADMIN_SCHEDULES: '/schedules',
    ADMIN_SCHEDULES_CREATE: '/schedules/create',
    ADMIN_SESSIONS: '/attendance/sessions',
    ADMIN_SESSIONS_CREATE: '/attendance/sessions/create',
    ADMIN_HISTORY: '/attendance/history',
    ADMIN_BREAK_MONITOR: '/attendance/break-monitor',
    ADMIN_BREAK_HISTORY: '/attendance/break-history',
    ADMIN_REPORTS: '/attendance/reports',
    ADMIN_AUDIT_LOGS: '/audit-logs',

    // Employee Routes
    EMPLOYEE_DASHBOARD: '/dashboard/employee',
    EMPLOYEE_ATTENDANCE: '/attendance/confirm',
    EMPLOYEE_HISTORY: '/attendance/history',
};

export const STATUS_COLORS = {
    present: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-800 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
    },
    late: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-800 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
    },
    absent: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-800 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
    },
    pending: {
        bg: 'bg-slate-100 dark:bg-slate-900/30',
        text: 'text-slate-800 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-800',
    },
    active: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
    },
    locked: {
        bg: 'bg-gray-100 dark:bg-gray-900/30',
        text: 'text-gray-800 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-800',
    },
    completed: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-800 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
    },
};

export const DEPARTMENTS = [
    'QuickConn Services',
];

export const POSITIONS = [
    'Sales Agent',
    'Team Lead',
    'Web Developer',
    'Quality Assurance',
    'IT support',
];

export const TIME_FORMAT = 'HH:mm';
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const DISPLAY_DATE_FORMAT = 'MMM dd, yyyy';
export const DISPLAY_TIME_FORMAT = 'HH:mm';
export const DISPLAY_DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';
