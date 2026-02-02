"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { Lock, Save, Key, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminChangePasswordPage() {
    const { logout } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await authApi.changePassword(formData);

            toast({
                title: "Password changed successfully",
                description: "You will be logged out to sign in with your new password.",
                variant: "success",
            });

            // Small delay before logout
            setTimeout(() => {
                logout();
            }, 1000);

        } catch (error) {
            console.error("Change password error:", error);
            const message = error.message || "Failed to change password";

            if (error.errors) {
                // Show first validation error
                const firstError = Object.values(error.errors)[0];
                if (firstError) toast({ title: "Validation Error", description: Array.isArray(firstError) ? firstError[0] : firstError, variant: "destructive" });
                return;
            }

            toast({
                title: "Error",
                description: message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout title="Change Password">
            <div className="max-w-md mx-auto space-y-6 animate-fade-in">
                {/* Back Link - HARDCODED FOR ADMIN */}
                <div>
                    <Link
                        href="/dashboard/admin"
                        className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "pl-0 gap-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                        )}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                </div>

                <div className="space-y-0">
                    <h1 className="text-3xl font-bold tracking-tight">Security</h1>
                    <p className="text-muted-foreground text-sm">
                        Change your password to maintain account security.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Key className="h-5 w-5 text-primary" />
                            Change Password
                        </CardTitle>
                        <CardDescription>
                            Use a strong password with at least 8 characters.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current_password">Current Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="current_password"
                                        name="current_password"
                                        type="password"
                                        value={formData.current_password}
                                        onChange={handleChange}
                                        className="pl-9"
                                        placeholder="Enter current password"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="pl-9"
                                        placeholder="Enter new password"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        type="password"
                                        value={formData.password_confirmation}
                                        onChange={handleChange}
                                        className="pl-9"
                                        placeholder="Retype new password"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button type="submit" loading={loading} className="w-full sm:w-auto">
                                    <Save className="mr-2 h-4 w-4" />
                                    Update Password
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
