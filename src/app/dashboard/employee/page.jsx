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
import { formatDate, formatTime24, formatTime12, getCurrentDate, getCurrentTime, isSameDay } from "@/lib/utils";
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

     else {
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

    return (
        <DashboardLayout title="Employee Dashboard">
            <div className="space-y-6 animate-fade-in content-start">
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

                            <Link href="/dashboard/employee/profile" className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <Fingerprint className="h-5 w-5 text-purple-500" />
                                    <span className="font-semibold">My Profile</span>
                                </div>
                                <p className="text-xs text-muted-foreground">View your information</p>
                            </Link>

                            <Link href="/attendance/history" className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <History className="h-5 w-5 text-blue-500" />
                                    <span className="font-semibold">History</span>
                                </div>
                                <p className="text-xs text-muted-foreground">View past records</p>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
