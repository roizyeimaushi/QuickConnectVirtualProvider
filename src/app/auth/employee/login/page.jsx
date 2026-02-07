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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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

            <div className="min-h-screen h-screen w-full flex flex-col md:flex-row overflow-hidden bg-white">
                {/* Left Side - Image and Branding */}
                <div className="hidden md:block md:w-1/2 h-full relative overflow-hidden bg-slate-200">
                    <img
                        src="/employee-login-side.png"
                        alt="QuickConn Workspace"
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Overlay with Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                        <div className="max-w-xl animate-fade-in space-y-8">
                            <h1 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-sm select-none">
                                Welcome to <br />
                                <span className="text-[#22c55e]">QuickConn Virtual</span>
                            </h1>
                            <p className="text-white/90 text-lg lg:text-xl font-medium max-w-md mx-auto leading-relaxed drop-shadow-sm">
                                Track your attendance, view schedules, and manage your work records in one convenient portal.
                            </p>
                        </div>
                    </div>

                    {/* Decorative Elements can be added here if they are separate images, 
                        otherwise they are expected to be part of the background image */}
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full md:w-1/2 h-full flex flex-col justify-center items-center p-6 sm:p-12 lg:p-20 overflow-y-auto">
                    <div className="w-full max-w-[420px] space-y-8 py-8">
                        {/* Logo */}
                        <div className="flex justify-center flex-col items-center space-y-6">
                            <img
                                src={getLogoUrl(settings?.system_logo)}
                                alt="QuickConn Logo"
                                className="h-auto max-h-24 w-auto object-contain"
                                onError={(e) => {
                                    e.currentTarget.src = "/quickconnect-logo.png";
                                    e.currentTarget.onerror = null;
                                }}
                            />
                            <p className="text-slate-500 text-sm font-medium">
                                Sign in to access your QuickConn Virtual account
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-5">
                                {/* Email Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-bold text-slate-800 uppercase tracking-widest ml-1">
                                        Email Address
                                    </Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#22c55e] transition-colors">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#22c55e] focus:ring-4 focus:ring-[#22c55e]/10 transition-all text-slate-900 placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-xs font-bold text-slate-800 uppercase tracking-widest ml-1">
                                        Password
                                    </Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#22c55e] transition-colors">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full h-14 pl-12 pr-14 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#22c55e] focus:ring-4 focus:ring-[#22c55e]/10 transition-all text-slate-900 placeholder:text-slate-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#22c55e] transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 py-1">
                                <Checkbox
                                    id="remember"
                                    checked={remember}
                                    onCheckedChange={setRemember}
                                    className="border-slate-300 data-[state=checked]:bg-[#22c55e] data-[state=checked]:border-[#22c55e]"
                                />
                                <Label htmlFor="remember" className="text-sm font-medium text-slate-500 cursor-pointer">
                                    Remember me
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 text-lg font-bold rounded-xl shadow-lg border-none hover:shadow-xl transition-all active:scale-[0.98] mt-2"
                                loading={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #2e8b57 0%, #236b43 100%)'
                                }}
                            >
                                Sign In
                            </Button>
                        </form>

                        {/* Footer text */}
                        <div className="pt-8 text-center">
                            <p className="text-slate-400 text-sm font-medium">
                                QuickConn Virtual Attendance System
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
