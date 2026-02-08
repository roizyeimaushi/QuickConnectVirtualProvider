"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Loader2 } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

export default function NotificationsSettingsPage() {
    const { settings, loading, saving, updateSettings } = useSettings();
    const [formData, setFormData] = useState({});
    const [isReady, setIsReady] = useState(false);
    const isInitialized = useRef(false);

    // Initialize formData ONLY once when settings first load
    // This prevents the 5-second polling from overwriting user's in-progress changes
    useEffect(() => {
        if (settings && Object.keys(settings).length > 0 && !isInitialized.current) {
            isInitialized.current = true;
            setFormData({
                late_alerts: settings.late_alerts === "1" || settings.late_alerts === true,
                absent_alerts: settings.absent_alerts === "1" || settings.absent_alerts === true,
                break_alerts: settings.break_alerts === "1" || settings.break_alerts === true,
                notify_email: settings.notify_email === "1" || settings.notify_email === true,
                notify_sms: settings.notify_sms === "1" || settings.notify_sms === true,
                notify_inapp: settings.notify_inapp === "1" || settings.notify_inapp === true,
            });
            setIsReady(true);
        }
    }, [settings]);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        updateSettings(formData);
    };

    if (loading || !isReady) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h3 className="text-lg font-medium">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                    Manage alert types and delivery methods.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl font-semibold">Alert Configuration</CardTitle>
                    <CardDescription>
                        Enable or disable different alert types.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between space-x-2 p-3 rounded-lg border bg-muted/5">
                        <Label htmlFor="late-alerts" className="flex flex-col space-y-1 cursor-pointer">
                            <span className="font-medium">Late Arrival Alerts</span>
                            <span className="font-normal text-xs text-muted-foreground">Alerts admins when an employee arrives late.</span>
                        </Label>
                        <Switch
                            id="late-alerts"
                            checked={formData.late_alerts || false}
                            onCheckedChange={(val) => handleChange("late_alerts", val)}
                        />
                    </div>
                    <div className="flex items-center justify-between space-x-2 p-3 rounded-lg border bg-muted/5">
                        <Label htmlFor="absent-alerts" className="flex flex-col space-y-1 cursor-pointer">
                            <span className="font-medium">Absent Alerts</span>
                            <span className="font-normal text-xs text-muted-foreground">Alerts admins about daily absences.</span>
                        </Label>
                        <Switch
                            id="absent-alerts"
                            checked={formData.absent_alerts || false}
                            onCheckedChange={(val) => handleChange("absent_alerts", val)}
                        />
                    </div>
                    <div className="flex items-center justify-between space-x-2 p-3 rounded-lg border bg-muted/5">
                        <Label htmlFor="break-alerts" className="flex flex-col space-y-1 cursor-pointer">
                            <span className="font-medium">Break Overtime Alerts</span>
                            <span className="font-normal text-xs text-muted-foreground">Alerts when break duration is exceeded.</span>
                        </Label>
                        <Switch
                            id="break-alerts"
                            checked={formData.break_alerts || false}
                            onCheckedChange={(val) => handleChange("break_alerts", val)}
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <Label className="text-base font-semibold">Notification Delivery</Label>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-center justify-between p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="inapp"
                                        checked={formData.notify_inapp || false}
                                        onCheckedChange={(val) => handleChange("notify_inapp", val)}
                                    />
                                    <Label htmlFor="inapp" className="flex flex-col space-y-0.5 cursor-pointer">
                                        <span className="font-medium text-sm">In-app Alerts</span>
                                        <span className="text-[10px] text-muted-foreground">Instant alerts in-app.</span>
                                    </Label>
                                </div>
                                <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">Real-time</span>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="email"
                                        checked={formData.notify_email || false}
                                        onCheckedChange={(val) => handleChange("notify_email", val)}
                                    />
                                    <Label htmlFor="email" className="flex flex-col space-y-0.5 cursor-pointer">
                                        <span className="font-medium text-sm">Email Alerts</span>
                                        <span className="text-[10px] text-muted-foreground">Send reports via email.</span>
                                    </Label>
                                </div>
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Reliable</span>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-xl bg-card shadow-sm opacity-60">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="sms"
                                        disabled
                                        checked={formData.notify_sms || false}
                                        onCheckedChange={(val) => handleChange("notify_sms", val)}
                                    />
                                    <Label htmlFor="sms" className="flex flex-col space-y-0.5">
                                        <span className="font-medium text-sm">SMS Alerts</span>
                                        <span className="text-[10px] text-muted-foreground text-orange-600 font-medium italic">Premium Feature</span>
                                    </Label>
                                </div>
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Locked</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleSave} loading={saving}>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
