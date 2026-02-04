"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Coffee } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

export default function BreakSettingsPage() {
    const { settings, loading, saving, updateSettings } = useSettings();
    const [formData, setFormData] = useState({});
    const [isReady, setIsReady] = useState(false);
    const isInitialized = useRef(false);

    useEffect(() => {
        if (settings && Object.keys(settings).length > 0 && !isInitialized.current) {
            isInitialized.current = true;
            setFormData({
                // Break Duration & Limits
                break_duration: settings.break_duration || "90",
                max_breaks: settings.max_breaks || "1",
                max_break_duration: settings.max_break_duration || settings.break_duration || "90",

                // Break Time Window
                break_start_window: settings.break_start_window || "00:00",
                break_end_window: settings.break_end_window || "01:30",

                // Enforcement Settings
                auto_end_break: settings.auto_end_break === "1" || settings.auto_end_break === true ||
                    settings.auto_resume === "1" || settings.auto_resume === true,
                prevent_overlap_break: settings.prevent_overlap_break !== false && settings.prevent_overlap_break !== "0",
                break_penalty: settings.break_penalty === "1" || settings.break_penalty === true,
            });
            setIsReady(true);
        }
    }, [settings]);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        // Sync max_break_duration with break_duration
        const dataToSave = {
            ...formData,
            max_break_duration: formData.break_duration,
            auto_resume: formData.auto_end_break, // Keep both in sync
        };
        updateSettings(dataToSave);
    };

    if (loading || !isReady) {
        return (
            null
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h3 className="text-lg font-medium">Break Settings</h3>
                <p className="text-sm text-muted-foreground">
                    Configure break duration limits and policies for all employees.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Coffee className="h-5 w-5 text-primary" />
                        Break Configuration
                    </CardTitle>
                    <CardDescription>
                        Set break duration, limits, and enforcement rules.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Duration & Limits */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-foreground/80">Duration & Limits</h4>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                                    <Input
                                        id="breakDuration"
                                        type="number"
                                        value={formData.break_duration || ""}
                                        onChange={(e) => handleChange("break_duration", e.target.value)}
                                    />
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Standard allowed break time (e.g., 90 for 1 hour 30 minutes)
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="maxBreaks">Maximum Breaks Per Day</Label>
                                    <Input
                                        id="maxBreaks"
                                        type="number"
                                        value={formData.max_breaks || ""}
                                        onChange={(e) => handleChange("max_breaks", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Break Time Window */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-foreground/80">Break Time Window</h4>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label htmlFor="breakStart">Allowed Break Start (24-hour)</Label>
                                    <Input
                                        id="breakStart"
                                        type="text"
                                        placeholder="00:00"
                                        pattern="([01]\d|2[0-3]):?([0-5]\d)"
                                        value={formData.break_start_window || ""}
                                        onChange={(e) => handleChange("break_start_window", e.target.value)}
                                    />
                                    <p className="text-[0.8rem] text-muted-foreground">Format: HH:mm (e.g. 00:00 for Midnight)</p>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="breakEnd">Allowed Break End (24-hour)</Label>
                                    <Input
                                        id="breakEnd"
                                        type="text"
                                        placeholder="01:00"
                                        pattern="([01]\d|2[0-3]):?([0-5]\d)"
                                        value={formData.break_end_window || ""}
                                        onChange={(e) => handleChange("break_end_window", e.target.value)}
                                    />
                                    <p className="text-[0.8rem] text-muted-foreground">Format: HH:mm (e.g. 01:00 for 1 AM)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enforcement Settings */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground/80">Enforcement</h4>
                        <div className="space-y-4 border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <Label className="flex flex-col">
                                    <span>Auto-End Break</span>
                                    <span className="font-normal text-muted-foreground text-xs">
                                        Automatically end break when duration is exceeded
                                    </span>
                                </Label>
                                <Switch
                                    checked={formData.auto_end_break || false}
                                    onCheckedChange={(val) => handleChange("auto_end_break", val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="flex flex-col">
                                    <span>Prevent Overlap</span>
                                    <span className="font-normal text-muted-foreground text-xs">
                                        Ensure only one active break at a time
                                    </span>
                                </Label>
                                <Switch
                                    checked={formData.prevent_overlap_break || false}
                                    onCheckedChange={(val) => handleChange("prevent_overlap_break", val)}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="flex flex-col">
                                    <span>Break Overtime Penalty</span>
                                    <span className="font-normal text-muted-foreground text-xs">
                                        Apply penalty deductions for exceeding break time
                                    </span>
                                </Label>
                                <Switch
                                    checked={formData.break_penalty || false}
                                    onCheckedChange={(val) => handleChange("break_penalty", val)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
