"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
