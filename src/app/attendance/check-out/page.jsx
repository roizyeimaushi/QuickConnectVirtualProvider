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
            <div className="bg-gradient-to-br from-[#7C3AED] via-[#7C3AED]/90 to-[#7C3AED]/80 text-white p-8">
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
        return <Skeleton className="h-32 w-full" />;
    }

    if (isWeekend || !session) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">Session Info</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <p>{isWeekend ? "No shift scheduled for today" : "No active session found"}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    Today's Session
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Shift Name</p>
                    <p className="font-medium text-sm">{session.name}</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Schedule</p>
                    <p className="font-medium text-sm">
                        {session.start_time} - {session.end_time}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function CheckOutConfirmationCard({ recordId, canCheckOut, onCheckOut, checkingOut, loading, checkOutMessage, onGoToTimeIn, isWeekend }) {
    if (loading) {
        return <Skeleton className="h-48 w-full" />;
    }

    if (isWeekend) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">It's the Weekend!</h3>
                    <p className="text-sm text-muted-foreground mb-4">No work scheduled for today.</p>
                    <Button variant="outline" onClick={onGoToTimeIn}>
                        Go to Dashboard
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-[#7C3AED]/20 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <LogOut className="h-5 w-5 text-[#7C3AED]" />
                    Confirm Time Out
                </CardTitle>
                <CardDescription>
                    Ready to end your shift?
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!canCheckOut && checkOutMessage && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 p-4 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium">Cannot Time Out</p>
                            <p className="text-sm opacity-90">{checkOutMessage}</p>
                        </div>
                    </div>
                )}

                {!recordId && !checkOutMessage && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium">No Active Check-in</p>
                            <p className="text-sm opacity-90">You haven't checked in today yet.</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <Button
                        size="lg"
                        className="w-full text-lg h-14 bg-[#7C3AED] hover:bg-[#6D28D9] shadow-md shadow-purple-200 dark:shadow-none transition-all"
                        onClick={onCheckOut}
                        disabled={!canCheckOut || checkingOut}
                    >
                        {checkingOut ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <LogOut className="mr-2 h-5 w-5" />
                                Time Out Now
                            </>
                        )}
                    </Button>
                    {!canCheckOut && (
                        <Button variant="outline" onClick={onGoToTimeIn} className="w-full">
                            Check Time In Status
                        </Button>
                    )}
                </div>
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
