"use client";

/**
 * Full-screen loading component with QuickConnect logo
 * Used for initial page loads across all pages
 */
export function FullscreenLoader() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
            <img
                src="/quickconnect-logo.png"
                alt="QuickConnect"
                className="h-32 w-auto object-contain"
            />
        </div>
    );
}

/**
 * Inline spinner for filtering/searching (not fullscreen)
 * Used when data is being filtered but page is already loaded
 */
export function InlineSpinner({ className = "" }) {
    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
    );
}
