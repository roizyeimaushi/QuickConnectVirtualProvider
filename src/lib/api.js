import { API_BASE_URL } from './constants';
import Cookies from 'js-cookie';

/**
 * API Client for QuickConn Virtual
 * Handles all HTTP requests to the Laravel backend
 */

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    /**
     * Get the authentication token (localStorage or cookie — must match auth-provider source)
     * @returns {string|null} The auth token
     */
    getToken() {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('quickcon_token') || Cookies.get('quickcon_token') || null;
    }

    /**
     * Set the authentication token in localStorage
     * @param {string} token - The auth token
     */
    setToken(token) {
        if (typeof window === 'undefined') return;
        localStorage.setItem('quickcon_token', token);
    }

    /**
     * Remove the authentication token from localStorage
     */
    removeToken() {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('quickcon_token');
        try { Cookies.remove('quickcon_token'); } catch (_) { }
    }

    /**
     * Get default headers for API requests
     * @returns {Object} Headers object
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Make an HTTP request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const headers = this.getHeaders();

        // If body is FormData, let browser set Content-Type
        if (options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        const config = {
            ...options,
            credentials: 'include', // Ensure cookies are sent (needed for sanctum/session)
            headers: {
                ...headers,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            // Handle 401 Unauthorized
            if (response.status === 401) {
                const hadToken = this.getToken();
                this.removeToken();
                // Only redirect if user was logged in (had a token)
                if (hadToken && typeof window !== 'undefined' && !window.location.pathname.includes('/auth/')) {
                    window.location.href = '/auth/login';
                }
                throw {
                    status: 401,
                    message: 'Unauthorized - Please log in again',
                    errors: {},
                };
            }

            // Handle 403 Forbidden (insufficient permissions)
            if (response.status === 403) {
                throw {
                    status: 403,
                    message: 'Access denied - You do not have permission to access this resource',
                    errors: {},
                };
            }

            // Handle Blob for downloads (Check content-type or if specifically requested as blob)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                let data = {};
                try {
                    data = await response.json();
                } catch (parseError) {
                    // JSON parsing failed
                    if (!response.ok) {
                        throw {
                            status: response.status,
                            message: `Request failed with status ${response.status}`,
                            errors: {},
                        };
                    }
                }
                if (!response.ok) {
                    throw {
                        status: response.status,
                        message: data.message || `Request failed with status ${response.status}`,
                        errors: data.errors || {},
                        ...data // Spread other fields like error_code
                    };
                }
                return data;
            } else {
                if (!response.ok) {
                    throw { status: response.status, message: `Request failed with status ${response.status}` };
                }
                // Return blob for backup downloads etc.
                return response.blob();
            }

        } catch (error) {
            // Already structured error from above (has status property)
            if (error && typeof error === 'object' && error.status !== undefined) {
                throw error;
            }

            // Network / CORS Error
            if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message?.includes('Network'))) {
                throw {
                    status: 0,
                    message: 'Network error: Cannot reach the server. Please check your connection.',
                    errors: {},
                };
            }

            // Handle Error objects (from new Error())
            if (error instanceof Error) {
                throw {
                    status: 500,
                    message: error.message || 'An unexpected error occurred',
                    errors: {},
                };
            }

            // Fallback for any other type of error (including empty objects)
            console.warn('API client caught unexpected error type:', error);
            throw {
                status: 500,
                message: typeof error === 'string' ? error : 'An unexpected error occurred',
                errors: {},
            };
        }
    }

    /**
     * GET request
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} Response data
     */
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} Response data
     */
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} Response data
     */
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * PATCH request
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request body
     * @returns {Promise<Object>} Response data
     */
    async patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE request
     * @param {string} endpoint - API endpoint
     * @returns {Promise<Object>} Response data
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Create singleton instance
const api = new ApiClient();

// ==========================================
// Authentication API
// ==========================================

export const authApi = {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    me: () => api.request('/auth/me', { method: 'GET', headers: { 'Cache-Control': 'no-store' } }),
    refreshToken: () => api.post('/auth/refresh'),
    heartbeat: () => api.post('/auth/heartbeat'),
    updateProfile: (data) => api.request('/auth/update-profile', {
        method: 'POST',
        body: data
    }),
    changePassword: (data) => api.post('/auth/change-password', data),
    getPasswordPolicy: () => api.get('/auth/password-policy'),
};

// ==========================================
// Employees API (Admin only)
// ==========================================

export const employeesApi = {
    getAll: (params = {}) => api.get('/employees', params),
    getById: (id) => api.get(`/employees/${id}`),
    getNextId: () => api.get('/employees/next-id'),
    create: (data) => api.post('/employees', data),
    update: (id, data) => api.put(`/employees/${id}`, data),
    delete: (id) => api.delete(`/employees/${id}`),
    toggleStatus: (id) => api.patch(`/employees/${id}/toggle-status`),
    getByEmployeeId: (employeeId) => api.get(`/employees/by-employee-id/${employeeId}`),
};

// ==========================================
// Schedules API (Admin only)
// ==========================================

export const schedulesApi = {
    getAll: (params = {}) => api.get('/schedules', params),
    getById: (id) => api.get(`/schedules/${id}`),
    create: (data) => api.post('/schedules', data),
    update: (id, data) => api.put(`/schedules/${id}`, data),
    delete: (id) => api.delete(`/schedules/${id}`),
    toggleStatus: (id) => api.patch(`/schedules/${id}/toggle-status`),
};

