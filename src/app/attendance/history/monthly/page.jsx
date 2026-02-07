"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/page-skeleton";

import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { attendanceApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/providers/auth-provider";
import {
    Calendar,
    CheckCircle2,
    Timer,
    XCircle,
    TrendingUp,
    BarChart3,
} from "lucide-react";



export default function MonthlyHistoryPage() {
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [stats, setStats] = useState({
        present: 0,
        late: 0,
        absent: 0,
        total: 0,
        attendanceRate: 0,
        punctualityRate: 0,
    });
    const { toast } = useToast();
    const { user } = useAuth();

    const months = [
        { value: 1, label: "January" },
        { value: 2, label: "February" },
        { value: 3, label: "March" },
        { value: 4, label: "April" },
        { value: 5, label: "May" },
        { value: 6, label: "June" },
        { value: 7, label: "July" },
        { value: 8, label: "August" },
        { value: 9, label: "September" },
        { value: 10, label: "October" },
        { value: 11, label: "November" },
        { value: 12, label: "December" },
    ];

    const years = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 2; y--) {
        years.push(y);
    }

    useEffect(() => {
        const fetchMonthlyData = async () => {
            setLoading(true);
            try {
                const response = await attendanceApi.getMyRecords({
                    month: selectedMonth,
                    year: selectedYear,
                });

                const data = response.data || [];
                setRecords(data);

                const present = data.filter((r) => r.status === "present").length;
                const late = data.filter((r) => r.status === "late").length;
                const absent = data.filter((r) => r.status === "absent").length;
                const total = present + late + absent;

                setStats({
                    present,
                    late,
                    absent,
                    total,
                    attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
                    punctualityRate: present + late > 0 ? Math.round((present / (present + late)) * 100) : 0,
                });
            } catch (error) {
                console.error("Failed to fetch monthly data:", error);
                toast({
                    title: "Error",
                    description: "Failed to load monthly summary",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchMonthlyData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMonth, selectedYear]);

    const getMonthLabel = () => {
        const month = months.find((m) => m.value === selectedMonth);
        return `${month?.label} ${selectedYear}`;
    };

    return (
        <DashboardLayout title="Monthly Summary">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Monthly Summary</h1>
                        <p className="text-muted-foreground">
                            Your attendance summary for {getMonthLabel()}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Select
                            value={selectedMonth.toString()}
                            onValueChange={(v) => setSelectedMonth(parseInt(v))}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((month) => (
                                    <SelectItem key={month.value} value={month.value.toString()}>
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={selectedYear.toString()}
                            onValueChange={(v) => setSelectedYear(parseInt(v))}
                        >
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={year.toString()}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {loading ? (
                    <PageSkeleton cardCount={4} hasHeader={false} />
                ) : (
                    <>
                        {/* Stats Grid */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardContent className="flex items-center gap-4 p-6">
                                    <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                        <Calendar className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.total}</p>
                                        <p className="text-sm text-muted-foreground">Total Days</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="flex items-center gap-4 p-6">
                                    <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.present}</p>
                                        <p className="text-sm text-muted-foreground">Present</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="flex items-center gap-4 p-6">
                                    <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                        <Timer className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.late}</p>
                                        <p className="text-sm text-muted-foreground">Late</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="flex items-center gap-4 p-6">
                                    <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                                        <XCircle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{stats.absent}</p>
                                        <p className="text-sm text-muted-foreground">Absent</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Performance Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-primary" />
                                    Performance Overview
                                </CardTitle>
                                <CardDescription>
                                    Your attendance and punctuality metrics for {getMonthLabel()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {stats.total === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No attendance records found for this month
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                                                    <span className="font-medium">Attendance Rate</span>
                                                </div>
                                                <span className="text-2xl font-bold text-emerald-600">
                                                    {stats.attendanceRate}%
                                                </span>
                                            </div>
                                            <Progress
                                                value={stats.attendanceRate}
                                                className="h-3"
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                You attended {stats.present + stats.late} out of {stats.total} working days
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                                    <span className="font-medium">Punctuality Rate</span>
                                                </div>
                                                <span className="text-2xl font-bold text-blue-600">
                                                    {stats.punctualityRate}%
                                                </span>
                                            </div>
                                            <Progress
                                                value={stats.punctualityRate}
                                                className="h-3"
                                            />
                                            <p className="text-sm text-muted-foreground">
                                                You were on time {stats.present} out of {stats.present + stats.late} attended days
                                            </p>
                                        </div>

                                        {/* Status Breakdown */}
                                        <div className="pt-4 border-t">
                                            <h4 className="font-medium mb-4">Status Breakdown</h4>
                                            <div className="flex gap-4 flex-wrap">
                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-2">
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    Present: {stats.present}
                                                </Badge>
                                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-4 py-2">
                                                    <Timer className="h-4 w-4 mr-2" />
                                                    Late: {stats.late}
                                                </Badge>
                                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-4 py-2">
                                                    <XCircle className="h-4 w-4 mr-2" />
                                                    Absent: {stats.absent}
                                                </Badge>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
