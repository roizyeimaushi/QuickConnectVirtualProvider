"use client";

import { useState, useEffect, useRef } from "react";
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

import { Save, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSettings } from "@/hooks/use-settings";
import { settingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function GeneralSettingsPage() {
    const { settings, loading, saving, updateSettings, setLocalSettings } = useSettings();
    const [formData, setFormData] = useState({
        company_name: "",
        timezone: "Asia/Manila",
        language: "en",
        date_format: "ymd",
        time_format: "24h",
        system_logo: "/logo.png"
    });
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();
    const isInitialized = useRef(false);

    // Sync settings to formData ONLY once when first loaded
    // This prevents polling from overwriting user's in-progress changes
    useEffect(() => {
        if (settings && Object.keys(settings).length > 0 && !isInitialized.current) {
            isInitialized.current = true;
            setFormData({
                company_name: settings.company_name || "",
                timezone: settings.timezone || "Asia/Manila",
                language: settings.language || "en",
                date_format: (settings.date_format === "YYYY-MM-DD" ? "ymd" :
                    settings.date_format === "MM/DD/YYYY" ? "mdy" :
                        settings.date_format === "DD/MM/YYYY" ? "dmy" :
                            settings.date_format) || "ymd",
                time_format: (settings.time_format === "24-hour" ? "24h" :
                    settings.time_format === "12-hour" ? "12h" :
                        settings.time_format) || "24h",
                system_logo: settings.system_logo || "/logo.png",
            });
        }
    }, [settings]);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        updateSettings(formData);
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("logo", file);

        try {
            setUploading(true);
            const response = await settingsApi.uploadLogo(formData);

            // Update local state with new logo URL
            handleChange("system_logo", response.url);
            // Update global context immediately
            setLocalSettings({ system_logo: response.url });

            toast({
                title: "Success",
                description: "Logo uploaded successfully",
            });
        } catch (error) {
            console.error("Upload failed", error);
            toast({
                title: "Error",
                description: "Failed to upload logo",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="space-y-0">
                <h3 className="text-lg font-medium">General Settings</h3>
                <p className="text-sm text-muted-foreground">
                    Set up company details and system preferences.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">System Information</CardTitle>
                    <CardDescription>
                        These details appear throughout the application.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>System Logo</Label>
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={formData.system_logo} />
                                <AvatarFallback>QC</AvatarFallback>
                            </Avatar>
                            <div className="relative">
                                <input
                                    type="file"
                                    id="logo-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById('logo-upload').click()}
                                    loading={uploading}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Logo
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                value={formData.company_name || ""}
                                onChange={(e) => handleChange("company_name", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timezone">Timezone</Label>
                            <Select
                                value={formData.timezone}
                                onValueChange={(val) => handleChange("timezone", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Asia/Manila">Asia/Manila (GMT+8)</SelectItem>
                                    <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                                    <SelectItem value="America/New_York">New York (EST/EDT)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="language">Default Language</Label>
                            <Input
                                id="language"
                                value="English"
                                disabled
                                className="bg-muted text-muted-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dateFormat">Date Format</Label>
                            <Select
                                value={formData.date_format}
                                onValueChange={(val) => handleChange("date_format", val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                                    <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timeFormat">Time Format</Label>
                            <Select
                                value="24h"
                                onValueChange={(val) => handleChange("time_format", "24h")}
                                disabled
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="24h">24-hour (Strict)</SelectItem>
                                </SelectContent>
                            </Select>
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
        </div >
    );
}
