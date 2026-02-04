"use client";

/**
 * Full-screen loading component with QuickConnect logo
 * Used ONLY for login pages and successful login redirect
 */
export function FullscreenLoader() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
            <img
                src="/quickconnect-logo.png"
                alt="QuickConnect"
                className="h-20 w-auto object-contain"
            />
        </div>
    );
}

/**
 * Page loading spinner - simple centered spinner
 * Used for loading states on regular pages (not login)
 */
export function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
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
