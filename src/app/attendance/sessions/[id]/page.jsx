"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { EditRecordDialog } from "@/components/attendance/edit-record-dialog";
import { LockSessionDialog } from "@/components/attendance/lock-session-dialog";
import { attendanceApi, sessionsApi } from "@/lib/api";
import { formatTime24, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
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
    AlertTriangle,
    ShieldCheck,
    Timer,
    MapPin,
    User,
    Laptop,
    Smartphone,
    Pencil,
    Trash2,
    MoreHorizontal
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
    const [virtualRecordDialogOpen, setVirtualRecordDialogOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [lockDialogOpen, setLockDialogOpen] = useState(false);

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

        if (typeof record.id === 'string' && record.id.startsWith('virtual_')) {
            setVirtualRecordDialogOpen(true);
            return;
        }

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

    const handleLockSession = async (lockData) => {
        try {
            await sessionsApi.lock(id, lockData);
            toast({
                title: "Session locked",
                description: "The attendance session has been finalized.",
                variant: "success",
            });
            fetchSession(true);
            setLockDialogOpen(false);
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to lock session",
                variant: "destructive",
            });
        }
    };

    const statusConfig = {
        active: {
            label: "Live",
            color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 shadow-sm font-semibold",
            icon: Timer,
        },
        pending: {
            label: "Upcoming",
            color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
            icon: Calendar,
        },
        locked: {
            label: "Finalized",
            color: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 font-medium",
            icon: Lock,
        },
        completed: {
            label: "Awaiting Review",
            color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 font-medium",
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
            color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 font-medium",
            icon: CheckCircle2,
        },
        left_early: {
            label: "Left Early",
            color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
            icon: AlertCircle,
        }
    };

    // Simplified: No more full-page blocking loader.
    // The page will render the layout and header immediately.

    if (loading && !session) {
        return (
            <DashboardLayout title="Loading Session...">
                <div className="space-y-6 animate-fade-in p-4">
                    {/* Header Skeleton */}
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="ml-auto h-9 w-32 rounded-full" />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-5 w-32" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-5 w-24" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-48 mb-2" />
                            <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md">
                                <div className="p-4 border-b bg-muted/30">
                                    <div className="grid grid-cols-6 gap-4">
                                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                                    </div>
                                </div>
                                <div className="p-0">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="p-4 border-b last:border-0">
                                            <div className="grid grid-cols-6 gap-4 items-center">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-9 w-9 rounded-full" />
                                                    <Skeleton className="h-4 w-24" />
                                                </div>
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-4 w-full" />
                                                <Skeleton className="h-6 w-16 mx-auto" />
                                                <Skeleton className="h-8 w-24 ml-auto" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    if (!session) {
        return (
            <DashboardLayout title="Session Details">
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 animate-fade-in">
                    <AlertCircle className="h-12 w-12 text-destructive" />
                    <h3 className="text-lg font-semibold">Session not found</h3>
                    <p className="text-muted-foreground text-sm max-w-xs">
                        This session record might have been removed or you don't have permission to view it.
                    </p>
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
                    <div className="ml-auto flex items-center gap-3">
                        {session.status === 'completed' && (
                            <Button
                                onClick={() => setLockDialogOpen(true)}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                <Lock className="mr-2 h-4 w-4" />
                                Finalize & Lock
                            </Button>
                        )}
                        <Badge className={`${statusColor} px-3 py-1 border shadow-sm`}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusLabel}
                        </Badge>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Session Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                Schedule Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Date</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span className="font-semibold">{formatDate(session.date, "MMM d, yyyy")}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Schedule Time</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-primary" />
                                        <span className="font-semibold">
                                            {formatTime24(session.schedule?.time_in)} - {formatTime24(session.schedule?.time_out)}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Created By</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-primary" />
                                        <span className="font-semibold">{session.creator?.name || "System"}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Attendance</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                        <span className="font-semibold">
                                            {session.records?.filter(r => r.time_in).length || 0}/{session.total_employees_count || session.records?.length || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Context Card */}
                    <Card className={`overflow-hidden border-2 transition-all ${session.status === 'locked'
                        ? (session.session_type === 'Remote/WFH' ? 'border-blue-200 bg-blue-50/20' :
                            session.session_type === 'Special' ? 'border-purple-200 bg-purple-50/20' :
                                session.session_type === 'Excused' ? 'border-amber-200 bg-amber-50/20' :
                                    'border-emerald-100 bg-emerald-50/10')
                        : 'border-slate-100'
                        }`}>
                        <CardHeader className={`${session.session_type === 'Remote/WFH' ? 'bg-blue-100/50' :
                            session.session_type === 'Special' ? 'bg-purple-100/50' :
                                session.session_type === 'Excused' ? 'bg-amber-100/50' :
                                    session.session_type === 'Overtime' ? 'bg-orange-100/50' :
                                        session.status === 'locked' ? 'bg-emerald-50' : 'bg-slate-50'
                            } py-3`}>
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className={`h-4 w-4 ${session.status === 'locked' ? 'text-primary' : ''}`} />
                                    Final Verdict & Protocol
                                </div>
                                {session.status === 'locked' && (
                                    <Badge variant="outline" className={`
                                        ${session.session_type === 'Remote/WFH' ? 'border-blue-500 bg-blue-500' :
                                            session.session_type === 'Special' ? 'border-purple-500 bg-purple-500' :
                                                session.session_type === 'Excused' ? 'border-amber-500 bg-amber-500' :
                                                    session.session_type === 'Overtime' ? 'border-orange-500 bg-orange-500' :
                                                        'border-slate-800 bg-slate-800'}
                                        text-white text-[10px] px-2 py-0 h-5
                                    `}>
                                        {session.session_type}
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-5 pb-5">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Decision</p>
                                        <div className="flex items-center gap-2">
                                            {session.status === 'locked' ? (
                                                <Badge className="bg-emerald-600 text-white border-none text-[10px] font-bold">LOCKED & APPROVED</Badge>
                                            ) : session.status === 'completed' ? (
                                                <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 text-[10px] font-bold">AWAITING REVIEW</Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 text-[10px] font-bold uppercase">{session.status}</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Protocol</p>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            {session.attendance_required ? "Auto-mark ABSENT if not present" : "Excused / Voluntary Attendance"}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Review Responsibility</p>
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                                                {session.locked_by_user?.avatar ? (
                                                    <img src={session.locked_by_user.avatar} className="object-cover h-full w-full" />
                                                ) : (
                                                    <User className="h-3 w-3 text-primary" />
                                                )}
                                            </div>
                                            <span className="font-bold text-xs uppercase tracking-tight">
                                                {session.status === 'locked' ? (session.locked_by_user?.name || "Administrator") : "Admin Group"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
                                                    <Avatar className="h-11 w-11 border border-primary/10 shadow-sm">
                                                        <AvatarImage src={record.user?.avatar} />
                                                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                            {record.user?.first_name ? record.user.first_name.charAt(0) : (record.user?.name?.charAt(0) || "U")}
                                                            {record.user?.last_name ? record.user.last_name.charAt(0) : ""}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
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
                                                                <MoreHorizontal className="h-4 w-4" />
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
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600"
                                                                onClick={() => handleDeleteRecord(record)}
                                                            >
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
                                                            <Avatar className="h-9 w-9 border border-primary/10">
                                                                <AvatarImage src={record.user?.avatar} />
                                                                <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                                                                    {record.user?.first_name ? record.user.first_name.charAt(0) : (record.user?.name?.charAt(0) || "U")}
                                                                    {record.user?.last_name ? record.user.last_name.charAt(0) : ""}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 italic-not-really">
                                                                {record.user?.first_name ? `${record.user.first_name} ${record.user.last_name}` : (record.user?.name || "Unknown User")}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {formatTime24(record.time_in) || '--:--'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {(() => {
                                                            // Helper to calculate total minutes
                                                            const hasBreaks = record.breaks && record.breaks.length > 0;
                                                            let totalMinutes = 0;
                                                            let isOnBreak = false;

                                                            if (hasBreaks) {
                                                                record.breaks.forEach(b => {
                                                                    if (b.duration_minutes) {
                                                                        totalMinutes += b.duration_minutes;
                                                                    } else if (!b.break_end && b.break_start) {
                                                                        const isToday = new Date(session.date).toDateString() === new Date().toDateString();
                                                                        if (isToday) {
                                                                            isOnBreak = true;
                                                                            const start = new Date(b.break_start);
                                                                            const now = new Date();
                                                                            const diff = Math.floor((now - start) / 60000);
                                                                            totalMinutes += diff;
                                                                        }
                                                                        // If not today, we don't add ongoing time to minutes
                                                                    }
                                                                });
                                                            } else if (record.break_start) {
                                                                // Legacy fallback
                                                                const start = new Date(record.break_start);

                                                                // If session is old, don't use 'now' as it creates 7000+ min durations
                                                                const isToday = new Date(session.date).toDateString() === new Date().toDateString();
                                                                const end = record.break_end
                                                                    ? new Date(record.break_end)
                                                                    : (isToday ? new Date() : (record.time_out ? new Date(record.time_out) : start));

                                                                if (!record.break_end && isToday) isOnBreak = true;
                                                                totalMinutes = Math.floor((end - start) / 60000);
                                                            }

                                                            if (totalMinutes === 0 && !isOnBreak && !record.break_start) return <span className="text-muted-foreground">-</span>;

                                                            return (
                                                                <div className="flex flex-col items-center justify-center">
                                                                    {isOnBreak ? (
                                                                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 mb-1 text-[10px] px-1 py-0 h-5">
                                                                            On Break
                                                                        </Badge>
                                                                    ) : null}
                                                                    <span className={`font-mono text-xs ${isOnBreak ? 'font-bold text-amber-700' : ''}`}>
                                                                        {record.break_start && record.break_end
                                                                            ? `${formatTime24(record.break_start)} - ${formatTime24(record.break_end)}`
                                                                            : isOnBreak
                                                                                ? `${formatTime24(record.break_start)} - ...`
                                                                                : '-'
                                                                        }
                                                                    </span>
                                                                    {(totalMinutes > 0 || isOnBreak) && (
                                                                        <span className="text-[10px] text-muted-foreground mt-0.5 font-bold">
                                                                            ({totalMinutes > 0 ? totalMinutes : '0'}m)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
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
                                                                        setRecordToEdit(record);
                                                                        setEditDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Pencil className="mr-2 h-4 w-4" /> Edit Record
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => handleDeleteRecord(record)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
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

            {/* Lock Session Dialog */}
            <LockSessionDialog
                session={session}
                open={lockDialogOpen}
                onOpenChange={setLockDialogOpen}
                onConfirm={handleLockSession}
            />

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

            {/* Virtual Record Info Dialog */}
            <AlertDialog open={virtualRecordDialogOpen} onOpenChange={setVirtualRecordDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cannot Delete Pending Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            This is a placeholder for an active employee who hasn't checked in yet.
                            <br /><br />
                            This employee (<strong>{recordToDelete?.user?.first_name} {recordToDelete?.user?.last_name}</strong>) is currently listed as "Active" in the system.
                            To remove them from this list, you must <strong>deactivate</strong> or <strong>delete</strong> their account in the Employees section.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Close</AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Link href="/employees">
                                Go to Employees
                            </Link>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
}

