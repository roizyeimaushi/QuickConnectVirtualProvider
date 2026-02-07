"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";

import { History } from "lucide-react";

export default function BreakHistoryPage() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <DashboardLayout title="Break History">
                <div className="space-y-6 animate-pulse">
                    <div className="space-y-2">
                        <Skeleton className="h-9 w-48 bg-slate-200/60" />
                        <Skeleton className="h-4 w-64 bg-slate-100/60" />
                    </div>
                    <Card>
                        <CardHeader className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-5 bg-slate-100/60" />
                                <Skeleton className={`h-6 ${i => i % 2 === 0 ? 'w-32' : 'w-28'} bg-slate-100/60`} />
                            </div>
                            <Skeleton className={`h-4 ${i => i % 2 === 0 ? 'w-64' : 'w-56'} bg-slate-100/40`} />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-9 w-9 rounded-full bg-slate-200/40" />
                                            <div className="space-y-2">
                                                <Skeleton className={`h-4 ${i % 3 === 0 ? 'w-24' : i % 3 === 1 ? 'w-28' : 'w-20'} bg-slate-200/40`} />
                                                <Skeleton className={`h-3 ${i % 2 === 0 ? 'w-16' : 'w-14'} bg-slate-100/30`} />
                                            </div>
                                        </div>
                                        <Skeleton className={`h-6 ${i % 2 === 0 ? 'w-20' : 'w-16'} rounded-full bg-slate-100/30`} />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Break History">
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Break History</h1>
                    <p className="text-muted-foreground">
                        View historical break records for all employees
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            Break Records
                        </CardTitle>
                        <CardDescription>
                            Complete history of employee breaks
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            null
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <History className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No records found</h3>
                                <p className="text-sm text-muted-foreground">
                                    No break history available yet
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
