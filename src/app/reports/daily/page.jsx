"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format, isSameDay } from "date-fns";
import { reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
    Calendar as CalendarIcon,
    Download,
    Clock,
    Users,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import { Label, Pie, PieChart } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

const statusConfig = {
    present: {
        label: "Present",
        icon: CheckCircle2,
        color: "#10b981",
        badgeClass: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-green-200"
    },
    late: {
        label: "Late",
        icon: AlertTriangle,
        color: "#f59e0b",
        badgeClass: "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200"
    },
    absent: {
        label: "Absent",
        icon: XCircle,
        color: "#ef4444",
        badgeClass: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200"
    },
    pending: {
        label: "Pending",
        icon: Clock,
        color: "#3b82f6",
        badgeClass: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200"
    },
};

export default function DailyReportsPage() {
    const { toast } = useToast();
    const [date, setDate] = useState(new Date());
    const [initialLoad, setInitialLoad] = useState(true);
    const [report, setReport] = useState({ summary: { total: 0, present: 0, late: 0, absent: 0, pending: 0 }, records: [] });

    // Pagination State (server-side: backend returns one page)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const perPage = 20;

    // Records for current page from API
    const recordsList = (Array.isArray(report?.records) ? report.records : []).filter(r => r && typeof r === 'object');

    const fetchReport = useCallback(async (selectedDate, page = 1, isPolling = false) => {
        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const response = await reportsApi.getDailyReport(dateStr, { per_page: perPage, page });

            // Backend returns { date, summary, records: Paginator }
            const paginator = response.records;
            const dailyRecords = paginator?.data
                ? paginator.data
                : (Array.isArray(response.records) ? response.records : []);

            setReport({
                summary: response.summary || { total: 0, present: 0, late: 0, absent: 0, pending: 0 },
                records: Array.isArray(dailyRecords) ? dailyRecords.filter(r => r && typeof r === 'object') : [],
            });
            setTotalPages(paginator?.last_page ?? 1);
            setTotalRecords(paginator?.total ?? 0);
        } catch (error) {
            if (!isPolling) {
                setReport({ summary: { total: 0, present: 0, late: 0, absent: 0, pending: 0 }, records: [] });
                setTotalPages(1);
                setTotalRecords(0);
            }
        } finally {
            if (initialLoad) setInitialLoad(false);
        }
    }, [initialLoad, perPage]);

    useEffect(() => {
        setCurrentPage(1);
        fetchReport(date, 1, false);

        let interval;
        if (isSameDay(date, new Date())) {
            // Fallback polling every 60 seconds (WebSocket handles real-time updates)
            interval = setInterval(() => fetchReport(date, 1, true), 60000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [date]);

    // Refetch when page changes (server-side pagination)
    useEffect(() => {
        if (currentPage === 1) return;
        fetchReport(date, currentPage, false);
    }, [currentPage]);

    const chartData = [
        { status: "Present", count: report?.summary?.present ?? 0, fill: statusConfig.present.color },
        { status: "Late", count: report?.summary?.late ?? 0, fill: statusConfig.late.color },
        { status: "Absent", count: report?.summary?.absent ?? 0, fill: statusConfig.absent.color },
        { status: "Pending", count: report?.summary?.pending ?? 0, fill: statusConfig.pending.color },
    ].filter(item => item.count > 0);

    const chartConfig = {
        count: {
            label: "Employees",
        },
        Present: {
            label: "Present",
            color: statusConfig.present.color,
        },
        Late: {
            label: "Late",
            color: statusConfig.late.color,
        },
        Absent: {
            label: "Absent",
            color: statusConfig.absent.color,
        },
        Pending: {
            label: "Pending",
            color: statusConfig.pending.color,
        },
    };

    // Full-page loader for initial load only
    // Full-page loader for initial load only


    return (
        <DashboardLayout title="Daily Attendance Report">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Daily Attendance Report</h1>
                        <p className="text-muted-foreground">
                            View attendance records for a specific date
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto sm:min-w-[200px] h-10 px-3 justify-between font-normal">
                                    <div className="flex items-center truncate">
                                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                        <span className="truncate">{format(date, "PPP")}</span>
                                    </div>
                                    <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0 max-h-(--radix-popover-content-available-height) overflow-y-auto"
                                align="center"
                                side="bottom"
                                sideOffset={4}
                            >
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => {
                                        if (d) {
                                            setDate(d);
                                        }
                                    }}
                                    className="rounded-lg border"
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Button
                            className="w-full sm:w-auto"
                            onClick={async () => {
                                const dateStr = format(date, "yyyy-MM-dd");
                                if (totalRecords === 0) {
                                    toast({
                                        title: "No records to export",
                                        description: "There are no attendance records for this date.",
                                        variant: "destructive",
                                    });
                                    return;
                                }
                                try {
                                    const response = await reportsApi.getDailyReport(dateStr, { per_page: 5000, page: 1 });
                                    const paginator = response.records;
                                    const allRecords = paginator?.data ? paginator.data : (Array.isArray(response.records) ? response.records : []);
                                    const rows = (Array.isArray(allRecords) ? allRecords : []).filter(r => r && typeof r === 'object');

                                    const headers = ["Employee ID", "Name", "Schedule", "Time In", "Break", "Time Out", "Hours", "Status"];
                                    const rowData = rows.map(r => [
                                        r.employee_id,
                                        r.name,
                                        r.schedule || "",
                                        r.time_in || "",
                                        r.break_time || "",
                                        r.time_out || "",
                                        r.hours || "",
                                        r.status
                                    ]);

                                    const wsData = [headers, ...rowData];
                                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                                    ws['!cols'] = [
                                        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
                                    ];

                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
                                    XLSX.writeFile(wb, `attendance-report-${dateStr}.xlsx`);

                                    toast({
                                        title: "Export successful",
                                        description: `Exported ${rows.length} records to Excel.`,
                                    });
                                } catch (err) {
                                    toast({
                                        title: "Export failed",
                                        description: err?.message || "Could not export report.",
                                        variant: "destructive",
                                    });
                                }
                            }}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{report?.summary?.total ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Present</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{report?.summary?.present ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Late</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{report?.summary?.late ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Absent</CardTitle>
                            <XCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{report.summary.absent}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Pending</CardTitle>
                            <Clock className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{report?.summary?.pending ?? 0}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Area */}
                {(report?.summary?.total ?? 0) > 0 && (
                    <div className="grid gap-4 md:grid-cols-2 lg:col-span-7">
                        <Card className="col-span-4 lg:col-span-3">
                            <CardHeader>
                                <CardTitle>Attendance Overview</CardTitle>
                                <CardDescription>
                                    Distribution of attendance status for {format(date, "MMM d")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 pb-0">
                                <ChartContainer
                                    config={chartConfig}
                                    className="mx-auto aspect-square max-h-[250px]"
                                >
                                    <PieChart>
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent hideLabel />}
                                        />
                                        <Pie
                                            data={chartData}
                                            dataKey="count"
                                            nameKey="status"
                                            innerRadius={60}
                                            strokeWidth={5}
                                        >
                                            <Label
                                                content={({ viewBox }) => {
                                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                                        return (
                                                            <text
                                                                x={viewBox.cx}
                                                                y={viewBox.cy}
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                            >
                                                                <tspan
                                                                    x={viewBox.cx}
                                                                    y={viewBox.cy}
                                                                    className="fill-foreground text-3xl font-bold"
                                                                >
                                                                    {report.summary.total.toLocaleString()}
                                                                </tspan>
                                                                <tspan
                                                                    x={viewBox.cx}
                                                                    y={(viewBox.cy || 0) + 24}
                                                                    className="fill-muted-foreground"
                                                                >
                                                                    Employees
                                                                </tspan>
                                                            </text>
                                                        )
                                                    }
                                                }}
                                            />
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Attendance Table */}
                <Card className={(report?.summary?.total ?? 0) > 0 ? "col-span-4 lg:col-span-7" : ""}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Attendance Records
                        </CardTitle>
                        <CardDescription>
                            Detailed attendance for {format(date, "MMMM d, yyyy")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recordsList.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No attendance records found for this date
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="block md:hidden space-y-3">
                                    {recordsList.map((record) => {
                                        const config = statusConfig[record.status] || statusConfig.present;
                                        const StatusIcon = config.icon;
                                        return (

                                            <div key={record.id} className="border rounded-lg p-4 space-y-3">
                                                {/* Header: Employee Info + Status */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium">{record.name}</p>
                                                        <p className="text-xs font-mono text-muted-foreground">{record.employee_id}</p>
                                                    </div>
                                                    <Badge className={`gap-1 ${config.badgeClass}`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {config.label}
                                                    </Badge>
                                                </div>

                                                {/* Schedule */}
                                                <div className="bg-muted/50 rounded p-2 text-sm">
                                                    <p className="text-xs text-muted-foreground">Schedule</p>
                                                    <p className="font-medium">{record.schedule || "—"}</p>
                                                </div>

                                                {/* Times Grid */}
                                                <div className="grid grid-cols-4 gap-2 text-sm">
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Time In</p>
                                                        <p className="font-mono font-medium">{record.time_in || "—"}</p>
                                                    </div>
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Break</p>
                                                        <p className="font-mono font-medium">{record.break_time || "—"}</p>
                                                    </div>
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Time Out</p>
                                                        <p className="font-mono font-medium">{record.time_out || "—"}</p>
                                                    </div>
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Hours</p>
                                                        <p className="font-mono font-medium">{record.hours || "—"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee ID</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Schedule</TableHead>
                                                <TableHead className="text-center">Time In</TableHead>
                                                <TableHead className="text-center">Break</TableHead>
                                                <TableHead className="text-center">Time Out</TableHead>
                                                <TableHead className="text-center">Hours</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recordsList.map((record) => {
                                                const config = statusConfig[record.status] || statusConfig.present;
                                                const StatusIcon = config.icon;
                                                return (
                                                    <TableRow key={record.id}>
                                                        <TableCell className="font-mono">{record.employee_id}</TableCell>
                                                        <TableCell className="font-medium">{record.name}</TableCell>
                                                        <TableCell>{record.schedule || "—"}</TableCell>
                                                        <TableCell className="font-mono text-center">{record.time_in || "—"}</TableCell>
                                                        <TableCell className="font-mono text-center">{record.break_time || "—"}</TableCell>
                                                        <TableCell className="font-mono text-center">{record.time_out || "—"}</TableCell>
                                                        <TableCell className="font-mono text-center">{record.hours || "—"}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={`gap-1 ${config.badgeClass}`}>
                                                                <StatusIcon className="h-3 w-3" />
                                                                {config.label}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 pt-6 border-t mt-4">
                                        <p className="text-sm text-muted-foreground text-center sm:text-left">
                                            Showing {(currentPage - 1) * perPage + 1} to{" "}
                                            {Math.min(currentPage * perPage, totalRecords)} of {totalRecords} records
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <span className="text-sm">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout >
    );
}
