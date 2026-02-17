"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Pass query parameters (like ?redirect=/dashboard/employee) to the target page
        const search = window.location.search;
        router.replace(`/auth/employee/login${search}`);
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#2e8b57] rounded-full animate-spin"></div>
        </div>
    );
}

