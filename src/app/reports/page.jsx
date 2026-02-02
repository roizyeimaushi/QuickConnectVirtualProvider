"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function ReportsPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to daily reports by default
        router.replace("/reports/daily");
    }, [router]);

    return (
        <DashboardLayout title="Reports">
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground animate-pulse">Loading reports...</p>
                </div>
            </div>
        </DashboardLayout>
    );
}
