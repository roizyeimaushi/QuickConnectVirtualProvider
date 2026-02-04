"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { reportsApi } from "@/lib/api";
import {
    Calendar,
    Download,
    Users,
    TrendingUp,
    Clock,
    CheckCircle2,
} from "lucide-react";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function MonthlyReportsPage() {
    const currentDate = new Date();
    const [month, setMonth] = useState(String(currentDate.getMonth() + 1));
    const [year, setYear] = useState(String(currentDate.getFullYear()));
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [report, setReport] = useState({ working_days: 0, total_employees: 0, summary: [] });

    const fetchReport = async () => {
        try {
            setLoading(true); // Ensure loading state triggers on month/year change
            const response = await reportsApi.getMonthlyReport(year, month);
            setReport({
                working_days: response.working_days || 0,
                total_employees: response.total_employees || 0,
                summary: response.summary || [],
            });
        } catch (error) {
            const errorMessage = error?.message ||
                (error && Object.keys(error).length > 0 ? JSON.stringify(error) : 'Unknown error');
            console.error("Failed to fetch monthly report:", errorMessage);
            setReport({ working_days: 0, total_employees: 0, summary: [] });
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [month, year]);

    const avgAttendance = report.summary.length > 0
        ? Math.round(report.summary.reduce((acc, emp) => acc + emp.attendance_rate, 0) / report.summary.length)
        : 0;

    if (loading) {
        return null;
    }

    return (
        <DashboardLayout title="Monthly Summary Report">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Monthly Summary</h1>
                        <p className="text-muted-foreground">
                            Overview of attendance statistics for the month
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="w-full sm:w-[140px]">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((m, i) => (
                                    <SelectItem key={m} value={String(i + 1)}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="w-full sm:w-[100px]">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {[2024, 2025, 2026].map((y) => (
                                    <SelectItem key={y} value={String(y)}>
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button className="w-full sm:w-auto">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Working Days</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-8 w-12" />
                            ) : (
                                <div className="text-2xl font-bold">{report.working_days}</div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-8 w-12" />
                            ) : (
                                <div className="text-2xl font-bold text-green-600">{avgAttendance}%</div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-8 w-12" />
                            ) : (
                                <div className="text-2xl font-bold">{report.total_employees}</div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Report Period</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold">{months[parseInt(month) - 1]} {year}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Employee Summary Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Employee Attendance Summary
                        </CardTitle>
                        <CardDescription>
                            Individual attendance breakdown for {months[parseInt(month) - 1]} {year}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : report.summary.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No attendance data found for this period
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="block md:hidden space-y-3">
                                    {report.summary.map((emp, index) => (
                                        <div key={index} className="border rounded-lg p-4 space-y-3">
                                            {/* Header: Employee Info */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium">{emp.name}</p>
                                                    <p className="text-xs font-mono text-muted-foreground">{emp.employee_id}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold">{emp.attendance_rate}%</p>
                                                    <p className="text-xs text-muted-foreground">Attendance</p>
                                                </div>
                                            </div>

                                            {/* Attendance Rate Progress */}
                                            <Progress value={emp.attendance_rate} className="h-2" />

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-center">
                                                    <Badge variant="success" className="bg-green-100 text-green-800 mb-1">
                                                        {emp.present}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground">Present</p>
                                                </div>
                                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded p-2 text-center">
                                                    <Badge variant="warning" className="bg-amber-100 text-amber-800 mb-1">
                                                        {emp.late}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground">Late</p>
                                                </div>
                                                <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 text-center">
                                                    <Badge variant="destructive" className="bg-red-100 text-red-800 mb-1">
                                                        {emp.absent}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground">Absent</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee ID</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead className="text-center">Present</TableHead>
                                                <TableHead className="text-center">Late</TableHead>
                                                <TableHead className="text-center">Absent</TableHead>
                                                <TableHead>Attendance Rate</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.summary.map((emp, index) => (
                                                <TableRow key={index}>
                                                    <TableCell className="font-mono">{emp.employee_id}</TableCell>
                                                    <TableCell className="font-medium">{emp.name}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="success" className="bg-green-100 text-green-800">
                                                            {emp.present}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="warning" className="bg-amber-100 text-amber-800">
                                                            {emp.late}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="destructive" className="bg-red-100 text-red-800">
                                                            {emp.absent}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={emp.attendance_rate} className="w-20 h-2" />
                                                            <span className="text-sm font-medium">{emp.attendance_rate}%</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
