"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Custom 404 Not Found Page
 * Displays when a user navigates to a non-existent route
 */
export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 flex items-center justify-center p-4">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-100 rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-100 rounded-full blur-3xl opacity-50" />
            </div>

            <div className="relative z-10 text-center max-w-lg mx-auto">
                {/* Logo */}
                <div className="mb-8">
                    <img
                        src="/quickconnect-logo.png"
                        alt="QuickConnect"
                        className="h-16 w-auto mx-auto object-contain"
                    />
                </div>

                {/* 404 Display */}
                <div className="mb-8">
                    <h1 className="text-[180px] font-black leading-none text-emerald-600">
                        404
                    </h1>
                </div>

                {/* Error Message */}
                <div className="space-y-4 mb-10">
                    <h2 className="text-2xl md:text-3xl font-semibold text-slate-800">
                        Page Not Found
                    </h2>
                    <p className="text-slate-600 text-lg max-w-md mx-auto">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                        Let&apos;s get you back on track.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button
                        asChild
                        size="lg"
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 px-8"
                    >
                        <Link href="/">
                            <Home className="mr-2 h-5 w-5" />
                            Go to Homepage
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="border-slate-300 hover:bg-slate-50 hover:border-emerald-300 transition-all duration-300 px-8"
                        onClick={() => window.history.back()}
                    >
                        <button type="button" onClick={() => window.history.back()}>
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Go Back
                        </button>
                    </Button>
                </div>

                {/* Footer note */}
                <p className="mt-12 text-sm text-slate-400">
                    QuickConn Virtual • Attendance Management System
                </p>
            </div>
        </div>
    );
}
