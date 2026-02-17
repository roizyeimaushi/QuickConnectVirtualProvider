"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useSettingsContext } from "@/components/providers/settings-provider";
import { usePathname } from "next/navigation";

/**
 * Global loading screen that shows the logo while providers initialize.
 * Only shown on auth/login pages — other pages already have skeleton loaders.
 */
export function GlobalLoadingScreen({ children }) {
    const { loading: authLoading } = useAuth();
    const { loading: settingsLoading } = useSettingsContext();
    const pathname = usePathname();

    const isLoading = authLoading || settingsLoading;

    // Only show the logo loading screen on login/auth pages
    const isAuthPage = pathname?.startsWith("/auth") || pathname === "/";

    if (isLoading && isAuthPage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-fade-in">
                    <img
                        src="/quickconnect-logo.png"
                        alt="QuickConnect"
                        className="h-16 w-auto object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                </div>
            </div>
        );
    }

    return children;
}
