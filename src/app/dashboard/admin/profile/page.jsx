"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { getInitials } from "@/lib/utils";
import { authApi } from "@/lib/api";
import {
    User,
    Mail,
    Building2,
    BadgeCheck,
    Save,
    Camera,
    ArrowLeft,
    Calendar,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";

export default function AdminProfilePage() {
    const { user, refetchUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        email: user?.email || "",
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user?.first_name || "",
                last_name: user?.last_name || "",
                email: user?.email || "",
            });
        }
    }, [user]);

    // Separate loading state for initial fetch vs save operations
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            setInitialLoading(true);
            await refetchUser();
            setInitialLoading(false);
        };
        init();
    }, [refetchUser]);

    if (authLoading || initialLoading) {
        return <FullscreenLoader />;
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 2MB)
            if (file.size > 2048 * 1024) {
                toast({
                    title: "File too large",
                    description: "Avatar image must be less than 2MB",
                    variant: "destructive",
                });
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            data.append('first_name', formData.first_name);
            data.append('last_name', formData.last_name);
            data.append('email', formData.email);
            if (avatarFile) {
                if (avatarFile.size > 2048 * 1024) {
                    toast({
                        title: "File too large",
                        description: "Avatar image must be less than 2MB",
                        variant: "destructive",
                    });
                    setLoading(false);
                    return;
                }
                data.append('avatar', avatarFile);
            }

            await authApi.updateProfile(data);

            // Refresh user data (updates sidebar)
            await refetchUser();

            toast({
                title: "Profile updated",
                description: "Your profile has been updated successfully.",
                variant: "success",
            });
        } catch (error) {
            console.error("Profile update error details:", JSON.stringify(error, null, 2));
            const message = error.message || (error.errors ? "Validation failed" : "Failed to update profile");

            if (error.errors) {
                // Show first validation error if available
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
        <DashboardLayout title="Profile">
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
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

                {/* Header */}
                <div className="space-y-0">
                    <h1 className="text-3xl font-bold tracking-tight">Admin Profile</h1>
                    <p className="text-muted-foreground text-sm">
                        View and update your account information.
                    </p>
                </div>

                {/* Profile Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <Avatar className="h-20 w-20 rounded-full border-2 border-primary/20 cursor-pointer">
                                    <AvatarImage src={avatarPreview || user?.avatar} alt={user?.first_name} />
                                    <AvatarFallback className="rounded-full bg-primary/10 text-primary text-2xl font-semibold">
                                        {getInitials(user?.first_name, user?.last_name)}
                                    </AvatarFallback>
                                </Avatar>
                                <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera className="h-6 w-6" />
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>
                            <div>
                                <CardTitle className="text-xl">
                                    {user?.first_name} {user?.last_name}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1">
                                    <BadgeCheck className="h-4 w-4 text-primary" />
                                    <span className="capitalize">{user?.role}</span>
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="first_name"
                                            value={formData.first_name}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    first_name: e.target.value,
                                                }))
                                            }
                                            className="pl-9"
                                            placeholder="Enter first name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="last_name"
                                            value={formData.last_name}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    last_name: e.target.value,
                                                }))
                                            }
                                            className="pl-9"
                                            placeholder="Enter last name"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                email: e.target.value,
                                            }))
                                        }
                                        className="pl-9"
                                        placeholder="Enter email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <div className="relative">
                                    <BadgeCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={user?.status || "Active"}
                                        className="pl-9 bg-muted/50"
                                        disabled
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" loading={loading}>
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout >
    );
}
