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
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/admin-login-bg.jpg')" }}
            />

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

            {/* Decorative Curved Shapes */}
            <div
                className="absolute -left-32 top-1/4 w-96 h-96 rounded-full opacity-10"
                style={{ background: '#2e8b57' }}
            />
            <div
                className="absolute -right-48 -bottom-32 w-[500px] h-[500px] rounded-full opacity-10"
                style={{ background: '#3da36e' }}
            />

            {/* Error Modal - Updated to match screenshot style */}
            <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
                <DialogContent className="sm:max-w-md bg-[#0a1410]/95 backdrop-blur-xl border-white/10 text-white">
                    <DialogHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-500" />
                        </div>
                        <DialogTitle className="text-center font-bold text-xl">Login Failed</DialogTitle>
                        <DialogDescription className="text-center text-white/60">
                            {error}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center mt-6">
                        <Button
                            onClick={() => setShowErrorModal(false)}
                            className="bg-white text-black hover:bg-white/90 font-bold px-8"
                        >
                            Try Again
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Login Form */}
            <div className="relative z-10 w-full max-w-sm px-6 sm:px-8 flex flex-col items-center">
                {/* Logo */}
                <div className="flex justify-center mb-8">
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

                {/* Title */}
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white text-center mb-2 tracking-tight drop-shadow-lg flex flex-col md:block">
                    <span className="block md:inline">Welcome to </span>
                    <span className="text-[#22c55e]">QuickConn Virtual</span>
                </h1>
                <p className="text-white/80 text-sm font-medium text-center mb-10 drop-shadow-md">
                    Sign in to access your administrator account
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    {/* Email Input */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-500 transition-colors">
                            <User className="h-5 w-5" />
                        </div>
                        <input
                            type="email"
                            placeholder="admin@quickconn.net"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full h-12 pl-12 pr-4 bg-transparent border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition-all font-medium"
                        />
                    </div>

                    {/* Password Input */}
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-emerald-500 transition-colors">
                            <KeyRound className="h-5 w-5" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            className="w-full h-12 pl-12 pr-12 bg-transparent border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition-all font-medium"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>

                    <div className="flex items-center space-x-2 py-2">
                        <Checkbox
                            id="remember"
                            className="border-white/20 h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            checked={remember}
                            onCheckedChange={setRemember}
                        />
                        <Label
                            htmlFor="remember"
                            className="text-sm text-white/80 font-medium cursor-pointer"
                        >
                            Remember me
                        </Label>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 mt-4 bg-transparent border border-emerald-500 text-emerald-500 rounded-xl text-base font-bold transition-all duration-300 hover:bg-emerald-500/10 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            "Login"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
