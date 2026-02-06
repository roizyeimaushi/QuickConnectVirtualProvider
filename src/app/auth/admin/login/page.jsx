"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, AlertCircle, User, KeyRound } from "lucide-react";
import { useSettingsContext } from "@/components/providers/settings-provider";
import { getLogoUrl, API_BASE_URL } from "@/lib/constants";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
                        <DialogTitle className="text-center text-white">Login Failed</DialogTitle>
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

            {/* Layout - Fixed to ALWAYS be side-by-side: Image LEFT, Login RIGHT */}
            <div className="h-screen w-full flex bg-[#0f172a] overflow-hidden">

                {/* Left Side - Welcome Image (Always 1/2 width) */}
                <div className="w-1/2 h-full relative overflow-hidden flex-shrink-0">
                    <img
                        src="/admin-login-bg.jpg"
                        alt="Admin Portal"
                        className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-slate-950/60" />

                    <div className="absolute inset-0 z-10 flex items-center justify-center p-4 text-center">
                        <div className="max-w-md">
                            <h2 className="text-xl sm:text-4xl font-extrabold leading-tight text-white mb-2 sm:mb-4 drop-shadow-2xl">
                                Administrator <br />
                                <span className="text-[#22c55e]">Console</span>
                            </h2>
                            <p className="text-white/90 text-[10px] sm:text-lg font-medium drop-shadow-lg">
                                Secure access for system management.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form (Always 1/2 width) */}
                <div className="w-1/2 h-full flex flex-col justify-center p-4 sm:p-10 md:p-12 lg:p-16 bg-[#0f172a] overflow-y-auto">
                    <div className="w-full max-w-sm mx-auto">
                        {/* Logo */}
                        <div className="flex justify-center mb-4 sm:mb-6">
                            <img
                                src={getLogoUrl(settings?.system_logo)}
                                alt="QuickConn Logo"
                                className="h-auto max-h-12 sm:max-h-24 w-auto object-contain filter brightness-0 invert"
                                onError={(e) => {
                                    e.currentTarget.src = "/quickconnect-logo.png";
                                    e.currentTarget.onerror = null;
                                }}
                            />
                        </div>

                        <div className="text-center mb-6 sm:mb-8">
                            <h1 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2">Welcome Back</h1>
                            <p className="text-slate-400 text-[10px] sm:text-sm">Admin Access</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                            <div className="space-y-3 sm:space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="email" className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase ml-1">Admin Email</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                            <User className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="Admin email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-4 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs sm:text-base placeholder:text-slate-600 focus:outline-none focus:border-[#3da36e] transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="password" className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase ml-1">Password</Label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                            <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full h-10 sm:h-12 pl-10 sm:pl-12 pr-10 sm:pr-12 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs sm:text-base placeholder:text-slate-600 focus:outline-none focus:border-[#3da36e] transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    checked={remember}
                                    onCheckedChange={setRemember}
                                    className="h-3 w-3 sm:h-4 sm:w-4 border-slate-700 data-[state=checked]:bg-[#3da36e] data-[state=checked]:border-[#3da36e]"
                                />
                                <Label htmlFor="remember" className="text-[10px] sm:text-sm text-slate-400">
                                    Remember me
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-10 sm:h-12 text-xs sm:text-base font-bold bg-[#3da36e] hover:bg-[#2e8b57] text-white rounded-xl shadow-lg transition-all"
                                loading={loading}
                            >
                                Login
                            </Button>
                        </form>

                        <div className="mt-8 pt-4 border-t border-slate-800/50 text-center">
                            <p className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">
                                QuickConn Security
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
