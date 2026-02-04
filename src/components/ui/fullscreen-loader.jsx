"use client";

/**
 * Full-screen loading component with QuickConnect logo
 * Used for initial page loads across all pages
 */
export function FullscreenLoader() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <img
                        src="/quickconnect-logo.png"
                        alt="QuickConnect"
                        className="h-24 w-auto object-contain animate-[pulse_2s_ease-in-out_infinite]"
                    />
                </div>
                <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-primary animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }}></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-primary animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
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
