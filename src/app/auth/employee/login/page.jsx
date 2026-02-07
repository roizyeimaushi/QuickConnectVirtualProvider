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

            {/* Layout - Centered Card Only */}
            <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-50">
                {/* Background Decoration */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/employee-login-side.png"
                        alt="Background"
                        className="w-full h-full object-cover opacity-10 blur-[2px]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10" />
                </div>

                {/* Login Card */}
                <div className="relative z-10 w-full max-w-[450px] px-4">
                    <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm">
                        <CardHeader className="pt-8 pb-4 text-center">
                            <div className="flex justify-center mb-4">
                                <img
                                    src={getLogoUrl(settings?.system_logo)}
                                    alt="QuickConn Logo"
                                    className="h-16 w-auto object-contain"
                                    onError={(e) => {
                                        e.currentTarget.src = "/quickconnect-logo.png";
                                        e.currentTarget.onerror = null;
                                    }}
                                />
                            </div>
                            <CardTitle className="text-2xl font-bold tracking-tight">
                                Welcome to <span className="text-[#22c55e]">QuickConn</span>
                            </CardTitle>
                            <CardDescription className="text-muted-foreground mt-2">
                                Sign in to access your employee account
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="px-8 pb-8">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase ml-1">Email Address</Label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <input
                                                id="email"
                                                type="email"
                                                placeholder="Enter your email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-xs font-bold text-slate-700 uppercase ml-1">Password</Label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                <Lock className="h-5 w-5" />
                                            </div>
                                            <input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter your password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                className="w-full h-12 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="remember"
                                            checked={remember}
                                            onCheckedChange={setRemember}
                                            className="border-slate-300"
                                        />
                                        <Label htmlFor="remember" className="text-sm font-medium text-muted-foreground cursor-pointer">
                                            Remember me
                                        </Label>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 text-base font-semibold rounded-xl shadow-lg transition-all active:scale-[0.98]"
                                    loading={loading}
                                    style={{
                                        background: 'linear-gradient(135deg, #2e8b57 0%, #236b43 100%)'
                                    }}
                                >
                                    Sign In
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <p className="text-center text-slate-400 text-xs mt-8">
                        &copy; {new Date().getFullYear()} QuickConn Virtual Services. All rights reserved.
                    </p>
                </div>
            </div>
        </>
    );
}
