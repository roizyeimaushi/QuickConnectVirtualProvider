"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    Timer,
    ArrowRight,
} from "lucide-react";

function StatCard({ title, value, description, icon: Icon, trend, loading }) {
    if (loading) return <Skeleton className="h-32 w-full" />;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
                {trend && (
                    <div className="mt-1 flex items-center text-xs text-green-500">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        {trend}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AttendanceOverviewCard({ data, loading }) {
    if (loading) return <Skeleton className="h-[300px] w-full" />;

    return (
        <Card className="col-span-full lg:col-span-2">
            <CardHeader>
                <CardTitle>Attendance Overview</CardTitle>
                <CardDescription>Today's attendance metrics</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Present</span>
                            <span className="text-muted-foreground">{data?.activeToday}/{data?.totalEmployees} ({data?.presentRate}%)</span>
                        </div>
                        <Progress value={data?.presentRate} className="h-2 bg-muted [&>div]:bg-green-500" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Late</span>
                            <span className="text-muted-foreground">{data?.lateToday}/{data?.totalEmployees} ({data?.lateRate}%)</span>
                        </div>
                        <Progress value={data?.lateRate} className="h-2 bg-muted [&>div]:bg-yellow-500" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Absent / Not In</span>
                            <span className="text-muted-foreground">{data?.absentToday}/{data?.totalEmployees} ({data?.absentRate}%)</span>
                        </div>
                        <Progress value={data?.absentRate} className="h-2 bg-muted [&>div]:bg-red-500" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ActiveSessionCard({ session, loading }) {
    if (loading) return <Skeleton className="h-[200px] w-full" />;

    if (!session) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Active Session</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                        <Clock className="h-10 w-10 mb-3 opacity-20" />
                        <p>No active session right now.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Current Session</CardTitle>
                <Badge variant="outline" className="font-normal">Active</Badge>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="mb-4">
                    <h3 className="text-lg font-bold">{session.name}</h3>
                    <p className="text-sm text-muted-foreground">
                        {session.start_time} - {session.end_time}
                    </p>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Confirmed</span>
                        <span className="font-medium">{session.confirmedCount || 0} employees</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function QuickActionsCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                <Button variant="outline" className="justify-start" asChild>
                    <Link href="/employees/create">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add New Employee
                    </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                    <Link href="/reports/daily">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        View Daily Report
                    </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                    <Link href="/schedules">
                        <Calendar className="mr-2 h-4 w-4" />
                        Manage Schedules
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

export default function AdminDashboardPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace("/login");
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
