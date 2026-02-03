"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Mail, Sparkles, Server, Clock, Shield, Coffee } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { notificationsApi } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { useAuth } from "@/components/providers/auth-provider";

// System notifications for employees - stored in localStorage to track read status
const EMPLOYEE_SYSTEM_NOTIFICATIONS = [
    {
        id: "system-welcome",
        type: "server",
        icon: "sparkles",
        data: {
            title: "Welcome to QuickConnect!",
            message: "We're thrilled to have you on board. QuickConnect Virtual Agency is your all-in-one attendance management platform designed to make your work life easier.",
        },
    },
    {
        id: "system-attendance",
        type: "server",
        icon: "clock",
        data: {
            title: "Attendance Made Simple",
            message: "Confirm your attendance with just one tap. Your time-in, breaks, and time-out are all tracked automatically for accurate records.",
        },
    },
    {
        id: "system-breaks",
        type: "server",
        icon: "coffee",
        data: {
            title: "Break Time Management",
            message: "Take your scheduled breaks worry-free. Start and end breaks from your dashboard, and we'll handle the rest.",
        },
    },
    {
        id: "system-support",
        type: "server",
        icon: "shield",
        data: {
            title: "We're Here to Help",
            message: "Need assistance? Contact your supervisor or admin for any attendance-related concerns. Your success is our priority.",
        },
    },
];

// System notifications for admins
const ADMIN_SYSTEM_NOTIFICATIONS = [
    {
        id: "admin-welcome",
        type: "server",
        icon: "sparkles",
        data: {
            title: "Welcome, Administrator!",
            message: "You have full access to manage employees, schedules, attendance, and system settings. Let's make workforce management effortless.",
        },
    },
    {
        id: "admin-dashboard",
        type: "server",
        icon: "clock",
        data: {
            title: "Your Command Center",
            message: "Monitor real-time attendance, view daily reports, and track employee performance all from your dashboard.",
        },
    },
    {
        id: "admin-reports",
        type: "server",
        icon: "coffee",
        data: {
            title: "Powerful Reporting",
            message: "Generate comprehensive daily, monthly, and employee reports. Export data to Excel for further analysis and record-keeping.",
        },
    },
    {
        id: "admin-settings",
        type: "server",
        icon: "shield",
        data: {
            title: "System Configuration",
            message: "Customize attendance rules, break policies, and notification settings to match your organization's requirements.",
        },
    },
];

const getIconComponent = (iconName) => {
    switch (iconName) {
        case 'sparkles': return Sparkles;
        case 'clock': return Clock;
        case 'coffee': return Coffee;
        case 'shield': return Shield;
        default: return Server;
    }
};

