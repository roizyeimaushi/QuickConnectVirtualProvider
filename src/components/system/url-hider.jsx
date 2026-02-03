"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Paths where we hide the URL in the address bar (show only "/" so path is not visible)
const HIDE_PATH_PREFIXES = [
    "/auth/login",
    "/auth/employee/login",
    "/auth/admin/login",
];

function shouldHidePath(pathname) {
    if (!pathname || pathname === "/") return false;
    return HIDE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export function UrlHider() {
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!shouldHidePath(pathname)) return;

        try {
            // Replace URL with "/" so the address bar shows only the origin + "/"
            // (hides /auth/employee/login, /auth/admin/login, etc.)
            window.history.replaceState(null, "", "/");
        } catch (e) {
            console.error("Failed to hide URL path", e);
        }
    }, [pathname]);

    return null;
}
