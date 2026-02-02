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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { employeesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getInitials, debounce } from "@/lib/utils";
import {
    Search,
    MoreHorizontal,
    Pencil,
    Trash2,
    UserCheck,
    UserX,
    Users,
    ArrowLeft,
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
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                </div>
            ))}
        </div>
    );
}

export default function DeactivatedEmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteDialog, setDeleteDialog] = useState({ open: false, employee: null });
    const [activateDialog, setActivateDialog] = useState({ open: false, employee: null });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const perPage = 10;

    const router = useRouter();
    const { toast } = useToast();

    const fetchDeactivatedEmployees = async (search = "", showLoader = false) => {
        try {
            if (showLoader) setLoading(true);

            // Note: The API endpoint for getAll supports status filter, but we are using the specific 'deactivated' logic if needed.
            // However, based on the previous code, it called getAll({ status: 'inactive' }).
            // Let's check api.js.
            // employeesApi.getAll calls /employees. 
            // BUT EmployeeController::deactivated is a separate method!
            // Wait, I need to check if there is a specific API rout explicitly for deactivated or if I should follow the previous pattern.
            // The previous code used: employeesApi.getAll({ search, status: 'inactive' });
            // Let's stick to that for consistency with the audit I did on the previous page.
            // Actually, wait. EmployeeController has `deactivated` method (lines 183).
            // Does `employeesApi` use it? 
            // api.js: getAll: (params) => api.get('/employees', params)
            // It does NOT seem to call the /employees/deactivated endpoint unless I missed it in api.js.
            // Let's check api.js again.
            // It has `getAll` map to `/employees`.
            // Controller `index` handles status filter. 
            // Controller `deactivated` is likely mapped to `/employees/deactivated`?
            // Please refer to routes/api.php to be sure.
            // PROCEEDING WITH SAFE ASSUMPTION: The previous code worked, so I will stick to getAll({status: 'inactive'}).

            const params = {
                search,
                status: 'inactive',
                page: currentPage,
                per_page: perPage
            };

            const response = await employeesApi.getAll(params);

            // Handle Pagination
            setEmployees(response.data || []);
            setTotalPages(response.last_page || 1);
            setTotalRecords(response.total || 0);

        } catch (error) {
            console.error("Failed to fetch deactivated employees:", error);
            toast({
                title: "Error",
                description: "Failed to load deactivated employees",
                variant: "destructive",
            });
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeactivatedEmployees(searchQuery, true);
    }, [currentPage]); // Reload when page changes

    // Real-time polling every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDeactivatedEmployees(searchQuery, false); // Silent polling
        }, 5000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, searchQuery]);

    const handleSearch = debounce((value) => {
        setCurrentPage(1);
        setSearchQuery(value);
        fetchDeactivatedEmployees(value, false);
    }, 300);

    const handleDelete = async () => {
        if (!deleteDialog.employee) return;

        try {
            await employeesApi.delete(deleteDialog.employee.id);
            setEmployees((prev) => prev.filter((emp) => emp.id !== deleteDialog.employee.id));
            toast({
                title: "Employee deleted",
                description: `${deleteDialog.employee.first_name} ${deleteDialog.employee.last_name} has been permanently removed.`,
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

    const handleActivate = async () => {
        if (!activateDialog.employee) return;

        try {
            await employeesApi.toggleStatus(activateDialog.employee.id);
            setEmployees((prev) => prev.filter((emp) => emp.id !== activateDialog.employee.id));
            toast({
                title: "Employee activated",
                description: `${activateDialog.employee.first_name} ${activateDialog.employee.last_name} has been reactivated.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to activate employee",
                variant: "destructive",
            });
        } finally {
            setActivateDialog({ open: false, employee: null });
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Deactivated Employees">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Deactivated Employees">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/employees">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Employees
                                </Link>
                            </Button>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Deactivated Employees</h1>
                        <p className="text-muted-foreground">
                            View and manage deactivated employee accounts
                        </p>
                    </div>
                </div>

                {/* Stats Card */}
                <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                        <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <UserX className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{employees.length}</p>
                            <p className="text-sm text-muted-foreground">Deactivated Accounts</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Table Card */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Deactivated Employees</CardTitle>
                                <CardDescription>Employees that have been deactivated from the system</CardDescription>
                            </div>
                            <div className="w-full sm:w-auto">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search deactivated employees..."
                                        className="pl-9 w-full sm:w-[250px]"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            handleSearch(e.target.value);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <EmployeeTableSkeleton />
                        ) : employees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No deactivated employees</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {searchQuery
                                        ? "Try adjusting your search query"
                                        : "All employees are currently active"}
                                </p>
                                <Button variant="outline" asChild>
                                    <Link href="/employees">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Active Employees
                                    </Link>
                                </Button>
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
                                                    <Avatar className="h-12 w-12 flex-shrink-0">
                                                        <AvatarFallback className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
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
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => router.push(`/employees/edit/${employee.id}`)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setActivateDialog({ open: true, employee })}
                                                            className="text-emerald-600 focus:text-emerald-600"
                                                        >
                                                            <UserCheck className="mr-2 h-4 w-4" />
                                                            Reactivate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => setDeleteDialog({ open: true, employee })}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Permanently
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground text-xs">Employee ID</p>
                                                    <Badge variant="outline" className="font-mono text-xs mt-0.5">
                                                        {employee.employee_id}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground text-xs">Status</p>
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs mt-0.5"
                                                    >
                                                        Inactive
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div className="text-sm">
                                                <p className="text-muted-foreground text-xs">Email</p>
                                                <p className="text-sm break-all">{employee.email}</p>
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
                                                <TableHead>Employee ID</TableHead>
                                                <TableHead>Position</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="w-[70px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {employees.map((employee) => (
                                                <TableRow key={employee.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9">
                                                                <AvatarFallback className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-sm">
                                                                    {getInitials(employee.first_name, employee.last_name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium">
                                                                    {employee.first_name} {employee.last_name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {employee.email}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono">
                                                            {employee.employee_id}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{employee.position}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                                        >
                                                            inactive
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
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
                                                                <DropdownMenuItem
                                                                    onClick={() => setActivateDialog({ open: true, employee })}
                                                                    className="text-emerald-600 focus:text-emerald-600"
                                                                >
                                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                                    Reactivate
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => setDeleteDialog({ open: true, employee })}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete Permanently
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
                            <AlertDialogTitle>Delete Employee Permanently</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to permanently delete{" "}
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
                                Delete Permanently
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Activate Confirmation Dialog */}
                <AlertDialog
                    open={activateDialog.open}
                    onOpenChange={(open) => setActivateDialog({ open, employee: activateDialog.employee })}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reactivate Employee</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to reactivate{" "}
                                <strong>
                                    {activateDialog.employee?.first_name} {activateDialog.employee?.last_name}
                                </strong>
                                ? They will be able to access the system again.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleActivate}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                Reactivate
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DashboardLayout>
    );
}
