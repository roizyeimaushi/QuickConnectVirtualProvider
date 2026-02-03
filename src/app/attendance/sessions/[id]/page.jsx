"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { EditRecordDialog } from "@/components/attendance/edit-record-dialog";
import { attendanceApi, sessionsApi } from "@/lib/api";
import { formatTime24, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
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
    ArrowLeft,
    Calendar,
    Clock,
    Lock,
    CheckCircle2,
    AlertCircle,
    Timer,
    MapPin,
    User,
    Laptop,
    Smartphone,
    Pencil,
    Trash2,
    MoreVertical
} from "lucide-react";
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

function SessionDetailsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid gap-6 md:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-6 w-32" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-6 w-16" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function SessionDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    // Edit Dialog State
    const [recordToEdit, setRecordToEdit] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    // Delete Dialog State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchSession = async (isPolling = false) => {
        if (!id) return;

        try {
            if (!isPolling) setLoading(true); // Show loader on initial fetch
            const response = await sessionsApi.getById(id);
            setSession(response);
        } catch (error) {
            // Handle 404 (session deleted) - redirect to sessions list
            if (error?.status === 404 || error?.response?.status === 404) {
                if (!isPolling) {
                    toast({
                        title: "Session not found",
                        description: "This session may have been deleted.",
                        variant: "destructive",
                    });
                }
                router.push("/attendance/sessions");
                return;
            }

            console.error("Failed to fetch session details:", error);
            if (!isPolling) {
                toast({
                    title: "Error",
                    description: "Failed to load session details",
                    variant: "destructive",
                });
            }
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Polling logic (fallback - WebSocket handles real-time updates)
    useEffect(() => {
        // Disable polling when dialog is open to prevent overwriting edits/state
        if (!editDialogOpen) {
            const interval = setInterval(() => fetchSession(true), 60000); // Fallback poll every 60s
            return () => clearInterval(interval);
        }
    }, [editDialogOpen]);

    const handleDeleteRecord = (record) => {
        setRecordToDelete(record);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;

        try {
            setIsDeleting(true);
            await attendanceApi.delete(recordToDelete.id);
            toast({
                title: "Deleted",
                description: "Attendance record deleted successfully.",
                variant: "success",
            });
            fetchSession(true);
            setDeleteDialogOpen(false);
        } catch (error) {
            console.error("Delete failed:", error);
            toast({
                title: "Error",
                description: "Failed to delete record.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
            setRecordToDelete(null);
        }
    };

    const statusConfig = {
        active: {
            label: "Active",
            color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
            icon: CheckCircle2,
        },
        pending: {
            label: "Pending",
            color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
            icon: Timer,
        },
        locked: {
            label: "Locked",
            color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
            icon: Lock,
        },
        completed: {
            label: "Completed",
            color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
            icon: CheckCircle2,
        },
        // Record Statuses (Matching History Page)
        present: {
            label: "Present",
            color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
            icon: CheckCircle2,
        },
        late: {
            label: "Late",
            color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
            icon: Timer,
        },
        absent: {
            label: "Absent",
            color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
            icon: AlertCircle,
        },
        excused: {
            label: "Excused",
            color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
            icon: CheckCircle2,
        },
        left_early: {
            label: "Left Early",
            color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
            icon: AlertCircle,
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Session Details">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!session) {
        return (
            <DashboardLayout title="Session Details">
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <h3 className="text-lg font-semibold">Session not found</h3>
                    <Button asChild variant="outline">
                        <Link href="/attendance/sessions">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Sessions
                        </Link>
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const StatusIcon = statusConfig[session.status]?.icon || AlertCircle;
    const statusColor = statusConfig[session.status]?.color || "bg-gray-100 text-gray-800";
    const statusLabel = statusConfig[session.status]?.label || session.status;

    return (
        <DashboardLayout title="Session Details">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/attendance/sessions">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Session Details</h1>
                        <p className="text-muted-foreground">
                            {formatDate(session.date, "MMMM d, yyyy")} • {session.schedule?.name}
                        </p>
                    </div>
                    <div className="ml-auto">
                        <Badge className={`${statusColor} px-3 py-1`}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusLabel}
                        </Badge>
                    </div>
                </div>

                {/* Session Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Session Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Date</p>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{formatDate(session.date, "MMM d, yyyy")}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Schedule Time</p>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                        {formatTime24(session.schedule?.time_in)} - {formatTime24(session.schedule?.time_out)}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Created By</p>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{session.creator?.name || "System"}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Attendance</p>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                        {session.records?.length || 0} Records
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Attendance Records Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Attendance Records</CardTitle>
                        <CardDescription>
                            List of employees who have timed in for this session
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {session.records && session.records.length > 0 ? (
                            <>
                                {/* Mobile Card View */}
                                <div className="block md:hidden space-y-3">
                                    {session.records.map((record) => (
                                        <div key={record.id} className="border rounded-lg p-4 space-y-3">
                                            {/* Header: Employee + Status */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <Avatar className="h-10 w-10 flex-shrink-0">
                                                        <AvatarImage src={record.user?.avatar} />
                                                        <AvatarFallback>
                                                            {record.user?.first_name ? record.user.first_name.charAt(0) : (record.user?.name?.charAt(0) || "U")}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">
                                                            {record.user?.first_name ? `${record.user.first_name} ${record.user.last_name}` : (record.user?.name || "Unknown User")}
                                                        </p>
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            {record.user?.status === 'inactive' ? (
                                                                <span className="italic text-red-500">Account inactive</span>
                                                            ) : record.status === 'pending' ? (
                                                                <span className="italic opacity-70">Waiting for check-in...</span>
                                                            ) : (
                                                                <>
                                                                    <MapPin className="h-3 w-3" />
                                                                    <span className="truncate max-w-[150px]" title={record.location_address}>
                                                                        {record.location_city ? `${record.location_city}, ${record.location_country}` : (record.ip_address || "Unknown")}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={statusConfig[record.status] ? statusConfig[record.status].color : "bg-gray-50 text-gray-700 border-gray-200"}
                                                    >
                                                        {record.user?.status === 'inactive' ? 'inactive' : (statusConfig[record.status]?.label || record.status)}
                                                    </Badge>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => {
                                                                setRecordToEdit(record);
                                                                setEditDialogOpen(true);
                                                            }}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDeleteRecord(record)}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            {/* Time Info Grid */}
                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                <div className="bg-muted/50 rounded p-2 text-center">
                                                    <p className="text-xs text-muted-foreground">Time In</p>
                                                    <p className="font-mono font-medium">{formatTime24(record.time_in) || '--:--'}</p>
                                                </div>
                                                <div className="bg-muted/50 rounded p-2 text-center">
                                                    <p className="text-xs text-muted-foreground">Break</p>
                                                    {record.break_start ? (
                                                        <div className="font-mono text-xs">
                                                            <span className="text-amber-600">{formatTime24(record.break_start)}</span>
                                                            {record.break_end && (
                                                                <span className="text-emerald-600"> - {formatTime24(record.break_end)}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="font-mono text-muted-foreground">-</p>
                                                    )}
                                                </div>
                                                <div className="bg-muted/50 rounded p-2 text-center">
                                                    <p className="text-xs text-muted-foreground">Time Out</p>
                                                    <p className="font-mono font-medium">
                                                        {record.time_out
                                                            ? formatTime24(record.time_out)
                                                            : record.time_in
                                                                ? <span className="text-muted-foreground italic text-xs">Active</span>
                                                                : '--:--'
                                                        }
                                                    </p>
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
                                                <TableHead>Employee</TableHead>
                                                <TableHead className="text-center">Time In</TableHead>
                                                <TableHead className="text-center">Break</TableHead>
                                                <TableHead className="text-center">Time Out</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                                <TableHead className="text-center">Device & Location</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {session.records.map((record) => (
                                                <TableRow key={record.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={record.user?.avatar} />
                                                                <AvatarFallback>
                                                                    {record.user?.first_name ? record.user.first_name.charAt(0) : (record.user?.name?.charAt(0) || "U")}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="text-sm font-medium">
                                                                {record.user?.first_name ? `${record.user.first_name} ${record.user.last_name}` : (record.user?.name || "Unknown User")}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {formatTime24(record.time_in) || '--:--'}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {record.break_start ? (
                                                            <div className="flex flex-col items-center text-xs">
                                                                <span className="text-amber-600">
                                                                    {formatTime24(record.break_start)}
                                                                </span>
                                                                {record.break_end && (
                                                                    <span className="text-emerald-600">
                                                                        {formatTime24(record.break_end)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {record.time_out ? (
                                                            formatTime24(record.time_out)
                                                        ) : record.time_in ? (
                                                            <span className="text-muted-foreground italic">Active</span>
                                                        ) : (
                                                            '--:--'
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={statusConfig[record.status] ? statusConfig[record.status].color : "bg-gray-50 text-gray-700 border-gray-200"}
                                                        >
                                                            {record.user?.status === 'inactive' ? 'inactive' : (statusConfig[record.status]?.label || record.status)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs text-muted-foreground">
                                                        {record.user?.status === 'inactive' ? (
                                                            <span className="italic text-red-500">Account inactive</span>
                                                        ) : record.status === 'pending' ? (
                                                            <span className="italic opacity-50">Waiting for check-in...</span>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center gap-1">
                                                                <div className="flex items-center gap-1 font-medium text-foreground/80">
                                                                    <MapPin className="h-3 w-3" />
                                                                    <span title={record.location_address}>
                                                                        {record.location_city ? `${record.location_city}, ${record.location_country}` : (record.ip_address || "Unknown")}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-70">
                                                                    {record.device_type === 'Mobile' ? <Smartphone className="h-3 w-3" /> : <Laptop className="h-3 w-3" />}
                                                                    <span>{record.os || "Unknown"} • {record.browser?.split(' ')[0] || "Browser"}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setRecordToEdit(record);
                                                                    setEditDialogOpen(true);
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteRecord(record)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <User className="h-10 w-10 text-muted-foreground mb-3" />
                                <p className="text-sm text-muted-foreground">No attendance records found for this session.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Dialog */}
            {recordToEdit && (
                <EditRecordDialog
                    record={recordToEdit}
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    onSuccess={() => fetchSession(true)}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the attendance record
                            {recordToDelete && recordToDelete.user && ` for ${recordToDelete.user.first_name || recordToDelete.user.name}`}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDelete();
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? (
                                <>
                                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
}

