"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { attendanceApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatTime24, getInitials, formatDate } from "@/lib/utils";
import {
    Timer,
    Clock,
    User,
    AlertTriangle,
    checkCircle2
} from "lucide-react";



export default function BreakMonitorPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [activeBreaks, setActiveBreaks] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    const fetchActiveBreaks = async (isPolling = false) => {
        try {
            if (!isPolling) setLoading(true); // Ensure spinner shows up on manual fetch/refresh
            // Fetch all records - ideally filtered by date=today and status 
            // Since we don't have a specific 'active-breaks' endpoint yet, we fetch all 
            // and filter client side. In prod, this should be optimized.
            const response = await attendanceApi.getAll();
            const allRecords = response.data || [];

            // Filter for records where break_start is set key AND break_end is null
            const onBreak = allRecords.filter(record =>
                record.break_start && !record.break_end && !record.time_out
            ).map(record => ({
                id: record.id,
                employee: record.user ? {
                    name: record.user.name || `${record.user.first_name} ${record.user.last_name}`,
                    avatar: record.user.avatar,
                    position: record.user.position,
                } : { name: "Unknown" },
                break_start: record.break_start,
                session_date: record.session?.date || record.created_at,
            }));

            setActiveBreaks(onBreak);
        } catch (error) {
            const errorMessage = error?.message ||
                (error && Object.keys(error).length > 0 ? JSON.stringify(error) : 'Unknown error');
            console.error("Failed to fetch active breaks:", errorMessage);
            toast({
                title: "Error",
                description: errorMessage || "Failed to load active breaks",
                variant: "destructive",
            });
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveBreaks();
        // Fallback polling every 30 seconds (WebSocket handles real-time updates)
        const interval = setInterval(() => fetchActiveBreaks(true), 30000);
        return () => clearInterval(interval);
    }, []);

    // Update local timer for elapsed time display
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const calculateElapsed = (startTime) => {
        if (!startTime) return 0;
        const start = new Date(startTime); // Assumes ISO string or Date compatible
        // If start time has no date (just time), attach today's date? 
        // Backend usually sends full datetime or we need to handle it.
        // Assuming the backend sends a full timestamp or we construct one.
        // If it's just HH:mm:ss, we need to be careful. 
        // Let's assume it's parsable.

        // Debug check: simplistic handling if it's just time string 'HH:mm:ss'
        let startObj = new Date(startTime);
        if (isNaN(startObj.getTime())) {
            // Fallback if it's potentially just a time string on today's date
            const [hours, minutes] = startTime.split(':');
            const now = new Date();
            startObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        }

        const diff = currentTime - startObj;
        return Math.floor(diff / 60000); // Minutes
    };

    const handleEndBreak = async (recordId) => {
        try {
            await attendanceApi.endBreak(recordId);
            toast({
                title: "Success",
                description: "Force ended employee break",
                variant: "success",
            });
            fetchActiveBreaks(); // Refresh immediately
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to end break",
                variant: "destructive",
            });
        }
    };

    return (
        <DashboardLayout title="Break Time Monitor">
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Break Time Monitor</h1>
                        <p className="text-muted-foreground">
                            Live dashboard of employees currently on break
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                                <Timer className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{activeBreaks.length}</p>
                                <p className="text-sm text-muted-foreground">Employees on Break</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Active Breaks</CardTitle>
                        <CardDescription>Real-time break tracking</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading && activeBreaks.length === 0 ? (
                            null
                        ) : activeBreaks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No active breaks</h3>
                                <p className="text-sm text-muted-foreground">
                                    All checked-in employees are currently working
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center">Employee</TableHead>
                                            <TableHead className="text-center">Shift Date</TableHead>
                                            <TableHead className="text-center">Break Start</TableHead>
                                            <TableHead className="text-center">Time Elapsed</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activeBreaks.map((breakRecord) => {
                                            const elapsed = calculateElapsed(breakRecord.break_start);
                                            const isOvertime = elapsed > 60; // Assuming 60 min allowence
                                            return (
                                                <TableRow key={breakRecord.id}>
                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-3">
                                                            <Avatar className="h-9 w-9">
                                                                <AvatarImage src={breakRecord.employee.avatar} />
                                                                <AvatarFallback>{getInitials(breakRecord.employee.name)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="text-left">
                                                                <p className="font-medium">{breakRecord.employee.name}</p>
                                                                <p className="text-xs text-muted-foreground">{breakRecord.employee.position || 'Employee'}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center text-sm text-muted-foreground">
                                                        {formatDate(breakRecord.session_date)}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {formatTime24(breakRecord.break_start)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`font-bold font-mono ${isOvertime ? 'text-red-600' : 'text-primary'}`}>
                                                                {elapsed} min
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                / 60 min
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {isOvertime ? (
                                                            <Badge variant="destructive" className="flex w-fit mx-auto items-center gap-1">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                Overtime
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex w-fit mx-auto items-center gap-1">
                                                                <Timer className="h-3 w-3" />
                                                                On Break
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleEndBreak(breakRecord.id)}
                                                        >
                                                            End Break
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
