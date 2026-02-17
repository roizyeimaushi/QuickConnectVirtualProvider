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
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#2e8b57] rounded-full animate-spin"></div>
        </div>
    );
}
