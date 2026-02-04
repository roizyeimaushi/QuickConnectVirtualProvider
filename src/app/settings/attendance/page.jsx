"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Shield, Timer, Loader2 } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AttendanceSettingsPage() {
    const { settings, loading, saving, updateSettings } = useSettings();
    const [formData, setFormData] = useState({});
    const [isReady, setIsReady] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const isInitialized = useRef(false);

    // Default to 'rules' tab or whatever comes from URL
    const activeTab = searchParams.get("tab") || "rules";

    // Only initialize formData once when settings first load
    // This prevents polling from overwriting user's in-progress changes
    useEffect(() => {
        if (settings && Object.keys(settings).length > 0 && !isInitialized.current) {
            isInitialized.current = true;
            setFormData({
                // --- SECTION 1: Rules Configuration (Global) ---
                attendance_mode: "automatic",
                timezone: settings.timezone || "Asia/Manila",
                time_format: "24-hour",
                date_format: "YYYY-MM-DD",

                // Validation Rules
                grace_period: settings.grace_period || "15",
                late_threshold: settings.late_threshold || "30",
                allow_multi_checkin: settings.allow_multi_checkin === "1" || settings.allow_multi_checkin === true,
                prevent_duplicate: settings.prevent_duplicate !== false && settings.prevent_duplicate !== "0",
                auto_checkout: settings.auto_checkout === "1" || settings.auto_checkout === true,

                // --- SECTION 3: Break Rules ---
                max_breaks: settings.max_breaks || "1",
                max_break_duration: settings.max_break_duration || "60",
                auto_end_break: settings.auto_end_break === "1" || settings.auto_end_break === true,
                prevent_overlap_break: settings.prevent_overlap_break !== false && settings.prevent_overlap_break !== "0",

                // --- SECTION 4: Overtime Rules ---
                allow_overtime: settings.allow_overtime === "1" || settings.allow_overtime === true,
                min_overtime_minutes: settings.min_overtime_minutes || "60",
                overtime_rate: settings.overtime_rate || "1.25",
                require_ot_approval: settings.require_ot_approval === "1" || settings.require_ot_approval === true,
                ot_rounding: settings.ot_rounding || "none",
            });
            setIsReady(true);
        } else if (settings && Object.keys(settings).length === 0 && !loading) {
            // Handle case where settings are loaded but empty (fallback)
            setFormData({
                attendance_mode: "automatic",
                timezone: "Asia/Manila",
                time_format: "24-hour",
                date_format: "YYYY-MM-DD",
                grace_period: "15",
                late_threshold: "30",
                allow_multi_checkin: false,
                prevent_duplicate: true,
                auto_checkout: true,
                max_breaks: "1",
                max_break_duration: "60",
                auto_end_break: true,
                prevent_overlap_break: true,
                allow_overtime: false,
                min_overtime_minutes: "60",
                overtime_rate: "1.25",
                require_ot_approval: false,
                ot_rounding: "none",
            });
            setIsReady(true);
        }
    }, [settings, loading]);



    // Local loader while preparing form data
    if (loading || !isReady) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }


    const handleTabChange = (value) => {
        router.push(`/settings/attendance?tab=${value}`);
    };

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        updateSettings(formData);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h3 className="text-lg font-medium">Attendance Rules</h3>
                <p className="text-sm text-muted-foreground">
                    Set up automated attendance tracking behavior.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-2 lg:w-[400px]">
                        <TabsTrigger value="rules" className="whitespace-nowrap">Rules Configuration</TabsTrigger>
                        <TabsTrigger value="overtime" className="whitespace-nowrap">Overtime Rules</TabsTrigger>
                    </TabsList>
                </div>

                {/* SECTION 1: Rules Configuration */}
                <TabsContent value="rules" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                <Shield className="h-5 w-5 text-primary" />
                                Global System Behavior
                            </CardTitle>
                            <CardDescription>
                                Core settings for how the system processes time and records.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Read-only System Flags */}
                            <div className="grid gap-4 md:grid-cols-4 p-4 bg-muted/30 rounded-lg border">
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Attendance Mode</Label>
                                    <p className="font-mono font-medium">Automatic</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Time Format</Label>
                                    <p className="font-mono font-medium">
                                        {settings?.time_format === '12h' ? '12-hour (AM/PM)' : '24-hour'}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Date Format</Label>
                                    <p className="font-mono font-medium">
                                        {settings?.date_format === 'mdy' ? 'MM/DD/YYYY' :
                                            settings?.date_format === 'dmy' ? 'DD/MM/YYYY' : 'YYYY-MM-DD'}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Timezone</Label>
                                    <p className="font-mono font-medium">{formData.timezone}</p>
                                </div>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Validation Thresholds */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-foreground/80">Validation Thresholds</h4>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label>Grace Period (Minutes)</Label>
                                            <Input
                                                type="number"
                                                value={formData.grace_period || ""}
                                                onChange={(e) => handleChange("grace_period", e.target.value)}
                                            />
                                            <p className="text-[0.8rem] text-muted-foreground">Time allowed after shift start before marking late.</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Late Threshold (Minutes)</Label>
                                            <Input
                                                type="number"
                                                value={formData.late_threshold || ""}
                                                onChange={(e) => handleChange("late_threshold", e.target.value)}
                                            />
                                            <p className="text-[0.8rem] text-muted-foreground">Additional buffer for calculating late status.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Behavior Flags */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-foreground/80">System Logic</h4>
                                    <div className="space-y-4 border rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="flex flex-col">
                                                <span>Allow Multiple Time-ins</span>
                                                <span className="font-normal text-muted-foreground text-xs">Enables split shifts or multiple entries per day.</span>
                                            </Label>
                                            <Switch
                                                checked={formData.allow_multi_checkin || false}
                                                onCheckedChange={(val) => handleChange("allow_multi_checkin", val)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label className="flex flex-col">
                                                <span>Prevent Duplicate Time-ins</span>
                                                <span className="font-normal text-muted-foreground text-xs">Blocks accidental double clicks or duplicate entries.</span>
                                            </Label>
                                            <Switch
                                                checked={formData.prevent_duplicate || false}
                                                onCheckedChange={(val) => handleChange("prevent_duplicate", val)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label className="flex flex-col">
                                                <span>Auto Time-out</span>
                                                <span className="font-normal text-muted-foreground text-xs">Automatically closes open sessions at midnight.</span>
                                            </Label>
                                            <Switch
                                                checked={formData.auto_checkout || false}
                                                onCheckedChange={(val) => handleChange("auto_checkout", val)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SECTION 4: Overtime Rules */}
                <TabsContent value="overtime" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                <Timer className="h-5 w-5 text-primary" />
                                Overtime Rules
                            </CardTitle>
                            <CardDescription>Settings for calculating extra working hours.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Allow Overtime</Label>
                                    <p className="text-sm text-muted-foreground">Enable overtime tracking for attendance records.</p>
                                </div>
                                <Switch
                                    checked={formData.allow_overtime || false}
                                    onCheckedChange={(val) => handleChange("allow_overtime", val)}
                                />
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold">Calculation Criteria</h4>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Label>Minimum OT Duration (Minutes)</Label>
                                            <Input
                                                type="number"
                                                value={formData.min_overtime_minutes || ""}
                                                onChange={(e) => handleChange("min_overtime_minutes", e.target.value)}
                                                disabled={!formData.allow_overtime}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Overtime Rate Multiplier</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={formData.overtime_rate || ""}
                                                onChange={(e) => handleChange("overtime_rate", e.target.value)}
                                                disabled={!formData.allow_overtime}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Rounding Rule</Label>
                                            <Select
                                                value={formData.ot_rounding}
                                                onValueChange={(val) => handleChange("ot_rounding", val)}
                                                disabled={!formData.allow_overtime}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select rounding" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Rounding</SelectItem>
                                                    <SelectItem value="15">Nearest 15 Minutes</SelectItem>
                                                    <SelectItem value="30">Nearest 30 Minutes</SelectItem>
                                                    <SelectItem value="60">Nearest Hour</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold">Approval Logic</h4>
                                    <div className="space-y-4 border rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="flex flex-col">
                                                <span>Require Admin Approval</span>
                                                <span className="font-normal text-muted-foreground text-xs">Overtime requires manual approval before counting.</span>
                                            </Label>
                                            <Switch
                                                checked={formData.require_ot_approval || false}
                                                onCheckedChange={(val) => handleChange("require_ot_approval", val)}
                                                disabled={!formData.allow_overtime}
                                            />
                                        </div>
                                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-900/50">
                                            <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                                Note: Overtime starts strictly after the scheduled Shift End time.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Footer Actions */}
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} loading={saving} size="lg" className="px-8">
                        <Save className="mr-2 h-4 w-4" />
                        Save Attendance Rules
                    </Button>
                </div>
            </Tabs>
        </div>
    );
}
