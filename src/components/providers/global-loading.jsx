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
