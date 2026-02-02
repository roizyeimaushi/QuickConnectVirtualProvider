"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SettingsNav } from "@/components/settings/settings-nav";
import { useSettings } from "@/hooks/use-settings";

export default function SettingsLayout({ children }) {
    const { loading } = useSettings();

    if (loading) {
        return (
            <DashboardLayout title="Settings">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Settings">
            <div className="space-y-6 animate-fade-in">
                {/* Content */}
                <div className="flex flex-col space-y-6 lg:flex-row lg:space-x-12 lg:space-y-0">
                    <aside className="-mx-4 lg:mx-0 lg:w-1/4">
                        <SettingsNav />
                    </aside>
                    <div className="flex-1 lg:max-w-2xl">{children}</div>
                </div>
            </div>
        </DashboardLayout>
    );
}
