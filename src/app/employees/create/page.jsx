"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { employeesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { isValidEmail } from "@/lib/utils";
import { API_BASE_URL, POSITIONS as DEFAULT_POSITIONS } from "@/lib/constants";
import {
    ArrowLeft,
    Loader2,
    UserPlus,
    AlertCircle,
    Eye,
    EyeOff,
} from "lucide-react";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";

export default function CreateEmployeePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [loadingId, setLoadingId] = useState(true);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [positions, setPositions] = useState(DEFAULT_POSITIONS);

    const [formData, setFormData] = useState({
        employee_id: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        password_confirmation: "",
        position: "",
    });

    // Fetch the next employee ID and positions from backend on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const token = localStorage.getItem("token");

                // Fetch next employee ID
                const idResponse = await employeesApi.getNextId();
                setFormData(prev => ({ ...prev, employee_id: idResponse.next_employee_id }));

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
                console.error("Failed to fetch initial data:", error);
                setFormData(prev => ({ ...prev, employee_id: "QCV-001" }));
            } finally {
                setLoadingId(false);
            }
        };
        fetchInitialData();
    }, []);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.employee_id.trim()) {
            newErrors.employee_id = "Employee ID is required";
        }

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

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        }

        if (formData.password !== formData.password_confirmation) {
            newErrors.password_confirmation = "Passwords do not match";
        }

        if (!formData.position) {
            newErrors.position = "Position is required";
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
            await employeesApi.create(formData);

            toast({
                title: "Employee created",
                description: `${formData.first_name} ${formData.last_name} has been added successfully.`,
                variant: "success",
            });

            router.push("/employees");
        } catch (error) {
            const message = error.message || "Failed to create employee";
            toast({
                title: "Error",
                description: message,
                variant: "destructive",
            });

            if (error.errors) {
                setErrors(error.errors);
            }
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

    if (loadingId) {
        return null;
    }

    return (
        <DashboardLayout title="Create Employee">
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
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Add Employee</h1>
                        <p className="text-muted-foreground">
                            Register a new employee in the system.
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" />
                            Employee Information
                        </CardTitle>
                        <CardDescription>
                            Enter the required details for the new employee.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Employee ID */}
                            <div className="space-y-2">
                                <Label htmlFor="employee_id">Employee ID</Label>
                                <Input
                                    id="employee_id"
                                    value={loadingId ? "Loading..." : formData.employee_id}
                                    onChange={(e) => handleChange("employee_id", e.target.value)}
                                    placeholder="QCV-001"
                                    className="font-mono"
                                    disabled
                                />
                                <p className="text-xs text-muted-foreground">
                                    Unique identifier assigned by the system.
                                </p>
                                {errors.employee_id && (
                                    <p className="text-sm text-destructive">{errors.employee_id}</p>
                                )}
                            </div>

                            {/* Name Fields */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name</Label>
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
                                    <Label htmlFor="last_name">Last Name</Label>
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
                                <Label htmlFor="email">Email Address</Label>
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
                                <Label htmlFor="position">Position</Label>
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

                            {/* Password Fields */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => handleChange("password", e.target.value)}
                                            placeholder="••••••••"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Minimum 8 characters.
                                    </p>
                                    {errors.password && (
                                        <p className="text-sm text-destructive">{errors.password}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">Confirm Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password_confirmation"
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={formData.password_confirmation}
                                            onChange={(e) => handleChange("password_confirmation", e.target.value)}
                                            placeholder="••••••••"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Re-enter the password to confirm.
                                    </p>
                                    {errors.password_confirmation && (
                                        <p className="text-sm text-destructive">{errors.password_confirmation}</p>
                                    )}
                                </div>
                            </div>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    The employee will receive their login credentials via email and can change their password after first login.
                                </AlertDescription>
                            </Alert>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push("/employees")}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading} className="flex-1">
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Create Employee
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
