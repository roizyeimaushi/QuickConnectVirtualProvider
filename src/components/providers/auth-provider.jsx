"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { authApi } from "@/lib/api";
import { USER_ROLES, ROUTES } from "@/lib/constants";

const AuthContext = createContext(null);

// ===============================
// DEMO MODE CREDENTIALS
// ===============================
// These are for demonstration purposes only.
// In production, authentication will be handled by the Laravel backend.

const DEMO_MODE = false; // Set to true for demo mode with mock users

const DEMO_USERS = {
    admin: {
        id: 1,
        employee_id: "QCV-000001",
        email: "admin@quickcon.com",
        password: "admin123",
        first_name: "Admin",
        last_name: "User",
        role: "admin",
        position: "System Administrator",
        status: "active",
    },
    employee: {
        id: 2,
        employee_id: "QCV-000002",
        email: "employee@quickcon.com",
        password: "employee123",
        first_name: "John",
        last_name: "Smith",
        role: "employee",
        position: "Senior Developer",
        status: "active",
    },
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchUser = useCallback(async () => {
        try {
            let token = Cookies.get("quickcon_token");
            const localToken = localStorage.getItem("quickcon_token");

            // Sync LocalStorage to Cookies if Cookie is missing
            // This prevents the middleware from rejecting the request while the client thinks it's authenticated
            if (!token && localToken) {
                token = localToken;
                Cookies.set("quickcon_token", token, {
                    expires: 7,
                    secure: window.location.protocol === 'https:',
                    sameSite: "lax"
                });
            }

            if (!token) {
                setLoading(false);
                return;
            }

            if (DEMO_MODE) {
                // In demo mode, decode the token to get user data
                const storedUser = localStorage.getItem("quickcon_user");
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
                setLoading(false);
                return;
            }

            const response = await authApi.me();
            setUser(response.data || response.user || response);
        } catch (error) {
            // Silence 401/Unauthorized and network (status 0) errors — expected when token expires or backend unreachable
            const isUnauthorized = error?.status === 401 || error?.message === 'Unauthorized';
            const isNetworkError = error?.status === 0;
            if (isUnauthorized || isNetworkError) {
                // Clear token and move on; no noisy console
            } else {
                const msg = error?.message ?? error?.status ?? (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error));
                console.error("Failed to fetch user:", msg || "Unknown error");
            }

            Cookies.remove("quickcon_token");
            localStorage.removeItem("quickcon_token");
            localStorage.removeItem("quickcon_user");
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // Heartbeat for online status (Method 1: Session-Based)
    useEffect(() => {
        if (!user || DEMO_MODE) return;

        const intervalId = setInterval(() => {
            authApi.heartbeat().catch(err => {
                if (err?.status === 401 || err?.message === 'Unauthorized' || err?.status === 0) return;
                const msg = err?.message ?? err?.status ?? (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));
                console.error("Heartbeat failed", msg || "Unknown error");
            });
        }, 60000); // 60 seconds

        return () => clearInterval(intervalId);
    }, [user]);

    const login = async (credentials) => {
        if (DEMO_MODE) {
            // Demo mode authentication
            const { email, password } = credentials;

            // Check admin credentials
            if (email === DEMO_USERS.admin.email && password === DEMO_USERS.admin.password) {
                const userData = { ...DEMO_USERS.admin };
                delete userData.password;

                const demoToken = "demo_admin_token_" + Date.now();
                Cookies.set("quickcon_token", demoToken, { expires: 7, secure: window.location.protocol === 'https:', sameSite: "lax" });
                localStorage.setItem("quickcon_token", demoToken);
                localStorage.setItem("quickcon_user", JSON.stringify(userData));

                setUser(userData);
                router.push(ROUTES.ADMIN_DASHBOARD);
                return { user: userData, token: demoToken };
            }

            // Check employee credentials
            if (email === DEMO_USERS.employee.email && password === DEMO_USERS.employee.password) {
                const userData = { ...DEMO_USERS.employee };
                delete userData.password;

                const demoToken = "demo_employee_token_" + Date.now();
                Cookies.set("quickcon_token", demoToken, { expires: 7, secure: window.location.protocol === 'https:', sameSite: "lax" });
                localStorage.setItem("quickcon_token", demoToken);
                localStorage.setItem("quickcon_user", JSON.stringify(userData));

                setUser(userData);
                router.push(ROUTES.EMPLOYEE_DASHBOARD);
                return { user: userData, token: demoToken };
            }

            // Invalid credentials
            throw new Error("Invalid email or password");
        }

        // Real API authentication
        const response = await authApi.login(credentials);

        // Handle token and user
        const token = response.token || response.access_token;

        if (token) {
            const days = credentials.remember ? 30 : 7;
            Cookies.set("quickcon_token", token, { expires: days, secure: window.location.protocol === 'https:', sameSite: "lax" });
            localStorage.setItem("quickcon_token", token);
        }

        const userData = response.user || response.data;
        setUser(userData);

        // Redirect based on role
        if (userData.role === USER_ROLES.ADMIN) {
            router.push(ROUTES.ADMIN_DASHBOARD);
        } else {
            router.push(ROUTES.EMPLOYEE_DASHBOARD);
        }

        return userData;
    };

    const logout = async () => {
        // Capture role before clearing state to determine redirect
        const wasAdmin = user?.role === USER_ROLES.ADMIN;

        try {
            if (!DEMO_MODE) {
                await authApi.logout();
            }
        } catch (error) {
            // If logout fails, it's likely due to token expiration or network issues.
            // We log it for debugging but it shouldn't stop the client-side cleanup.
            if (error?.status !== 401) {
                console.error("Logout error details:", error.message || error);
            }
        } finally {
            Cookies.remove("quickcon_token");
            localStorage.removeItem("quickcon_token");
            localStorage.removeItem("quickcon_user");
            setUser(null);

            if (wasAdmin) {
                router.push(ROUTES.ADMIN_LOGIN);
            } else {
                router.push(ROUTES.LOGIN);
            }
        }
    };

    const isAdmin = user?.role === USER_ROLES.ADMIN;
    const isEmployee = user?.role === USER_ROLES.EMPLOYEE;
    const isAuthenticated = !!user;

    const value = {
        user,
        loading,
        login,
        logout,
        isAdmin,
        isEmployee,
        isAuthenticated,
        refetchUser: fetchUser,
        demoMode: DEMO_MODE,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

// Export demo credentials for reference
export const DEMO_CREDENTIALS = {
    admin: {
        email: DEMO_USERS.admin.email,
        password: DEMO_USERS.admin.password,
    },
    employee: {
        email: DEMO_USERS.employee.email,
        password: DEMO_USERS.employee.password,
    },
};
