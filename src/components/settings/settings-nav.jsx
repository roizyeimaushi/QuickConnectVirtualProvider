"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
    Settings,
    Clock,
    Timer,
    Bell,
    Shield,
    Database,
    LifeBuoy,
    ArrowLeft
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

const sidebarNavItems = [
    {
        title: "General",
        href: "/settings/general",
        icon: Settings,
    },
    {
        title: "Attendance",
        href: "/settings/attendance",
        icon: Clock,
    },
    {
        title: "Break",
        href: "/settings/break",
        icon: Timer,
    },
    {
        title: "Notifications",
        href: "/settings/notifications",
        icon: Bell,
    },
    {
        title: "Security",
        href: "/settings/security",
        icon: Shield,
    },
    {
        title: "Data Management",
        href: "/settings/data",
        icon: Database,
    },

];

export function SettingsNav() {
    const pathname = usePathname();
    const { isAdmin } = useAuth();
    const dashboardLink = isAdmin ? "/dashboard/admin" : "/dashboard/employee";

    return (
        <nav
            className={cn(
                "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 overflow-x-auto pb-4 lg:pb-0"
            )}
        >
            <Link
                href={dashboardLink}
                className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "hover:bg-muted/50 justify-start gap-2 mb-2 lg:mb-4 text-muted-foreground"
                )}
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </Link>
            {sidebarNavItems.map((item) => {
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            buttonVariants({ variant: "ghost" }),
                            pathname === item.href
                                ? "bg-muted hover:bg-muted"
                                : "hover:bg-muted/50",
                            "justify-start gap-2"
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        {item.title}
                    </Link>
                );
            })}
        </nav>
    );
}
