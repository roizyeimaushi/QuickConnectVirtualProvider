"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { settingsApi } from "@/lib/api";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    const fetchSettings = async (isPolling = false) => {
        try {
            if (!isPolling) setLoading(true);
            const data = await settingsApi.getAll();
            setSettings(data);
        } catch {
            // console.warn("Failed to fetch settings (using defaults)", error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();

        // Poll every 60 seconds (not 5s) to reduce server load
        const interval = setInterval(() => {
            // Only poll when tab is visible to avoid wasting resources
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                fetchSettings(true);
            }
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const updateSettingsState = (newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return (
        <SettingsContext.Provider value={{ settings, loading, updateSettingsState, refetchSettings: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettingsContext must be used within a SettingsProvider");
    }
    return context;
}
