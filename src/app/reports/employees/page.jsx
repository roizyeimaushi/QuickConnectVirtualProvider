"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // Import Link
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { employeesApi } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { getInitials } from "@/lib/utils";
import {
    Search,
    Download,
    FileText,
    Briefcase,
    ArrowRight
} from "lucide-react";

export default function EmployeeReportsPage() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace("/auth/admin/login");
            } else if (!isAdmin) {
                router.replace("/dashboard/employee");
            }
        }
    }, [authLoading, user, isAdmin, router]);

    const fetchEmployees = useCallback(async () => {
        if (authLoading || !isAdmin) return;

        try {
            setLoading(true);
            const response = await employeesApi.getAll({ status: 'active', per_page: 100 });
            // API returns paginated response usually: { data: [...], ... } or direct array if not paginated
            const data = Array.isArray(response.data) ? response.data : (response.data?.data || []);
            setEmployees(data);
        } catch (error) {
            const errorMessage = error?.message ||
                (error && Object.keys(error).length > 0 ? JSON.stringify(error) : 'Unknown error');
            if (process.env.NODE_ENV === 'development') {
                console.error("Failed to fetch employees:", errorMessage);
            }
        } finally {
            setLoading(false);
        }
    }, [authLoading, isAdmin]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const filteredEmployees = employees.filter((emp) => {
        const query = search.toLowerCase();
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        return fullName.includes(query) ||
            (emp.employee_id && emp.employee_id.toLowerCase().includes(query)) ||
            (emp.position && emp.position.toLowerCase().includes(query));
    });

    return (
        <DashboardLayout title="Employee Reports">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Employee Reports</h1>
                        <p className="text-muted-foreground">
                            Individual attendance performance and history
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, ID or position..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Employee Cards */}
                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i} className="animate-pulse">
                                <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-muted"></div>
                                            <div className="space-y-2">
                                                <div className="h-4 w-32 bg-muted rounded"></div>
                                                <div className="h-3 w-16 bg-muted rounded"></div>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-4 w-24 bg-muted rounded mb-4"></div>
                                    <div className="h-10 w-full bg-muted rounded"></div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium">No employees found</h3>
                            <p className="text-muted-foreground mt-1">
                                Try adjusting your search query
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredEmployees.map((employee) => (
                            <Card key={employee.id} className="hover:shadow-md transition-shadow group flex flex-col">
                                <CardHeader className="pb-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 border">
                                                <AvatarImage src={employee.avatar} alt={employee.first_name} />
                                                <AvatarFallback className="bg-primary/5 text-primary">
                                                    {getInitials(employee.first_name, employee.last_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-base">
                                                    {employee.first_name} {employee.last_name}
                                                </CardTitle>
                                                <CardDescription className="flex items-center gap-1 mt-1">
                                                    <span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
                                                        {employee.employee_id}
                                                    </span>
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                        <Briefcase className="h-4 w-4" />
                                        {employee.position || "No position"}
                                    </div>
                                    <Button asChild className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="outline">
                                        <Link href={`/reports/employees/${employee.employee_id}`}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            View Report
                                            <ArrowRight className="ml-2 h-4 w-4 opacity-50" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
