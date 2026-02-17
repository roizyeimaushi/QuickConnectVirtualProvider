"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useSettingsContext } from "@/components/providers/settings-provider";

/**
 * Global loading screen that shows while auth and settings are initializing.
 * Prevents the white flash that occurs on first visit before hydration completes.
 */
export function GlobalLoadingScreen({ children }) {
    const { loading: authLoading } = useAuth();
    const { loading: settingsLoading } = useSettingsContext();

    // Show loading screen while critical providers are initializing
    if (authLoading || settingsLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-6 animate-fade-in">
                    {/* Logo */}
                    <img
                        src="/quickconnect-logo.png"
                        alt="QuickConnect"
                        className="h-16 w-auto object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />

                    {/* Spinner */}
                    <div className="relative">
                        <div className="w-10 h-10 border-4 border-gray-200 rounded-full"></div>
                        <div className="w-10 h-10 border-4 border-[#2e8b57] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>

                    {/* Text */}
                    <p className="text-sm text-gray-400 font-medium tracking-wide">
                        Loading QuickConnect...
                    </p>
                </div>
            </div>
        );
    }

    return children;
}
