"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

export default function SecuritySettingsPage() {
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
                "2fa_enabled": settings["2fa_enabled"] === "1" || settings["2fa_enabled"] === true,
                session_timeout: settings.session_timeout || "30",
                max_login_attempts: settings.max_login_attempts || "5",
                pass_min_length: settings.pass_min_length || "8",
                pass_special_chars: settings.pass_special_chars === "1" || settings.pass_special_chars === true,
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
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h3 className="text-lg font-medium">Security</h3>
                <p className="text-sm text-muted-foreground">
                    Configure access controls and authentication settings.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Access Control</CardTitle>
                    <CardDescription>
                        Manage authentication and session settings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">


                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                            <Input
                                id="sessionTimeout"
                                type="number"
                                value={formData.session_timeout || ""}
                                onChange={(e) => handleChange("session_timeout", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Automatic logout after inactivity.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                            <Input
                                id="loginAttempts"
                                type="number"
                                value={formData.max_login_attempts || ""}
                                onChange={(e) => handleChange("max_login_attempts", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Account locks after reaching this limit.</p>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                        <Label className="text-base">Password Policy</Label>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="minLength" className="font-normal text-sm">Minimum Length</Label>
                                <Input
                                    id="minLength"
                                    type="number"
                                    value={formData.pass_min_length || ""}
                                    onChange={(e) => handleChange("pass_min_length", e.target.value)}
                                />
                            </div>
                            <div className="flex items-center justify-between border rounded-lg p-3 h-full">
                                <Label htmlFor="specialChars" className="font-normal text-sm cursor-pointer">Require Special Char</Label>
                                <Switch
                                    id="specialChars"
                                    checked={formData.pass_special_chars || false}
                                    onCheckedChange={(val) => handleChange("pass_special_chars", val)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleSave} loading={saving}>
                            <Save className="mr-2 h-4 w-4" />
                            Save Security Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
