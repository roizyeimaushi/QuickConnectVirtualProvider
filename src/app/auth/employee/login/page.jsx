"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock } from "lucide-react";
import { useSettingsContext } from "@/components/providers/settings-provider";
import { getLogoUrl, API_BASE_URL } from "@/lib/constants";

export default function EmployeeLoginPage() {
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
        const savedEmail = localStorage.getItem("employee_remembered_email");
        const savedRemember = localStorage.getItem("employee_remember_me") === "true";
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
            const result = await login({ email, password, remember, login_type: 'employee' });

            // Check if user is employee
            if (result.role !== 'employee') {
                setError("Access denied. This login is for employees only.");
                setShowErrorModal(true);
                return;
            }

            // Save to localStorage if Remember me is checked
            if (remember) {
                localStorage.setItem("employee_remembered_email", email);
                localStorage.setItem("employee_remember_me", "true");
            } else {
                localStorage.removeItem("employee_remembered_email");
                localStorage.removeItem("employee_remember_me");
            }

            toast({
                title: "Welcome back!",
                description: "You have been successfully logged in.",
                variant: "success",
            });
        } catch (err) {
            let errorMessage = "The provided credentials are incorrect.";

            // Network / server unreachable: guide user to start backend
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
        <>
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

            {/* Main Layout Container - Column on mobile, Row on Tablet/Desktop (md and up) */}
            <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#f8f8ff]">

                {/* Left/Top Side - Welcome Image & Message */}
                <div className="w-full md:w-1/2 h-[35vh] sm:h-[40vh] md:h-screen relative overflow-hidden flex-shrink-0">
                    {/* Full Background Image */}
                    <img
                        src="/employee-login-side.png"
                        alt="Join QuickConn Virtual"
                        className="absolute inset-0 w-full h-full object-cover object-center md:object-[25%_center]"
                    />

                    {/* Darker Overlay for text readability on all devices */}
                    <div className="absolute inset-0 bg-black/45 md:bg-black/40" />

                    {/* Welcome Message Overlay - Positioned for impact */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
                        <div className="max-w-md animate-fade-in-up">
                            <h2 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-extrabold leading-tight text-white drop-shadow-xl mb-3 sm:mb-4">
                                Welcome to <br className="sm:hidden" />
                                <span className="text-[#22c55e]">QuickConn Virtual</span>
                            </h2>
                            <p className="text-white/95 text-sm sm:text-base md:text-base lg:text-lg leading-relaxed drop-shadow-lg font-medium">
                                Track your attendance, view schedules, and manage your work records in one convenient portal.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right/Bottom Side - Login Form */}
                <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 md:p-12 lg:p-16 bg-white md:bg-[#f8f8ff] shadow-2xl md:shadow-none -mt-4 md:mt-0 rounded-t-3xl md:rounded-none z-20">
                    <div className="w-full max-w-sm sm:max-w-md mx-auto">
                        {/* Logo */}
                        <div className="flex justify-center mb-6 sm:mb-8">
                            <img
                                src={getLogoUrl(settings?.system_logo)}
                                alt="QuickConn Logo"
                                className="h-auto max-h-16 sm:max-h-20 md:max-h-24 w-auto object-contain drop-shadow-sm"
                                onError={(e) => {
                                    e.currentTarget.src = "/quickconnect-logo.png";
                                    e.currentTarget.onerror = null;
                                }}
                            />
                        </div>

                        {/* Subtitle */}
                        <div className="text-center mb-8">
                            <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-1">Employee Login</h3>
                            <p className="text-slate-500 text-sm">Sign in to access your work account</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                            <div className="space-y-4">
                                {/* Email Field */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase ml-1">Email Address</Label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="someone@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-xs font-bold text-slate-700 uppercase ml-1">Password</Label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full h-12 pl-11 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <label className="flex items-center space-x-2 cursor-pointer group">
                                    <Checkbox
                                        id="remember"
                                        className="rounded-md border-slate-300"
                                        checked={remember}
                                        onCheckedChange={setRemember}
                                    />
                                    <span className="text-sm text-slate-600 font-medium group-hover:text-slate-900 selection:bg-transparent">Remember me</span>
                                </label>
                                <button type="button" className="text-sm font-semibold text-primary hover:underline">
                                    Forgot Password?
                                </button>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-13 text-base font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0px] transition-all duration-200"
                                loading={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                                }}
                            >
                                Sign In to Portfolio
                            </Button>
                        </form>

                        {/* Footer text */}
                        <div className="mt-10 pt-6 border-t border-slate-100 text-center">
                            <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide">
                                © 2026 QUICKCONN VIRTUAL PORTAL • SECURE ACCESS
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
