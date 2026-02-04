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

export default function EmployeeLoginPage() {
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

            {/* Full Screen Layout - Responsive: stacked on mobile, side-by-side on larger screens */}
            <div className="min-h-screen h-screen w-full flex flex-col md:flex-row overflow-hidden">

                {/* Left Side - Full Image with Centered Message Overlay (hidden on mobile) */}
                <div className="hidden md:block md:w-1/2 h-full relative overflow-hidden">
                    {/* Full Background Image */}
                    <img
                        src="/employee-login-side.png"
                        alt="Customer Service Representative"
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />

                    {/* Dark Overlay for text readability */}
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Centered Welcome Message Overlay */}
                    <div className="absolute inset-0 z-10 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                        <div className="text-center px-4 sm:px-8 lg:px-12">
                            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl font-bold leading-tight text-white drop-shadow-lg mb-2 sm:mb-4 lg:mb-6">
                                Welcome to <span className="text-[#22c55e]">QuickConn Virtual</span>
                            </h2>
                            <p className="text-white/90 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed max-w-sm sm:max-w-md mx-auto drop-shadow-md">
                                Track your attendance, view schedules, and manage your work records in one convenient portal.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form (full width on mobile, half on larger screens) */}
                <div className="w-full md:w-1/2 h-full flex flex-col justify-center p-6 sm:p-8 md:p-12 lg:p-16 bg-[#f8f8ff]">
                    <div className="w-full max-w-md mx-auto">
                        {/* Logo - using max-w to prevent stretching */}
                        <div className="flex justify-center mb-4 sm:mb-6">
                            <img src="/logo.png" alt="QuickConn Logo" className="h-auto max-h-16 md:max-h-24 w-auto max-w-[300px] sm:max-w-[350px] object-contain" />
                        </div>

                        {/* Subtitle */}
                        <p className="text-muted-foreground text-xs sm:text-sm lg:text-base text-center mb-6 sm:mb-8">
                            Sign in to access your QuickConn Virtual account
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                            <div className="space-y-3 sm:space-y-4">
                                {/* Email Input with Icon */}
                                <div className="relative">
                                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        className="w-full h-11 sm:h-12 pl-10 sm:pl-12 pr-4 bg-white border border-gray-200 rounded-lg text-sm sm:text-base placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                {/* Password Input with Icon */}
                                <div className="relative">
                                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        className="w-full h-11 sm:h-12 pl-10 sm:pl-12 pr-10 sm:pr-12 bg-white border border-gray-200 rounded-lg text-sm sm:text-base placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                                        ) : (
                                            <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="remember"
                                        className="border-gray-300 h-4 w-4"
                                        checked={remember}
                                        onCheckedChange={setRemember}
                                    />
                                    <Label
                                        htmlFor="remember"
                                        className="text-xs sm:text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Remember me
                                    </Label>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-10 sm:h-11 lg:h-12 text-sm sm:text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                                loading={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #2e8b57 0%, #236b43 100%)'
                                }}
                            >
                                Sign In
                            </Button>
                        </form>

                        {/* Footer text */}
                        <p className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-muted-foreground">
                            QuickConn Virtual Attendance System
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
