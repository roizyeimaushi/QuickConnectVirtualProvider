"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { FileDown, Calendar, CheckCircle, Clock, AlertTriangle, XCircle, User } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function PersonalReportPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            const response = await reportsApi.getPersonalReport();
            setData(response);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to load report data.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const blob = await reportsApi.exportPersonalReport();

            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `attendance_report_${data?.employee?.employee_id || 'me'}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast({
                title: "Success",
                description: "Report downloaded successfully.",
                variant: "success",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Export Failed",
                description: "Could not generate Excel file.",
                variant: "destructive",
            });
        } finally {
            setExporting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'present': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Present</Badge>;
            case 'late': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">Late</Badge>;
            case 'absent': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">Absent</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const { employee, summary, history } = data || {};

    return (
        <DashboardLayout title="My Attendance Report">
            <div className="space-y-6 animate-fade-in">
                {/* Header & Export */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Personal Report</h1>
                        <p className="text-muted-foreground flex items-center mt-1">
                            <User className="w-4 h-4 mr-2" />
                            {employee?.full_name} ({employee?.employee_id}) - {employee?.position}
                        </p>
                    </div>
                    <Button
                        onClick={handleExport}
                        loading={exporting}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                    >
                        <FileDown className="w-4 h-4 mr-2" />
                        Export Excel Report
                    </Button>
                </div>

                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary?.attendance_rate}%</div>
                            <p className="text-xs text-muted-foreground">Overall performance</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Present Days</CardTitle>
                            <Calendar className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary?.present_days}</div>
                            <p className="text-xs text-muted-foreground">Total days present</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary?.late_arrivals}</div>
                            <p className="text-xs text-muted-foreground">Total late check-ins</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Absences</CardTitle>
                            <XCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary?.absences}</div>
                            <p className="text-xs text-muted-foreground">Unexcused absences</p>
                        </CardContent>
                    </Card>
                </div>

                {/* History Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Full Attendance History</CardTitle>
                        <CardDescription>
                            A detailed log of all your check-ins and check-outs.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {history && history.length > 0 ? (
                            <>
                                {/* Mobile Card View */}
                                <div className="block md:hidden space-y-3">
                                    {history.map((record) => (
                                        <div key={record.id} className="border rounded-lg p-4 space-y-3">
                                            {/* Header: Date + Status */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium">
                                                        {new Date(record.attendance_date).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {record.session?.schedule?.name || 'N/A'}
                                                    </p>
                                                </div>
                                                {getStatusBadge(record.status)}
                                            </div>

                                            {/* Times Grid */}
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <div className="bg-muted/50 rounded p-2 text-center">
                                                    <p className="text-xs text-muted-foreground">Time In</p>
                                                    <p className="font-mono font-medium">
                                                        {record.time_in ? new Date(record.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                                                    </p>
                                                </div>
                                                <div className="bg-muted/50 rounded p-2 text-center">
                                                    <p className="text-xs text-muted-foreground">Break</p>
                                                    <p className="font-mono font-medium">
                                                        {record.break_start ? new Date(record.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                                                    </p>
                                                </div>
                                                <div className="bg-muted/50 rounded p-2 text-center">
                                                    <p className="text-xs text-muted-foreground">Time Out</p>
                                                    <p className="font-mono font-medium">
                                                        {record.time_out ? new Date(record.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Late:</span>
                                                    {record.minutes_late > 0 ?
                                                        <span className="text-red-500 font-bold">{record.minutes_late} min</span> :
                                                        <span>0 min</span>
                                                    }
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Worked:</span>
                                                    <span className="font-medium">{record.hours_worked} hrs</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Schedule</TableHead>
                                                <TableHead className="text-center">Time In</TableHead>
                                                <TableHead className="text-center">Break</TableHead>
                                                <TableHead className="text-center">Time Out</TableHead>
                                                <TableHead className="text-center">Late (mins)</TableHead>
                                                <TableHead className="text-center">Worked (hrs)</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {history.map((record) => (
                                                <TableRow key={record.id}>
                                                    <TableCell className="font-medium">
                                                        {new Date(record.attendance_date).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>{record.session?.schedule?.name || 'N/A'}</TableCell>
                                                    <TableCell className="text-center">
                                                        {record.time_in ? new Date(record.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {record.break_start ? new Date(record.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {record.time_out ? new Date(record.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {record.minutes_late > 0 ? <span className="text-red-500 font-bold">{record.minutes_late}</span> : 0}
                                                    </TableCell>
                                                    <TableCell className="text-center">{record.hours_worked}</TableCell>
                                                    <TableCell className="text-right">
                                                        {getStatusBadge(record.status)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-md border p-8 text-center text-muted-foreground">
                                No attendance records found.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
