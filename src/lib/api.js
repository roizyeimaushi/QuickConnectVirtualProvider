import { API_BASE_URL } from './constants';
import Cookies from 'js-cookie';
import { mutate } from 'swr';

/**
 * Helper to invalidate SWR cache after mutations
 */
const invalidateCache = (patterns) => {
    if (typeof window === 'undefined') return;

    // Invalidate all matching patterns
    patterns.forEach(pattern => {
        mutate(
            key => typeof key === 'string' && key.includes(pattern),
            undefined,
            { revalidate: true }
        );
    });
};

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

        // If body is FormData, let browser set Content-Type (for multipart/form-data boundary)
        const isFormData = options.body instanceof FormData;
        if (isFormData) {
            delete headers['Content-Type'];
        }

        // Debug logging for development (helps diagnose mobile auth issues)
        if (process.env.NODE_ENV === 'development' && isFormData) {
            console.log('[API Debug] FormData request:', {
                url,
                hasToken: !!this.getToken(),
                tokenPreview: this.getToken()?.substring(0, 20) + '...',
            });
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
                let data = {};
                try {
                    data = await response.json();
                } catch (_) { }

                throw {
                    status: 403,
                    message: data.message || 'Access denied - You do not have permission to access this resource',
                    errors: data.errors || {},
                    ...data
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
    updateProfile: async (data) => {
        const result = await api.request('/auth/update-profile', {
            method: 'POST',
            body: data
        });
        // Invalidate cache so admin can see updated employee profile immediately
        invalidateCache(['/employees', '/dashboard', '/auth/me']);
        return result;
    },
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
    create: async (data) => {
        const result = await api.post('/employees', data);
        invalidateCache(['/employees', '/dashboard']);
        return result;
    },
    update: async (id, data) => {
        const result = await api.put(`/employees/${id}`, data);
        invalidateCache(['/employees', '/dashboard']);
        return result;
    },
    delete: async (id) => {
        const result = await api.delete(`/employees/${id}`);
        invalidateCache(['/employees', '/dashboard']);
        return result;
    },
    toggleStatus: async (id) => {
        const result = await api.patch(`/employees/${id}/toggle-status`);
        invalidateCache(['/employees', '/dashboard']);
        return result;
    },
    getByEmployeeId: (employeeId) => api.get(`/employees/by-employee-id/${employeeId}`),
};

// ==========================================
// Schedules API (Admin only)
// ==========================================

export const schedulesApi = {
    getAll: (params = {}) => api.get('/schedules', params),
    getById: (id) => api.get(`/schedules/${id}`),
    create: async (data) => {
        const result = await api.post('/schedules', data);
        invalidateCache(['/schedules']);
        return result;
    },
    update: async (id, data) => {
        const result = await api.put(`/schedules/${id}`, data);
        invalidateCache(['/schedules']);
        return result;
    },
    delete: async (id) => {
        const result = await api.delete(`/schedules/${id}`);
        invalidateCache(['/schedules']);
        return result;
    },
    toggleStatus: async (id) => {
        const result = await api.patch(`/schedules/${id}/toggle-status`);
        invalidateCache(['/schedules']);
        return result;
    },
};

// ==========================================
// Attendance Sessions API
// ==========================================

export const sessionsApi = {
    getAll: (params = {}) => api.get('/attendance-sessions', params),
    getById: (id) => api.get(`/attendance-sessions/${id}`),
    create: async (data) => {
        const result = await api.post('/attendance-sessions', data);
        invalidateCache(['/sessions', '/attendance-sessions', '/dashboard']);
        return result;
    },
    update: async (id, data) => {
        const result = await api.put(`/attendance-sessions/${id}`, data);
        invalidateCache(['/sessions', '/attendance-sessions', '/dashboard']);
        return result;
    },
    delete: async (id) => {
        const result = await api.delete(`/attendance-sessions/${id}`);
        invalidateCache(['/sessions', '/attendance-sessions', '/dashboard']);
        return result;
    },
    lock: async (id, data = {}) => {
        const result = await api.patch(`/attendance-sessions/${id}/lock`, data);
        invalidateCache(['/sessions', '/attendance-sessions', '/dashboard']);
        return result;
    },
    unlock: async (id) => {
        const result = await api.patch(`/attendance-sessions/${id}/unlock`);
        invalidateCache(['/sessions', '/attendance-sessions', '/dashboard']);
        return result;
    },
    getActive: () => api.get('/attendance-sessions/active'),
    getToday: () => api.get('/attendance-sessions/today'),
};

// ==========================================
// Attendance Records API
// ==========================================

export const attendanceApi = {
    getAll: (params = {}) => api.get('/attendance-records', params),
    getById: (id) => api.get(`/attendance-records/${id}`),
    confirm: async (sessionId, data = {}) => {
        const result = await api.post(`/attendance-records/confirm/${sessionId}`, data);
        invalidateCache(['/attendance', '/sessions', '/reports', '/dashboard']);
        return result;
    },
    getMyRecords: (params = {}) => api.get('/attendance-records/my-records', params),
    getBySession: (sessionId, params = {}) => api.get(`/attendance-records/by-session/${sessionId}`, params),
    getByEmployee: (employeeId, params = {}) => api.get(`/attendance-records/by-employee/${employeeId}`, params),
    canConfirm: (sessionId) => api.get(`/attendance-records/can-confirm/${sessionId}`),
    checkOut: async (recordId, data = {}) => {
        const result = await api.post(`/attendance-records/${recordId}/check-out`, data);
        invalidateCache(['/attendance', '/sessions', '/reports', '/dashboard']);
        return result;
    },
    startBreak: async (recordId, data = {}) => {
        const result = await api.post(`/attendance-records/${recordId}/break/start`, data);
        invalidateCache(['/attendance', '/break', '/dashboard']);
        return result;
    },
    endBreak: async (recordId, data = {}) => {
        const result = await api.post(`/attendance-records/${recordId}/break/end`, data);
        invalidateCache(['/attendance', '/break', '/dashboard']);
        return result;
    },
    getActiveBreak: (recordId) => api.get(`/attendance-records/${recordId}/break/active`),
    update: async (id, data) => {
        const result = await api.put(`/attendance-records/${id}`, data);
        invalidateCache(['/attendance', '/reports', '/dashboard']);
        return result;
    },
    // New: Get today's status with break awareness
    getTodayStatus: () => api.get('/attendance-records/today-status'),
    // New: Get display status (considers break as orange)
    getDisplayStatus: (recordId) => api.get(`/attendance-records/${recordId}/display-status`),
    create: async (data) => {
        const result = await api.post('/attendance-records', data);
        invalidateCache(['/attendance', '/reports', '/dashboard']);
        return result;
    },
    delete: async (id) => {
        const result = await api.delete(`/attendance-records/${id}`);
        invalidateCache(['/attendance', '/reports', '/dashboard']);
        return result;
    },
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
    startBreak: async (data) => {
        const result = await api.post('/break/start', data);
        invalidateCache(['/break', '/attendance', '/dashboard']);
        return result;
    },
    // End break manually
    endBreak: async () => {
        const result = await api.post('/break/end');
        invalidateCache(['/break', '/attendance', '/dashboard']);
        return result;
    },
    // Get break history
    getHistory: (params = {}) => api.get('/break/history', params),
    // Get break rules (public)
    getRules: () => api.get('/break-rules'),
    // Admin Management
    update: async (id, data) => {
        const result = await api.put(`/breaks/${id}`, data);
        invalidateCache(['/break']);
        return result;
    },
    delete: async (id) => {
        const result = await api.delete(`/breaks/${id}`);
        invalidateCache(['/break']);
        return result;
    },
};

// ==========================================
// Notifications API
// ==========================================

export const notificationsApi = {
    getAll: () => api.get('/notifications'),
    markAsRead: async (id) => {
        const result = await api.patch(`/notifications/${id}/read`);
        invalidateCache(['/notifications']);
        return result;
    },
    markAllAsRead: async () => {
        const result = await api.post('/notifications/read-all');
        invalidateCache(['/notifications']);
        return result;
    },
};

export default api;

