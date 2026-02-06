"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { breakApi, reportsApi } from "@/lib/api";
import { formatTime24 } from "@/lib/utils";
import { Timer, Coffee, Play, StopCircle, AlertCircle, Clock, Ban, Loader2, PauseCircle, Calendar, ThumbsUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BreakPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submittingType, setSubmittingType] = useState(null); // 'Coffee', 'Meal', or 'End'
    const [breakStatus, setBreakStatus] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isWeekend, setIsWeekend] = useState(false);

    // Fetch break status from the new API
    const fetchStatus = async () => {
        try {
            // First check dashboard for weekend status
            const dashboardResponse = await reportsApi.getEmployeeDashboard();

            // Check if it's a weekend (no work today)
            if (dashboardResponse.is_weekend || dashboardResponse.no_work_today) {
                setIsWeekend(true);
                setBreakStatus(null);
                setLoading(false);
                return;
            } else {
                setIsWeekend(false);
            }

            // Try break API for detailed status
            try {
                const response = await breakApi.getStatus();
                setBreakStatus(response);
            } catch (error) {
                // API fetch failed - likely using fallback data
                // Suppressing console error as requested since fallback handles it
                if (dashboardResponse.break_status) {
                    setBreakStatus({
                        ...dashboardResponse.break_status,
                        has_checked_in: !!dashboardResponse.today_record,
                        has_checked_out: dashboardResponse.today_record ? dashboardResponse.today_record.time_out !== null : false,
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    // Calculate Time Used
    const maxSeconds = (breakStatus?.break_window?.max_minutes || 90) * 60;
    const remaining = breakStatus?.break_remaining_seconds || 0;
    const usedSeconds = Math.max(0, maxSeconds - remaining);

    // Format Used Time
    const formatDuration = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    };

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Timer for break countdown
    useEffect(() => {
        let interval;
        if (breakStatus?.is_on_break && breakStatus?.break_remaining_seconds > 0) {
            let remaining = breakStatus.break_remaining_seconds;

            interval = setInterval(async () => {
                remaining -= 1;

                if (remaining <= 0) {
                    setTimeLeft("00:00:00");
                    clearInterval(interval);

                    // Auto-refresh status (break should have ended)
                    await fetchStatus();
                    toast({
                        title: "Break Time Over",
                        description: "Your break has ended automatically.",
                        variant: "default",
                    });
                } else {
                    // Ensure integer math for seconds
                    const hours = Math.floor(remaining / 3600);
                    const minutes = Math.floor((remaining % 3600) / 60);
                    const seconds = Math.floor(remaining % 60);
                    setTimeLeft(
                        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                    );
                }
            }, 1000);
        } else {
            setTimeLeft(null);
        }
        return () => clearInterval(interval);
    }, [breakStatus?.is_on_break, breakStatus?.break_remaining_seconds, toast]);

    const handleStartBreak = async (type) => {
        // PRE-CHECK: Prevent 400 Error by checking status directly
        if (breakStatus && !breakStatus.has_checked_in) {
            toast({
                title: "Time In Required",
                description: "You must Time In before starting a break.",
            });
            setTimeout(() => router.push('/attendance/confirm'), 2000);
            return;
        }

        setSubmittingType(type);
        try {
            // Ensure payload is correct.
            // 422 often means validation failed. Backend expects 'type' in body.
            const res = await breakApi.startBreak({ type: type });

            toast({
                title: `${type} Break Started`,
                description: `Enjoy your ${type} break!`,
                variant: "success",
            });
            // Refresh status
            await fetchStatus();
        } catch (error) {
            // API Client returns { message, error_code, ... } directly
            const errorMessage = error.message || "Could not start break. Please try again.";
            const errorCode = error.error_code || error.response?.data?.error_code;

            // Only log unexpected errors
            if (errorCode !== 'NOT_TIMED_IN') {
                console.error("Start Break Error:", error);
            }

            toast({
                title: errorCode === 'NOT_TIMED_IN' ? "Time In Required" : "Failed to Start Break",
                description: errorMessage,
                variant: errorCode === 'NOT_TIMED_IN' ? "default" : "destructive",
            });

            if (errorCode === 'NOT_TIMED_IN') {
                // Redirect user to Time In page
                setTimeout(() => router.push('/attendance/confirm'), 2000);
            }
        } finally {
            setSubmittingType(null);
        }
    };

    const handleEndBreak = async () => {
        setSubmittingType('End');
        try {
            await breakApi.endBreak();
            toast({
                title: "Break Ended",
                description: "Welcome back to work!",
                variant: "success",
            });
            // Refresh status
            await fetchStatus();
        } catch (error) {
            toast({
                title: "Failed to End Break",
                description: error.message || "Could not end break.",
                variant: "destructive",
            });
        } finally {
            setSubmittingType(null);
        }
    };

    // Get break window info for display
    const breakWindow = breakStatus?.break_window;
    const canStartBreak = breakStatus?.can_start_break;
    const canEndBreak = breakStatus?.can_end_break;
    const isOnBreak = breakStatus?.is_on_break;
    const breakAlreadyUsed = breakStatus?.break_already_used;
    const isWithinWindow = breakStatus?.is_within_break_window;
    const hasCheckedIn = breakStatus?.has_checked_in;
    const hasCheckedOut = breakStatus?.has_checked_out;
    const breakMessage = breakStatus?.break_message;

    return (
        <DashboardLayout title="Break Time">
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-primary">Break Time</h1>
                    <p className="text-sm text-muted-foreground">
                        Current Time: {formatTime24(currentTime)}
                    </p>
                </div>

                <Card className="w-full max-w-md border-primary/20 shadow-xl">
                    <CardHeader className="text-center pb-2">
                        <PauseCircle className="w-7 h-7 mx-auto text-primary mb-4" />
                        <CardTitle className="text-2xl">
                            {isOnBreak ? "On Break" : "Break"}
                        </CardTitle>
                        <CardDescription>
                            {isOnBreak ? "Time Remaining:" : "Start your break below"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {loading ? (
                            <div className="space-y-4">
                                <Button disabled className="w-full h-16 text-lg">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                </Button>
                            </div>
                        ) : isWeekend ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mb-4">
                                    <Calendar className="h-8 w-8 text-sky-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-sky-700 dark:text-sky-400 mb-2">No Work Today</h3>
                                <p className="text-sm text-sky-600/80 dark:text-sky-400/80 max-w-sm">
                                    It's the weekend! No shifts are scheduled for today. Enjoy your time off!
                                </p>
                            </div>
                        ) : hasCheckedOut ? (
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <p className="text-muted-foreground">You have Timed Out for the day.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Break Card */}
                                <BreakTypeCard
                                    type="Regular"
                                    label="Start Break"
                                    duration={`${breakStatus?.break_window?.max_minutes || 90} minutes`}
                                    icon={<Timer className="h-6 w-6" />}
                                    isUsed={false}
                                    isActive={isOnBreak}
                                    isDisabled={!canStartBreak || !!submittingType}
                                    timeLeft={timeLeft}
                                    onStart={() => handleStartBreak('Regular')}
                                    onEnd={handleEndBreak}
                                    isLoading={submittingType === 'Regular' || submittingType === 'End'}
                                />

                                {breakMessage && !isOnBreak && (
                                    <p className="text-xs text-center text-muted-foreground mt-2">
                                        {breakMessage}
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}

function BreakTypeCard({ type, label, duration, icon, isUsed, isActive, isDisabled, timeLeft, onStart, onEnd, isLoading }) {
    if (isActive) {
        return (
            <div className="w-full p-4 border-2 border-primary bg-primary/5 rounded-xl animate-pulse ring-2 ring-primary/20">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 text-primary font-bold">
                        <span>{label} In Progress</span>
                    </div>
                    <span className="text-xs font-mono bg-primary/10 px-2 py-1 rounded text-primary">
                        {duration}
                    </span>
                </div>
                <div className="text-center py-4">
                    <div className="text-4xl font-mono font-bold tracking-widest text-primary">
                        {timeLeft || "00:00:00"}
                    </div>
                </div>
                <Button
                    onClick={onEnd}
                    disabled={isLoading}
                    className="w-full mt-2"
                    variant="destructive"
                >
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "End Break"}
                </Button>
            </div>
        );
    }

    if (isUsed) {
        return (
            <div className="w-full h-20 border border-border bg-muted/50 rounded-lg flex items-center justify-center gap-4 cursor-not-allowed">
                <div className="w-12 flex justify-center">{icon}</div>
                <div className="text-left leading-tight">
                    <div className="font-bold text-lg text-muted-foreground">{label}</div>
                    <div className="text-sm text-muted-foreground font-normal">Completed</div>
                </div>
            </div>
        );
    }

    return (
        <Button
            onClick={onStart}
            disabled={isDisabled || isLoading}
            className={`w-full h-20 text-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-4 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                } ${type === 'Coffee' ? 'hover:bg-emerald-600/90' : 'hover:bg-primary/90'}`}
            variant={type === 'Coffee' ? 'default' : 'secondary'}
        >
            {isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
                <>
                    <div className="w-12 flex justify-center">{icon}</div>
                    <div className="text-left leading-tight">
                        <div className="font-bold text-lg">{label}</div>
                        <div className="text-sm opacity-80 font-normal">{duration}</div>
                    </div>
                </>
            )}
        </Button>
    );
}

