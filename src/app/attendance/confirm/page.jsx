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
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";

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
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        );
    }

    // Weekend - Show friendly "No Work Today" message
    if (isWeekend) {
        return (
            <Card className="border-sky-200 dark:border-sky-900/50 bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/30">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mb-4">
                        <Calendar className="h-8 w-8 text-sky-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-sky-700 dark:text-sky-400 mb-2">No Work Today</h3>
                    <p className="text-sm text-sky-600/80 dark:text-sky-400/80 max-w-sm">
                        It's the weekend! No shifts are scheduled for today. Enjoy your time off and we'll see you on Monday.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!session) {
        return (
            <Card className="border-amber-200 dark:border-amber-900/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                        <AlertCircle className="h-8 w-8 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Active Session</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        There is no attendance session open at the moment. Please wait for your administrator to open one.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Session Details
                    </CardTitle>
                    <Badge className="bg-emerald-500 animate-pulse">ACTIVE</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Timer className="h-4 w-4" />
                            <span className="text-xs">Time In</span>
                        </div>
                        <p className="text-2xl font-bold font-mono">{formatTime24(session.schedule?.time_in)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs">Time Out</span>
                        </div>
                        <p className="text-2xl font-bold font-mono">{formatTime24(session.schedule?.time_out)}</p>
                    </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Schedule</span>
                        <span className="font-medium">{session.schedule?.name || "Night Shift"}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function LocationStatusCard({ locationState, deviceInfo }) {
    const { loading, error, address, coords } = locationState;

    // Determine status icon and color
    let statusColor = "text-muted-foreground";
    let statusBg = "bg-muted";
    let statusText = "Ready to detect";

    if (loading) {
        statusText = "Detecting location...";
        statusColor = "text-blue-500";
        statusBg = "bg-blue-100 dark:bg-blue-900/20";
    } else if (error) {
        statusText = "Location detection failed";
        statusColor = "text-red-500";
        statusBg = "bg-red-100 dark:bg-red-900/20";
    } else if (coords) {
        statusText = "Location Detected";
        statusColor = "text-emerald-500";
        statusBg = "bg-emerald-100 dark:bg-emerald-900/20";
    }

    const DeviceIcon = deviceInfo.device_type === 'Mobile' ? Smartphone : Laptop;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Device & Location Verification
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                {/* Device Info */}
                <div className="p-3 rounded-lg border bg-card/50 flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <DeviceIcon className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Device Detected</p>
                        <p className="font-semibold text-sm">{deviceInfo.os} • {deviceInfo.browser}</p>
                        <p className="text-xs text-muted-foreground mt-1">{deviceInfo.device_type}</p>
                    </div>
                </div>

                {/* Location Info */}
                <div className={`p-3 rounded-lg border flex items-start gap-3 ${error ? 'border-red-200 bg-red-50/50' : 'bg-card/50'}`}>
                    <div className={`p-2 rounded-full ${statusBg} ${statusColor}`}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Real-time Location</p>
                            {coords && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-emerald-200 text-emerald-700 bg-emerald-50">
                                    Trusted
                                </Badge>
                            )}
                        </div>

                        {address ? (
                            <p className="font-semibold text-sm truncate" title={address}>
                                {address}
                            </p>
                        ) : error ? (
                            <div className="flex flex-col">
                                <p className="font-semibold text-sm text-red-600">Location unavailable</p>
                                <p className="text-xs text-red-500 mt-1">{error}</p>
                            </div>
                        ) : (
                            <p className="font-semibold text-sm text-muted-foreground">Waiting for permission...</p>
                        )}

                        {coords && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                                {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function AttendanceConfirmationCard({ session, canConfirm, onConfirm, confirming, loading, checkInMessage, checkInReason, todayRecord, isWeekend, locationState }) {
    if (loading) {
        return (
            <Card className="col-span-full">
                <CardContent className="p-8">
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        );
    }

    // On weekends, don't show the confirmation card (SessionInfoCard handles the message)
    if (isWeekend) {
        return null;
    }

    if (!session) {
        return null;
    }

    // Case 1: Already checked OUT - show completed message
    if (todayRecord && todayRecord.time_out) {
        // Official Check-in Window opens at 18:00
        const nextCheckIn = "18:00";
        return (
            <Card className="col-span-full border-[#7C3AED]/30 bg-purple-50/50 dark:bg-purple-950/20">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <CheckCircle2 className="h-12 w-12 text-[#7C3AED]" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-[#7C3AED] mb-2">
                        Already Timed Out
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                        You have already completed your shift for today. Time-in opens again at {nextCheckIn} tomorrow.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Case 2: Already checked IN (has time_in) - show confirmed message
    if (todayRecord && todayRecord.time_in && todayRecord.status !== 'pending') {
        return (
            <Card className="col-span-full border-[#2563EB]/30 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative mb-6">
                        <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <CheckCircle2 className="h-12 w-12 text-[#2563EB]" />
                        </div>
                        {locationState.address && (
                            <div className="absolute -bottom-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-blue-200 shadow-sm whitespace-nowrap left-1/2 transform -translate-x-1/2">
                                <MapPin className="h-3 w-3" />
                                <span className="max-w-[150px] truncate">{locationState.address.split(',')[0]}</span>
                            </div>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-[#2563EB] mb-2">
                        Attendance Confirmed!
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                        Your attendance has been successfully recorded for today's session.
                        {todayRecord.status === 'late' && " (You were marked late)"}
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Case 3: Cannot Confirm (Blocked - Too Early, Too Late, etc.)
    if (!canConfirm) {
        return (
            <Card className="col-span-full border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
                        <AlertCircle className="h-12 w-12 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">
                        Time In Unavailable
                    </h2>
                    <p className="text-lg font-medium text-red-600 dark:text-red-300 mb-2">
                        {checkInMessage || "You cannot time in at this moment."}
                    </p>

                </CardContent>
            </Card>
        );
    }

    // Case 4: Ready to Confirm (pending record or no record)
    return (
        <Card className="col-span-full overflow-hidden">
            <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">Ready to Time In?</CardTitle>
                <CardDescription>
                    Tap the button below to record your start time
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pb-8">
                <button
                    onClick={onConfirm}
                    disabled={confirming || locationState.loading}
                    className="group relative w-48 h-48 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <div className="absolute inset-2 rounded-full bg-primary/20 animate-ping opacity-20" />
                    <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center">
                        {confirming || locationState.loading ? (
                            <div className="flex flex-col items-center">
                                <Loader2 className="h-16 w-16 animate-spin mb-2" />
                                {locationState.loading && <span className="text-xs opacity-80">Locating...</span>}
                            </div>
                        ) : (
                            <>
                                <Fingerprint className="h-16 w-16 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-semibold text-lg">Time In</span>
                            </>
                        )}
                    </div>
                </button>
                <p className="mt-6 text-sm text-muted-foreground text-center max-w-sm">
                    By timing in, you acknowledge your presence at work for today's session.
                    {locationState.coords ? " Your device and location have been verified." : ""}
                </p>
                {locationState.error && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Location check failed: {locationState.error}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

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

    if (loading) {
        return null;
    }

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
