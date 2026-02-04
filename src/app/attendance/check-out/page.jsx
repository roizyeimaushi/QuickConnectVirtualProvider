"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { attendanceApi, reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime24, getCurrentDate, getCurrentTime } from "@/lib/utils";
import {
    Clock,
    AlertCircle,
    Fingerprint,
    Loader2,
    Calendar,
    Timer,
    LogOut,
    CheckCircle2,
    Shield,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";

function LiveClockCard() {
    const [time, setTime] = useState(getCurrentTime());
    const [date, setDate] = useState(getCurrentDate());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(getCurrentTime());
            setDate(getCurrentDate());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = time.split(":")[0];
    const minutes = time.split(":")[1];

    return (
        <Card className="overflow-hidden border-[#7C3AED]/30">
            <div className="bg-linear-to-br from-[#7C3AED] via-[#7C3AED]/90 to-[#7C3AED]/80 text-white p-8">
                <div className="text-center">
                    <p className="text-sm opacity-80 mb-2">Current Time</p>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
                            <span className="text-6xl font-bold font-mono">{hours}</span>
                        </div>
                        <span className="text-6xl font-bold animate-pulse">:</span>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
                            <span className="text-6xl font-bold font-mono">{minutes}</span>
                        </div>
                    </div>
                    <p className="text-lg opacity-90">
                        {formatDate(date, "EEEE, MMMM d, yyyy")}
                    </p>
                </div>
            </div>
        </Card>
    );
}

function SessionInfoCard({ session, loading, isWeekend }) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        );
    }

    // Weekend - Show friendly "No Work Today" message
    if (isWeekend) {
        return (
            <Card className="border-sky-200 dark:border-sky-900/50 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/30">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mb-4">
                        <Calendar className="h-8 w-8 text-sky-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-sky-700 dark:text-sky-400 mb-2">No Work Today</h3>
                    <p className="text-sm text-sky-600/80 dark:text-sky-400/80 max-w-sm">
                        It's the weekend! No shifts are scheduled for today. Enjoy your time off!
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!session) {
        return (
            <Card className="border-amber-200 dark:border-amber-900/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                        <AlertCircle className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Active Session</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        There is no attendance session open at the moment.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Session Details
                    </CardTitle>
                    {/* Active Badge Removed as requested */}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Timer className="h-4 w-4" />
                            <span className="text-xs">Time In</span>
                        </div>
                        <p className="text-2xl font-bold font-mono">{formatTime24(session.schedule?.time_in)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs">Time Out</span>
                        </div>
                        <p className="text-2xl font-bold font-mono">{formatTime24(session.schedule?.time_out)}</p>
                    </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Schedule</span>
                        <span className="font-medium">{session.schedule?.name || "Regular"}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function CheckOutConfirmationCard({ recordId, canCheckOut, onCheckOut, checkingOut, loading, checkOutMessage, onGoToTimeIn, isWeekend }) {
    if (loading) {
        return (
            <Card className="col-span-full">
                <CardContent className="p-8">
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        );
    }

    // On weekends, don't show this card (SessionInfoCard handles the message)
    if (isWeekend) {
        return null;
    }

    if (!canCheckOut) {
        return (
            <Card className="col-span-full border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
                        <AlertCircle className="h-12 w-12 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-400 mb-2">
                        Time-out Unavailable
                    </h2>
                    <p className="text-lg font-medium text-amber-600 dark:text-amber-300 mb-2">
                        {checkOutMessage || "You cannot time out at this time."}
                    </p>
                    {(checkOutMessage === "You have not timed in yet." || checkOutMessage === "You haven't timed in yet.") && (
                        <Button className="mt-4 bg-amber-600 hover:bg-amber-700 text-white" onClick={onGoToTimeIn}>
                            Go to Time In
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="col-span-full overflow-hidden border-destructive/20">
            <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-destructive">Ready to Time Out?</CardTitle>
                <CardDescription>
                    Tap the button below to end your work day
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pb-8">
                <button
                    onClick={onCheckOut}
                    disabled={checkingOut}
                    className="group relative w-48 h-48 rounded-full bg-linear-to-br from-red-600 to-red-700 text-white shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <div className="absolute inset-2 rounded-full bg-white/20 animate-ping opacity-20" />
                    <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center">
                        {checkingOut ? (
                            <Loader2 className="h-16 w-16 animate-spin" />
                        ) : (
                            <>
                                <LogOut className="h-16 w-16 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-semibold text-lg">Time Out</span>
                            </>
                        )}
                    </div>
                </button>
                <p className="mt-6 text-sm text-muted-foreground text-center max-w-sm">
                    This will record your end time for today. Make sure you are done with your tasks.
                </p>
            </CardContent>
        </Card>
    );
}

export default function CheckOutPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [session, setSession] = useState(null);
    const [recordId, setRecordId] = useState(null);
    const [canCheckOut, setCanCheckOut] = useState(false);
    const [checkOutMessage, setCheckOutMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(false);
    const [isWeekend, setIsWeekend] = useState(false);

    const fetchStatus = useCallback(async (isPolling = false) => {
        try {
            if (!isPolling) setLoading(true);
            const response = await reportsApi.getEmployeeDashboard();

            // Check if it's a weekend (no work today)
            if (response.is_weekend || response.no_work_today) {
                setIsWeekend(true);
                setSession(null);
                setCanCheckOut(false);
                setCheckOutMessage("No work scheduled for today.");
                if (!isPolling) setLoading(false);
                return;
            } else {
                setIsWeekend(false);
            }

            if (response.active_session) {
                setSession(response.active_session);
            }

            const todayRecord = response.today_record;

            if (todayRecord) {
                setRecordId(todayRecord.id);

                if (todayRecord.time_out) {
                    setCanCheckOut(false);
                    setCheckOutMessage("You have already timed out for today.");
                } else if (!todayRecord.time_in) {
                    setCanCheckOut(false);
                    setCheckOutMessage("You haven't timed in yet.");
                } else {
                    setCanCheckOut(true);
                    setCheckOutMessage("");
                }
            } else {
                setCanCheckOut(false);
                setCheckOutMessage("You have not timed in yet.");
            }
        } catch (error) {
            if (error?.status === 401 || error?.message === "Unauthorized") return;
            console.error("Failed to fetch status:", error?.message ?? error);
            toast({
                title: "Error",
                description: "Failed to load status",
                variant: "destructive",
            });
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => fetchStatus(true), 15000); // 15 seconds
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleCheckOut = async () => {
        if (!recordId) return;
        setCheckingOut(true);
        try {
            await attendanceApi.checkOut(recordId);
            toast({
                title: "Timed Out Successfully",
                description: `You have timed out at ${formatTime24(new Date())}`,
                variant: "success",
            });

            // Refresh status
            await fetchStatus();

            // Redirect after brief delay
            setTimeout(() => router.push("/dashboard/employee"), 2000);
        } catch (error) {
            toast({
                title: "Time Out Failed",
                description: error?.message || "Something went wrong.",
                variant: "destructive",
            });
        } finally {
            setCheckingOut(false);
        }
    };

    if (loading) {
        return <FullscreenLoader />;
    }

    // Special State: Already Timed Out (Show Success Card similar to Confirm Page)
    if (!loading && !canCheckOut && checkOutMessage.includes("timed out")) {
        return (
            <DashboardLayout title="Time Out">
                <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Time Out</h1>
                        <p className="text-muted-foreground">End your work day</p>
                    </div>
                    <LiveClockCard />
                    <SessionInfoCard session={session} loading={false} />

                    <Card className="col-span-full border-[#7C3AED]/30 bg-purple-50/50 dark:bg-purple-950/20">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="relative mb-6">
                                <div className="w-24 h-24 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <CheckCircle2 className="h-12 w-12 text-[#7C3AED]" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-[#7C3AED] mb-2">
                                Already Timed Out
                            </h2>
                            <p className="text-muted-foreground max-w-md">
                                You have already completed your shift for today.
                            </p>
                            <Button
                                variant="outline"
                                className="mt-6 border-purple-200 text-purple-700 hover:bg-purple-100"
                                onClick={() => router.push("/dashboard/employee")}
                            >
                                Back to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Time Out">
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        Time Out
                    </h1>
                    <p className="text-muted-foreground">
                        End your work day and record your departure
                    </p>
                </div>

                {/* Live Clock */}
                <LiveClockCard />

                {/* Session Info */}
                <SessionInfoCard session={session} loading={loading} isWeekend={isWeekend} />

                {/* Time Out Card */}
                <CheckOutConfirmationCard
                    recordId={recordId}
                    canCheckOut={canCheckOut}
                    onCheckOut={handleCheckOut}
                    checkingOut={checkingOut}
                    loading={loading}
                    checkOutMessage={checkOutMessage}
                    onGoToTimeIn={() => router.push('/attendance/confirm')}
                    isWeekend={isWeekend}
                />
            </div>
        </DashboardLayout>
    );
}
