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
        <div className="min-h-screen flex items-center justify-center bg-white">
            <img
                src="/quickconnect-logo.png"
                alt="QuickConnect"
                className="h-16 w-auto object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
        </div>
    );
}

