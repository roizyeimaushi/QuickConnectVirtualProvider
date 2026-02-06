"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
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
import { Eye, EyeOff, AlertCircle, Mail, Lock } from "lucide-react";
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

    const { login, isAuthenticated, isAdmin, isEmployee } = useAuth();
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

            if (result.role !== 'employee') {
                setError("Access denied. This login is for employees only.");
                setShowErrorModal(true);
                return;
            }

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

            if (err?.status === 0 || (err?.message && err.message.includes("Cannot reach the server"))) {
                errorMessage = `Cannot reach the API server. Please ensure the backend is running at ${API_BASE_URL}.`;
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

            {/* Layout - Fixed to ALWAYS be side-by-side: Image LEFT, Login RIGHT */}
            <div className="h-screen w-full flex bg-[#f8f8ff] overflow-hidden">

                {/* Left Side - Welcome Image (Always 1/2 width) */}
                <div className="w-1/2 h-full relative overflow-hidden flex-shrink-0">
                    <img
                        src="/employee-login-side.png"
                        alt="Welcome"
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-black/40" />

                    <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
                        <div className="max-w-md">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight text-white drop-shadow-lg mb-2 sm:mb-4">
                                Welcome to <span className="text-[#22c55e]">QuickConn Virtual</span>
                            </h2>
                            <p className="text-white/90 text-[10px] sm:text-sm lg:text-base leading-relaxed max-w-sm mx-auto drop-shadow-md">
                                Track your attendance, view schedules, and manage your work records in one convenient portal.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form (Always 1/2 width) */}
                <div className="w-1/2 h-full flex flex-col justify-center p-4 sm:p-10 md:p-12 lg:p-16 bg-[#f8f8ff] overflow-y-auto">
                    <div className="w-full max-w-md mx-auto">
                        <div className="flex justify-center mb-4">
                            <img
                                src={getLogoUrl(settings?.system_logo)}
                                alt="QuickConn Logo"
                                className="h-auto max-h-12 sm:max-h-20 md:max-h-24 w-auto object-contain"
                                onError={(e) => {
                                    e.currentTarget.src = "/quickconnect-logo.png";
                                    e.currentTarget.onerror = null;
                                }}
                            />
                        </div>

                        <p className="text-muted-foreground text-[10px] sm:text-sm text-center mb-6">
                            Sign in to access your QuickConn Virtual account
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                            <div className="space-y-3 sm:space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="email" className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase ml-1">Email Address</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                            <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-4 bg-white border border-gray-200 rounded-lg text-xs sm:text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="password" className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase ml-1">Password</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                            <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-10 sm:pr-12 bg-white border border-gray-200 rounded-lg text-xs sm:text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="remember"
                                        checked={remember}
                                        onCheckedChange={setRemember}
                                        className="h-3 w-3 sm:h-4 sm:w-4 border-gray-300"
                                    />
                                    <Label htmlFor="remember" className="text-[10px] sm:text-sm text-muted-foreground">
                                        Remember me
                                    </Label>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-10 sm:h-12 text-xs sm:text-base font-semibold rounded-lg shadow-lg"
                                loading={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #2e8b57 0%, #236b43 100%)'
                                }}
                            >
                                Sign In
                            </Button>
                        </form>

                        <p className="mt-6 text-center text-[10px] sm:text-sm text-muted-foreground">
                            QuickConn Virtual Attendance System
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
