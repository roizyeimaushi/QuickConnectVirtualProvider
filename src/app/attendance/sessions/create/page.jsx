"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sessionsApi, schedulesApi, employeesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime24 } from "@/lib/utils";
import { format } from "date-fns";
import {
    ArrowLeft,
    Loader2,
    Calendar as CalendarIcon,
    Clock,
    AlertCircle,
    Plus,
    Users,
    CheckSquare,
    ChevronDown,
} from "lucide-react";

export default function CreateSessionPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Data States
    const [schedules, setSchedules] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [schedulesLoading, setSchedulesLoading] = useState(true);
    const [employeesLoading, setEmployeesLoading] = useState(true);

    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        date: new Date(),
        schedule_id: "",
        employee_ids: [],
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [schedRes, empRes] = await Promise.all([
                    schedulesApi.getAll(),
                    employeesApi.getAll({ per_page: 999, status: 'active' }) // Only active employees
                ]);

                // Extract data depending on API response structure (pagination vs array)
                const schedData = schedRes.data || [];
                // Handle pagination for employees if necessary
                const empData = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.data || []);

                setSchedules(schedData);
                setEmployees(empData);

                // Removed: setFormData pre-assignment. 
                // We keep it empty by default as requested to allow placeholder sessions.

            } catch (error) {
                console.error("Failed to load initial data", error);
                toast({
                    title: "Error",
                    description: "Failed to load schedules or employees",
                    variant: "destructive",
                });
            } finally {
                setSchedulesLoading(false);
                setEmployeesLoading(false);
            }
        };

        loadInitialData();
    }, []);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.date) {
            newErrors.date = "Date is required";
        }

        if (!formData.schedule_id) {
            newErrors.schedule_id = "Schedule is required";
        }

        // Removed mandatory employee assignment for more flexibility

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            await sessionsApi.create({
                ...formData,
                date: format(formData.date, 'yyyy-MM-dd'),
                employee_ids: formData.employee_ids
            });

            toast({
                title: "Session created",
                description: `Attendance session created with ${formData.employee_ids.length} assigned employees.`,
                variant: "success",
            });

            router.push("/attendance/sessions");
        } catch (error) {
            // Only log unexpected errors to console
            if (error.status !== 422) {
                console.error("Create session error:", JSON.stringify(error, null, 2));
            }

            // Handle validation errors (422)
            if (error.status === 422) {
                // Check if it's a field-specific error (non-empty 'errors' object)
                if (error.errors && Object.keys(error.errors).length > 0) {
                    toast({
                        title: "Validation Error",
                        description: error.message || "Please check your inputs",
                        variant: "destructive",
                    });
                } else {
                    // General 422 error (e.g., "Session already exists")
                    toast({
                        title: "Validation Error",
                        description: error.message || "Invalid request",
                        variant: "destructive",
                    });
                }
            } else {
                toast({
                    title: "Error",
                    description: error.message || "Failed to create session",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleEmployee = (id) => {
        setFormData(prev => {
            const current = prev.employee_ids;
            if (current.includes(id)) {
                return { ...prev, employee_ids: current.filter(eid => eid !== id) };
            } else {
                return { ...prev, employee_ids: [...current, id] };
            }
        });
    };

    const toggleAllEmployees = () => {
        if (formData.employee_ids.length === employees.length) {
            setFormData(prev => ({ ...prev, employee_ids: [] }));
        } else {
            setFormData(prev => ({ ...prev, employee_ids: employees.map(e => e.id) }));
        }
    };

    const selectedSchedule = schedules.find((s) => s.id.toString() === formData.schedule_id);

    return (
        <DashboardLayout title="Create Session">
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0">
                        <Link href="/attendance/sessions">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Create Session</h1>
                        <p className="text-muted-foreground">
                            Set up a new attendance session for employees.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-[1fr_300px]">
                    {/* Main Form */}
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-primary" />
                                Session Details
                            </CardTitle>
                            <CardDescription>
                                Define the session date and schedule.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form id="create-session-form" onSubmit={handleSubmit} className="space-y-6">
                                {/* Date Selection */}
                                <div className="space-y-2">
                                    <Label>Session Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full h-10 px-3 justify-between text-left font-normal"
                                            >
                                                <div className="flex items-center">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {formData.date ? (
                                                        format(formData.date, "PPPP")
                                                    ) : (
                                                        "Select a date"
                                                    )}
                                                </div>
                                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" side="bottom" sideOffset={4} avoidCollisions={false}>
                                            <Calendar
                                                mode="single"
                                                selected={formData.date}
                                                onSelect={(date) => setFormData((prev) => ({ ...prev, date }))}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <p className="text-xs text-muted-foreground">
                                        Date when attendance will be recorded.
                                    </p>
                                    {errors.date && (
                                        <p className="text-sm text-destructive">{errors.date}</p>
                                    )}
                                </div>

                                {/* Schedule Selection */}
                                <div className="space-y-2">
                                    <Label>Work Schedule</Label>
                                    <Select
                                        value={formData.schedule_id}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({ ...prev, schedule_id: value }))
                                        }
                                        disabled={schedulesLoading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={schedulesLoading ? "Loading..." : "Select schedule"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {schedules.map((schedule) => (
                                                <SelectItem key={schedule.id} value={schedule.id.toString()}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{schedule.name}</span>
                                                        <span className="text-muted-foreground text-xs">
                                                            ({formatTime24(schedule.time_in)} - {formatTime24(schedule.time_out)})
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Determines shift timings for this session.
                                    </p>
                                    {errors.schedule_id && (
                                        <p className="text-sm text-destructive">{errors.schedule_id}</p>
                                    )}
                                </div>

                                {/* Selected Schedule Preview */}
                                {selectedSchedule && (
                                    <div className="p-4 rounded-lg bg-muted/50 border">
                                        <h4 className="font-medium mb-3 flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-primary" />
                                            Schedule Preview
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Time In</p>
                                                <p className="font-mono font-bold text-lg">
                                                    {formatTime24(selectedSchedule.time_in)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Break</p>
                                                <p className="font-mono font-bold text-lg">
                                                    {formatTime24(selectedSchedule.break_time)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Time Out</p>
                                                <p className="font-mono font-bold text-lg">
                                                    {formatTime24(selectedSchedule.time_out)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        This will create pending attendance records for the selected employees. If none are selected, the session will start empty.
                                    </AlertDescription>
                                </Alert>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Employee Selection Sidebar */}
                    <Card className="h-fit flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between text-lg">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    Assign Employees
                                </div>
                                <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                                    {formData.employee_ids.length} Selected
                                </span>
                            </CardTitle>
                            <CardDescription>
                                Choose employees for this session.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full mb-2"
                                onClick={toggleAllEmployees}
                            >
                                <CheckSquare className="mr-2 h-3 w-3" />
                                {formData.employee_ids.length === employees.length ? "Deselect All" : "Select All"}
                            </Button>

                            <ScrollArea className="h-[300px] border rounded-md p-2">
                                {employeesLoading ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading employees...</div>
                                ) : employees.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No employees found</div>
                                ) : (
                                    <div className="space-y-3 p-1">
                                        {employees.map(employee => (
                                            <div key={employee.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`emp-${employee.id}`}
                                                    checked={formData.employee_ids.includes(employee.id)}
                                                    onCheckedChange={() => toggleEmployee(employee.id)}
                                                />
                                                <label
                                                    htmlFor={`emp-${employee.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {employee.first_name} {employee.last_name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>

                            {errors.employee_ids && (
                                <p className="text-sm text-destructive mt-2">{errors.employee_ids}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push("/attendance/sessions")}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" form="create-session-form" disabled={loading} className="min-w-[150px]">
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Session
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
}
