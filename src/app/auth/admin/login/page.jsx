"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, AlertCircle, User, KeyRound } from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [remember, setRemember] = useState(false);

    const { login, isAuthenticated, isAdmin, isEmployee, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    // Load saved credentials from localStorage on mount
    useEffect(() => {
        const savedEmail = localStorage.getItem("admin_remembered_email");
        const savedRemember = localStorage.getItem("admin_remember_me") === "true";
        if (savedEmail && savedRemember) {
            setEmail(savedEmail);
            setRemember(true);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            if (isAdmin) {
                router.replace("/dashboard/admin");
            } else if (isEmployee) {
                router.replace("/dashboard/employee");
            }
        }
    }, [isAuthenticated, isAdmin, isEmployee, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await login({ email, password, remember });

            if (result.role !== 'admin') {
                setError("Access denied. This login is for administrators only.");
                setShowErrorModal(true);
                return;
            }

            // Save to localStorage if Remember me is checked
            if (remember) {
                localStorage.setItem("admin_remembered_email", email);
                localStorage.setItem("admin_remember_me", "true");
            } else {
                localStorage.removeItem("admin_remembered_email");
                localStorage.removeItem("admin_remember_me");
            }

            toast({
                title: "Welcome back, Admin!",
                description: "You have been successfully logged in.",
                variant: "success",
            });
        } catch (err) {
            let errorMessage = "The provided credentials are incorrect.";

            if (err?.status === 0 || (err?.message && err.message.includes("Cannot reach the server"))) {
                errorMessage = "Cannot reach the API server. Start the Laravel backend (e.g. in backend/quickcon-api run: php artisan serve) and ensure it is reachable at the URL in NEXT_PUBLIC_API_URL (default: http://localhost:8000/api).";
            } else if (err?.errors?.email?.[0]) {
                errorMessage = err.errors.email[0];
            } else if (err?.message && err.message !== "An error occurred" && err.message !== "Request failed") {
                errorMessage = err.message;
            }

            setError(errorMessage);
            setShowErrorModal(true);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/admin-login-bg.jpg')" }}
            />

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Decorative Curved Shapes */}
            <div
                className="absolute -left-32 top-1/4 w-96 h-96 rounded-full opacity-20"
                style={{ background: '#2e8b57' }}
            />
            <div
                className="absolute -right-48 -bottom-32 w-[500px] h-[500px] rounded-full opacity-15"
                style={{ background: '#3da36e' }}
            />
            <div
                className="absolute right-1/4 -top-24 w-64 h-64 rounded-full opacity-10"
                style={{ background: '#4db87e' }}
            />

            {/* Error Modal */}
            <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <DialogTitle className="text-center">Login Failed</DialogTitle>
                        <DialogDescription className="text-center">
                            {error}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center mt-4">
                        <Button onClick={() => setShowErrorModal(false)}>
                            Try Again
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Login Form */}
            <div className="relative z-10 w-full max-w-sm px-6 sm:px-8">
                {/* Logo - with max-width to prevent stretching */}
                <div className="flex justify-center mb-4 sm:mb-6">
                    <img src="/logo.png" alt="QuickConn Logo" className="h-14 sm:h-16 md:h-20 lg:h-24 max-w-[180px] sm:max-w-[220px] object-contain" />
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-2xl font-bold text-white text-center mb-1 sm:mb-2">
                    Welcome to QuickConn
                </h1>
                <p className="text-white/70 text-xs sm:text-sm text-center mb-6 sm:mb-8">
                    Sign in to access your administrator dashboard
                </p>

                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    {/* ... existing form elements ... */}
                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-10 sm:h-12 mt-1 sm:mt-2 bg-transparent border rounded-md text-sm sm:text-base font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{
                            borderColor: '#3da36e',
                            color: '#3da36e'
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.background = '#2e8b57';
                                e.currentTarget.style.color = 'white';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#3da36e';
                        }}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        ) : (
                            "Login"
                        )}
                    </button>

                    {/* Debug API URL - Temporary for troubleshooting */}
                    <p className="text-[10px] text-white/40 text-center mt-4">
                        API: {API_BASE_URL}
                    </p>
                </form>
            </div>
        </div>
    );
}
