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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock } from "lucide-react";
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

            <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-50">
                {/* Background Decoration */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/admin-login-bg.jpg"
                        alt="Background"
                        className="w-full h-full object-cover opacity-10 blur-[2px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10" />
                </div>

                {/* Login Card */}
                <div className="relative z-10 w-full max-w-[480px] px-4">
                    <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm shadow-emerald-500/5 overflow-hidden">
                        <CardHeader className="pt-12 pb-6 text-center">
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
                            <CardTitle className="text-4xl font-black tracking-tight text-slate-900 font-inter">
                                QuickConn <span className="text-emerald-600">Admin</span>
                            </CardTitle>
                            <CardDescription className="text-slate-500 mt-2 text-base">
                                Unauthorized access is strictly prohibited
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="px-10 pb-12">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-widest">Email</Label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <input
                                                id="email"
                                                type="email"
                                                placeholder="Enter your email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full h-14 pl-12 pr-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-900 font-inter"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-xs font-bold text-slate-700 uppercase ml-1 tracking-widest">Password</Label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors">
                                                <Lock className="h-5 w-5" />
                                            </div>
                                            <input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                className="w-full h-14 pl-12 pr-14 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-900 font-inter"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-1">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="remember"
                                            checked={remember}
                                            onCheckedChange={setRemember}
                                            className="border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                        />
                                        <Label htmlFor="remember" className="text-sm font-medium text-slate-600 cursor-pointer">
                                            Keep me signed in
                                        </Label>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all active:scale-[0.98] border-none"
                                    loading={loading}
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                    }}
                                >
                                    Login
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col items-center mt-10 space-y-2">
                        <p className="text-slate-300 text-[10px]">
                            &copy; {new Date().getFullYear()} QuickConn Virtual Services. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
