"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
    Settings,
    Clock,
    Timer,
    Bell,
    Shield,
    Database,
    Briefcase
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

const settingsItems = [
    { title: "General", href: "/settings/general", icon: Settings, description: "Basic company details and defaults" },
    { title: "Positions", href: "/settings/positions", icon: Briefcase, description: "Manage employee job positions" },
    { title: "Attendance", href: "/settings/attendance", icon: Clock, description: "Attendance rules and policies" },
    { title: "Break", href: "/settings/break", icon: Timer, description: "Break time configurations" },
    { title: "Notifications", href: "/settings/notifications", icon: Bell, description: "Alerts and delivery methods" },
    { title: "Security", href: "/settings/security", icon: Shield, description: "Password policies and access control" },
    { title: "Data Management", href: "/settings/data", icon: Database, description: "Backup, restore, and data export" },
];

export default function SettingsRootPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Settings</h3>
                <p className="text-sm text-muted-foreground">
                    Manage your application settings and preferences.
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {settingsItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                buttonVariants({ variant: "outline", className: "h-auto flex-col items-start justify-start p-4 hover:bg-muted/50" })
                            )}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className="h-5 w-5 text-primary" />
                                <span className="font-semibold text-foreground">{item.title}</span>
                            </div>
                            <p className="text-sm text-muted-foreground font-normal line-clamp-2">
                                {item.description}
                            </p>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
