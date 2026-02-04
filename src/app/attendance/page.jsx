"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export default function AttendancePage() {
    const router = useRouter();
    const { isAdmin, isEmployee, isAuthenticated, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (!isAuthenticated) {
            router.replace("/auth/employee/login");
            return;
        }

        if (isAdmin) {
            // Admin goes to sessions management
            router.replace("/attendance/sessions");
        } else if (isEmployee) {
            // Employee goes to attendance confirmation
            router.replace("/attendance/confirm");
        } else {
            router.replace("/");
        }
    }, [isAdmin, isEmployee, isAuthenticated, loading, router]);

    return null;
}
