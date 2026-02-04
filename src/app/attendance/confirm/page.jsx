"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { attendanceApi, sessionsApi, reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime24, getCurrentDate, getCurrentTime } from "@/lib/utils";
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    Fingerprint,
    Loader2,
    Calendar,
    Timer,
    MapPin,
    Shield,
    Laptop,
    Smartphone,
    Globe
} from "lucide-react";

// Helper to detect device info
const getDeviceInfo = () => {
    if (typeof window === 'undefined') return {};

    const ua = navigator.userAgent;
    let browser = "Unknown";
    let os = "Unknown";
    let deviceType = "Desktop";
    let deviceName = "Unknown Device";

    // Browser Detection
    if (ua.indexOf("Firefox") > -1) browser = "Mozilla Firefox";
    else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Internet";
    else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
    else if (ua.indexOf("Trident") > -1) browser = "Microsoft Internet Explorer";
    else if (ua.indexOf("Edge") > -1) browser = "Microsoft Edge";
    else if (ua.indexOf("Chrome") > -1) browser = "Google Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Apple Safari";

    // OS Detection
    if (ua.indexOf("Win") > -1) os = "Windows";
    else if (ua.indexOf("Mac") > -1) os = "MacOS";
    else if (ua.indexOf("Linux") > -1) os = "Linux";
    else if (ua.indexOf("Android") > -1) os = "Android";
    else if (ua.indexOf("like Mac") > -1) os = "iOS";

    // Device Type
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        deviceType = "Tablet";
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        deviceType = "Mobile";
    }

    // Attempt to guess device name from OS/Browser context (very limited)
    if (os === "MacOS" || os === "iOS") deviceName = "Apple Device";
    else if (os === "Android") deviceName = "Android Device";
    else if (os === "Windows") deviceName = "Windows PC";

    return {
        device_type: deviceType,
        device_name: deviceName,
        browser: browser,
        os: os
    };
};

function LiveClockCard() {
    const [time, setTime] = useState(getCurrentTime());
    const [date, setDate] = useState(getCurrentDate());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(getCurrentTime());
            setDate(getCurrentDate());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = time.split(":")[0];
    const minutes = time.split(":")[1];

    return (
        <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground p-8">
                <div className="text-center">
                    <p className="text-sm opacity-80 mb-2">Current Time</p>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
                            <span className="text-6xl font-bold font-mono">{hours}</span>
                        </div>
                        <span className="text-6xl font-bold animate-pulse">:</span>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
                            <span className="text-6xl font-bold font-mono">{minutes}</span>
                        </div>
                    </div>
                    <p className="text-lg opacity-90">
                        {formatDate(date, "EEEE, MMMM d, yyyy")}
                    </p>
                </div>
            </div>
        </Card>
    );
}

