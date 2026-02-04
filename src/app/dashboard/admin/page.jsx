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
     else if (!isAdmin) {
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
