"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { reportsApi } from "@/lib/api";
import { formatDateTime, formatTime24, getInitials } from "@/lib/utils";
import { format } from "date-fns";
import {
    ArrowLeft,
    Download,
    Calendar,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Clock,
    User,
    Briefcase,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

export default function EmployeeReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [initialLoad, setInitialLoad] = useState(true);
    const [data, setData] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const perPage = 10;

    useEffect(() => {
        const fetchData = async () => {
            if (!params.id) return;
            try {
                // Pass pagination parameters
                const queryParams = {
                    page: currentPage,
                    per_page: perPage
                };

                const response = await reportsApi.getEmployeeReport(params.id, queryParams);

                // Response structure changed:
                // response.records is now a Paginator object (or similar structure from Laravel)
                // We need to handle both old (array) and new (paginator) structures just in case of transition,
                // but since I updated backend, I assume new structure.

                if (response.records && response.records.data) {
                    // New Paginated Structure
                    setData({
                        ...response,
                        records: response.records.data
                    });
                    setTotalPages(response.records.last_page || 1);
                    setTotalRecords(response.records.total || 0);
                } else {
                    // Fallback or Old Structure (Array)
                    setData(response);
                    // If it's an array, we can't really paginate server-side properly with this logic unless we slice it,
                    // but likely the backend update is live.
                }

            } catch (error) {
                console.error("Failed to load employee report:", error);
            } finally {
                if (initialLoad) setInitialLoad(false);
            }
        };

        fetchData();
    }, [params.id, currentPage]); // Added currentPage dependency

    const statusConfig = {
        present: { label: "Present", variant: "success", icon: CheckCircle2, className: "bg-green-100 text-green-800 border-green-200" },
        late: { label: "Late", variant: "warning", icon: AlertTriangle, className: "bg-amber-100 text-amber-800 border-amber-200" },
        absent: { label: "Absent", variant: "destructive", icon: XCircle, className: "bg-red-100 text-red-800 border-red-200" },
        pending: { label: "Pending", variant: "outline", icon: Clock, className: "bg-blue-100 text-blue-800 border-blue-200" },
        excused: { label: "Excused", variant: "outline", icon: CheckCircle2, className: "bg-blue-100 text-blue-800 border-blue-200" },
        left_early: { label: "Left Early", variant: "warning", icon: AlertTriangle, className: "bg-orange-100 text-orange-800 border-orange-200" },
    };

    // Fallback config for unknown statuses - should NOT show as Present
    const unknownConfig = { label: "Unknown", variant: "outline", icon: Clock, className: "bg-gray-100 text-gray-800 border-gray-200" };

    // Full-page loader for initial load only
    if (initialLoad) {
        return (
            <DashboardLayout title="Employee Report">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout title="Employee Report">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <h2 className="text-xl font-semibold">Employee not found</h2>
                    <Button variant="link" onClick={() => router.push('/reports/employees')}>
                        Return to list
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const employee = data.employee;
    const stats = data.stats || {};
    const records = Array.isArray(data.records) ? data.records : (data.records?.data || []);

    const handleExport = async () => {
        try {
            toast({
                title: "Exporting...",
                description: "Preparing your report download.",
            });

            const blob = await reportsApi.exportToExcel({
                employee_id: employee.id,
                start_date: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'), // Start of current year (2026)
                end_date: format(new Date(), 'yyyy-MM-dd'),
                includePresent: true,
                includeLate: true,
                includeAbsent: true,
                includeTimes: true,
                includeBreaks: true,
            });

            // Create a URL for the blob
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Report_${employee.first_name}_${employee.last_name}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Success",
                description: "Report downloaded successfully.",
                variant: "success",
            });
        } catch (error) {
            console.error("Export failed", error);
            toast({
                title: "Export Failed",
                description: "Could not download the report.",
                variant: "destructive",
            });
        }
    };

    return (
        <DashboardLayout title={`${employee.first_name}'s Report`}>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-2 border-primary/10">
                                <AvatarImage src={employee.avatar} />
                                <AvatarFallback className="text-lg">
                                    {getInitials(employee.first_name, employee.last_name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {employee.first_name} {employee.last_name}
                                </h1>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Badge variant="outline" className="font-mono">
                                        {employee.employee_id}
                                    </Badge>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Briefcase className="h-3 w-3" />
                                        {employee.position}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.attendance_rate}%</div>
                            <p className="text-xs text-muted-foreground">Overall performance</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Present Days</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                            <p className="text-xs text-muted-foreground">Confirmed present</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{stats.late}</div>
                            <p className="text-xs text-muted-foreground">Late check-ins</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Absences</CardTitle>
                            <XCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                            <p className="text-xs text-muted-foreground">Unexcused absences</p>
                        </CardContent>
                    </Card>
                </div>

                {/* History Table */}
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Full Attendance History
                        </CardTitle>
                        <CardDescription>
                            Complete list of attendance records for {employee.first_name}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {records.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No attendance records found
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="block md:hidden space-y-3">
                                    {records.map((record) => {
                                        const config = statusConfig[record.status] || unknownConfig;
                                        const StatusIcon = config.icon;

                                        // Safe date parsing
                                        const dateStr = record.session?.date ? format(new Date(record.session.date), "MMM d, yyyy") : "—";
                                        const timeIn = record.time_in ? formatTime24(record.time_in) : "—";
                                        const timeOut = record.time_out ? formatTime24(record.time_out) : "—";
                                        const breakTime = record.break_start ? formatTime24(record.break_start) : "—";

                                        return (
                                            <div key={record.id} className="border rounded-lg p-4 space-y-3">
                                                {/* Header: Date + Status */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 font-medium">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            {dateStr}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {record.session?.schedule?.name || "—"}
                                                        </p>
                                                    </div>
                                                    <Badge variant="outline" className={`gap-1 ${config.className}`}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {config.label}
                                                    </Badge>
                                                </div>

                                                {/* Times Grid */}
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Time In</p>
                                                        <p className="font-mono font-medium">{timeIn}</p>
                                                    </div>
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Break</p>
                                                        <p className="font-mono font-medium">{breakTime}</p>
                                                    </div>
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Time Out</p>
                                                        <p className="font-mono font-medium">{timeOut}</p>
                                                    </div>
                                                </div>

                                                {/* Duration */}
                                                {record.hours_worked > 0 && (
                                                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                                                        <span className="text-muted-foreground">Duration:</span>
                                                        <span className="font-mono font-medium">{record.hours_worked}h</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Schedule</TableHead>
                                                <TableHead className="text-center">Time In</TableHead>
                                                <TableHead className="text-center">Break</TableHead>
                                                <TableHead className="text-center">Time Out</TableHead>
                                                <TableHead className="text-center">Duration</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {records.map((record) => {
                                                const config = statusConfig[record.status] || unknownConfig;
                                                const StatusIcon = config.icon;

                                                // Safe date parsing
                                                const dateStr = record.session?.date ? format(new Date(record.session.date), "MMM d, yyyy") : "—";
                                                const timeIn = record.time_in ? formatTime24(record.time_in) : "—";
                                                const timeOut = record.time_out ? formatTime24(record.time_out) : "—";
                                                const breakTime = record.break_start ? formatTime24(record.break_start) : "—";

                                                return (
                                                    <TableRow key={record.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                                {dateStr}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{record.session?.schedule?.name || "—"}</TableCell>
                                                        <TableCell className="text-center font-mono">{timeIn}</TableCell>
                                                        <TableCell className="text-center font-mono">{breakTime}</TableCell>
                                                        <TableCell className="text-center font-mono">{timeOut}</TableCell>
                                                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                            {record.hours_worked > 0 ? `${record.hours_worked}h` : "—"}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className={`gap-1 ${config.className}`}>
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
                                            {Math.min(currentPage * perPage, totalRecords)} of{" "}
                                            {totalRecords} records
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
        </DashboardLayout>
    );
}
