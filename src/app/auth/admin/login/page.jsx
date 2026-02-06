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
        <>
            {/* Main Layout Container - Column on mobile, Row on Tablet/Desktop (md and up) */}
            <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0f172a]">

                {/* Left/Top Side - Welcome Image & Message */}
                <div className="w-full md:w-1/2 h-[35vh] sm:h-[40vh] md:h-screen relative overflow-hidden flex-shrink-0">
                    {/* Full Background Image */}
                    <img
                        src="/admin-login-bg.jpg"
                        alt="QuickConn Admin Portal"
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />

                    {/* Darker Overlay for Admin - Premium Slate/Blue tint */}
                    <div className="absolute inset-0 bg-slate-950/50" />

                    {/* Welcome Message Overlay */}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
                        <div className="max-w-md">
                            <h2 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-extrabold leading-tight text-white drop-shadow-2xl mb-3 sm:mb-4">
                                Administrator <br className="sm:hidden" />
                                <span className="text-[#22c55e]">Console</span>
                            </h2>
                            <p className="text-white/90 text-sm sm:text-base md:text-base lg:text-lg leading-relaxed drop-shadow-lg font-medium">
                                Secure access to manage employees, schedules, and attendance system records.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right/Bottom Side - Login Form */}
                <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 md:p-12 lg:p-16 bg-[#0f172a] shadow-2xl md:shadow-none -mt-4 md:mt-0 rounded-t-3xl md:rounded-none z-20">
                    <div className="w-full max-w-sm sm:max-w-md mx-auto">
                        {/* Logo */}
                        <div className="flex justify-center mb-6 sm:mb-8">
                            <img
                                src={getLogoUrl(settings?.system_logo)}
                                alt="QuickConn Logo"
                                className="h-auto max-h-16 sm:max-h-20 md:max-h-24 w-auto object-contain filter brightness-0 invert"
                                onError={(e) => {
                                    e.currentTarget.src = "/quickconnect-logo.png";
                                    e.currentTarget.onerror = null;
                                }}
                            />
                        </div>

                        {/* Subtitle */}
                        <div className="text-center mb-8">
                            <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Admin Access</h3>
                            <p className="text-slate-400 text-sm">Welcome back! Please sign in to continue.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                            <div className="space-y-4">
                                {/* Email Field */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase ml-1">Admin Email</Label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#22c55e] transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="admin@quickconn.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full h-12 pl-11 pr-4 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-[#22c55e]/50 focus:ring-4 focus:ring-[#22c55e]/10 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-xs font-bold text-slate-400 uppercase ml-1">Password</Label>
                                    <div className="relative group">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#22c55e] transition-colors">
                                            <KeyRound className="h-5 w-5" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full h-12 pl-11 pr-12 bg-slate-900/50 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-[#22c55e]/50 focus:ring-4 focus:ring-[#22c55e]/10 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-all"
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
                                        className="rounded-md border-slate-700 data-[state=checked]:bg-[#22c55e] data-[state=checked]:border-[#22c55e]"
                                        checked={remember}
                                        onCheckedChange={setRemember}
                                    />
                                    <span className="text-sm text-slate-400 font-medium group-hover:text-slate-200 selection:bg-transparent">Keep me logged in</span>
                                </label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-13 text-base font-bold rounded-xl shadow-lg shadow-[#22c55e]/10 hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0px] transition-all duration-200"
                                loading={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                }}
                            >
                                Secure Login
                            </Button>
                        </form>

                        {/* Footer text */}
                        <div className="mt-10 pt-6 border-t border-slate-800/50 text-center">
                            <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                                System Protected by QuickConn Security
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
