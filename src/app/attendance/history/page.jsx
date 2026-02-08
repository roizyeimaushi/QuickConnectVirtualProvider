"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";
import { StatsCardSkeleton, TableSkeleton, MobileCardSkeleton } from "@/components/ui/skeleton-patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { formatDate, formatTime24, getInitials, cn } from "@/lib/utils";
import { EditRecordDialog } from "@/components/attendance/edit-record-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";



function StatCard({ title, value, description, icon: Icon, colorClass = "bg-primary/10", iconColor = "text-primary" }) {
    return (
        <Card className="transition-all hover:shadow-lg hover:border-primary/20 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-none">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colorClass)}>
                    <Icon className={cn("h-5 w-5", iconColor)} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold font-mono">
                    {value}
                </div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function StatsSummary({ totalRecords, statusFilter, dateRange, records }) {
    // Calculate page-level stats for visual enrichment
    const presentOnPage = records.filter(r => r.status === 'present').length;
    const hoursOnPage = records.reduce((sum, r) => sum + (parseFloat(r.hours_worked) || 0), 0).toFixed(1);

    return (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
                title="Total Records"
                value={totalRecords}
                description="Historical entries"
                icon={History}
                colorClass="bg-blue-100 dark:bg-blue-900/30"
                iconColor="text-blue-600"
            />
            <StatCard
                title="Status Filter"
                value={statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                description="Active filter"
                icon={Filter}
                colorClass="bg-purple-100 dark:bg-purple-900/30"
                iconColor="text-purple-600"
            />
            <StatCard
                title="Page Present"
                value={presentOnPage}
                description="On current page"
                icon={CheckCircle2}
                colorClass="bg-emerald-100 dark:bg-emerald-900/30"
                iconColor="text-emerald-600"
            />
            <StatCard
                title="Hours Logged"
                value={`${hoursOnPage}h`}
                description="Summed from current page"
                icon={Timer}
                colorClass="bg-amber-100 dark:bg-amber-900/30"
                iconColor="text-amber-600"
            />
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);

    const handleDeleteRecord = (recordId) => {
        setRecordToDelete(recordId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;

        try {
            await attendanceApi.delete(recordToDelete);
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
        } finally {
            setDeleteDialogOpen(false);
            setRecordToDelete(null);
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
                    employee_id: record.user.employee_id,
                } : null,
                date: record.attendance_date || record.session?.date || record.created_at,
                time_in: record.time_in,
                time_out: record.time_out,
                break_start: record.break_start,
                break_end: record.break_end,
                status: record.status,
                schedule: record.session?.schedule?.name || "Regular Shift",
                hours_worked: record.hours_worked || null,
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

    // Loading state is now handled by Skeletons in the main return check

    return (
        <DashboardLayout title="Attendance History">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col space-y-0 text-left">
                    <h1 className="text-3xl font-bold tracking-tight">Attendance History</h1>
                    <p className="text-muted-foreground text-sm">
                        {user?.role === 'admin'
                            ? "View and manage attendance history across the entire organization."
                            : "Track your personal attendance performance and historical records."}
                    </p>
                </div>

                {/* Summary Stats */}
                {loading && records.length === 0 ? (
                    <StatsCardSkeleton count={4} />
                ) : (
                    <StatsSummary
                        totalRecords={totalRecords}
                        statusFilter={statusFilter}
                        dateRange={dateRange}
                        records={records}
                    />
                )}

                {/* Records Table */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Attendance Records</CardTitle>
                            </div>
                            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full sm:w-[140px] h-9">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-muted-foreground" />
                                            <SelectValue placeholder="Status" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="present">Present</SelectItem>
                                        <SelectItem value="late">Late</SelectItem>
                                        <SelectItem value="absent">Absent</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="flex items-center gap-1 w-full sm:w-auto">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "w-full sm:w-auto h-9 justify-start text-left font-normal",
                                                    dateRange?.from && "border-primary/50 bg-primary/5"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                                {dateRange?.from ? (
                                                    dateRange.to ? (
                                                        <>
                                                            {format(dateRange.from, "LLL dd")} -{" "}
                                                            {format(dateRange.to, "LLL dd")}
                                                        </>
                                                    ) : (
                                                        format(dateRange.from, "LLL dd, yyyy")
                                                    )
                                                ) : (
                                                    <span>Filter by Date</span>
                                                )}
                                                <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 max-h-[90vh] overflow-y-auto sm:max-h-none sm:overflow-visible" align="end" side="bottom" sideOffset={4} collisionPadding={10}>
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={dateRange?.from}
                                                selected={dateRange}
                                                onSelect={setDateRange}
                                                numberOfMonths={1}
                                            />
                                            <div className="p-3 border-t flex justify-between items-center bg-muted/20">
                                                <p className="text-[10px] text-muted-foreground italic">
                                                    Select a range to filter
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDateRange({ from: null, to: null })}
                                                    className="text-xs h-7 px-2 hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    Clear Selection
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    {dateRange?.from && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                            onClick={() => setDateRange({ from: null, to: null })}
                                            title="Clear date filter"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading && records.length === 0 ? (
                            <div className="space-y-6">
                                <div className="hidden md:block">
                                    <TableSkeleton rows={10} cols={7} />
                                </div>
                                <div className="md:hidden">
                                    <MobileCardSkeleton count={5} />
                                </div>
                            </div>
                        ) : records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-muted rounded-full p-6 mb-4">
                                    <History className="h-12 w-12 text-muted-foreground opacity-20" />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight">No records found</h3>
                                <p className="text-muted-foreground max-w-[250px] mt-2 mb-6">
                                    {dateRange?.from || statusFilter !== 'all'
                                        ? "We couldn't find any records matching your current filter criteria."
                                        : "There are no attendance records in your history yet."}
                                </p>
                                {(dateRange?.from || statusFilter !== 'all') && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setDateRange({ from: null, to: null });
                                            setStatusFilter("all");
                                        }}
                                        className="gap-2"
                                    >
                                        <Filter className="h-4 w-4" />
                                        Reset all filters
                                    </Button>
                                )}
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
                                                        <span className="text-muted-foreground text-xs uppercase font-bold tracking-tight">Shift Date</span>
                                                    </div>
                                                )}

                                                {/* Time & Schedule Info */}
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Time In</p>
                                                        <p className="font-mono font-medium">{formatTime24(record.time_in) || '--:--'}</p>
                                                    </div>
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Time Out</p>
                                                        <p className="font-mono font-medium">{formatTime24(record.time_out) || '--:--'}</p>
                                                    </div>

                                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded p-2 text-center">
                                                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Break Out</p>
                                                        <p className="font-mono font-medium text-emerald-700 dark:text-emerald-300">{formatTime24(record.break_end) || '--:--'}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div className="bg-muted/50 rounded p-2 text-center">
                                                        <p className="text-xs text-muted-foreground">Schedule</p>
                                                        <p className="font-medium text-xs truncate">{record.schedule}</p>
                                                    </div>
                                                    <div className="bg-primary/5 rounded p-2 text-center border border-primary/10">
                                                        <p className="text-xs text-primary font-medium">Worked Hours</p>
                                                        <p className="font-bold text-xs">{record.hours_worked ? `${record.hours_worked}h` : '--'}</p>
                                                    </div>
                                                </div>

                                                {/* Actions (admin only) */}
                                                {user?.role === 'admin' && (
                                                    <div className="pt-2 border-t">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" size="sm" className="w-full">
                                                                    <MoreHorizontal className="h-4 w-4 mr-2" />
                                                                    Manage Record
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-[200px]">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setEditingRecord(record);
                                                                        setIsEditDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Edit className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                    Edit Record
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => handleDeleteRecord(record.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Delete Permanent
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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
                                                <TableHead>Shift Date</TableHead>
                                                <TableHead className="text-center">Schedule</TableHead>
                                                <TableHead className="text-center">Time In</TableHead>

                                                <TableHead className="text-center">Time Out</TableHead>
                                                <TableHead className="text-center">Hours</TableHead>
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
                                                            {formatTime24(record.time_out) || '--:--'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-center font-bold text-primary">
                                                            {record.hours_worked ? `${record.hours_worked}h` : '--'}
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
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-[160px]">
                                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                        <DropdownMenuItem
                                                                            onClick={() => {
                                                                                setEditingRecord(record);
                                                                                setIsEditDialogOpen(true);
                                                                            }}
                                                                        >
                                                                            <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                            Edit Record
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            className="text-destructive focus:text-destructive"
                                                                            onClick={() => handleDeleteRecord(record.id)}
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Delete
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
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

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the attendance record.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DashboardLayout>
    );
}
