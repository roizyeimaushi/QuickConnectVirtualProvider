// QuickConn Virtual - Constants and Configuration

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000/api` : 'http://localhost:8000/api');

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
export const DISPLAY_TIME_FORMAT = 'hh:mm a';
export const DISPLAY_DATETIME_FORMAT = 'MMM dd, yyyy hh:mm a';
