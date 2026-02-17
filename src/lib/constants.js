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
        // NOTE: On Vercel, if this is used without a rewrite, it will hit Vercel's /api
        return '/api';
    }

    // If set to a full URL or hostname = separate services mode
    let resolvedUrl = envUrl;

    // Fix Platform specific internal hostname issues
    if (!resolvedUrl.includes('.') && !resolvedUrl.includes('localhost') && !resolvedUrl.startsWith('http')) {
        if (resolvedUrl.includes('railway')) {
            resolvedUrl = `${resolvedUrl}.up.railway.app`;
        } else {
            resolvedUrl = `${resolvedUrl}.onrender.com`;
        }
    }

    // Ensure protocol
    if (!resolvedUrl.startsWith('http')) {
        // Force HTTPS for any production-looking domain unless explicitly HTTP
        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https:' : 'http:';
        resolvedUrl = `${protocol}//${resolvedUrl}`;
    }

    // Ensure /api suffix
    if (!resolvedUrl.endsWith('/api')) {
        resolvedUrl = `${resolvedUrl.replace(/\/$/, '')}/api`;
    }

    return resolvedUrl;
})();

/**
 * Helper to resolve the correct logo URL based on settings
 * @param {string} settingsLogo - Logo path from settings
 * @returns {string} Resolved logo URL
 */
export const getLogoUrl = (settingsLogo) => {
    const fallback = "/quickconnect-logo.png";
    if (!settingsLogo) return fallback;

    // If it's a data URI or blob, use as-is
    if (settingsLogo.startsWith("data:") || settingsLogo.startsWith("blob:")) return settingsLogo;

    // If it's a full URL (Cloudinary, etc.), use it — but skip broken ephemeral storage URLs
    if (settingsLogo.startsWith("http")) {
        // Detect known ephemeral storage patterns that are likely broken after redeploy
        const isEphemeralStorage = /\/(storage|public)\/(logo|logos)\//i.test(settingsLogo) &&
            (settingsLogo.includes('railway.app') || settingsLogo.includes('onrender.com'));
        if (isEphemeralStorage) {
            // These files get wiped on redeploy — fall back to local logo
            return fallback;
        }
        return settingsLogo;
    }

    // Handle Laravel relative storage paths (e.g. "logos/abc.png")
    let backendRoot = API_BASE_URL.replace("/api", "").replace(/\/$/, "");
    if (!backendRoot || backendRoot === "/") {
        backendRoot = "";
    }

    const cleanPath = settingsLogo.replace(/^\/?storage\//, "");
    return `${backendRoot}/storage/${cleanPath}`;
};

/**
 * Helper to resolve the correct avatar URL
 * @param {string} avatarPath - Avatar path from user data
 * @param {object} [options] - Options
 * @param {boolean} [options.cacheBust] - If true, append cache-busting query param (skipped for data/blob URIs)
 * @returns {string} Resolved avatar URL or fallback
 */
export const getAvatarUrl = (avatarPath, options = {}) => {
    if (!avatarPath) return "https://github.com/shadcn.png";

    // Data URIs and blob URLs should be returned as-is (never append ?t= to these)
    if (avatarPath.startsWith("data:") || avatarPath.startsWith("blob:")) {
        return avatarPath;
    }

    if (avatarPath.startsWith("http")) {
        // Security check: If page is HTTPS, upgrade HTTP avatar URLs to avoid mixed content block on mobile
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && avatarPath.startsWith('http://')) {
            avatarPath = avatarPath.replace('http://', 'https://');
        }
        return options.cacheBust ? `${avatarPath}?t=${Date.now()}` : avatarPath;
    }

    // Handle Laravel storage paths
    let backendRoot = API_BASE_URL.replace("/api", "").replace(/\/$/, "");

    // If backendRoot is empty (relative), we assume same domain
    if (!backendRoot || backendRoot === "/") {
        backendRoot = "";
    }

    // If it's a root-relative path (starts with /) but NOT /storage, it's a local frontend asset
    if (avatarPath.startsWith("/") && !avatarPath.startsWith("/storage")) {
        return avatarPath;
    }

    // Ensure it starts with /storage/ or backend domain/storage/
    const cleanPath = avatarPath.replace(/^\/?storage\//, "");
    return `${backendRoot}/storage/${cleanPath}`;
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
