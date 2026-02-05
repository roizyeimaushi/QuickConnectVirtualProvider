"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/components/providers/auth-provider";
import { reportsApi } from "@/lib/api";
import { formatDate, formatTime24, getCurrentDate } from "@/lib/utils";
import {
    Users,
    CalendarCheck,
    Clock,
    AlertTriangle,
    UserPlus,
    Calendar,
    FileSpreadsheet,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Loader2,
    Timer,
    ArrowRight,
} from "lucide-react";

function StatCard({ title, value, description, icon: Icon, trend, loading }) {
    return (
        <Card className="transition-all hover:shadow-lg hover:border-primary/20 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold font-mono">
                    {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                    ) : (
                        value
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {trend && (
                        <span className={trend > 0 ? "text-emerald-600" : "text-red-600"}>
                            <TrendingUp className={`h-3 w-3 inline ${trend < 0 ? 'rotate-180' : ''}`} />
                            {Math.abs(trend)}%
                        </span>
                    )}
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}

function AttendanceOverviewCard({ data, loading }) {
    if (loading) {
        return (
            <Card className="col-span-full lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarCheck className="h-5 w-5 text-primary" />
                        Today's Attendance Overview
                    </CardTitle>
                    <CardDescription>
                        Real-time attendance statistics for {formatDate(getCurrentDate())}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-20 animate-pulse">
                    <Loader2 className="h-12 w-12 text-primary/20 animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">Calculating attendance stats...</p>
                </CardContent>
            </Card>
        );
    }

    const presentRate = data?.presentRate || 0;
    const lateRate = data?.lateRate || 0;
    const absentRate = data?.absentRate || 0;
    const pendingRate = data?.pendingRate || 0;

    return (
        <Card className="col-span-full lg:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                    Today's Attendance Overview
                </CardTitle>
                <CardDescription>
                    Real-time attendance statistics for {formatDate(getCurrentDate())}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-medium">Present</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">{presentRate}%</span>
                    </div>
                    <Progress value={presentRate} className="h-2 [&>div]:bg-emerald-500" />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium">Late</span>
                        </div>
                        <span className="text-sm font-bold text-amber-600">{lateRate}%</span>
                    </div>
                    <Progress value={lateRate} className="h-2 [&>div]:bg-amber-500" />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Pending</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600">{pendingRate}%</span>
                    </div>
                    <Progress value={pendingRate} className="h-2 [&>div]:bg-blue-500" />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium">Absent</span>
                        </div>
                        <span className="text-sm font-bold text-red-600">{absentRate}%</span>
                    </div>
                    <Progress value={absentRate} className="h-2 [&>div]:bg-red-500" />
                </div>
            </CardContent>
        </Card>
    );
}

function QuickActionsCard() {
    const actions = [
        {
            title: "Add Employee",
            description: "Register a new employee",
            icon: UserPlus,
            href: "/employees/create",
            color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
        },
        {
            title: "Create Session",
            description: "Open attendance session",
            icon: Calendar,
            href: "/attendance/sessions/create",
            color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
        },
        {
            title: "View Reports",
            description: "Generate attendance reports",
            icon: FileSpreadsheet,
            href: "/reports/daily",
            color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
                {actions.map((action) => (
                    <Link key={action.title} href={action.href}>
                        <div className="flex items-center gap-4 p-3 rounded-lg border transition-all hover:bg-muted/50 hover:border-primary/20 group">
                            <div className={`p-2 rounded-lg ${action.color}`}>
                                <action.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{action.title}</p>
                                <p className="text-xs text-muted-foreground">{action.description}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}

function ActiveSessionCard({ session, loading }) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Active Session
                    </CardTitle>
                    <CardDescription>Current attendance session status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-10 text-center animate-pulse">
                        <Loader2 className="h-10 w-10 text-primary/20 animate-spin mb-4" />
                        <p className="text-sm text-muted-foreground">Checking session status...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!session) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Active Session
                    </CardTitle>
                    <CardDescription>Current attendance session status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">No active session</p>
                        <Button asChild size="sm">
                            <Link href="/attendance/sessions/create">Create Session</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Active Session
                    </CardTitle>
                </div>
                <CardDescription>Currently accepting attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Schedule</span>
                        <span className="font-medium">{session.schedule?.name || "Default"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shift Time</span>
                        <span className="font-mono font-medium">
                            {formatTime24(session.schedule?.time_in)} - {formatTime24(session.schedule?.time_out)}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Confirmed</span>
                        <span className="font-medium text-emerald-600">{session.confirmedCount || 0} employees</span>
                    </div>
                </div>
                <Button asChild variant="outline" className="w-full">
                    <Link href="/attendance/sessions">Manage Sessions</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

export default function AdminDashboard() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace("/auth/admin/login");
            } else if (!isAdmin) {
                router.replace("/dashboard/employee");
            }
        }
    }, [authLoading, user, isAdmin, router]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await reportsApi.getDashboardStats();
                const totalEmployees = response.total_employees || 0;
                const presentToday = response.present_today || 0;
                const lateToday = response.late_today || 0;
                const absentToday = response.absent_today || 0;
                const pendingToday = response.pending_today || 0;

                // Use strict Total Employees as denominator
                const denominator = totalEmployees > 0 ? totalEmployees : 1;

                setStats({
                    totalEmployees: totalEmployees,
                    activeToday: presentToday,
                    lateToday: lateToday,
                    absentToday: absentToday,
                    pendingToday: pendingToday,

                    // Percentages based on Total Scheduled Force
                    presentRate: Math.round((presentToday / denominator) * 100),
                    lateRate: Math.round((lateToday / denominator) * 100),
                    absentRate: Math.round((absentToday / denominator) * 100),
                    pendingRate: Math.round((pendingToday / denominator) * 100),

                    activeSession: response.active_session ? {
                        ...response.active_session,
                        confirmedCount: response.active_session.confirmed_count
                    } : null,
                });
            } catch (error) {
                // Log detailed error information for debugging (development only)
                if (process.env.NODE_ENV === 'development') {
                    const errorMessage = error?.message ||
                        (error && Object.keys(error).length > 0 ? JSON.stringify(error) : 'Unknown error (empty response)');
                    console.error("Failed to fetch dashboard data:", errorMessage);
                }

                // If it's a 403 error, user doesn't have admin access
                if (error?.status === 403) {
                    console.warn("Admin access required for dashboard stats");
                }
                // Fallback to empty state
                setStats({
                    totalEmployees: 0,
                    activeToday: 0,
                    lateToday: 0,
                    absentToday: 0,
                    pendingToday: 0,
                    presentRate: 0,
                    lateRate: 0,
                    absentRate: 0,
                    pendingRate: 0,
                    activeSession: null,
                });
            } finally {
                setLoading(false);
            }
        };

        // Only fetch if user is authenticated AND is an admin
        if (!authLoading && user && isAdmin) {
            fetchDashboardData();
            // Fallback polling every 60 seconds (WebSocket handles real-time updates)
            // This serves as a safety net in case WebSocket connection drops
            const interval = setInterval(fetchDashboardData, 60000);
            return () => clearInterval(interval);
        } else if (!authLoading && (!user || !isAdmin)) {
            // Not authenticated or not admin, set default state
            // (Redirect is handled by the other useEffect)
            setStats({
                totalEmployees: 0,
                activeToday: 0,
                lateToday: 0,
                absentToday: 0,
                pendingToday: 0,
                presentRate: 0,
                lateRate: 0,
                absentRate: 0,
                pendingRate: 0,
                activeSession: null,
            });
            setLoading(false);
        }
    }, [authLoading, user, isAdmin]);


    return (
        <DashboardLayout title="Admin Dashboard">
            <div className="space-y-6 animate-fade-in">
                {/* Welcome Section */}
                <div className="flex flex-col space-y-0">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back, {user?.first_name || "Admin"}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Here's what's happening with your workforce today.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Employees"
                        value={stats?.totalEmployees || 0}
                        description="Registered employees"
                        icon={Users}
                        loading={loading}
                    />
                    <StatCard
                        title="Present Today"
                        value={stats?.activeToday || 0}
                        description="Timed in on time"
                        icon={CheckCircle2}
                        loading={loading}
                    />
                    <StatCard
                        title="Late Today"
                        value={stats?.lateToday || 0}
                        description="Arrived after schedule"
                        icon={Timer}
                        loading={loading}
                    />
                    <StatCard
                        title={stats?.pendingToday > 0 ? "Pending Check-in" : "Absent Today"}
                        value={stats?.pendingToday > 0 ? stats.pendingToday : (stats?.absentToday || 0)}
                        description={stats?.pendingToday > 0 ? "Not yet timed in" : "Did not report"}
                        icon={stats?.pendingToday > 0 ? Clock : AlertTriangle}
                        loading={loading}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-4 lg:grid-cols-3">
                    <AttendanceOverviewCard data={stats} loading={loading} />
                    <div className="space-y-4">
                        <ActiveSessionCard session={stats?.activeSession} loading={loading} />
                        <QuickActionsCard />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
