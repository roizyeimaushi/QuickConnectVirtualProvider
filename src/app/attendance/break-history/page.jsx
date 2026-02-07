"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Skeleton from "@/components/ui/skeleton";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { breakApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatTime24, getInitials, formatDate } from "@/lib/utils";
import {
    History,
    Calendar,
    User,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Edit,
    Trash2
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { EditBreakDialog } from "@/components/attendance/edit-break-dialog";
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
import { MoreHorizontal } from "lucide-react";



export default function BreakHistoryPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [groupedRecords, setGroupedRecords] = useState([]);
    const [forceUpdate, setForceUpdate] = useState(0);

    // Dialog States
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);

    const handleDeleteRecord = (id) => {
        setRecordToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;
        try {
            await breakApi.delete(recordToDelete);
            toast({
                title: "Deleted",
                description: "Break record deleted successfully",
                variant: "success",
            });
            fetchHistory(true); // silent refresh
        } catch (error) {
            console.error("Delete failed:", error);
            toast({
                title: "Error",
                description: "Failed to delete break record",
                variant: "destructive",
            });
        } finally {
            setDeleteDialogOpen(false);
            setRecordToDelete(null);
        }
    };

    // Helper for key
    const formatDateKey = (dateStr) => {
        if (!dateStr) return 'unknown';
        const d = new Date(dateStr);
        return d.toISOString().split('T')[0];
    };

    // Helper for duration
    const calculateDuration = (start, end) => {
        if (!start) return 0;
        const s = new Date(start);
        const e = end ? new Date(end) : new Date();
        return Math.floor((e - s) / 60000); // Minutes
    };

    // 1. Fetch Function
    const fetchHistory = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await breakApi.getHistory({ per_page: 50 });
            const allRecords = response.data || response.data?.data || response;

            // Flat Map
            const safeRecords = Array.isArray(allRecords) ? allRecords : (allRecords.data || []);

            const processed = safeRecords.map(record => {
                // Determine duration
                let duration = record.duration_minutes;

                // If active (no end time), calculate live duration
                if (!record.break_end) {
                    duration = calculateDuration(record.break_start, new Date());
                } else if (!duration) {
                    // Completed but 0? Try recalc
                    duration = calculateDuration(record.break_start, record.break_end);
                }

                // Determine break type label
                let typeLabel = "Unknown Break";
                if (record.break_type) {
                    typeLabel = `${record.break_type} Break`;
                } else {
                    // Fallback heuristic for legacy data
                    typeLabel = (duration <= 20) ? "Coffee Break" : "Meal Break";
                }

                // Status
                let status = 'completed';
                if (!record.break_end) {
                    status = 'ongoing';
                }

                return {
                    id: record.id,
                    employee: {
                        name: record.user ? (record.user.name || `${record.user.first_name} ${record.user.last_name}`) : "Unknown",
                        avatar: record.user?.avatar,
                        position: record.user?.position || 'Employee',
                    },
                    date: record.break_date || record.attendance?.attendance_date || record.created_at,
                    schedule: record.attendance?.session?.schedule?.name || "Regular Shift",
                    type: typeLabel,
                    duration: duration,
                    status: status.toLowerCase(),
                    break_start: record.break_start,
                    break_end: record.break_end,
                    break_type: record.break_type // raw type for editing
                };
            }).sort((a, b) => new Date(b.break_start) - new Date(a.break_start));

            setGroupedRecords(processed);

        } catch (error) {
            console.error("Failed to fetch break history:", error);
            if (!silent) {
                toast({
                    title: "Error",
                    description: "Failed to load break history",
                    variant: "destructive",
                });
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // 2. Initial Fetch
    useEffect(() => {
        fetchHistory(); // Initial fetch
    }, []);

    // 3. Live Timer Update
    useEffect(() => {
        const timer = setInterval(() => {
            setGroupedRecords(prev => {
                return prev.map(rec => {
                    if (rec.status === 'ongoing') {
                        const newDur = calculateDuration(rec.break_start, new Date());
                        return { ...rec, duration: newDur };
                    }
                    return rec;
                });
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Loading state is now handled by Skeletons in the main return check

    return (
        <DashboardLayout title="Break History">
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Break History</h1>
                        <p className="text-muted-foreground">
                            All recorded break sessions
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Break Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4 animate-pulse">
                                {/* Desktop Tablet Skeleton */}
                                <div className="hidden md:block">
                                    <div className="border rounded-md">
                                        {[...Array(8)].map((_, i) => (
                                            <div key={i} className="p-4 border-b last:border-0 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 w-1/4">
                                                    <Skeleton className="h-9 w-9 rounded-full bg-slate-200/60" />
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-4 w-24 bg-slate-200/60" />
                                                        <Skeleton className="h-3 w-16 bg-slate-100/40" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-4 w-24 bg-slate-100/40" />
                                                <Skeleton className="h-4 w-20 bg-slate-200/40" />
                                                <Skeleton className="h-4 w-16 bg-slate-100/40" />
                                                <Skeleton className="h-4 w-16 bg-slate-100/40" />
                                                <Skeleton className="h-4 w-12 bg-slate-200/60" />
                                                <Skeleton className="h-6 w-16 rounded-full bg-slate-100/40" />
                                                <Skeleton className="h-8 w-8 rounded-md bg-slate-100/30" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Mobile Cards Skeleton */}
                                <div className="md:hidden space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <Card key={i} className="p-4 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-10 w-10 rounded-full bg-slate-200/60" />
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-4 w-24 bg-slate-200/60" />
                                                        <Skeleton className="h-3 w-16 bg-slate-100/40" />
                                                    </div>
                                                </div>
                                                <Skeleton className="h-6 w-16 rounded-full bg-slate-200/60" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pb-2 border-b">
                                                <Skeleton className="h-8 w-full bg-slate-100/40" />
                                                <Skeleton className="h-8 w-full bg-slate-100/40" />
                                            </div>
                                            <Skeleton className="h-10 w-full bg-slate-100/30" />
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ) : groupedRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <History className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No break records found</h3>
                                <p className="text-sm text-muted-foreground">
                                    No break activities have been recorded yet.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="grid grid-cols-1 gap-4 md:hidden">
                                    {groupedRecords.map((record) => (
                                        <Card key={record.id}>
                                            <CardContent className="p-4 space-y-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10">
                                                            <AvatarImage src={record.employee.avatar} />
                                                            <AvatarFallback>{getInitials(record.employee.name)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{record.employee.name}</p>
                                                            <p className="text-xs text-muted-foreground">{record.employee.position}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {record.status === 'ongoing' || record.status === 'on break' ? (
                                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 animate-pulse">
                                                                ongoing
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                completed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-y-2 text-sm pt-2 border-t">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Shift Date</span>
                                                        <div className="flex items-center gap-1 font-medium">
                                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                            {formatDate(record.date)}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Type</span>
                                                        <div className="flex items-center gap-1 font-medium">
                                                            {record.type}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Start</span>
                                                        <div className="font-mono font-medium">{formatTime24(record.break_start)}</div>
                                                    </div>
                                                    <div className="flex flex-col gap-1 text-right">
                                                        <span className="text-muted-foreground text-xs uppercase tracking-wider">End</span>
                                                        <div className="font-mono font-medium">{formatTime24(record.break_end) || '--:--'}</div>
                                                    </div>
                                                    <div className="flex flex-col gap-1 col-span-2">
                                                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Duration</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-bold text-slate-900 border-b border-dashed border-slate-300">
                                                                {record.duration} min
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {user?.role === 'admin' && (
                                                    <div className="pt-2 border-t mt-2">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" size="sm" className="w-full">
                                                                    <MoreHorizontal className="h-4 w-4 mr-2" />
                                                                    Manage Break
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-[180px]">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setEditingRecord(record);
                                                                        setIsEditDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Edit className="h-4 w-4 mr-2 text-muted-foreground" />
                                                                    Edit Break
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => handleDeleteRecord(record.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Delete Record
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {user?.role === 'admin' && <TableHead>Employee</TableHead>}
                                                <TableHead>Shift Date</TableHead>
                                                <TableHead className="text-center">Schedule</TableHead>
                                                <TableHead className="text-center">Start</TableHead>
                                                <TableHead className="text-center">End</TableHead>
                                                <TableHead className="text-center">Duration</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                                {user?.role === 'admin' && <TableHead className="text-center">Actions</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedRecords.map((record) => (
                                                <TableRow key={record.id}>
                                                    {user?.role === 'admin' && (
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-9 w-9">
                                                                    <AvatarImage src={record.employee.avatar} />
                                                                    <AvatarFallback>{getInitials(record.employee.name)}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="text-left">
                                                                    <p className="font-medium">{record.employee.name}</p>
                                                                    <p className="text-xs text-muted-foreground">{record.employee.position}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    )}
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            <span>{formatDate(record.date)}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">
                                                        {record.schedule}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {formatTime24(record.break_start)}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {formatTime24(record.break_end) || '--:--'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="font-bold text-slate-700">
                                                            {record.duration}m
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {record.status === 'ongoing' || record.status === 'on break' ? (
                                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 animate-pulse">
                                                                ongoing
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                completed
                                                            </Badge>
                                                        )}
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
                                                                        Edit Break
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
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

            </div>
            <EditBreakDialog
                record={editingRecord}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSuccess={() => fetchHistory(true)}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this break record. This action cannot be undone.
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
        </DashboardLayout>
    );
}
