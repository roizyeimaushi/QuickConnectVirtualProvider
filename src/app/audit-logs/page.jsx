"use client";

import { useState, useEffect } from "react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auditApi } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { formatDateTime, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    FileText,
    Search,
    Filter,
    User,
    UserPlus,
    UserMinus,
    Settings,
    Calendar,
    Clock,
    Shield,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    XCircle,
    CheckCircle2,
    Monitor,
    Smartphone,
    Tablet,
    Globe,
    Eye,
    AlertOctagon,
    ShieldAlert,
    Activity,
    Lock,
} from "lucide-react";



// Device icon component
const DeviceIcon = ({ type }) => {
    switch (type) {
        case "mobile":
            return <Smartphone className="h-4 w-4" />;
        case "tablet":
            return <Tablet className="h-4 w-4" />;
        default:
            return <Monitor className="h-4 w-4" />;
    }
};

// Status badge component
const StatusBadge = ({ status }) => {
    const config = {
        success: { color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
        failed: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
        warning: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: AlertTriangle },
    };
    const cfg = config[status] || config.success;
    const Icon = cfg.icon;

    return (
        <Badge className={cfg.color}>
            <Icon className="mr-1 h-3 w-3" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
    );
};

// Severity badge component
const SeverityBadge = ({ severity }) => {
    const config = {
        critical: { color: "bg-red-500 text-white", icon: AlertOctagon },
        high: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", icon: ShieldAlert },
        medium: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: AlertTriangle },
        low: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Activity },
        info: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", icon: FileText },
    };
    const cfg = config[severity] || config.info;
    const Icon = cfg.icon;

    return (
        <Badge className={cfg.color}>
            <Icon className="mr-1 h-3 w-3" />
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </Badge>
    );
};

