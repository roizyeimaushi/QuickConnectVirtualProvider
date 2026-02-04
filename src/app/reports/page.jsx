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

    return null;
}
