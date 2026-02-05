"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { employeesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { isValidEmail } from "@/lib/utils";
import { API_BASE_URL, POSITIONS as DEFAULT_POSITIONS } from "@/lib/constants";
import {
    ArrowLeft,
    Loader2,
    Save,
    User,
    Key,
    Eye,
    EyeOff,
} from "lucide-react";

export default function EditEmployeePage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [positions, setPositions] = useState(DEFAULT_POSITIONS);

    const [formData, setFormData] = useState({
        employee_id: "",
        first_name: "",
        last_name: "",
        email: "",
        position: "",
        status: "active",
        department: "",
        employee_type: "Full-time",
        password: "",
        confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("quickcon_token");

                // Fetch employee data
                const response = await employeesApi.getById(params.id);
                const employee = response.data || response;

                setFormData({
                    employee_id: employee.employee_id || "",
                    first_name: employee.first_name || "",
                    last_name: employee.last_name || "",
                    email: employee.email || "",
                    position: employee.position || "",
                    status: employee.status || "active",
                    department: employee.department || "",
                    employee_type: employee.employee_type || "Full-time",
                });

                // Fetch positions from settings
                const settingsResponse = await fetch(`${API_BASE_URL}/settings`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (settingsResponse.ok) {
                    const settings = await settingsResponse.json();
                    if (settings.positions) {
                        try {
                            const parsed = JSON.parse(settings.positions);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                setPositions(parsed);
                            }
                        } catch {
                            // If not valid JSON, use default positions
                        }
                    }
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to load employee data",
                    variant: "destructive",
                });
                router.push("/employees");
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.first_name.trim()) {
            newErrors.first_name = "First name is required";
        }

        if (!formData.last_name.trim()) {
            newErrors.last_name = "Last name is required";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        }

        if (!formData.position) {
            newErrors.position = "Position is required";
        }

        // Password validation (only if user is trying to change it)
        if (formData.password) {
            if (formData.password.length < 6) {
                newErrors.password = "Password must be at least 6 characters";
            }
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = "Passwords do not match";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSaving(true);

        try {
            const updateData = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                position: formData.position,
                status: formData.status,
                department: formData.department,
                employee_type: formData.employee_type,
            };

            // Only include password if it's being changed
            if (formData.password) {
                updateData.password = formData.password;
            }

            await employeesApi.update(params.id, updateData);

            toast({
                title: "Employee updated",
                description: `${formData.first_name} ${formData.last_name} has been updated successfully.`,
                variant: "success",
            });

            router.push("/employees");
        } catch (error) {
            const message = error.message || "Failed to update employee";
            toast({
                title: "Error",
                description: message,
                variant: "destructive",
            });

            if (error.errors) {
                setErrors(error.errors);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <DashboardLayout title="Edit Employee">
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="shrink-0"
                    >
                        <Link href="/employees">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold tracking-tight">Edit Employee</h1>
                        <p className="text-muted-foreground">
                            Modify employee details and status.
                        </p>
                    </div>
                    <Badge variant="outline" className="font-mono">
                        {formData.employee_id}
                    </Badge>
                </div>

                {/* Form Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Employee Information
                        </CardTitle>
                        <CardDescription>
                            Update the employee details below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name Fields */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name *</Label>
                                    <Input
                                        id="first_name"
                                        value={formData.first_name}
                                        onChange={(e) => handleChange("first_name", e.target.value)}
                                        placeholder="John"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Employee's given name.
                                    </p>
                                    {errors.first_name && (
                                        <p className="text-sm text-destructive">{errors.first_name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Last Name *</Label>
                                    <Input
                                        id="last_name"
                                        value={formData.last_name}
                                        onChange={(e) => handleChange("last_name", e.target.value)}
                                        placeholder="Doe"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Employee's family name.
                                    </p>
                                    {errors.last_name && (
                                        <p className="text-sm text-destructive">{errors.last_name}</p>
                                    )}
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    placeholder="john.doe@company.com"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Used for login and notifications.
                                </p>
                                {errors.email && (
                                    <p className="text-sm text-destructive">{errors.email}</p>
                                )}
                            </div>

                            {/* Position */}
                            <div className="space-y-2">
                                <Label htmlFor="position">Position *</Label>
                                <Select
                                    value={formData.position}
                                    onValueChange={(value) => handleChange("position", value)}
                                >
                                    <SelectTrigger id="position">
                                        <SelectValue placeholder="Select position" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {positions.map((position) => (
                                            <SelectItem key={position} value={position}>
                                                {position}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Employee's job role in the organization.
                                </p>
                                {errors.position && (
                                    <p className="text-sm text-destructive">{errors.position}</p>
                                )}
                            </div>

                            {/* Department */}
                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Input
                                    id="department"
                                    value={formData.department}
                                    onChange={(e) => handleChange("department", e.target.value)}
                                    placeholder="e.g. Operations, IT, Sales"
                                />
                                <p className="text-xs text-muted-foreground">
                                    The department this employee belongs to.
                                </p>
                            </div>

                            {/* Employee Type */}
                            <div className="space-y-2">
                                <Label htmlFor="employee_type">Employee Type</Label>
                                <Select
                                    value={formData.employee_type}
                                    onValueChange={(value) => handleChange("employee_type", value)}
                                >
                                    <SelectTrigger id="employee_type">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Full-time">Full-time</SelectItem>
                                        <SelectItem value="Part-time">Part-time</SelectItem>
                                        <SelectItem value="Contractor">Contractor</SelectItem>
                                        <SelectItem value="Freelance">Freelance</SelectItem>
                                        <SelectItem value="Intern">Intern</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Employment classification.
                                </p>
                            </div>

                            {/* Password Change Section */}
                            <div className="rounded-lg border p-4 space-y-4">
                                <div className="flex items-center gap-2">
                                    <Key className="h-4 w-4 text-primary" />
                                    <Label className="text-base font-medium">Change Password</Label>
                                    <span className="text-xs text-muted-foreground">(Optional)</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Leave blank to keep the current password.
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={(e) => handleChange("password", e.target.value)}
                                                placeholder="Enter new password"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                        {errors.password && (
                                            <p className="text-sm text-destructive">{errors.password}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                                        <Input
                                            id="confirmPassword"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.confirmPassword}
                                            onChange={(e) => handleChange("confirmPassword", e.target.value)}
                                            placeholder="Confirm new password"
                                        />
                                        {errors.confirmPassword && (
                                            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Status Toggle */}
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="status">Active Status</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Inactive employees cannot log in or access the system.
                                    </p>
                                </div>
                                <Switch
                                    id="status"
                                    checked={formData.status === "active"}
                                    onCheckedChange={(checked) =>
                                        handleChange("status", checked ? "active" : "inactive")
                                    }
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/employees")}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving} className="flex-1">
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
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
