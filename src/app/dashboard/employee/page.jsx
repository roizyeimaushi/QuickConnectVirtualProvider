"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/components/providers/auth-provider";
import { attendanceApi, reportsApi, breakApi } from "@/lib/api";
import { formatDate, formatTime24, getCurrentDate, getCurrentTime, isSameDay } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
    CheckCircle2,
    Clock,
    Calendar,
    TrendingUp,
    History,
    Timer,
    AlertCircle,
    Fingerprint,
    ArrowRight,
    Sparkles,
    Coffee,
    LogOut,
    ThumbsUp
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";


function TodayStatusCard({ user, session, record, breakStatus, loading, constraints, isWeekend }) {
    const [currentTime, setCurrentTime] = useState(formatTime24(new Date()));
    const [timeLeft, setTimeLeft] = useState(null);
    const [elapsedTime, setElapsedTime] = useState("--");

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(formatTime24(new Date()));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Sync initial time from props
    const [secondsLeft, setSecondsLeft] = useState(Math.floor(breakStatus?.remaining_seconds || 0));

    useEffect(() => {
        if (breakStatus?.remaining_seconds !== undefined) {
            setSecondsLeft(Math.floor(breakStatus.remaining_seconds));
        }
    }, [breakStatus?.remaining_seconds]);

    useEffect(() => {
        let interval;
        if (breakStatus?.active && secondsLeft > 0) {
            interval = setInterval(() => {
                setSecondsLeft((prev) => {
                    if (prev <= 0) return 0;
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [breakStatus?.active]);

    // Format for display
    useEffect(() => {
        // Always show timer if break is active
        if (breakStatus?.active) {
            const hours = Math.floor(secondsLeft / 3600);
            const minutes = Math.floor((secondsLeft % 3600) / 60);
            const seconds = Math.floor(secondsLeft % 60);
            setTimeLeft(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        } else {
            setTimeLeft(null);
        }
    }, [secondsLeft, breakStatus?.active]);

    if (loading) return null;

    // Determine Logic States
    const hasCheckedIn = record && record.time_in;
    const hasCheckedOut = record && record.time_out;
    const isBreakActive = breakStatus?.active;
    const breakUsed = breakStatus?.already_used;
    const isLate = record && record.minutes_late > 0;

    // Strict Logic for Button Enabling
    const canCheckIn = !hasCheckedIn && constraints?.allowed !== false;
    // Break allowed if not checked out and not currently on break
    // Respect backend can_start status if available
    const canStartBreak = !hasCheckedOut && !isBreakActive && (breakStatus?.can_start !== false);
    const canEndBreak = isBreakActive;

    // Time out allowed even if on break (Backend auto-ends break)
    const canCheckOut = hasCheckedIn && !hasCheckedOut;

    // Status Text Map
    let statusText = "PENDING"; // Default to pending instead of absent
    let statusColor = "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
    let headerColor = "bg-blue-600";
    let StatusIcon = Clock;

    // Weekend - No work scheduled
    if (isWeekend) {
        statusText = "NO WORK TODAY";
        statusColor = "text-sky-600 bg-sky-100";
        headerColor = "bg-sky-600";
        StatusIcon = ThumbsUp;
    } else if (isBreakActive) {
        statusText = "ON BREAK";
        statusColor = "text-amber-600 bg-amber-100";
        headerColor = "bg-amber-600";
        StatusIcon = Coffee;
    } else if (record?.status && record.status !== 'pending') {
        // Respect the DB status set by system or admin
        const s = record.status;
        if (s === 'present') {
            statusText = "PRESENT";
            statusColor = "text-emerald-600 bg-emerald-100";
            headerColor = "bg-emerald-600";
            StatusIcon = CheckCircle2;
        } else if (s === 'late') {
            statusText = "LATE";
            statusColor = "text-amber-600 bg-amber-100";
            headerColor = "bg-amber-600";
            StatusIcon = AlertCircle;
        } else if (s === 'absent') {
            statusText = "ABSENT";
            statusColor = "text-red-600 bg-red-100";
            headerColor = "bg-red-600";
            StatusIcon = AlertCircle;
        } else if (s === 'excused') {
            statusText = "EXCUSED";
            statusColor = "text-blue-600 bg-blue-100";
            headerColor = "bg-blue-600";
            StatusIcon = CheckCircle2;
        } else if (s === 'left_early') {
            statusText = "LEFT EARLY";
            statusColor = "text-orange-600 bg-orange-100";
            headerColor = "bg-orange-600";
            StatusIcon = AlertCircle;
        }
    } else {
        // Not checked in yet
        if (constraints?.reason === 'too_late') {
            statusText = "ABSENT";
        } else if (constraints?.reason === 'weekend') {
            statusText = "NO WORK TODAY";
            statusColor = "text-sky-600 bg-sky-100";
            headerColor = "bg-sky-600";
            StatusIcon = ThumbsUp;
        } else {
            statusText = "NOT TIMED IN";
            statusColor = "text-gray-500 bg-gray-100";
            headerColor = "bg-gray-500";
            StatusIcon = Clock;
        }
    }

    // Reusable Action Button Component
    const ActionButton = ({ title, subtext, icon: Icon, href, enabled, variant, activeState, tooltip }) => {
        const baseStyles = "relative flex flex-col items-center justify-center p-6 h-40 w-full rounded-xl border-2 transition-all duration-300 group";
        const variants = {
            emerald: "border-emerald-100 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-800",
            amber: "border-amber-100 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 text-amber-800",
            purple: "border-purple-100 bg-purple-50 hover:bg-purple-100 hover:border-purple-300 text-purple-800",
            disabled: "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed grayscale"
        };

        const activeStyles = enabled ? "hover:scale-105 active:scale-95 shadow-md hover:shadow-xl" : "cursor-not-allowed opacity-60";
        const colorClass = enabled ? variants[variant] : variants.disabled;

        const Content = () => (
            <>
                {/* Scanner corners for Time In/Out */}
                {(variant === 'emerald' || variant === 'purple') && enabled && (
                    <>
                        <div className={cn(
                            "absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 transition-all duration-500 group-hover:scale-110",
                            variant === 'emerald' ? "border-emerald-500/50" : "border-purple-500/50"
                        )} />
                        <div className={cn(
                            "absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 transition-all duration-500 group-hover:scale-110",
                            variant === 'emerald' ? "border-emerald-500/50" : "border-purple-500/50"
                        )} />
                        <div className={cn(
                            "absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 transition-all duration-500 group-hover:scale-110",
                            variant === 'emerald' ? "border-emerald-500/50" : "border-purple-500/50"
                        )} />
                        <div className={cn(
                            "absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 transition-all duration-500 group-hover:scale-110",
                            variant === 'emerald' ? "border-emerald-500/50" : "border-purple-500/50"
                        )} />
                    </>
                )}

                <div className={`
                    h-14 w-14 rounded-full flex items-center justify-center mb-3 transition-transform duration-300 
                    ${enabled ? "bg-white shadow-sm group-hover:scale-110" : "bg-gray-200"}
                `}>
                    <Icon className={`h-7 w-7 ${enabled ? "" : "text-gray-400"}`} />
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                {subtext && <p className="text-xs opacity-80 mt-1 font-medium text-center max-w-[120px]">{subtext}</p>}

                {activeState && (
                    <div className="absolute top-3 right-3 h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                )}
            </>
        );

        if (enabled && href) {
            return (
                <Link href={href} className="w-full focus:outline-none">
                    <div className={`${baseStyles} ${colorClass} ${activeStyles}`}>
                        <Content />
                    </div>
                </Link>
            );
        }

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={`${baseStyles} ${colorClass} ${activeStyles}`}>
                            <Content />
                        </div>
                    </TooltipTrigger>
                    {tooltip && <TooltipContent><p>{tooltip}</p></TooltipContent>}
                </Tooltip>
            </TooltipProvider>
        );
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* Header Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-5 w-48" />
                </div>

                {/* Status Card Skeleton */}
                <Card className="col-span-full border-none shadow-lg overflow-hidden">
                    <div className="bg-slate-500/10 p-6 md:p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-3 w-full md:w-auto">
                                <Skeleton className="h-8 w-40 bg-white/20" />
                                <Skeleton className="h-6 w-32 bg-white/20" />
                            </div>
                            <div className="text-left md:text-right space-y-2 w-full md:w-auto">
                                <Skeleton className="h-5 w-36 bg-white/20 ml-0 md:ml-auto" />
                                <Skeleton className="h-12 w-32 bg-white/20 ml-0 md:ml-auto" />
                            </div>
                        </div>
                    </div>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Skeleton className="h-40 w-full" />
                            <Skeleton className="h-40 w-full" />
                            <Skeleton className="h-40 w-full" />
                        </div>
                    </CardContent>
                </Card>

                {/* Bottom Cards Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    return (
        <Card className="col-span-full overflow-hidden border-none shadow-lg mb-6">
            <div className={`${headerColor} text-white p-5 md:p-8 transition-colors duration-500`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-2">
                    <div className="space-y-1.5">
                        <h3 className="text-lg md:text-xl font-bold tracking-tight">Today's Status</h3>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${statusColor} hover:${statusColor} border-none text-xs md:text-sm px-3 py-1 font-bold`}>
                                <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                                {statusText}
                            </Badge>
                            {session?.schedule?.name && (
                                <Badge variant="outline" className="bg-white/10 text-white border-white/20 backdrop-blur-sm text-[10px] md:text-xs px-2 py-0.5 font-medium">
                                    {session.schedule.name}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-row sm:flex-col justify-between items-end sm:items-end w-full sm:w-auto border-t border-white/10 sm:border-none pt-5 sm:pt-0 mt-2 sm:mt-0">
                        <div className="text-left sm:text-right order-2 sm:order-1">
                            <p className="text-[10px] md:text-xs opacity-75 font-bold uppercase tracking-widest mb-1">
                                {formatDate(record?.attendance_date || session?.date || getCurrentDate(), "EEEE, MMM do")}
                            </p>
                            <p className="text-4xl md:text-5xl font-black font-mono tracking-tighter text-white leading-none">
                                {currentTime}
                            </p>
                        </div>

                        {isBreakActive && (
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md animate-pulse order-1 sm:order-2">
                                <Timer className="h-3.5 w-3.5" />
                                <span className="font-mono font-bold text-sm">{timeLeft}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* TIME IN BUTTON */}
                    <div className="col-span-1">
                        <ActionButton
                            title="Time In"
                            icon={CheckCircle2}
                            variant="emerald"
                            href="/attendance/confirm"
                            enabled={!isWeekend && canCheckIn}
                            subtext={
                                isWeekend ? "No work today" :
                                    hasCheckedIn ? `Timed in at ${formatTime24(record?.time_in)}` : "Mark your attendance"
                            }
                            tooltip={isWeekend ? "No work scheduled for today" : undefined}
                        />
                    </div>

                    {/* BREAK BUTTON */}
                    <div className="col-span-1">
                        <ActionButton
                            title={isBreakActive ? "On Break" : "Break"}
                            icon={Coffee}
                            variant="amber"
                            href="/attendance/break"
                            enabled={!isWeekend && (canEndBreak || canStartBreak)}
                            activeState={isBreakActive}
                            subtext={
                                isWeekend ? "No work today" :
                                    isBreakActive ? "Click to End" :
                                        breakStatus?.can_start ? "Break Available" :
                                            breakStatus?.within_window === false ? "Window Closed" :
                                                breakUsed ? "Break Completed" :
                                                    "Check Availability"
                            }
                            tooltip={isWeekend ? "No work scheduled for today" : undefined}
                        />
                    </div>

                    {/* TIME OUT BUTTON */}
                    <div className="col-span-1">
                        <ActionButton
                            title="Time Out"
                            icon={LogOut}
                            variant="purple"
                            href="/attendance/check-out"
                            enabled={!isWeekend && canCheckOut}
                            tooltip={
                                isWeekend ? "No work scheduled for today" :
                                    !hasCheckedIn ? "Time in first" :
                                        (hasCheckedOut ? "Shift Completed" :
                                            (isBreakActive ? "Ends active break & shift" : null))
                            }
                            subtext={
                                isWeekend ? "No work today" :
                                    hasCheckedOut ? "Shift Completed" :
                                        isBreakActive ? "End break & shift" :
                                            "End your day"
                            }
                        />
                    </div>
                </div>

                {record?.minutes_late > 0 && (
                    <div className="mt-6 mx-auto max-w-md bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 text-amber-800 text-sm">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        <p>You were marked late by <span className="font-bold">{record.minutes_late} minutes</span>.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


function AttendanceStatsCard({ stats, loading }) {
    if (loading) return null;

    // Using monthly stats but could filter for weekly if data available
    const attendanceRate = stats?.attendanceRate || 0;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className=" text-base font-medium flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Attendance Summary
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Attendance Rate</span>
                        <span className="text-sm font-bold text-emerald-600">{attendanceRate}%</span>
                    </div>
                    <Progress value={attendanceRate} className="h-2 [&>div]:bg-emerald-500" />

                    <div className="grid grid-cols-3 gap-2 pt-4 text-center">
                        <div>
                            <p className="text-xl font-bold">{stats?.presentDays || 0}</p>
                            <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold">{stats?.lateDays || 0}</p>
                            <p className="text-xs text-muted-foreground">Late</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold">{stats?.absentDays || 0}</p>
                            <p className="text-xs text-muted-foreground">Absent</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function EmployeeDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [session, setSession] = useState(null);
    const [stats, setStats] = useState(null);
    const [todayRecord, setTodayRecord] = useState(null);
    const [activeBreak, setActiveBreak] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkInConstraints, setCheckInConstraints] = useState({ allowed: true, message: null });
    const [isWeekend, setIsWeekend] = useState(false);

    // Fetch dashboard data function (extracted for reuse in polling)
    const fetchDashboardData = async (isPolling = false) => {
        try {
            const response = await reportsApi.getEmployeeDashboard();

            // Check if it's a weekend (no work today)
            if (response.is_weekend || response.no_work_today) {
                setIsWeekend(true);
                setSession(null);
                setTodayRecord(null);
            } else {
                setIsWeekend(false);
                if (response.active_session) {
                    setSession(response.active_session);
                } else {
                    setSession(null);
                }
            }

            // Set Check-in constraints
            setCheckInConstraints({
                allowed: response.can_confirm,
                message: response.check_in_message,
                reason: response.check_in_reason
            });

            // Set stats
            const monthlyStats = response.monthly_stats || {};
            const present = monthlyStats.present || 0;
            const late = monthlyStats.late || 0;
            const absent = monthlyStats.absent || 0;
            const total = present + late + absent;



            setStats({
                attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
                presentDays: present,
                lateDays: late,
                absentDays: absent,
            });

            // Use the record provided by the backend (DATE-SCOPED)
            let record = response.today_record;

            // Only use recent_records if they match TODAY's session
            if (!record && response.active_session) {
                if (response.recent_records && response.recent_records.length > 0) {
                    const latest = response.recent_records[0];
                    if (latest.session_id === response.active_session.id) {
                        record = latest;
                    }
                }
            }

            setTodayRecord(record);

            // Fetch detailed break status directly from Break API for accuracy
            try {
                const breakStatusData = await breakApi.getStatus();
                if (breakStatusData) {
                    setActiveBreak({
                        active: breakStatusData.is_on_break,
                        start_time: record?.break_start,
                        can_start: breakStatusData.can_start_break,
                        can_end: breakStatusData.can_end_break,
                        message: breakStatusData.break_message,
                        already_used: breakStatusData.break_already_used,
                        within_window: breakStatusData.is_within_break_window,
                        remaining_seconds: breakStatusData.break_remaining_seconds,
                        break_window: breakStatusData.break_window,
                        has_break_today: breakStatusData.has_break_today,
                        current_break: breakStatusData.current_break,
                        coffee_used: breakStatusData.coffee_used,
                        meal_used: breakStatusData.meal_used,
                    });
                }
            } catch (breakError) {
                // If break API fails, fallback to dashboard response data
                // Use break_status from the API (new 12PM-1PM policy)
                if (response.break_status) {
                    const bs = response.break_status;
                    setActiveBreak({
                        active: bs.is_on_break,
                        start_time: record?.break_start,
                        can_start: bs.can_start_break,
                        can_end: bs.can_end_break,
                        message: bs.break_message,
                        already_used: bs.break_already_used,
                        within_window: bs.is_within_break_window,
                        remaining_seconds: bs.break_remaining_seconds,
                        break_window: bs.break_window,
                        has_break_today: bs.has_break_today,
                        current_break: bs.current_break,
                        coffee_used: bs.coffee_used,
                        meal_used: bs.meal_used,
                    });
                } else if (record) {
                    // Fallback to legacy break check
                    try {
                        const breakRes = await attendanceApi.getActiveBreak(record.id);
                        if (breakRes) setActiveBreak(breakRes);
                    } catch (e) {
                        // No active break
                    }
                } else {
                    setActiveBreak(null);
                }
            }

        } catch (error) {
            // Silently ignore 401 errors during polling (session expired)
            if (error?.status === 401 || error?.message === 'Unauthorized') {
                return; // Don't log, user will be redirected by API client
            }
            if (!isPolling) {
                console.error("Failed to fetch dashboard data:", error);
            }
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    // Initial data fetch
    useEffect(() => {
        if (!authLoading && user) {
            fetchDashboardData(false);
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [authLoading, user]);

    // Real-time polling every 5 seconds
    useEffect(() => {
        if (!authLoading && user) {
            const pollInterval = setInterval(() => {
                fetchDashboardData(true); // Silent polling
            }, 15000); // 15 seconds - balanced between responsiveness and server load

            return () => clearInterval(pollInterval);
        }
    }, [authLoading, user]);

    if (loading) {
        return (
            <DashboardLayout title="Employee Dashboard">
                <div className="space-y-6 animate-fade-in">
                    {/* Welcome Skeleton */}
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>

                    {/* Status Card Skeleton */}
                    <Card className="col-span-full border-none shadow-lg overflow-hidden">
                        <div className="bg-slate-500/10 p-6 md:p-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="space-y-3 w-full md:w-auto">
                                    <Skeleton className="h-8 w-40 bg-muted/50" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-6 w-24 bg-muted/30" />
                                        <Skeleton className="h-6 w-20 bg-muted/30" />
                                    </div>
                                </div>
                                <div className="text-left md:text-right space-y-2 w-full md:w-auto">
                                    <Skeleton className="h-4 w-36 bg-muted/30 ml-0 md:ml-auto" />
                                    <Skeleton className="h-12 w-48 bg-muted/30 ml-0 md:ml-auto" />
                                </div>
                            </div>
                        </div>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-40 w-full rounded-xl" />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bottom Cards Skeleton */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="col-span-1">
                            <CardHeader>
                                <Skeleton className="h-5 w-40" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-12" />
                                </div>
                                <Skeleton className="h-2 w-full" />
                                <div className="grid grid-cols-3 gap-2 py-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="space-y-2">
                                            <Skeleton className="h-6 w-10 mx-auto" />
                                            <Skeleton className="h-3 w-12 mx-auto" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="col-span-1 lg:col-span-2">
                            <CardHeader>
                                <Skeleton className="h-5 w-32" />
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Employee Dashboard">
            <div className="space-y-6 content-start animate-fade-in">
                {/* Welcome Section */}
                <div className="flex flex-col gap-1 mb-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                        Welcome back, {user?.first_name}!
                    </h1>
                    <p className="text-muted-foreground">
                        Here's your attendance overview for today.
                    </p>
                </div>

                <TodayStatusCard
                    user={user}
                    session={session}
                    record={todayRecord}
                    breakStatus={activeBreak}
                    loading={loading}
                    constraints={checkInConstraints}
                    isWeekend={isWeekend}
                />

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <AttendanceStatsCard stats={stats} loading={loading} />

                    <Card className="col-span-1 lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-base font-medium">Quick Links</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">

                            <Link href="/dashboard/employee/profile" className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                        <Fingerprint className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <span className="font-semibold text-sm sm:text-base">My Profile</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground ml-10">View your information</p>
                            </Link>

                            <Link href="/attendance/break" className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                        <Coffee className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <span className="font-semibold text-sm sm:text-base">Break</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground ml-10">Start or end your break</p>
                            </Link>

                            <Link href="/attendance/history" className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                        <History className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <span className="font-semibold text-sm sm:text-base">Attendance History</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-muted-foreground ml-10">View past records</p>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}

