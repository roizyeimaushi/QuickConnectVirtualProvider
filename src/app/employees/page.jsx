"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { employeesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getInitials, debounce } from "@/lib/utils";
import {
    Search,
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    UserCheck,
    UserX,
    Users,
    Filter,
    Download,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

function EmployeeTableSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                </div>
            ))}
        </div>
    );
}

function StatsCardsSkeleton() {
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

export default function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteDialog, setDeleteDialog] = useState({ open: false, employee: null });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const perPage = 10;

    const router = useRouter();
    const { toast } = useToast();

    // Debounce search query
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);


    const fetchEmployees = async (search = "", isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const params = {
                search,
                status: 'active',
                page: currentPage,
                per_page: perPage
            };

            const response = await employeesApi.getAll(params);

            // Handle Pagination
            setEmployees(response.data || []);
            setTotalPages(response.last_page || 1);
            setTotalRecords(response.total || 0);

        } catch (error) {
            // Only show error toast on initial load, not during polling
            if (!isPolling) {
                console.error("Failed to fetch employees:", error);
                let errorMessage = "Failed to load employees";
                if (error?.status === 401) {
                    errorMessage = "Please log in to view employees";
                } else if (error?.status === 0) {
                    errorMessage = "Cannot connect to server. Please check if the backend is running.";
                } else if (error?.message) errorMessage = error.message;

                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            }
        } finally {
            if (!isPolling) setLoading(false);
            if (isFirstLoad) setIsFirstLoad(false);
        }
    };

    // Effect for Search & Page Changes
    useEffect(() => {
        fetchEmployees(debouncedSearchQuery, false);
    }, [debouncedSearchQuery, currentPage]);

    // Polling Effect
    useEffect(() => {
        const interval = setInterval(() => {
            // Only poll if no search query is active
            if (!searchQuery) {
                fetchEmployees(debouncedSearchQuery, true);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [debouncedSearchQuery, currentPage]);

    const handleSearch = (value) => {
        setSearchQuery(value);
        setCurrentPage(1); // Reset to page 1 on new search input
    };

    const handleDelete = async () => {
        if (!deleteDialog.employee) return;

        try {
            await employeesApi.delete(deleteDialog.employee.id);
            setEmployees((prev) => prev.filter((emp) => emp.id !== deleteDialog.employee.id));
            toast({
                title: "Employee deleted",
                description: `${deleteDialog.employee.first_name} ${deleteDialog.employee.last_name} has been removed.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete employee",
                variant: "destructive",
            });
        } finally {
            setDeleteDialog({ open: false, employee: null });
        }
    };

    const handleToggleStatus = async (employee) => {
        try {
            await employeesApi.toggleStatus(employee.id);
            setEmployees((prev) =>
                prev.map((emp) =>
                    emp.id === employee.id
                        ? { ...emp, status: emp.status === "active" ? "inactive" : "active" }
                        : emp
                )
            );

            toast({
                title: "Status updated",
                description: `${employee.first_name} is now ${employee.status === "active" ? "inactive" : "active"}.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update status",
                variant: "destructive",
                // variant: "destructive",
            });
        }
    };

    // Loading state is now handled by Skeletons in the main return check


    // Full-page logo loader for initial load only
    if (isFirstLoad) {
        return <FullscreenLoader />;
    }

    return (
        <DashboardLayout title="Employees">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
                        <p className="text-muted-foreground">
                            View and manage employee records.
                        </p>
                    </div>
                    <Button asChild className="w-full md:w-auto">
                        <Link href="/employees/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Employee
                        </Link>
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="p-3 rounded-lg bg-primary/10">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{employees.length}</p>
                                <p className="text-sm text-muted-foreground">Total Employees</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                <UserCheck className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {employees.filter((e) => e.status === "active").length}
                                </p>
                                <p className="text-sm text-muted-foreground">Active</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Link href="/employees/deactivated">
                        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                    <UserX className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">
                                        {employees.filter((e) => e.status === "inactive").length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Inactive</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Table Card */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Employee Directory</CardTitle>
                                <CardDescription>All registered employees in the system.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search employees..."
                                        className="pl-9 w-[250px]"
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {employees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No employees found</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {searchQuery
                                        ? "Try adjusting your search query"
                                        : "Get started by adding your first employee"}
                                </p>
                                {!searchQuery && (
                                    <Button asChild>
                                        <Link href="/employees/create">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Employee
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="block md:hidden space-y-3">
                                    {employees.map((employee) => (
                                        <div key={employee.id} className="border rounded-lg p-4 space-y-3">
                                            {/* Header: Avatar, Name, Actions */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <Avatar className="h-12 w-12 shrink-0">
                                                        <AvatarImage src={employee.avatar} />
                                                        <AvatarFallback className="bg-primary/10 text-primary">
                                                            {getInitials(employee.first_name, employee.last_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">
                                                            {employee.first_name} {employee.last_name}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => router.push(`/employees/edit/${employee.id}`)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleToggleStatus(employee)}>
                                                            {employee.status === "active" ? (
                                                                <>
                                                                    <UserX className="mr-2 h-4 w-4" />
                                                                    Deactivate
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                                    Activate
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => setDeleteDialog({ open: true, employee })}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Info Grid */}
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="bg-muted/50 rounded p-2">
                                                    <p className="text-xs text-muted-foreground">Employee ID</p>
                                                    <p className="font-mono font-medium">{employee.employee_id}</p>
                                                </div>
                                                <div className="bg-muted/50 rounded p-2">
                                                    <p className="text-xs text-muted-foreground">Status</p>
                                                    <Badge
                                                        variant={employee.status === "active" ? "default" : "secondary"}
                                                        className={
                                                            employee.status === "active"
                                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                                : ""
                                                        }
                                                    >
                                                        {employee.status}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div className="text-sm text-muted-foreground truncate">
                                                {employee.email}
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
                                                <TableHead>Email</TableHead>
                                                <TableHead className="text-center">Employee ID</TableHead>
                                                <TableHead className="text-center">Position</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                                <TableHead className="w-[70px] text-center">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {employees.map((employee) => (
                                                <TableRow key={employee.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9">
                                                                <AvatarImage src={employee.avatar} />
                                                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                                                    {getInitials(employee.first_name, employee.last_name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="text-left">
                                                                <p className="font-medium">
                                                                    {employee.first_name} {employee.last_name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {employee.email}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="font-mono">
                                                            {employee.employee_id}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">{employee.position}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant={employee.status === "active" ? "default" : "secondary"}
                                                            className={
                                                                employee.status === "active"
                                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                                    : ""
                                                            }
                                                        >
                                                            {employee.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                    <span className="sr-only">Open menu</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem
                                                                    onClick={() => router.push(`/employees/edit/${employee.id}`)}
                                                                >
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleToggleStatus(employee)}>
                                                                    {employee.status === "active" ? (
                                                                        <>
                                                                            <UserX className="mr-2 h-4 w-4" />
                                                                            Deactivate
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <UserCheck className="mr-2 h-4 w-4" />
                                                                            Activate
                                                                        </>
                                                                    )}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => setDeleteDialog({ open: true, employee })}
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
                            {totalRecords} employees
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

                {/* Delete Confirmation Dialog */}
                <AlertDialog
                    open={deleteDialog.open}
                    onOpenChange={(open) => setDeleteDialog({ open, employee: deleteDialog.employee })}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete{" "}
                                <strong>
                                    {deleteDialog.employee?.first_name} {deleteDialog.employee?.last_name}
                                </strong>
                                ? This action cannot be undone and will permanently remove all their records.
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
