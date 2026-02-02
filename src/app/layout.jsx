import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Suspense } from "react";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { UrlHider } from "@/components/system/url-hider";
import "./globals.css";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
});

export const metadata = {
    title: "QuickConn Virtual | Enterprise Attendance Sheet System",
    description:
        "QuickConn Virtual is a secure, enterprise-grade attendance sheet system for organizations, enabling administrators to manage employees, enforce 24-hour attendance schedules, and generate audit-ready reports with precision and efficiency.",
    keywords:
        "attendance system, employee attendance, HR management, enterprise attendance, workforce tracking, QuickConn Virtual",
    authors: [{ name: "QuickConn Virtual" }],
    openGraph: {
        title: "QuickConn Virtual | Enterprise Attendance Management",
        description:
            "A professional attendance management platform designed for modern organizations with admin-controlled schedules and secure employee tracking.",
        type: "website",
    },
};


export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <meta name="theme-color" content="#2e8b57" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="QuickCon" />
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body
                className={`${inter.variable} font-sans antialiased`}
            >
                <SettingsProvider>
                    <AuthProvider>
                        <Suspense fallback={null}>
                            <UrlHider />
                        </Suspense>
                        {children}
                        <Toaster />
                    </AuthProvider>
                </SettingsProvider>
            </body>
        </html>
    );
}
