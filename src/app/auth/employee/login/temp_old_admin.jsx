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
import { useSettingsContext } from "@/components/providers/settings-provider";
import { getLogoUrl, API_BASE_URL } from "@/lib/constants";

export default function AdminLoginPage() {
    const { settings } = useSettingsContext();
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
            const result = await login({ email, password, remember, login_type: 'admin' });

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
                errorMessage = `Cannot reach the API server. Please ensure the backend is running at ${API_BASE_URL}. If you are on Vercel, make sure NEXT_PUBLIC_API_URL is set in your project settings.`;
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
                    <img
                        src={getLogoUrl(settings?.system_logo)}
                        alt="QuickConn Logo"
                        className="h-auto max-h-16 md:max-h-24 w-auto max-w-[180px] sm:max-w-[220px] object-contain"
                        onError={(e) => {
                            e.currentTarget.src = "/quickconnect-logo.png";
                            e.currentTarget.onerror = null;
                        }}
                    />
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-2xl font-bold text-white text-center mb-1 sm:mb-2">
                    Welcome to <span className="text-[#22c55e]">QuickConn</span>
                </h1>
                <p className="text-white/70 text-xs sm:text-sm text-center mb-6 sm:mb-8">
                    Sign in to access your administrator account
                </p>

                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    {/* Email Input */}
                    <div className="relative">
                        <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/60">
                            <User className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-4 bg-transparent border border-white/30 rounded-md text-white text-xs sm:text-sm placeholder:text-white/50 focus:outline-none focus:border-[#3da36e] transition-colors"
                        />
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                        <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-white/60">
                            <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-10 sm:pr-12 bg-transparent border border-white/30 rounded-md text-white text-xs sm:text-sm placeholder:text-white/50 focus:outline-none focus:border-[#3da36e] transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>

                    <div className="flex items-center space-x-2 mb-2 sm:mb-4">
                        <Checkbox
                            id="remember"
                            className="border-white/50 h-3 w-3 sm:h-4 sm:w-4 data-[state=checked]:bg-[#3da36e] data-[state=checked]:border-[#3da36e]"
                            checked={remember}
                            onCheckedChange={setRemember}
                        />
                        <Label
                            htmlFor="remember"
                            className="text-xs sm:text-sm text-white/80 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                            Remember me
                        </Label>
                    </div>
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

                </form>
            </div>
        </div>
    );
}
