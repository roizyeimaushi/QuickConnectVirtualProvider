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
        <div className="min-h-screen w-full relative flex items-center justify-center p-4 overflow-hidden selection:bg-emerald-500/30 font-sans">
            {/* Background Layer with Dark Overlay */}
            <div
                className="absolute inset-0 z-0"
                style={{
                    backgroundImage: "url('/admin-login-bg.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat"
                }}
            >
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />
            </div>

            {/* Error Modal */}
            <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
                <DialogContent className="sm:max-w-md bg-slate-900/95 backdrop-blur-xl border-slate-800 text-white">
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

            <div className="relative z-10 w-full max-w-[450px] animate-fade-in flex flex-col items-center">
                {/* Logo Section */}
                <div className="mb-10 text-center flex flex-col items-center">
                    <div className="p-4 mb-4">
                        <img
                            src={getLogoUrl(settings?.system_logo)}
                            alt="QuickConn Logo"
                            className="h-20 w-auto object-contain"
                            onError={(e) => {
                                e.currentTarget.src = "/quickconnect-logo.png";
                                e.currentTarget.onerror = null;
                            }}
                        />
                    </div>

                    <h1 className="text-3xl md:text-3xl font-black text-white mb-1 tracking-tight">
                        Welcome to QuickConn
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">
                        Sign in to access your administrator dashboard
                    </p>
                </div>

                {/* Login Form */}
                <div className="w-full space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-emerald-500 transition-colors">
                                    <User className="h-5 w-5" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="admin@quickconn.net"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-12 pl-12 pr-4 bg-transparent border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-medium"
                                />
                            </div>

                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-emerald-500 transition-colors">
                                    <KeyRound className="h-5 w-5" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full h-12 pl-12 pr-12 bg-transparent border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 py-1">
                            <Checkbox
                                id="remember"
                                checked={remember}
                                onCheckedChange={setRemember}
                                className="h-5 w-5 rounded-md border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all"
                            />
                            <Label htmlFor="remember" className="text-sm text-white font-medium cursor-pointer select-none">
                                Remember me
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-bold bg-transparent hover:bg-emerald-500/10 border border-emerald-500 text-emerald-500 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                            disabled={loading}
                        >
                            {loading ? "Authenticating..." : "Login"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
