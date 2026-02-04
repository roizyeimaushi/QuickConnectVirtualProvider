"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { schedulesApi } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { formatTime24 } from "@/lib/utils";
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Clock,
    Calendar,
    CheckCircle2,
    XCircle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

function SchedulesTableSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b">
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                </div>
            ))}
        </div>
    );
}

function ScheduleStatsCardsSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
                <Card key={i}>
                    <CardContent className="flex items-center gap-4 p-6">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-12" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function SchedulesPage() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const router = useRouter();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, schedule: null });
    const { toast } = useToast();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const perPage = 10;

    // Auth check - redirect if not admin
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace("/auth/admin/login");
            } else if (!isAdmin) {
                router.replace("/dashboard/employee");
            }
        }
    }, [authLoading, user, isAdmin, router]);

    const fetchSchedules = async (isPolling = false) => {
        // Only fetch if user is confirmed as admin
        if (authLoading || !isAdmin) return;

        if (!isPolling) setLoading(true);

        try {
            const params = {
                page: currentPage,
                per_page: perPage
            };

            const response = await schedulesApi.getAll(params);

            // Determine if we have paginated response or plain array (just in case)
            // ScheduleController returns paginate(20) json.

            const rawData = response.data || [];
            const schedulesData = rawData.map(s => ({
                id: s.id,
                name: s.name,
                time_in: s.time_in,
                break_time: s.break_time,
                time_out: s.time_out,
                grace_period: s.grace_period_minutes,
                late_threshold: s.late_threshold_minutes,
                status: s.status,
            }));

            setSchedules(schedulesData);
            setTotalPages(response.last_page || 1);
            setTotalRecords(response.total || 0);

        } catch (error) {
            const errorMessage = error?.message ||
                (error && Object.keys(error).length > 0 ? JSON.stringify(error) : 'Unknown error');
            console.error("Failed to fetch schedules:", errorMessage);

            // If access denied, session might be stale - redirect to login
            if (error?.status === 403 || error?.status === 401 ||
                errorMessage?.toLowerCase().includes('access denied') ||
                errorMessage?.toLowerCase().includes('unauthorized')) {
                toast({
                    title: "Session Expired",
                    description: "Please log in again to continue.",
                    variant: "destructive",
                });
                router.replace("/auth/admin/login");
                return;
            }

            if (!isPolling) {
                toast({
                    title: "Error",
                    description: errorMessage || "Failed to load schedules",
                    variant: "destructive",
                });
            }
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAdmin, currentPage]); // Added currentPage dependency

    // Real-time polling every 5 seconds
    useEffect(() => {
        if (authLoading || !isAdmin) return;

        const interval = setInterval(() => {
            fetchSchedules(true); // Silent polling
        }, 5000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAdmin, currentPage]);

    const handleDelete = async () => {
        if (!deleteDialog.schedule) return;

        try {
            await schedulesApi.delete(deleteDialog.schedule.id);
            setSchedules((prev) => prev.filter((s) => s.id !== deleteDialog.schedule.id));
            toast({
                title: "Schedule deleted",
                description: `${deleteDialog.schedule.name} has been removed.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete schedule",
                variant: "destructive",
            });
        } finally {
            setDeleteDialog({ open: false, schedule: null });
        }
    };

    return (
        <DashboardLayout title="Schedules">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Work Schedules</h1>
                        <p className="text-muted-foreground">
                            Manage shift timings and attendance rules.
                        </p>
                    </div>
                    <Button asChild className="w-full md:w-auto">
                        <Link href="/schedules/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Schedule
                        </Link>
                    </Button>
                </div>

                {/* Stats */}
                {loading ? (
                    <ScheduleStatsCardsSkeleton />
                ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 rounded-lg bg-primary/10">
                                    <Calendar className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{schedules.length}</p>
                                    <p className="text-sm text-muted-foreground">Total Schedules</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">
                                        {schedules.filter((s) => s.status === "active").length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Active</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900/30">
                                    <XCircle className="h-6 w-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">
                                        {schedules.filter((s) => s.status === "inactive").length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Inactive</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Schedules Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Schedule Configuration
                        </CardTitle>
                        <CardDescription>
                            Configure shift schedules using 24-hour format.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <SchedulesTableSkeleton />
                        ) : schedules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No schedules yet</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Create your first work schedule to get started
                                </p>
                                <Button asChild>
                                    <Link href="/schedules/create">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Schedule
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="block md:hidden space-y-3">
                                    {schedules.map((schedule) => (
                                        <div key={schedule.id} className="border rounded-lg p-4 space-y-3">
                                            {/* Header: Name + Status + Actions */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-muted">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{schedule.name}</p>
                                                        <Badge
                                                            className={
                                                                schedule.status === "active"
                                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                                                            }
                                                        >
                                                            {schedule.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/schedules/edit/${schedule.id}`}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => setDeleteDialog({ open: true, schedule })}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Times Grid */}
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <div className="bg-muted/50 rounded p-2 text-center">
                                                    <p className="text-xs text-muted-foreground">Time In</p>
                                                    <p className="font-mono font-medium">{formatTime24(schedule.time_in)}</p>
                                                </div>
                                                <div className="bg-muted/50 rounded p-2 text-center">
                                                    <p className="text-xs text-muted-foreground">Break</p>
                                                    <p className="font-mono font-medium">{formatTime24(schedule.break_time)}</p>
                                                </div>
                                                <div className="bg-muted/50 rounded p-2 text-center">
                                                    <p className="text-xs text-muted-foreground">Time Out</p>
                                                    <p className="font-mono font-medium">{formatTime24(schedule.time_out)}</p>
                                                </div>
                                            </div>

                                            {/* Thresholds */}
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="bg-muted/50 rounded p-2">
                                                    <p className="text-xs text-muted-foreground">Grace Period</p>
                                                    <p className="font-medium">{schedule.grace_period} min</p>
                                                </div>
                                                <div className="bg-muted/50 rounded p-2">
                                                    <p className="text-xs text-muted-foreground">Late Threshold</p>
                                                    <p className="font-medium">{schedule.late_threshold} min</p>
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
                                                <TableHead>Name</TableHead>
                                                <TableHead className="text-center">Time In</TableHead>
                                                <TableHead className="text-center">Break</TableHead>
                                                <TableHead className="text-center">Time Out</TableHead>
                                                <TableHead className="text-center">Grace Period</TableHead>
                                                <TableHead className="text-center">Late Threshold</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                                <TableHead className="w-[70px] text-center">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {schedules.map((schedule) => (
                                                <TableRow key={schedule.id}>
                                                    <TableCell className="font-medium">{schedule.name}</TableCell>
                                                    <TableCell className="font-mono text-center">{formatTime24(schedule.time_in)}</TableCell>
                                                    <TableCell className="font-mono text-center">{formatTime24(schedule.break_time)}</TableCell>
                                                    <TableCell className="font-mono text-center">{formatTime24(schedule.time_out)}</TableCell>
                                                    <TableCell className="text-center">{schedule.grace_period} min</TableCell>
                                                    <TableCell className="text-center">{schedule.late_threshold} min</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            className={
                                                                schedule.status === "active"
                                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                                                            }
                                                        >
                                                            {schedule.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/schedules/edit/${schedule.id}`}>
                                                                        <Pencil className="mr-2 h-4 w-4" />
                                                                        Edit
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => setDeleteDialog({ open: true, schedule })}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                        <p className="text-sm text-muted-foreground text-center sm:text-left">
                            Showing {(currentPage - 1) * perPage + 1} to{" "}
                            {Math.min(currentPage * perPage, totalRecords)} of{" "}
                            {totalRecords} schedules
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

                {/* Delete Dialog */}
                <AlertDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, schedule: deleteDialog.schedule })}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete <strong>{deleteDialog.schedule?.name}</strong>?
                                This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DashboardLayout>
    );
}
