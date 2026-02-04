"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
    Save,
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

export default function EditSchedulePage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [loadingSchedule, setLoadingSchedule] = useState(true);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        name: "",
        time_in: "20:00",
        break_time: "00:00",
        time_out: "23:00",
        grace_period: "15",
        late_threshold: "30",
        is_active: true,
    });

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const schedule = await schedulesApi.getById(params.id);
                setFormData({
                    name: schedule.name || "",
                    time_in: schedule.time_in ? schedule.time_in.slice(0, 5) : "08:00",
                    break_time: schedule.break_time ? schedule.break_time.slice(0, 5) : "12:00",
                    time_out: schedule.time_out ? schedule.time_out.slice(0, 5) : "07:00",
                    grace_period: String(schedule.grace_period_minutes || 15),
                    late_threshold: String(schedule.late_threshold_minutes || 30),
                    is_active: schedule.status === "active",
                });
            } catch (error) {
                console.error("Failed to fetch schedule:", error);
                toast({
                    title: "Error",
                    description: "Failed to load schedule details",
                    variant: "destructive",
                });
                router.push("/schedules");
            } finally {
                setLoadingSchedule(false);
            }
        };

        if (params.id) {
            fetchSchedule();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

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
            await schedulesApi.update(params.id, {
                name: formData.name,
                time_in: formData.time_in,
                break_time: formData.break_time,
                time_out: formData.time_out,
                grace_period_minutes: parseInt(formData.grace_period),
                late_threshold_minutes: parseInt(formData.late_threshold),
                status: formData.is_active ? 'active' : 'inactive',
            });

            toast({
                title: "Schedule updated",
                description: `${formData.name} has been updated successfully.`,
                variant: "success",
            });

            router.push("/schedules");
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to update schedule",
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

    // Full-page loading spinner
    
