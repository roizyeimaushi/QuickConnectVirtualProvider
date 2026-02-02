import { USER_ROLES, ROUTES } from "./constants";

/**
 * Auth utilities for QuickConn Virtual
 */

// Token storage keys
const TOKEN_KEY = "quickcon_token";
const USER_KEY = "quickcon_user";

/**
 * Get stored authentication token
 * @returns {string|null}
 */
export function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store authentication token
 * @param {string} token
 */
export function setToken(token) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove authentication token
 */
export function removeToken() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

/**
 * Get stored user data
 * @returns {Object|null}
 */
export function getStoredUser() {
    if (typeof window === "undefined") return null;
    try {
        const userStr = localStorage.getItem(USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
}

/**
 * Store user data
 * @param {Object} user
 */
export function setStoredUser(user) {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
    return !!getToken();
}

/**
 * Get redirect URL based on user role
 * @param {Object} user - User object with role
 * @returns {string}
 */
export function getRedirectUrl(user) {
    if (!user) return ROUTES.LOGIN;

    switch (user.role) {
        case USER_ROLES.ADMIN:
            return ROUTES.ADMIN_DASHBOARD;
        case USER_ROLES.EMPLOYEE:
            return ROUTES.EMPLOYEE_DASHBOARD;
        default:
            return ROUTES.LOGIN;
    }
}

/**
 * Check if current route is allowed for user role
 * @param {string} pathname - Current path
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isRouteAllowed(pathname, user) {
    if (!user) return false;

    const adminOnlyRoutes = [
        "/dashboard/admin",
        "/employees",
        "/schedules",
        "/attendance/sessions",
        "/attendance/reports",
        "/audit-logs",
    ];

    const employeeOnlyRoutes = [
        "/dashboard/employee",
        "/attendance/confirm",
        "/attendance/history",
    ];

    const isAdminRoute = adminOnlyRoutes.some(route => pathname.startsWith(route));
    const isEmployeeRoute = employeeOnlyRoutes.some(route => pathname.startsWith(route));

    if (user.role === USER_ROLES.ADMIN) {
        return !isEmployeeRoute;
    }

    if (user.role === USER_ROLES.EMPLOYEE) {
        return !isAdminRoute;
    }

    return false;
}

/**
 * Parse JWT token to get expiration
 * @param {string} token
 * @returns {Object|null}
 */
export function parseJwt(token) {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

/**
 * Check if token is expired
 * @param {string} token
 * @returns {boolean}
 */
export function isTokenExpired(token) {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    return Date.now() >= payload.exp * 1000;
}
