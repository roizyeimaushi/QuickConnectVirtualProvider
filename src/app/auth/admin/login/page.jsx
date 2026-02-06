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
import { Eye, EyeOff, AlertCircle, User, KeyRound } from "lucide-react";
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

    const { login, isAuthenticated, isAdmin, isEmployee } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

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
                <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
                    <DialogHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-900/20 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-500" />
                        </div>
                        <DialogTitle className="text-center">Login Failed</DialogTitle>
                        <DialogDescription className="text-center text-slate-400">
                            {error}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center mt-4">
                        <Button onClick={() => setShowErrorModal(false)} variant="outline" className="border-slate-700 text-white hover:bg-slate-800">
                            Try Again
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Layout - Split Layout for Admin (Dark Theme) */}
            <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#0f172a]">

                {/* Left Side (Desktop) / Top Side (Mobile) - Admin Image */}
                <div className="w-full md:w-1/2 h-[30vh] sm:h-[35vh] md:h-screen relative overflow-hidden flex-shrink-0">
                    <img
                        src="/admin-login-bg.jpg"
                        alt="Admin Console"
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />

                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center">
                        <div className="max-w-md animate-slide-in-top">
                            <h2 className="text-2xl sm:text-4xl font-black leading-tight text-white mb-4 drop-shadow-2xl">
                                Administrator <br />
                                <span className="text-[#22c55e]">Portal</span>
                            </h2>
                            <p className="text-white/80 text-sm sm:text-lg font-medium tracking-wide">
                                Secure gateway for workforce management and system oversight.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Admin Login Form */}
                <div className="flex-1 flex flex-col justify-center p-6 sm:p-10 md:p-12 lg:p-16 bg-[#0f172a]">
                    <div className="w-full max-w-sm mx-auto animate-fade-in">
                        {/* Logo */}
                        <div className="flex justify-center mb-8">
                            <img
                                src={getLogoUrl(settings?.system_logo)}
                                alt="QuickConn Logo"
                                className="h-auto max-h-16 md:max-h-24 w-auto object-contain filter brightness-0 invert"
                                onError={(e) => {
                                    e.currentTarget.src = "/quickconnect-logo.png";
                                    e.currentTarget.onerror = null;
                                }}
                            />
                        </div>

                        <div className="text-center mb-10">
                            <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Access Control</h1>
                            <p className="text-slate-400 text-sm font-medium">Verify credentials to proceed</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Admin Identity</Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#3da36e] transition-colors">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="Enter administrator email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full h-14 pl-12 pr-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-[#3da36e] focus:ring-1 focus:ring-[#3da36e]/30 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Security Key</Label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-[#3da36e] transition-colors">
                                            <KeyRound className="h-5 w-5" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full h-14 pl-12 pr-12 bg-slate-900/50 border border-slate-800 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-[#3da36e] focus:ring-1 focus:ring-[#3da36e]/30 transition-all shadow-inner"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 py-2">
                                <Checkbox
                                    id="remember"
                                    checked={remember}
                                    onCheckedChange={setRemember}
                                    className="h-5 w-5 rounded-md border-slate-700 data-[state=checked]:bg-[#3da36e] data-[state=checked]:border-[#3da36e]"
                                />
                                <Label htmlFor="remember" className="text-sm text-slate-400 font-medium cursor-pointer select-none">
                                    Maintain session
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 text-base font-black bg-[#3da36e] hover:bg-[#2e8b57] text-white rounded-2xl shadow-lg hover:shadow-[#3da36e]/20 transition-all duration-300"
                                loading={loading}
                            >
                                Validate & Login
                            </Button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-slate-800/50 text-center">
                            <p className="text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase">
                                QuickConn Security Framework v4.0
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
