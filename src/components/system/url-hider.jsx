"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function UrlHider() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // This effectively "hides" the path in the address bar by replacing it with "/"
        // WARNING: This will cause page refreshes to return to the home page instead of the deep link
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
            try {
                // Keep the state but change the URL
                console.log("Hiding URL path:", window.location.pathname);
                window.history.replaceState(null, "", "/");
            } catch (e) {
                console.error("Failed to hide URL path", e);
            }
        }
    }, [pathname, searchParams]);

    return null;
}
