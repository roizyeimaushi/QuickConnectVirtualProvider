import { USER_ROLES } from "./constants";

/**
 * Permission definitions for QuickConn Virtual
 * Maps actions to allowed roles
 */
export const PERMISSIONS = {
    // Employee Management (Admin Only)
    CREATE_EMPLOYEE: [USER_ROLES.ADMIN],
    READ_EMPLOYEE: [USER_ROLES.ADMIN],
    UPDATE_EMPLOYEE: [USER_ROLES.ADMIN],
    DELETE_EMPLOYEE: [USER_ROLES.ADMIN],

    // Schedule Management (Admin Only)
    CREATE_SCHEDULE: [USER_ROLES.ADMIN],
    READ_SCHEDULE: [USER_ROLES.ADMIN],
    UPDATE_SCHEDULE: [USER_ROLES.ADMIN],
    DELETE_SCHEDULE: [USER_ROLES.ADMIN],

    // Session Management (Admin Only)
    CREATE_SESSION: [USER_ROLES.ADMIN],
    READ_ALL_SESSIONS: [USER_ROLES.ADMIN],
    UPDATE_SESSION: [USER_ROLES.ADMIN],
    DELETE_SESSION: [USER_ROLES.ADMIN],
    LOCK_SESSION: [USER_ROLES.ADMIN],

    // Attendance (Both roles with limitations)
    CONFIRM_ATTENDANCE: [USER_ROLES.EMPLOYEE],
    READ_OWN_ATTENDANCE: [USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE],
    READ_ALL_ATTENDANCE: [USER_ROLES.ADMIN],

    // Reports (Admin Only)
    VIEW_REPORTS: [USER_ROLES.ADMIN],
    EXPORT_REPORTS: [USER_ROLES.ADMIN],

    // Audit Logs (Admin Only)
    VIEW_AUDIT_LOGS: [USER_ROLES.ADMIN],

    // Dashboard Access
    ACCESS_ADMIN_DASHBOARD: [USER_ROLES.ADMIN],
    ACCESS_EMPLOYEE_DASHBOARD: [USER_ROLES.EMPLOYEE],
};

/**
 * Check if a user has permission for an action
 * @param {Object} user - User object with role property
 * @param {string} permission - Permission key from PERMISSIONS
 * @returns {boolean} Whether user has permission
 */
export function hasPermission(user, permission) {
    if (!user || !user.role) return false;
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) return false;
    return allowedRoles.includes(user.role);
}

/**
 * Check if user is admin
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isAdmin(user) {
    return user?.role === USER_ROLES.ADMIN;
}

/**
 * Check if user is employee
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isEmployee(user) {
    return user?.role === USER_ROLES.EMPLOYEE;
}

/**
 * Get dashboard route based on user role
 * @param {Object} user - User object
 * @returns {string} Dashboard route
 */
export function getDashboardRoute(user) {
    if (isAdmin(user)) {
        return "/dashboard/admin";
    }
    return "/dashboard/employee";
}

/**
 * Get sidebar navigation items based on user role
 * @param {Object} user - User object
 * @returns {Array} Navigation items
 */
export function getNavigationItems(user) {
    const adminNav = [
        {
            label: "Admin Navigation",
            items: [
                {
                    title: "Dashboard",
                    url: "/dashboard/admin",
                    icon: "LayoutDashboard",
                },
            ]
        },
        {
            label: "Employee Management",
            items: [
                {
                    title: "Employees",
                    url: "/employees",
                    icon: "Users",
                    items: [
                        { title: "Employee List", url: "/employees" },
                        { title: "Add Position", url: "/employees/positions" },
                        { title: "Add Employee", url: "/employees/create" },
                        { title: "Deactivated Employees", url: "/employees/deactivated" },
                    ],
                },
            ]
        },
        {
            label: "Work Schedules",
            items: [
                {
                    title: "Schedules",
                    url: "/schedules",
                    icon: "Calendar",
                    items: [
                        { title: "Schedule List", url: "/schedules" },
                        { title: "Create Schedule", url: "/schedules/create" },
                        { title: "Sessions", url: "/attendance/sessions" },
                    ],
                },
            ]
        },
        {
            label: "Attendance Management",
            items: [
                {
                    title: "Attendance Records",
                    // url removed to prevent navigation to parent
                    icon: "ClipboardCheck",
                    items: [
                        { title: "Attendance History", url: "/attendance/history" },
                    ]
                },
            ]
        },

        {
            label: "Reports & Logs",
            items: [
                {
                    title: "System Reports",
                    // url removed to prevent navigation to parent
                    icon: "BarChart3",
                    items: [
                        { title: "Attendance Reports", url: "/reports/daily" },
                        { title: "Employee Reports", url: "/reports/employees" },
                    ],
                },
                {
                    title: "Audit Logs",
                    url: "/audit-logs",
                    icon: "FileText",
                }
            ]
        }
    ];

    const employeeNav = [
        {
            label: "Employee Navigation",
            items: [
                {
                    title: "Dashboard",
                    url: "/dashboard/employee",
                    icon: "LayoutDashboard",
                },
                {
                    title: "Attendance",
                    // url removed to prevent navigation to parent
                    icon: "ClipboardCheck",
                    items: [
                        {
                            title: "Time In",
                            url: "/attendance/confirm",
                        },
                        {
                            title: "Break",
                            url: "/attendance/break",
                        },
                        {
                            title: "Time Out",
                            url: "/attendance/check-out",
                        },
                        {
                            title: "Attendance History",
                            url: "/attendance/history",
                        },
                    ]
                },
            ]
        },
    ];

    return isAdmin(user) ? adminNav : employeeNav;
}