// ==========================================
// Attendance Sessions API
// ==========================================

export const sessionsApi = {
    getAll: (params = {}) => api.get('/attendance-sessions', params),
    getById: (id) => api.get(`/attendance-sessions/${id}`),
    create: (data) => api.post('/attendance-sessions', data),
    update: (id, data) => api.put(`/attendance-sessions/${id}`, data),
    delete: (id) => api.delete(`/attendance-sessions/${id}`),
    lock: (id) => api.patch(`/attendance-sessions/${id}/lock`),
    unlock: (id) => api.patch(`/attendance-sessions/${id}/unlock`),
    getActive: () => api.get('/attendance-sessions/active'),
    getToday: () => api.get('/attendance-sessions/today'),
};

// ==========================================
// Attendance Records API
// ==========================================

export const attendanceApi = {
    getAll: (params = {}) => api.get('/attendance-records', params),
    getById: (id) => api.get(`/attendance-records/${id}`),
    confirm: (sessionId, data = {}) => api.post(`/attendance-records/confirm/${sessionId}`, data),
    getMyRecords: (params = {}) => api.get('/attendance-records/my-records', params),
    getBySession: (sessionId, params = {}) => api.get(`/attendance-records/by-session/${sessionId}`, params),
    getByEmployee: (employeeId, params = {}) => api.get(`/attendance-records/by-employee/${employeeId}`, params),
    canConfirm: (sessionId) => api.get(`/attendance-records/can-confirm/${sessionId}`),
    checkOut: (recordId, data = {}) => api.post(`/attendance-records/${recordId}/check-out`, data),
    startBreak: (recordId, data = {}) => api.post(`/attendance-records/${recordId}/break/start`, data),
    endBreak: (recordId, data = {}) => api.post(`/attendance-records/${recordId}/break/end`, data),
    getActiveBreak: (recordId) => api.get(`/attendance-records/${recordId}/break/active`),
    update: (id, data) => api.put(`/attendance-records/${id}`, data),
    // New: Get today's status with break awareness
    getTodayStatus: () => api.get('/attendance-records/today-status'),
    // New: Get display status (considers break as orange)
    getDisplayStatus: (recordId) => api.get(`/attendance-records/${recordId}/display-status`),
    delete: (id) => api.delete(`/attendance-records/${id}`),
};

// ==========================================
// Reports API (Admin only)
// ==========================================

export const reportsApi = {
    getDashboardStats: () => api.get('/reports/dashboard'),
    getEmployeeDashboard: () => api.get('/reports/employee-dashboard'),
    getDailyReport: (date, params = {}) => api.get(`/reports/daily/${date}`, params),
    getEmployeeReport: (employeeId, params = {}) => api.get(`/reports/employee/${employeeId}`, params),
    getMonthlyReport: (year, month) => api.get(`/reports/monthly/${year}/${month}`),
    exportToExcel: (params = {}) => api.get('/reports/export/excel', params),

    // New: Personal Report for Employee
    getPersonalReport: () => api.get('/reports/personal'),

    // New: Export Personal Report (returns blob/download)
    exportPersonalReport: () => api.get('/reports/personal/export'),
};

// ==========================================
// Audit Logs API (Admin only)
// ==========================================

export const auditApi = {
    getAll: (params = {}) => api.get('/audit-logs', params),
    getById: (id) => api.get(`/audit-logs/${id}`),
    getByUser: (userId, params = {}) => api.get(`/audit-logs/by-user/${userId}`, params),
    getAdminActions: (params = {}) => api.get('/audit-logs/admin', params),
    getLoginActivity: (params = {}) => api.get('/audit-logs/login', params),
    getFailedActions: (params = {}) => api.get('/audit-logs/failed', params),
    getCriticalEvents: (params = {}) => api.get('/audit-logs/critical', params),
    getStatistics: (params = {}) => api.get('/audit-logs/statistics', params),
    verifyIntegrity: () => api.get('/audit-logs/verify-integrity'),
};

// ==========================================
// Settings API
// ==========================================

export const settingsApi = {
    getAll: () => api.get('/settings'),
    update: (data) => api.post('/settings', data),
    uploadLogo: (formData) => api.request('/settings/logo', {
        method: 'POST',
        body: formData,
    }),
    backup: () => api.request('/settings/backup', { method: 'GET' }),
    restore: (formData) => api.request('/settings/restore', {
        method: 'POST',
        body: formData,
    }),
    exportData: () => api.request('/settings/export', { method: 'GET' }),
    clearData: () => api.request('/settings/clear-data', { method: 'POST' }),
    clearLogs: () => api.request('/settings/clear-logs', { method: 'POST' }),
};

// ==========================================
// Break API (12PM-1PM Strict Policy)
// ==========================================

export const breakApi = {
    // Get break status (including window info, can_start, can_end, etc.)
    getStatus: () => api.get('/break/status'),
    // Start break (only allowed 12PM-1PM)
    startBreak: (data) => api.post('/break/start', data),
    // End break manually
    endBreak: () => api.post('/break/end'),
    // Get break history
    getHistory: (params = {}) => api.get('/break/history', params),
    // Get break rules (public)
    getRules: () => api.get('/break-rules'),
};

// ==========================================
// Notifications API
// ==========================================

export const notificationsApi = {
    getAll: () => api.get('/notifications'),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.post('/notifications/read-all'),
};

export default api;
