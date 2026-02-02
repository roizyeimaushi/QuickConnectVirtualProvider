"use client";

import { useState } from "react";
import { settingsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSettingsContext } from "@/components/providers/settings-provider";

export function useSettings() {
    const { settings, loading: contextLoading, updateSettingsState } = useSettingsContext();
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const updateSettings = async (newSettings) => {
        try {
            setSaving(true);
            // newSettings can be partial
            await settingsApi.update(newSettings);

            updateSettingsState(newSettings);

            toast({
                title: "Success",
                description: "Settings updated successfully",
            });
            return true;
        } catch (error) {
            console.error("Failed to update settings:", error);
            toast({
                title: "Error",
                description: "Failed to update settings",
                variant: "destructive",
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    return {
        settings,
        loading: contextLoading,
        saving,
        updateSettings,
        setLocalSettings: updateSettingsState,
    };
}
