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
        <div className="min-h-screen w-full flex bg-[#0f172a] selection:bg-emerald-500/30">
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

            {/* Side Image Banner (Desktop Only) */}
            <div className="hidden md:flex md:w-[45%] lg:w-1/2 h-screen relative overflow-hidden items-center justify-center flex-col p-12 text-center shadow-2xl z-10 border-r border-white/5">
                <div
                    className="absolute inset-0 bg-slate-950"
                    style={{
                        backgroundImage: "url('/admin-login-bg.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat"
                    }}
                >
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]" />
                </div>

                {/* Abstract Decorative Elements */}
                <div className="absolute top-[10%] left-[-10%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="relative z-10 animate-fade-in max-w-md">
                    <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-2xl inline-block mb-10 group transition-all hover:scale-105">
                        <img
                            src={getLogoUrl(settings?.system_logo)}
                            alt="QuickConn Logo"
                            className="h-20 w-auto object-contain filter brightness-0 invert"
                            onError={(e) => {
                                e.currentTarget.src = "/quickconnect-logo.png";
                                e.currentTarget.onerror = null;
                            }}
                        />
                    </div>

                    <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
                        Administrator <br />
                        <span className="text-emerald-500">Portal</span>
                    </h2>
                    <p className="text-slate-300 text-lg font-medium leading-relaxed opacity-90">
                        Secure gateway for workforce management <br />and system oversight.
                    </p>
                </div>

                <div className="absolute bottom-8 text-center opacity-30">
                    <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">
                        QuickConn Security Framework v4.2
                    </p>
                </div>
            </div>

            {/* Form Section (Centered on Mobile, Side on Desktop) */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
                {/* Mobile Decorative Blobs (Very subtle) */}
                <div className="md:hidden absolute top-[10%] left-[10%] w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="w-full max-w-[420px] relative z-10 animate-fade-in">
                    {/* Mobile Logo Only (Visible when banner hidden) */}
                    <div className="md:hidden flex flex-col items-center mb-10">
                        <div className="bg-slate-900/30 backdrop-blur-md p-4 rounded-xl border border-white/5 mb-6">
                            <img
                                src={getLogoUrl(settings?.system_logo)}
                                alt="QuickConn Logo"
                                className="h-12 w-auto object-contain filter brightness-0 invert"
                                onError={(e) => {
                                    e.currentTarget.src = "/quickconnect-logo.png";
                                    e.currentTarget.onerror = null;
                                }}
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">Access Control</h1>
                        <p className="text-slate-400 text-sm">Verify credentials to proceed</p>
                    </div>

                    {/* Desktop "Access Control" Header (Hidden on Mobile as we use a better one above) */}
                    <div className="hidden md:block mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Access Control</h1>
                        <p className="text-slate-400 font-medium">Please enter your administrative credentials</p>
                    </div>

                    {/* Login Form Box */}
                    <div className="bg-slate-900/40 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none p-8 md:p-0 rounded-[2rem] border border-white/5 md:border-none shadow-2xl md:shadow-none">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Admin Identity</Label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="Enter administrator email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full h-14 pl-12 pr-4 bg-slate-950/40 border border-slate-800 md:border-slate-800/50 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Security Key</Label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                                        <KeyRound className="h-5 w-5" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full h-14 pl-12 pr-12 bg-slate-950/40 border border-slate-800 md:border-slate-800/50 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-inner"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="remember"
                                    checked={remember}
                                    onCheckedChange={setRemember}
                                    className="h-5 w-5 rounded-md border-slate-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all duration-300"
                                />
                                <Label htmlFor="remember" className="text-sm text-slate-400 font-medium cursor-pointer select-none hover:text-emerald-500 transition-colors">
                                    Maintain session
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 text-lg font-bold bg-transparent hover:bg-emerald-500 border-2 border-emerald-500 text-emerald-500 hover:text-white rounded-2xl shadow-lg transition-all duration-500 disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? "Verifying..." : "Login"}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
