"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { schedulesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { isValidTimeFormat, formatTime12 } from "@/lib/utils";
import {
    ArrowLeft,
    Loader2,
    Clock,
    AlertCircle,
    Plus,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
    const hh = h.toString().padStart(2, '0');
    TIME_OPTIONS.push(`${hh}:00`);
}

export default function CreateSchedulePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        // Simulate loading delay for smooth transition
        const timer = setTimeout(() => {
            setIsPageLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const [formData, setFormData] = useState({
        name: "",
        time_in: "23:00",
        break_time: "00:00",
        time_out: "07:00",
        grace_period: "15",
        late_threshold: "15",
        is_active: true,
    });

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = "Schedule name is required";
        }

        if (!formData.time_in || !isValidTimeFormat(formData.time_in)) {
            newErrors.time_in = "Valid time in HH:mm format is required";
        }

        if (!formData.break_time || !isValidTimeFormat(formData.break_time)) {
            newErrors.break_time = "Valid time in HH:mm format is required";
        }

        if (!formData.time_out || !isValidTimeFormat(formData.time_out)) {
            newErrors.time_out = "Valid time in HH:mm format is required";
        }

        if (!formData.grace_period || parseInt(formData.grace_period) < 0) {
            newErrors.grace_period = "Grace period must be a positive number";
        }

        if (!formData.late_threshold || parseInt(formData.late_threshold) < 0) {
            newErrors.late_threshold = "Late threshold must be a positive number";
        }

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
            await schedulesApi.create({
                name: formData.name,
                time_in: formData.time_in,
                break_time: formData.break_time,
                time_out: formData.time_out,
                grace_period_minutes: parseInt(formData.grace_period),
                late_threshold_minutes: parseInt(formData.late_threshold),
                status: formData.is_active ? 'active' : 'inactive',
            });

            toast({
                title: "Schedule created",
                description: `${formData.name} has been created successfully.`,
                variant: "success",
            });

            router.push("/schedules");
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to create schedule",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    if (isPageLoading) {
        return (
            <DashboardLayout title="Create Schedule">
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Create Schedule">
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0">
                        <Link href="/schedules">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Create Schedule</h1>
                        <p className="text-muted-foreground">
                            Set up a work schedule for employee attendance.
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Schedule Configuration
                        </CardTitle>
                        <CardDescription>
                            Define working hours and attendance behavior.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Schedule Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name">Schedule Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    placeholder="e.g., Regular Shift, Night Shift"
                                    disabled={loading}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Example: Regular Shift, Night Shift
                                </p>
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name}</p>
                                )}
                            </div>

                            {/* Time Fields */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="time_in">Time In *</Label>
                                    <Select
                                        value={formData.time_in}
                                        onValueChange={(value) => handleChange("time_in", value)}
                                        disabled={loading}
                                    >
                                        <SelectTrigger id="time_in">
                                            <SelectValue placeholder="Select time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <ScrollArea className="h-48">
                                                {TIME_OPTIONS.map((time) => (
                                                    <SelectItem key={`in-${time}`} value={time}>
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </ScrollArea>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Scheduled shift start time.
                                    </p>
                                    {errors.time_in && (
                                        <p className="text-sm text-destructive">{errors.time_in}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="break_time">Break Time *</Label>
                                    <Select
                                        value={formData.break_time}
                                        onValueChange={(value) => handleChange("break_time", value)}
                                        disabled={loading}
                                    >
                                        <SelectTrigger id="break_time">
                                            <SelectValue placeholder="Select time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <ScrollArea className="h-48">
                                                {TIME_OPTIONS.map((time) => (
                                                    <SelectItem key={`break-${time}`} value={time}>
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </ScrollArea>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Scheduled break start time.
                                    </p>
                                    {errors.break_time && (
                                        <p className="text-sm text-destructive">{errors.break_time}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="time_out">Time Out *</Label>
                                    <Select
                                        value={formData.time_out}
                                        onValueChange={(value) => handleChange("time_out", value)}
                                        disabled={loading}
                                    >
                                        <SelectTrigger id="time_out">
                                            <SelectValue placeholder="Select time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <ScrollArea className="h-48">
                                                {TIME_OPTIONS.map((time) => (
                                                    <SelectItem key={`out-${time}`} value={time}>
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </ScrollArea>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Scheduled shift end time.
                                    </p>
                                    {errors.time_out && (
                                        <p className="text-sm text-destructive">{errors.time_out}</p>
                                    )}
                                </div>
                            </div>

                            {/* Grace Period and Late Threshold */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="grace_period">Grace Period (minutes)</Label>
                                    <Input
                                        id="grace_period"
                                        type="number"
                                        min="0"
                                        max="60"
                                        value={formData.grace_period}
                                        onChange={(e) => handleChange("grace_period", e.target.value)}
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Time allowed after the shift start before an employee is marked late.
                                    </p>
                                    {errors.grace_period && (
                                        <p className="text-sm text-destructive">{errors.grace_period}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="late_threshold">Late Threshold (minutes)</Label>
                                    <Input
                                        id="late_threshold"
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={formData.late_threshold}
                                        onChange={(e) => handleChange("late_threshold", e.target.value)}
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Time after which employee is marked as late
                                    </p>
                                    {errors.late_threshold && (
                                        <p className="text-sm text-destructive">{errors.late_threshold}</p>
                                    )}
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="is_active">Active Status</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Only active schedules can be used for attendance tracking.
                                    </p>
                                </div>
                                <Switch
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => handleChange("is_active", checked)}
                                    disabled={loading}
                                />
                            </div>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="pt-2">
                                    <p className="font-medium mb-2">Attendance Rules</p>
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                        <li><strong>Check-in Window:</strong> Employees can check in from 18:00 to 01:30 (next day).</li>
                                        <li><strong>Late Policy:</strong> Employees who check in after Time In plus the grace period are marked Late.</li>
                                        <li><strong>Absence Policy:</strong> Employees who do not check in by 01:00 are marked Absent automatically.</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/schedules")}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading} className="flex-1">
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Create Schedule
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
