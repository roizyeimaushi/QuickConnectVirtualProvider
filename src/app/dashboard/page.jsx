"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export default function DashboardPage() {
    const router = useRouter();
    const { isAdmin, isEmployee, isAuthenticated, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (!isAuthenticated) {
            router.replace("/auth/employee/login");
            return;
        }

        if (isAdmin) {
            router.replace("/dashboard/admin");
        } else if (isEmployee) {
            router.replace("/dashboard/employee");
        } else {
            router.replace("/");
        }
    }, [isAdmin, isEmployee, isAuthenticated, loading, router]);

    return (
        null
    );
}