export function NotificationsPopover() {
    const { isAuthenticated, token, user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [systemReadStatus, setSystemReadStatus] = useState({});
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const isEmployee = user?.role === 'employee';
    const isAdmin = user?.role === 'admin';

    // Get role-specific system notifications
    const SYSTEM_NOTIFICATIONS = isAdmin ? ADMIN_SYSTEM_NOTIFICATIONS : EMPLOYEE_SYSTEM_NOTIFICATIONS;

    // Load system notification read status from localStorage
    useEffect(() => {
        if (user?.id) {
            const storageKey = `system_notifications_read_${user.id}`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                setSystemReadStatus(JSON.parse(stored));
            }
        }
    }, [user?.id]);

    // Initial fetch of notifications
    const fetchNotifications = async () => {
        if (!isAuthenticated) return;

        try {
            const data = await notificationsApi.getAll();
            if (Array.isArray(data)) {
                setNotifications(data);
                // Count unread regular notifications
                const regularUnread = data.filter(n => !n.read_at).length;
                // Count unread system notifications
                const systemUnread = SYSTEM_NOTIFICATIONS.filter(n => !systemReadStatus[n.id]).length;
                setUnreadCount(regularUnread + systemUnread);
            }
        } catch (error) {
            // Suppress network errors completely in this component to avoid spam
            if (error?.status !== 401 && !error?.message?.includes('Network error')) {
                console.error("Failed to fetch notifications:", error.message || error);
            }
        }
    };

    // Setup SSE connection for real-time notifications
    const setupEventSource = () => {
        if (!isAuthenticated || !token) return;

        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }


        try {
            const apiUrl = API_BASE_URL;
            const streamUrl = `${apiUrl}/notifications/stream`;

            const startStream = async () => {
                try {
                    const response = await fetch(streamUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'text/event-stream',
                            'Authorization': `Bearer ${token}`,
                            'Cache-Control': 'no-cache',
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    setIsConnected(true);

                    let buffer = '';

                    while (true) {
                        const { value, done } = await reader.read();

                        if (done) {
                            setIsConnected(false);
                            reconnectTimeoutRef.current = setTimeout(setupEventSource, 3000);
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });

                        const events = buffer.split('\n\n');
                        buffer = events.pop() || '';

                        for (const event of events) {
                            if (!event.trim()) continue;

                            const lines = event.split('\n');
                            let eventType = '';
                            let eventData = '';

                            for (const line of lines) {
                                if (line.startsWith('event:')) {
                                    eventType = line.substring(6).trim();
                                } else if (line.startsWith('data:')) {
                                    eventData = line.substring(5).trim();
                                }
                            }

                            if (eventType === 'notification' && eventData) {
                                try {
                                    const parsed = JSON.parse(eventData);
                                    if (parsed.notifications) {
                                        setNotifications(parsed.notifications);
                                        const regularUnread = parsed.unreadCount || 0;
                                        const systemUnread = SYSTEM_NOTIFICATIONS.filter(n => !systemReadStatus[n.id]).length;
                                        setUnreadCount(regularUnread + systemUnread);
                                    }
                                } catch (e) {
                                    console.error('Failed to parse notification:', e);
                                }
                            } else if (eventType === 'connected') {
                                // SSE connection established
                            }
                        }
                    }
                } catch (error) {
                    console.error('SSE connection error:', error);
                    setIsConnected(false);
                    reconnectTimeoutRef.current = setTimeout(setupEventSource, 5000);
                }
            };

            startStream();
        } catch (error) {
            console.error('Failed to setup SSE:', error);
            setIsConnected(false);
        }
    };

    // Update unread count when system read status changes
    useEffect(() => {
        const regularUnread = notifications.filter(n => !n.read_at).length;
        const systemUnread = SYSTEM_NOTIFICATIONS.filter(n => !systemReadStatus[n.id]).length;
        setUnreadCount(regularUnread + systemUnread);
    }, [systemReadStatus, notifications, SYSTEM_NOTIFICATIONS]);

    useEffect(() => {
        if (!isAuthenticated) return;

        fetchNotifications();
        setupEventSource();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [isAuthenticated, token]);

    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open]);

    const handleMarkSystemAsRead = (id) => {
        if (!user?.id) return;

        const newStatus = { ...systemReadStatus, [id]: true };
        setSystemReadStatus(newStatus);

        const storageKey = `system_notifications_read_${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(newStatus));
    };

    const handleMarkAsRead = async (id) => {
        // Handle system notifications
        if (id.startsWith('system-')) {
            handleMarkSystemAsRead(id);
            return;
        }

        try {
            await notificationsApi.markAsRead(id);
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, read_at: new Date().toISOString() } : n
            ));
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            // Mark all regular notifications as read
            await notificationsApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));

            // Mark all system notifications as read (for employees)
            if (isEmployee && user?.id) {
                const allSystemRead = {};
                SYSTEM_NOTIFICATIONS.forEach(n => {
                    allSystemRead[n.id] = true;
                });
                setSystemReadStatus(allSystemRead);

                const storageKey = `system_notifications_read_${user.id}`;
                localStorage.setItem(storageKey, JSON.stringify(allSystemRead));
            }

            setUnreadCount(0);
        } catch (error) {
            console.error(error);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            return date.toLocaleString();
        } catch (e) {
            return dateStr;
        }
    };

    // Combine system notifications with regular notifications
    // User requested Admin notifications to show latest alerts ABOVE system messages
    const sortedRealNotifications = [...notifications].sort((a, b) => {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    let allNotifications;
    if (isAdmin) {
        allNotifications = [...sortedRealNotifications, ...SYSTEM_NOTIFICATIONS];
    } else {
        // Default behavior for employees (System messages first)
        allNotifications = [...SYSTEM_NOTIFICATIONS, ...sortedRealNotifications];
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600 animate-pulse ring-1 ring-background" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">Notifications</h4>
                        {isConnected && (
                            <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] text-green-600 font-medium">LIVE</span>
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-auto p-0 text-xs text-primary hover:text-primary/80">
                            Mark all as read
                        </Button>
                    )}
                </div>
                <Separator />
                <div
                    className="h-[300px] overflow-y-auto"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    <style jsx>{`
                        div::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                    {allNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] p-4 text-center text-muted-foreground">
                            <Mail className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {allNotifications.map((notification) => {
                                const isSystemNotification = notification.type === "server";
                                const isRead = isSystemNotification
                                    ? systemReadStatus[notification.id]
                                    : notification.read_at;
                                const IconComponent = isSystemNotification
                                    ? getIconComponent(notification.icon)
                                    : null;

                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${isSystemNotification
                                            ? `bg-gradient-to-r from-primary/5 to-transparent`
                                            : !isRead ? 'bg-primary/5' : ''
                                            }`}
                                        onClick={() => !isRead && handleMarkAsRead(notification.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {isSystemNotification ? (
                                                <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${!isRead ? 'bg-primary/15' : 'bg-muted/50'}`}>
                                                    <IconComponent className={`h-4 w-4 ${!isRead ? 'text-primary' : 'text-muted-foreground'}`} />
                                                </div>
                                            ) : (
                                                <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${!isRead ? 'bg-primary' : 'bg-transparent'}`} />
                                            )}
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm font-medium leading-none ${isSystemNotification && !isRead ? 'text-primary' : ''}`}>
                                                        {notification.data?.title || notification.title || "Notification"}
                                                    </p>
                                                    {!isRead && (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {notification.data?.message || notification.message || "You have a new alert."}
                                                </p>
                                                {notification.created_at && (
                                                    <p className="text-[10px] text-muted-foreground pt-1">
                                                        {formatTime(notification.created_at)}
                                                    </p>
                                                )}
                                                {isSystemNotification && (
                                                    <div className="flex items-center gap-1 pt-1">
                                                        <Server className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-[10px] text-muted-foreground font-medium">QuickConnect</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
