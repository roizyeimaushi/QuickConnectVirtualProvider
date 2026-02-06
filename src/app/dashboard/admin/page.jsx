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
                    {value}
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

function SessionTimer({ session }) {
    const [timeLeft, setTimeLeft] = useState("");
    const [isCountingToStart, setIsCountingToStart] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const sessionDate = new Date(session.date);
            const [hIn, mIn] = session.schedule.time_in.split(':').map(Number);
            const [hOut, mOut] = session.schedule.time_out.split(':').map(Number);

            const startTime = new Date(sessionDate);
            startTime.setHours(hIn, mIn, 0);

            let endTime = new Date(sessionDate);
            endTime.setHours(hOut, mOut, 0);
            if (endTime < startTime) endTime.setDate(endTime.getDate() + 1);

            if (now < startTime) {
                // Counting to start
                const diff = startTime - now;
                setIsCountingToStart(true);
                return formatDiff(diff);
            } else if (now >= startTime && now <= endTime) {
                // Counting to end
                const diff = endTime - now;
                setIsCountingToStart(false);
                return formatDiff(diff);
            } else {
                return "Session ended";
            }
        };

        const formatDiff = (diff) => {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return `${h > 0 ? h + "h " : ""}${m}m`;
        };

        setTimeLeft(calculateTimeLeft());
        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 30000);

        return () => clearInterval(interval);
    }, [session]);

    if (!timeLeft || timeLeft === "Session ended") return null;

    return (
        <div className={`flex items-center gap-2 text-sm font-medium ${isCountingToStart ? 'text-blue-600' : 'text-amber-600 animate-pulse'}`}>
            <Timer className="h-4 w-4" />
            <span>{isCountingToStart ? "Starts in: " : "Ends in: "}{timeLeft}</span>
        </div>
    );
}

function ScheduleStatsCard({ sessions }) {
    if (!sessions || sessions.length === 0) return null;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Schedule Check-in</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {sessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="font-medium">{s.schedule?.name || "Shift"}</span>
                        </div>
                        <span className="text-muted-foreground">
                            {s.confirmed_count}/{s.total_count} checked in
                        </span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function ActiveSessionCard({ session, loading }) {
    if (!session) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Attendance Session
                    </CardTitle>
                    <CardDescription>Current attendance status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">No session found for today</p>
                        <Button asChild size="sm">
                            <Link href="/attendance/sessions/create">Create Session</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden border-2 border-primary/10">
            <div className={`h-1 ${session.status === 'active' ? 'bg-emerald-500' : session.status === 'pending' ? 'bg-blue-500' : 'bg-slate-300'}`} />
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Clock className={`h-5 w-5 ${session.status === 'active' ? 'text-emerald-500' : 'text-primary'}`} />
                        {session.status === 'pending' ? 'Upcoming Session' : 'Active Session'}
                    </CardTitle>
                    <Badge
                        variant={
                            session.status === 'active' ? 'default' :
                                session.status === 'completed' ? 'secondary' :
                                    'outline'
                        }
                        className={
                            session.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' :
                                session.status === 'completed' ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm' :
                                    session.status === 'locked' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                        session.status === 'pending' ? 'bg-blue-100 text-blue-700 border-blue-200' : ''
                        }
                    >
                        {session.status === 'active' ? 'Live' :
                            session.status === 'completed' ? 'Awaiting Review' :
                                session.status === 'locked' ? 'Finalized' : 'Upcoming'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold">{session.schedule?.name}</h3>
                    <p className="font-mono text-sm text-muted-foreground">
                        {formatTime24(session.schedule?.time_in)} - {formatTime24(session.schedule?.time_out)}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-dashed">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Assigned</p>
                        <p className="text-lg font-bold text-emerald-600">{session.total_count} employees</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Confirmed</p>
                        <p className="text-lg font-bold">
                            {session.confirmed_count} / {session.total_count}
                        </p>
                    </div>
                </div>

                {(session.status === 'active' || session.status === 'pending') && (
                    <SessionTimer session={session} />
                )}

                <Button asChild variant="outline" className="w-full">
                    <Link href={`/attendance/sessions/${session.id}`}>View Attendance</Link>
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

                    activeSession: response.active_session,
                    activeSessions: response.active_sessions || [],
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
            {loading ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    {/* Empty space or a single subtle loader could go here, but per user request we just want the fade in once ready */}
                </div>
            ) : (
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
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        <StatCard
                            title="Total Employees"
                            value={stats?.totalEmployees || 0}
                            description="Registered"
                            icon={Users}
                        />
                        <StatCard
                            title="Present Today"
                            value={stats?.activeToday || 0}
                            description="Timed in"
                            icon={CheckCircle2}
                        />
                        <StatCard
                            title="Late Today"
                            value={stats?.lateToday || 0}
                            description="Arrived late"
                            icon={Timer}
                        />
                        <StatCard
                            title="Pending Check-in"
                            value={stats?.pendingToday || 0}
                            icon={Clock}
                            description="Waiting"
                        />
                        <StatCard
                            title="Absent Today"
                            value={stats?.absentToday || 0}
                            icon={AlertTriangle}
                            description="Not reporting"
                        />
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid gap-4 lg:grid-cols-3">
                        <AttendanceOverviewCard data={stats} />
                        <div className="space-y-4">
                            <ActiveSessionCard session={stats?.activeSession} />
                            <ScheduleStatsCard sessions={stats?.activeSessions} />
                            <QuickActionsCard />
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