export default function AuditLogsPage() {
    const { user, loading: authLoading, isAdmin } = useAuth();
    const router = useRouter();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [severityFilter, setSeverityFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const logsPerPage = 15;

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace("/auth/admin/login");
            } else if (!isAdmin) {
                router.replace("/dashboard/employee");
            }
        }
    }, [authLoading, user, isAdmin, router]);

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);

    const [isFirstLoad, setIsFirstLoad] = useState(true);

    const fetchLogs = async (isPolling = false) => {
        // Only fetch if user is authenticated and is admin
        if (authLoading || !isAdmin) return;

        // Only show loader on first load to prevent flashing during search
        if (isFirstLoad && !isPolling) setLoading(true);

        try {
            const params = { search: debouncedSearchQuery };

            // Apply tab-based filtering
            if (activeTab === "failed") {
                params.failed_only = true;
            } else if (activeTab === "critical") {
                params.critical_only = true;
            }

            const response = await auditApi.getAll(params);
            const logsData = response.data || [];
            setLogs(logsData.map(log => ({
                id: log.id,
                user: log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System',
                userFirstName: log.user?.first_name || 'S',
                userLastName: log.user?.last_name || 'Y',
                userRole: log.user?.role || 'system',
                userAvatar: log.user?.avatar || null,
                action: log.action,
                description: log.description,
                status: log.status || 'success',
                severity: log.severity || 'info',
                created_at: log.created_at,
                ip_address: log.ip_address || 'N/A',
                device_type: log.device_type || 'desktop',
                browser: log.browser,
                browser_version: log.browser_version,
                os: log.os,
                os_version: log.os_version,
                user_agent: log.user_agent,
                old_values: log.old_values,
                new_values: log.new_values,
                transaction_id: log.transaction_id,
                session_id: log.session_id,
            })));
        } catch (error) {
            const errorMessage = error?.message ||
                (error && Object.keys(error).length > 0 ? JSON.stringify(error) : 'Unknown error');
            console.error("Failed to fetch logs:", errorMessage);
            if (!isPolling) setLogs([]);
        } finally {
            if (!isPolling) {
                setLoading(false);
                setIsFirstLoad(false);
            }
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [debouncedSearchQuery, authLoading, isAdmin, activeTab]);

    // Real-time polling every 5 seconds
    useEffect(() => {
        if (authLoading || !isAdmin) return;

        const interval = setInterval(() => {
            fetchLogs(true); // Silent polling
        }, 5000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchQuery, authLoading, isAdmin, activeTab]);

    const actionConfig = {
        create_employee: { label: "Create Employee", icon: UserPlus, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
        update_employee: { label: "Update Employee", icon: User, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
        delete_employee: { label: "Delete Employee", icon: UserMinus, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
        deactivate_employee: { label: "Deactivate", icon: UserMinus, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
        activate_employee: { label: "Activate", icon: UserPlus, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
        create_session: { label: "Create Session", icon: Calendar, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
        lock_session: { label: "Lock Session", icon: Lock, color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
        unlock_session: { label: "Unlock Session", icon: Clock, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
        create_schedule: { label: "Create Schedule", icon: Settings, color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400" },
        update_schedule: { label: "Update Schedule", icon: Settings, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
        delete_schedule: { label: "Delete Schedule", icon: Settings, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
        export_report: { label: "Export Report", icon: FileText, color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
        login: { label: "Login", icon: Shield, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
        logout: { label: "Logout", icon: Shield, color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
        login_failed: { label: "Login Failed", icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
        login_rate_limited: { label: "Rate Limited", icon: AlertOctagon, color: "bg-red-500 text-white" },
        password_change: { label: "Password Change", icon: Lock, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
        system_restore: { label: "System Restore", icon: AlertOctagon, color: "bg-red-500 text-white" },
        system_reset: { label: "System Reset", icon: AlertOctagon, color: "bg-red-500 text-white" },
    };

    const filteredLogs = logs.filter((log) => {
        // Filter by action
        if (actionFilter !== "all" && log.action !== actionFilter) {
            return false;
        }
        // Filter by status
        if (statusFilter !== "all" && log.status !== statusFilter) {
            return false;
        }
        // Filter by severity
        if (severityFilter !== "all" && log.severity !== severityFilter) {
            return false;
        }
        return true;
    });

    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * logsPerPage,
        currentPage * logsPerPage
    );

    const handleViewDetails = (log) => {
        setSelectedLog(log);
        setDetailsOpen(true);
    };

    // Calculate stats from logs
    const stats = {
        total: logs.length,
        successful: logs.filter(l => l.status === "success").length,
        failed: logs.filter(l => l.status === "failed").length,
        critical: logs.filter(l => ["high", "critical"].includes(l.severity)).length,
    };



    return (
        <DashboardLayout title="Audit Logs">
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground">
                        Track all system activities with detailed security information.
                    </p>
                </div>

                {/* Stats */}
                {loading && logs.length === 0 ? (
                    <div className="grid gap-4 md:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
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
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 rounded-lg bg-primary/10">
                                    <FileText className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                    <p className="text-sm text-muted-foreground">Total Logs</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats.successful}</p>
                                    <p className="text-sm text-muted-foreground">Successful</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                                    <XCircle className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats.failed}</p>
                                    <p className="text-sm text-muted-foreground">Failed</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="flex items-center gap-4 p-6">
                                <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stats.critical}</p>
                                    <p className="text-sm text-muted-foreground">Critical</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="all">All Logs</TabsTrigger>
                        <TabsTrigger value="failed" className="text-red-600">
                            <XCircle className="mr-1 h-4 w-4" />
                            Failed
                        </TabsTrigger>
                        <TabsTrigger value="critical" className="text-orange-600">
                            <AlertTriangle className="mr-1 h-4 w-4" />
                            Critical
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-4">
                        {/* Logs Table */}
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Shield className="h-5 w-5 text-primary" />
                                            Activity Log
                                        </CardTitle>
                                        <CardDescription>Complete audit trail with device and security details.</CardDescription>
                                    </div>
                                    <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                        <div className="relative w-full sm:w-auto">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search logs..."
                                                className="pl-9 w-full sm:w-[200px]"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-full sm:w-[130px]">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="success">Success</SelectItem>
                                                <SelectItem value="failed">Failed</SelectItem>
                                                <SelectItem value="warning">Warning</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={actionFilter} onValueChange={setActionFilter}>
                                            <SelectTrigger className="w-full sm:w-[160px]">
                                                <Filter className="mr-2 h-4 w-4" />
                                                <SelectValue placeholder="Filter" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Actions</SelectItem>
                                                <SelectItem value="login">Login</SelectItem>
                                                <SelectItem value="login_failed">Login Failed</SelectItem>
                                                <SelectItem value="create_employee">Create Employee</SelectItem>
                                                <SelectItem value="update_employee">Update Employee</SelectItem>
                                                <SelectItem value="create_session">Create Session</SelectItem>
                                                <SelectItem value="lock_session">Lock Session</SelectItem>
                                                <SelectItem value="create_schedule">Create Schedule</SelectItem>
                                                <SelectItem value="password_change">Password Change</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loading && logs.length === 0 ? (
                                    <div className="space-y-4">
                                        <div className="hidden md:block">
                                            <div className="border rounded-md">
                                                <div className="p-0">
                                                    {[...Array(10)].map((_, i) => (
                                                        <div key={i} className="p-4 border-b last:border-0">
                                                            <div className="grid grid-cols-6 gap-4 items-center">
                                                                <Skeleton className="h-4 w-full" />
                                                                <Skeleton className="h-4 w-full" />
                                                                <Skeleton className="h-6 w-16 mx-auto" />
                                                                <Skeleton className="h-8 w-24 mx-auto" />
                                                                <Skeleton className="h-4 w-24 mx-auto" />
                                                                <Skeleton className="h-4 w-32 mx-auto" />
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
                                ) : filteredLogs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-semibold">No logs found</h3>
                                        <p className="text-sm text-muted-foreground">
                                            No activity logs match your search criteria
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile Card View */}
                                        <div className="block md:hidden space-y-3">
                                            {paginatedLogs.map((log) => {
                                                const config = actionConfig[log.action] || {
                                                    label: log.action,
                                                    icon: FileText,
                                                    color: "bg-gray-100 text-gray-800",
                                                };
                                                const ActionIcon = config.icon;

                                                return (
                                                    <div key={log.id} className="border rounded-lg p-4 space-y-3">
                                                        {/* Header: Action Badge + Status + Timestamp */}
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex flex-col gap-1">
                                                                <Badge className={config.color}>
                                                                    <ActionIcon className="mr-1 h-3 w-3" />
                                                                    {config.label}
                                                                </Badge>
                                                                <StatusBadge status={log.status} />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatDateTime(log.created_at)}
                                                            </span>
                                                        </div>

                                                        {/* Description */}
                                                        <p className="text-sm">{log.description}</p>

                                                        {/* Severity */}
                                                        {log.severity && log.severity !== "info" && (
                                                            <SeverityBadge severity={log.severity} />
                                                        )}

                                                        {/* User, IP & Device */}
                                                        <div className="flex items-center justify-between text-sm pt-2 border-t">
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={log.userAvatar} alt={log.user} />
                                                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                                                        {getInitials(log.userFirstName, log.userLastName)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{log.user}</span>
                                                                    <span className="text-xs text-muted-foreground capitalize">{log.userRole}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <Globe className="h-3 w-3" />
                                                                    <span className="font-mono">{log.ip_address}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                    <DeviceIcon type={log.device_type} />
                                                                    <span>{log.browser || "Unknown"}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* View Details Button */}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full"
                                                            onClick={() => handleViewDetails(log)}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Desktop Table View */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <Table className="min-w-[900px]">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[140px]">Action</TableHead>
                                                        <TableHead className="min-w-[200px]">Description</TableHead>
                                                        <TableHead className="w-[90px] text-center">Status</TableHead>
                                                        <TableHead className="w-[140px] text-center">User</TableHead>
                                                        <TableHead className="w-[120px] text-center">IP / Device</TableHead>
                                                        <TableHead className="w-[150px] text-center">Timestamp</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedLogs.map((log) => {
                                                        const config = actionConfig[log.action] || {
                                                            label: log.action,
                                                            icon: FileText,
                                                            color: "bg-gray-100 text-gray-800",
                                                        };
                                                        const ActionIcon = config.icon;

                                                        return (
                                                            <TableRow key={log.id} className="group hover:bg-muted/50 cursor-pointer" onClick={() => handleViewDetails(log)}>
                                                                <TableCell>
                                                                    <div className="flex flex-col gap-1">
                                                                        <Badge className={config.color}>
                                                                            <ActionIcon className="mr-1 h-3 w-3" />
                                                                            {config.label}
                                                                        </Badge>
                                                                        {log.severity && log.severity !== "info" && (
                                                                            <SeverityBadge severity={log.severity} />
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <p className="truncate max-w-[300px]" title={log.description}>{log.description}</p>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <StatusBadge status={log.status} />
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <Avatar className="h-7 w-7">
                                                                            <AvatarImage src={log.userAvatar} alt={log.user} />
                                                                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                                                                {getInitials(log.userFirstName, log.userLastName)}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="flex flex-col items-start">
                                                                            <span className="text-xs font-medium truncate max-w-[80px]">{log.user}</span>
                                                                            <span className="text-[10px] text-muted-foreground capitalize">{log.userRole}</span>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="flex flex-col items-center gap-0.5">
                                                                                    <span className="font-mono text-xs">{log.ip_address}</span>
                                                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                                        <DeviceIcon type={log.device_type} />
                                                                                        <span className="truncate max-w-[60px]">{log.browser || "N/A"}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <div className="text-xs space-y-1">
                                                                                    {log.browser ? (
                                                                                        <>
                                                                                            <p><strong>OS:</strong> {log.os || 'N/A'} {log.os_version || ''}</p>
                                                                                            <p><strong>Browser:</strong> {log.browser || 'N/A'} {log.browser_version || ''}</p>
                                                                                            <p><strong>Device:</strong> {log.device_type || 'desktop'}</p>
                                                                                        </>
                                                                                    ) : (
                                                                                        <p className="italic">Device info not available for legacy logs</p>
                                                                                    )}
                                                                                </div>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                        {formatDateTime(log.created_at)}
                                                                    </span>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {/* Pagination */}
                                        {totalPages > 1 && (
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                                                <p className="text-sm text-muted-foreground text-center sm:text-left">
                                                    Showing {(currentPage - 1) * logsPerPage + 1} to{" "}
                                                    {Math.min(currentPage * logsPerPage, filteredLogs.length)} of{" "}
                                                    {filteredLogs.length} logs
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                        disabled={currentPage === 1}
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
                                                        disabled={currentPage === totalPages}
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Log Details Dialog */}
                <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Audit Log Details
                            </DialogTitle>
                            <DialogDescription>
                                Complete information about this log entry.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedLog && (
                            <div className="space-y-6">
                                {/* Basic Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">Action</p>
                                        <Badge className={actionConfig[selectedLog.action]?.color || "bg-gray-100"}>
                                            {actionConfig[selectedLog.action]?.label || selectedLog.action}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                                        <StatusBadge status={selectedLog.status} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">Severity</p>
                                        <SeverityBadge severity={selectedLog.severity} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                                        <p className="text-sm">{formatDateTime(selectedLog.created_at)}</p>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                                    <p className="text-sm p-3 bg-muted rounded-lg">{selectedLog.description}</p>
                                </div>

                                {/* User Info */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">User</p>
                                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={selectedLog.userAvatar} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {getInitials(selectedLog.userFirstName, selectedLog.userLastName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{selectedLog.user}</p>
                                            <p className="text-sm text-muted-foreground capitalize">{selectedLog.userRole}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Network & Device Info */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Network & Device</p>
                                    <div className="grid gap-3 sm:grid-cols-2 p-3 bg-muted rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">
                                                <strong>IP:</strong> {selectedLog.ip_address}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <DeviceIcon type={selectedLog.device_type} />
                                            <span className="text-sm">
                                                <strong>Device:</strong> {selectedLog.device_type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Monitor className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">
                                                <strong>Browser:</strong> {selectedLog.browser} {selectedLog.browser_version}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Settings className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">
                                                <strong>OS:</strong> {selectedLog.os} {selectedLog.os_version}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Session/Transaction IDs */}
                                {(selectedLog.session_id || selectedLog.transaction_id) && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-muted-foreground">Tracking IDs</p>
                                        <div className="space-y-2 p-3 bg-muted rounded-lg text-xs font-mono">
                                            {selectedLog.transaction_id && (
                                                <p><strong>Transaction:</strong> {selectedLog.transaction_id}</p>
                                            )}
                                            {selectedLog.session_id && (
                                                <p><strong>Session:</strong> {selectedLog.session_id}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
