"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { attendanceApi } from "@/lib/api";
import { formatDate, formatTime24, formatTime12, getInitials } from "@/lib/utils";
import { EditRecordDialog } from "@/components/attendance/edit-record-dialog";
import {
    History,
    CalendarIcon,
    Filter,
    ChevronDown,
    Search,
    CheckCircle2,
    Timer,
    XCircle,
    Clock,
    ChevronLeft,
    ChevronRight,
    Edit,
    Loader2,
    Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function HistoryTableSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                </div>
            ))}
        </div>
    );
}

function StatsSummary({ totalRecords }) {
    return (
        <div className="grid gap-4 md:grid-cols-4">
            <Card>
                <CardContent className="flex items-center gap-4 p-4">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <History className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{totalRecords}</p>
                        <p className="text-xs text-muted-foreground">Total Records Found</p>
                    </div>
                </CardContent>
            </Card>
            {/* 
                Detailed stats require separate aggregation API when using server-side pagination.
                Hiding misleading partial stats for now.
            */}
        </div>
    );
}

export default function AttendanceHistoryPage() {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ from: null, to: null });
    const [statusFilter, setStatusFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [editingRecord, setEditingRecord] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const recordsPerPage = 10;
    const { toast } = useToast();

    const handleDeleteRecord = async (recordId) => {
        if (!confirm("Are you sure you want to delete this record? This action cannot be undone.")) return;

        try {
            await attendanceApi.delete(recordId);
            toast({
                title: "Deleted",
                description: "Attendance record deleted successfully",
                variant: "success",
            });
            fetchRecords();
        } catch (error) {
            console.error("Delete failed:", error);
            toast({
                title: "Error",
                description: "Failed to delete record",
                variant: "destructive",
            });
        }
    };

    // Track initialization to only show loader on first fetch
    const initialized = useRef(false);

    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const fetchRecords = async (showLoader = false) => {
        if (!user) return;
        if (showLoader) setLoading(true);
        try {
            // Determine which API method to use
            const apiMethod = user?.role === 'admin'
                ? attendanceApi.getAll
                : attendanceApi.getMyRecords;

            // Prepare params
            const params = {
                page: currentPage,
                per_page: recordsPerPage,
            };

            if (statusFilter !== "all") {
                params.status = statusFilter;
            }

            if (dateRange?.from) {
                params.start_date = format(dateRange.from, "yyyy-MM-dd");
                if (dateRange?.to) {
                    params.end_date = format(dateRange.to, "yyyy-MM-dd");
                } else {
                    params.end_date = params.start_date;
                }
            }

            // Fetch records
            const response = await apiMethod(params);

            // Handle Laravel Pagination Response
            // structure: { data: [...], current_page: 1, last_page: 5, total: 100 }
            const data = response.data || [];

            setTotalPages(response.last_page || 1);
            setTotalRecords(response.total || 0);

            const formattedRecords = data.map(record => ({
                id: record.id,
                employee: record.user ? {
                    name: record.user.name || `${record.user.first_name} ${record.user.last_name}`,
                    avatar: record.user.avatar,
                    position: record.user.position,
                } : null,
                date: record.attendance_date || record.session?.date || record.created_at,
                time_in: record.time_in,
                time_out: record.time_out,
                break_start: record.break_start,
                break_end: record.break_end,
                status: record.status,
                schedule: record.session?.schedule?.name || "Regular Shift",
            }));

            setRecords(formattedRecords);
        } catch (error) {
            console.error("Failed to fetch records:", error);
            setRecords([]);
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    // Refetch when params change
    useEffect(() => {
        // If it's the first time processing with a user, show loader.
        // Otherwise, do background update.
        if (user && !initialized.current) {
            fetchRecords(true);
            initialized.current = true;
        } else if (user) {
            fetchRecords(false);
        }
    }, [user, currentPage, statusFilter, dateRange]);

    // Real-time polling every 5 seconds
    useEffect(() => {
        if (!user) return;

        const interval = setInterval(() => {
            fetchRecords(false); // Silent polling (no loader)
        }, 5000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, currentPage, statusFilter, dateRange]);

    // Client-side filtering removed (now handled by backend)
    const paginatedRecords = records;

    const statusColors = {
        present: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        late: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        absent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        excused: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        left_early: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };

    const statusIcons = {
        present: CheckCircle2,
        late: Timer,
        absent: XCircle,
        pending: Clock,
        excused: CheckCircle2,
        left_early: Timer,
    };



    if (loading) {
        return (
            <DashboardLayout title="Attendance History">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Attendance History">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Attendance History</h1>
                    <p className="text-muted-foreground">
                        View your complete attendance records and statistics
                    </p>
                </div>

                {/* Summary Stats */}
                <StatsSummary totalRecords={totalRecords} />

                {/* Records Table */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Attendance Records</CardTitle>
                                <CardDescription>Your detailed attendance log</CardDescription>
                            </div>
                            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full sm:w-[140px]">
                                        <Filter className="mr-2 h-4 w-4" />
                                        <SelectValue placeholder="Filter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="present">Present</SelectItem>
                                        <SelectItem value="late">Late</SelectItem>
                                        <SelectItem value="absent">Absent</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="excused">Excused</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full sm:w-[260px] h-10 px-3 justify-between text-left font-normal">
                                            <div className="flex items-center truncate">
                                                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                                {dateRange?.from ? (
                                                    dateRange?.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                                                        <span className="truncate">
                                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                                            {format(dateRange.to, "LLL dd, y")}
                                                        </span>
                                                    ) : (
                                                        <span className="truncate">{format(dateRange.from, "LLL dd, yyyy")}</span>
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground">Pick a date</span>
                                                )}
                                            </div>
                                            <ChevronDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-auto p-0 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain"
                                        align="end"
                                        side="bottom"
                                        avoidCollisions={false}
                                    >
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={1}
                                            className="rounded-md border p-3"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <History className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No records found</h3>
                                <p className="text-sm text-muted-foreground">
                                    No attendance records match your filter criteria
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="block md:hidden space-y-3">
                                    {records.map((record) => {
                                        const StatusIcon = statusIcons[record.status] || CheckCircle2;
                                        return (
                                            <div key={record.id} className="border rounded-lg p-4 space-y-3">
                                                {/* Header: Employee + Status */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        {user?.role === 'admin' && record.employee && (
                                                            <>
                                                                <Avatar className="h-10 w-10 flex-shrink-0">
                                                                    <AvatarImage src={record.employee?.avatar} />
                                                                    <AvatarFallback>{getInitials(record.employee?.name)}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium truncate">{record.employee?.name}</p>
                                                                    <p className="text-xs text-muted-foreground truncate">{record.employee?.position || 'Employee'}</p>
                                                                </div>
                                                            </>
                                                        )}
                                                        {user?.role !== 'admin' && (
                                                            <div className="flex items-center gap-2">
                                                                <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                                <div>
                                                                    <p className="font-medium">{formatDate(record.date, "MMM d, yyyy")}</p>
                                                                    <p className="text-xs text-muted-foreground">{formatDate(record.date, "EEEE")}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Badge className={`${statusColors[record.status] || statusColors.present} flex-shrink-0`}>
                                                        <StatusIcon className="mr-1 h-3 w-3" />
                                                        {record.status}
                                                    </Badge>
                                                </div>

                                                {/* Date (for admin view) */}
                                                {user?.role === 'admin' && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                        <span>{formatDate(record.date, "MMM d, yyyy")}</span>
                                                        <span className="text-muted-foreground">({formatDate(record.date, "EEEE")})</span>
                                                    </div>
                                                )}

                                                {/* Time & Schedule Info */}
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Time In</p>
                                                        <p className="font-mono font-medium">{formatTime24(record.time_in) || '--:--'}</p>
                                                    </div>
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Time Out</p>
                                                        <p className="font-mono font-medium">{formatTime24(record.time_out) || '--:--'}</p>
                                                    </div>
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Schedule</p>
                                                        <p className="font-medium text-xs truncate">{record.schedule}</p>
                                                    </div>
                                                </div>

                                                {/* Actions (admin only) */}
                                                {user?.role === 'admin' && (
                                                    <div className="pt-2 border-t flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1"
                                                            onClick={() => {
                                                                setEditingRecord(record);
                                                                setIsEditDialogOpen(true);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDeleteRecord(record.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </Button>
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
                                                {user?.role === 'admin' && (
                                                    <TableHead>Employee</TableHead>
                                                )}
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-center">Schedule</TableHead>
                                                <TableHead className="text-center">Time In</TableHead>
                                                <TableHead className="text-center">Break Start</TableHead>
                                                <TableHead className="text-center">Break End</TableHead>
                                                <TableHead className="text-center">Time Out</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                                {user?.role === 'admin' && (
                                                    <TableHead className="text-center">Actions</TableHead>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {records.map((record) => {
                                                const StatusIcon = statusIcons[record.status] || CheckCircle2;
                                                return (
                                                    <TableRow key={record.id}>
                                                        {user?.role === 'admin' && (
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar className="h-9 w-9">
                                                                        <AvatarImage src={record.employee?.avatar} />
                                                                        <AvatarFallback>{getInitials(record.employee?.name)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <p className="font-medium">{record.employee?.name}</p>
                                                                        <p className="text-xs text-muted-foreground">{record.employee?.position || 'Employee'}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                                                <span>{formatDate(record.date, "MMM d, yyyy")}</span>
                                                                <span className="text-muted-foreground text-xs">({formatDate(record.date, "EEEE")})</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">{record.schedule}</TableCell>
                                                        <TableCell className="font-mono text-center">
                                                            {formatTime24(record.time_in) || '--:--'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-center">
                                                            {formatTime24(record.break_start) || '--:--'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-center">
                                                            {formatTime24(record.break_end) || '--:--'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-center">
                                                            {formatTime24(record.time_out) || '--:--'}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex justify-center">
                                                                <Badge className={statusColors[record.status] || statusColors.present}>
                                                                    <StatusIcon className="mr-1 h-3 w-3" />
                                                                    {record.status}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        {user?.role === 'admin' && (
                                                            <TableCell className="text-center">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => {
                                                                            setEditingRecord(record);
                                                                            setIsEditDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                        onClick={() => handleDeleteRecord(record.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                                        <p className="text-sm text-muted-foreground text-center sm:text-left">
                                            Showing {(currentPage - 1) * recordsPerPage + 1} to{" "}
                                            {Math.min(currentPage * recordsPerPage, totalRecords)} of{" "}
                                            {totalRecords} records
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                disabled={currentPage === 1 || loading}
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
                                                disabled={currentPage === totalPages || loading}
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

                {editingRecord && (
                    <EditRecordDialog
                        record={editingRecord}
                        open={isEditDialogOpen}
                        onOpenChange={setIsEditDialogOpen}
                        onSuccess={fetchRecords}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
