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
        } catch (error) {
            // console.warn("Failed to fetch settings (using defaults)", error);
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        const interval = setInterval(() => fetchSettings(true), 5000);
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
