"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";


export default function LoginRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Pass query parameters (like ?redirect=/dashboard/employee) to the target page
        const search = window.location.search;
        router.replace(`/auth/employee/login${search}`);
    }, [router]);

    return <FullscreenLoader />;
}