function SessionInfoCard({ session, loading, isWeekend }) {

function AttendanceConfirmationCard({ session, canConfirm, onConfirm, confirming, loading, checkInMessage, checkInReason, todayRecord, isWeekend, locationState }) {

export default function AttendanceConfirmPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [session, setSession] = useState(null);
    const [todayRecord, setTodayRecord] = useState(null);
    const [canConfirm, setCanConfirm] = useState(false);
    const [checkInMessage, setCheckInMessage] = useState("");
    const [checkInReason, setCheckInReason] = useState("UNKNOWN_REASON");
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [isWeekend, setIsWeekend] = useState(false);

    // Device and Location State
    const [deviceInfo, setDeviceInfo] = useState({});
    const [locationState, setLocationState] = useState({
        loading: true,
        coords: null,
        address: null,
        error: null,
        city: null,
        country: null
    });

    // Detect Device Info on Mount
    useEffect(() => {
        setDeviceInfo(getDeviceInfo());
    }, []);

    // Helper: Restore location from localStorage (cache for 1 hour)
    const getCachedLocation = () => {
        if (typeof window === 'undefined') return null;
        try {
            const cached = localStorage.getItem('user_location_cache');
            if (cached) {
                const data = JSON.parse(cached);
                const age = new Date().getTime() - data.timestamp;
                if (age < 3600000) { // 1 Hour Cache
                    return data;
                }
            }
        } catch (e) { }
        return null;
    };

    // Helper: Reverse Geocode (Get address from lat/lng)
    const reverseGeocode = async (lat, lng) => {
        try {
            // Using OSM Nominatim (Free, no key required, lightweight)
            // Note: In production enterprise, consider Google Maps or Paid API for reliability
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await res.json();

            if (data && data.address) {
                const city = data.address.city || data.address.town || data.address.village || data.address.county;
                const country = data.address.country;
                const fullAddress = data.display_name;

                return { city, country, address: fullAddress };
            }
        } catch (error) {
            console.error("Reverse geocode failed:", error);
        }
        return { city: null, country: null, address: "Unknown Location" };
    };

    // Detect Location Logic
    const detectLocation = useCallback(async () => {
        setLocationState(prev => ({ ...prev, loading: true, error: null }));

        // Check Cache First
        const cached = getCachedLocation();
        if (cached) {
            setLocationState({
                loading: false,
                coords: cached.coords,
                address: cached.address,
                city: cached.city,
                country: cached.country,
                error: null
            });
            return;
        }

        if (!navigator.geolocation) {
            setLocationState(prev => ({ ...prev, loading: false, error: "Geolocation is not supported by your browser." }));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Get Address
                const { city, country, address } = await reverseGeocode(latitude, longitude);

                // Cache it
                localStorage.setItem('user_location_cache', JSON.stringify({
                    timestamp: new Date().getTime(),
                    coords: { latitude, longitude },
                    address,
                    city,
                    country
                }));

                setLocationState({
                    loading: false,
                    coords: { latitude, longitude },
                    address,
                    city,
                    country,
                    error: null
                });
            },
            (error) => {
                console.error("Geolocation error:", error.message, error);
                let errorMessage = "Failed to get location.";
                // Use standard numeric codes for safety: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
                switch (error.code) {
                    case 1: // PERMISSION_DENIED
                        errorMessage = "Location permission denied. Please enable location services.";
                        break;
                    case 2: // POSITION_UNAVAILABLE
                        errorMessage = "Location information is unavailable.";
                        break;
                    case 3: // TIMEOUT
                        errorMessage = "The request to get user location timed out.";
                        break;
                    default:
                        errorMessage = error.message || "An unknown location error occurred.";
                }
                setLocationState(prev => ({ ...prev, loading: false, error: errorMessage }));
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            }
        );
    }, []);

    // Initial Location Check (Trigger immediately for seamless UX)
    useEffect(() => {
        detectLocation();
    }, [detectLocation]);

    const fetchSessionData = useCallback(async (isPolling = false) => {
        try {
            if (!isPolling) setLoading(true);
            const response = await reportsApi.getEmployeeDashboard();

            if (response.is_weekend || response.no_work_today) {
                setIsWeekend(true);
                setSession(null);
                setTodayRecord(null);
                setCanConfirm(false);
                setCheckInMessage(response.check_in_message || "No work scheduled for today. Enjoy your day off!");
                setCheckInReason("weekend");
                if (!isPolling) setLoading(false);
                return;
            } else {
                setIsWeekend(false);
            }

            if (response.active_session) {
                setSession(response.active_session);
            } else {
                setSession(null);
            }

            setTodayRecord(response.today_record || null);

            if (response.today_record) {
                const rec = response.today_record;
                if (rec.time_out) {
                    setCanConfirm(false);
                    setCheckInMessage("You have already timed out for today.");
                    setCheckInReason("ALREADY_TIMED_OUT");
                } else if (rec.time_in && rec.status !== 'pending') {
                    setCanConfirm(false);
                    setCheckInMessage("You have already timed in for today.");
                    setCheckInReason("ALREADY_TIMED_IN");
                } else {
                    setCanConfirm(response.can_confirm ?? true);
                    setCheckInMessage(response.check_in_message || "");
                    setCheckInReason(response.check_in_reason || "");
                }
            } else {
                setCanConfirm(response.can_confirm ?? true);
                setCheckInMessage(response.check_in_message || "");
                setCheckInReason(response.check_in_reason || "");
            }
        } catch (error) {
            if (error.status === 401 || error.message === 'Unauthorized') return;

            // Only log errors if not polling, and suppress network errors
            if (!isPolling && !error?.message?.includes('Network error')) {
                console.error("Failed to fetch session:", error.message || error);
            }
            if (!isPolling) {
                toast({
                    title: "Error",
                    description: "Failed to load session data",
                    variant: "destructive",
                });
            }
        } finally {
            if (!isPolling) setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSessionData();
        const interval = setInterval(() => fetchSessionData(true), 15000); // 15 seconds
        return () => clearInterval(interval);
    }, [fetchSessionData]);

    const handleConfirmAttendance = async () => {
        if (confirming || !session) return;

        // Block if location is still loading and hasn't errored
        if (locationState.loading) {
            toast({
                title: "Locating...",
                description: "Please wait while we verify your location.",
                variant: "default",
            });
            return;
        }

        setConfirming(true);

        try {
            // Include device and location data in the request payload
            const payload = {
                device_type: deviceInfo.device_type,
                device_name: deviceInfo.device_name,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                latitude: locationState.coords?.latitude,
                longitude: locationState.coords?.longitude,
                location_address: locationState.address,
                location_city: locationState.city,
                location_country: locationState.country,
            };

            await attendanceApi.confirm(session.id, payload);

            setCanConfirm(false);
            await fetchSessionData();

            toast({
                title: "Timed In Successfully!",
                description: `Your time in has been recorded at ${getCurrentTime()}.`,
                variant: "success",
            });
        } catch (error) {
            console.error('Time In Error:', error);

            // Build a user-friendly error message
            let errorMessage = 'Please try again';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.error) {
                errorMessage = error.error;
            }

            // Add error code if available
            if (error.error_code) {
                errorMessage += ` (Code: ${error.error_code})`;
            }

            toast({
                title: "Failed to Time In",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setConfirming(false);
        }
    };

    return (
        <DashboardLayout title="Time In">
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        Time In
                    </h1>
                    <p className="text-muted-foreground">
                        Record your start time for today's work session
                    </p>
                </div>

                {/* Live Clock */}
                <LiveClockCard />

                {/* Device & Location Status (Only show to admins - employees should not see their location/device info) */}
                {(!isWeekend && session && user?.role === 'admin') && (
                    <LocationStatusCard locationState={locationState} deviceInfo={deviceInfo} />
                )}

                {/* Session Info */}
                <SessionInfoCard session={session} loading={loading} isWeekend={isWeekend} />

                {/* Confirmation Card */}
                <AttendanceConfirmationCard
                    session={session}
                    canConfirm={canConfirm}
                    onConfirm={handleConfirmAttendance}
                    confirming={confirming}
                    loading={loading}
                    checkInMessage={checkInMessage}
                    checkInReason={checkInReason}
                    todayRecord={todayRecord}
                    isWeekend={isWeekend}
                    locationState={locationState}
                />
            </div>
        </DashboardLayout>
    );
}
