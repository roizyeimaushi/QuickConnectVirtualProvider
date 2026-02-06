"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LockSessionDialog } from "@/components/attendance/lock-session-dialog";

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
import { sessionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime24 } from "@/lib/utils";
import {
    Plus,
    MoreHorizontal,
    Lock,
    Unlock,
    Calendar,
    Clock,
    Users,
    CheckCircle2,
    AlertCircle,
    Timer,
    Trash2,
    Eye,
    Pencil,
} from "lucide-react";



export default function AttendanceSessionsPage() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lockDialog, setLockDialog] = useState({ open: false, session: null });
    const [unlockDialog, setUnlockDialog] = useState({ open: false, session: null });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, session: null });
    const { toast } = useToast();

    useEffect(() => {
        const fetchSessions = async (isPolling = false) => {
            try {
                if (!isPolling) setLoading(true); // Show loader on initial load or manual refresh
                const response = await sessionsApi.getAll();
                // Check pagination structure: response.data is the array if using Laravel paginate()
                const data = response.data || response;
                const sessionsData = (Array.isArray(data) ? data : data.data || []).map(s => ({
                    id: s.id,
                    date: s.date,
                    schedule: s.schedule ? {
                        name: s.schedule.name,
                        time_in: s.schedule.time_in,
                        time_out: s.schedule.time_out,
                    } : null,
                    status: s.status,
                    confirmed_count: s.confirmed_count || 0,
                    total_employees: s.total_employees_count || 0,
                }));
                setSessions(sessionsData);
            } catch (error) {
                const errorMessage = error?.message ||
                    (error && Object.keys(error).length > 0 ? JSON.stringify(error) : 'Unknown error');
                console.error("Failed to fetch sessions:", errorMessage);
                toast({
                    title: "Error",
                    description: errorMessage || "Failed to load sessions",
                    variant: "destructive",
                });
            } finally {
                if (!isPolling) setLoading(false);
            }
        };

        fetchSessions();
        // Fallback polling every 60 seconds (WebSocket handles real-time updates)
        const interval = setInterval(() => fetchSessions(true), 60000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLockSession = async (lockData) => {
        if (!lockDialog.session) return;

        try {
            await sessionsApi.lock(lockDialog.session.id, lockData);
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === lockDialog.session.id ? { ...s, status: "locked" } : s
                )
            );

            toast({
                title: "Session locked",
                description: "The attendance session has been finalized and locked.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to lock session",
                variant: "destructive",
            });
        } finally {
            setLockDialog({ open: false, session: null });
        }
    };

    const handleUnlockSession = async () => {
        if (!unlockDialog.session) return;

        try {
            await sessionsApi.unlock(unlockDialog.session.id);
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === unlockDialog.session.id ? { ...s, status: "active" } : s
                )
            );

            toast({
                title: "Session unlocked",
                description: "The attendance session has been unlocked.",
                variant: "success",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to unlock session",
                variant: "destructive",
            });
        } finally {
            setUnlockDialog({ open: false, session: null });
        }
    };

    const handleDeleteSession = async () => {
        if (!deleteDialog.session) return;

        try {
            await sessionsApi.delete(deleteDialog.session.id);
            setSessions((prev) => prev.filter((s) => s.id !== deleteDialog.session.id));

            toast({
                title: "Session deleted",
                description: "The attendance session has been deleted permanently.",
                variant: "success",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete session",
                variant: "destructive",
            });
        } finally {
            setDeleteDialog({ open: false, session: null });
        }
    };

    const statusConfig = {
        active: {
            label: "Live",
            color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 shadow-sm font-semibold",
            icon: Timer,
        },
        completed: {
            label: "Awaiting Review",
            color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 font-medium",
            icon: CheckCircle2,
        },
        locked: {
            label: "Finalized",
            color: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 font-medium",
            icon: Lock,
        },
        pending: {
            label: "Upcoming",
            color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
            icon: Calendar,
        },
    };

    const activeSession = sessions.find((s) => s.status === "active");

    return (
        <DashboardLayout title="Attendance Sessions">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Attendance Sessions</h1>
                        <p className="text-muted-foreground">
                            Create and manage daily attendance sessions.
                        </p>
                    </div>
                    <Button asChild className="w-full md:w-auto">
                        <Link href="/attendance/sessions/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Session
                        </Link>
                    </Button>
                </div>

                {/* Active Session Card */}
                {loading && sessions.length === 0 ? (
                    <Card className="animate-fade-in">
                        <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-lg" />
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <Skeleton className="h-10 w-16" />
                                <Skeleton className="h-10 w-16" />
                                <Skeleton className="h-9 w-24" />
                            </div>
                        </CardContent>
                    </Card>
                ) : activeSession ? (
                    <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 animate-fade-in">
                        <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold">Active Session</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {activeSession.schedule?.name} • {formatDate(activeSession.date, "MMMM d, yyyy")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-emerald-600">
                                        {activeSession.confirmed_count}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Confirmed</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-muted-foreground">
                                        {Math.max(0, activeSession.total_employees - activeSession.confirmed_count)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Pending</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                >
                                    <Link href={`/attendance/sessions/${activeSession.id}`}>
                                        <Users className="mr-2 h-4 w-4" />
                                        Monitior
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                {/* Stats Cards */}
                {loading && sessions.length === 0 ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i}>
                                <CardContent className="flex items-center gap-4 p-6">
                                    <Skeleton className="h-12 w-12 rounded-lg" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-16" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-3 animate-fade-in stagger-1">
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 rounded-lg bg-primary/10">
                                    <Calendar className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{sessions.length}</p>
                                    <p className="text-sm text-muted-foreground">Total Sessions</p>
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
                                        {sessions.filter((s) => s.status === "completed").length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900/30">
                                    <Lock className="h-6 w-6 text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">
                                        {sessions.filter((s) => s.status === "locked").length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Locked</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Sessions Table */}
                <Card className="animate-fade-in stagger-2">
                    <CardHeader>
                        <CardTitle>Session History</CardTitle>
                        <CardDescription>All past and current attendance sessions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && sessions.length === 0 ? (
                            <div className="space-y-4">
                                <div className="hidden md:block">
                                    <div className="border rounded-md">
                                        <div className="p-0">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="p-4 border-b last:border-0">
                                                    <div className="grid grid-cols-6 gap-4 items-center">
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-4 w-full" />
                                                        <Skeleton className="h-6 w-16 mx-auto" />
                                                        <Skeleton className="h-8 w-8 rounded-md mx-auto" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="md:hidden space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex justify-between">
                                                <Skeleton className="h-4 w-32" />
                                                <Skeleton className="h-6 w-16" />
                                            </div>
                                            <Skeleton className="h-10 w-full" />
                                            <Skeleton className="h-8 w-full" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No sessions yet</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Create your first attendance session to get started
                                </p>
                                <Button asChild>
                                    <Link href="/attendance/sessions/create">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Session
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="block md:hidden space-y-3">
                                    {sessions.map((session) => {
                                        const status = statusConfig[session.status] || statusConfig.pending;
                                        const StatusIcon = status.icon;
                                        const attendanceRate = Math.round(
                                            (session.confirmed_count / session.total_employees) * 100
                                        ) || 0;

                                        return (
                                            <div key={session.id} className="border rounded-lg p-4 space-y-3">
                                                {/* Header: Date + Status */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-muted">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{formatDate(session.date, "MMM d, yyyy")}</p>
                                                            <p className="text-xs text-muted-foreground">{formatDate(session.date, "EEEE")}</p>
                                                        </div>
                                                    </div>
                                                    <Badge className={status.color}>
                                                        <StatusIcon className="mr-1 h-3 w-3" />
                                                        {status.label}
                                                    </Badge>
                                                </div>

                                                {/* Schedule & Time */}
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="bg-muted/50 rounded p-2">
                                                        <p className="text-xs text-muted-foreground">Schedule</p>
                                                        <p className="font-medium truncate">{session.schedule?.name}</p>
                                                    </div>
                                                    <div className="bg-muted/50 rounded p-2">
                                                        <p className="text-xs text-muted-foreground">Time</p>
                                                        <p className="font-mono text-xs">
                                                            {formatTime24(session.schedule?.time_in)} - {formatTime24(session.schedule?.time_out)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Attendance Progress */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Attendance</span>
                                                        <span className="font-medium">{session.confirmed_count}/{session.total_employees}</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary transition-all"
                                                            style={{ width: `${attendanceRate}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2 pt-2 border-t">
                                                    <Button asChild variant="outline" size="sm" className="flex-1">
                                                        <Link href={`/attendance/sessions/${session.id}`}>
                                                            <Users className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </Link>
                                                    </Button>
                                                    {session.status === "active" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setLockDialog({ open: true, session })}
                                                        >
                                                            <Lock className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {session.status === "locked" && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setUnlockDialog({ open: true, session })}
                                                        >
                                                            <Unlock className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => setDeleteDialog({ open: true, session })}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
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
                                                <TableHead>Date</TableHead>
                                                <TableHead>Schedule</TableHead>
                                                <TableHead className="text-center">Time</TableHead>
                                                <TableHead className="text-center">Attendance</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                                <TableHead className="w-[70px] text-center">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sessions.map((session) => {
                                                const status = statusConfig[session.status] || statusConfig.pending;
                                                const StatusIcon = status.icon;
                                                const attendanceRate = Math.round(
                                                    (session.confirmed_count / session.total_employees) * 100
                                                ) || 0;

                                                return (
                                                    <TableRow key={session.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{formatDate(session.date, "MMM d, yyyy")}</span>
                                                                    <span className="text-xs text-muted-foreground">{formatDate(session.date, "EEEE")}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-medium">{session.schedule?.name}</span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2 font-mono text-sm">
                                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                                {formatTime24(session.schedule?.time_in)} -{" "}
                                                                {formatTime24(session.schedule?.time_out)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-primary transition-all"
                                                                        style={{ width: `${attendanceRate}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-sm text-muted-foreground">
                                                                    {session.confirmed_count}/{session.total_employees}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={status.color}>
                                                                <StatusIcon className="mr-1 h-3 w-3" />
                                                                {status.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-[180px]">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                                                                    <DropdownMenuItem asChild>
                                                                        <Link href={`/attendance/sessions/${session.id}`} className="flex w-full items-center">
                                                                            <Eye className="mr-2 h-4 w-4" />
                                                                            View Attendance
                                                                        </Link>
                                                                    </DropdownMenuItem>

                                                                    <DropdownMenuItem disabled>
                                                                        <Pencil className="mr-2 h-4 w-4" />
                                                                        Edit Session
                                                                    </DropdownMenuItem>

                                                                    {session.status === "completed" && (
                                                                        <DropdownMenuItem onClick={() => setLockDialog({ open: true, session })}>
                                                                            <Lock className="mr-2 h-4 w-4" />
                                                                            Lock Session
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    {session.status === "locked" && (
                                                                        <DropdownMenuItem onClick={() => setUnlockDialog({ open: true, session })}>
                                                                            <Unlock className="mr-2 h-4 w-4" />
                                                                            Unlock Session
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    <DropdownMenuSeparator />

                                                                    <DropdownMenuItem
                                                                        onClick={() => setDeleteDialog({ open: true, session })}
                                                                        className="text-destructive focus:text-destructive"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Delete Session
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Lock Confirmation Dialog */}
                <LockSessionDialog
                    open={lockDialog.open}
                    onOpenChange={(open) => setLockDialog({ open, session: lockDialog.session })}
                    session={lockDialog.session}
                    onConfirm={handleLockSession}
                />

                {/* Unlock Confirmation Dialog */}
                <AlertDialog
                    open={unlockDialog.open}
                    onOpenChange={(open) => setUnlockDialog({ open, session: unlockDialog.session })}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Unlock Session</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to unlock this session? This will allow attendance
                                confirmations again for{" "}
                                <strong>{formatDate(unlockDialog.session?.date, "MMMM d, yyyy")}</strong>.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleUnlockSession}>
                                <Unlock className="mr-2 h-4 w-4" />
                                Unlock Session
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, session: deleteDialog.session })}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Session</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to permanently delete this session?
                                <br /><br />
                                <strong>Date: {formatDate(deleteDialog.session?.date, "MMMM d, yyyy")}</strong>
                                <br />
                                <strong>Schedule: {deleteDialog.session?.schedule?.name}</strong>
                                <br /><br />
                                <span className="text-destructive font-semibold">Warning: This will delete ALL attendance records associated with this session. This action cannot be undone.</span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteSession}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Session
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DashboardLayout>
    );
}
