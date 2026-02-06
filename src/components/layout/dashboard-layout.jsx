"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { getNavigationItems } from "@/lib/permissions";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { useSettingsContext } from "@/components/providers/settings-provider";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    Building2,
    ChevronRight,
    LogOut,
    Settings,
    User,
    LayoutDashboard,
    Users,
    Calendar,
    ClipboardCheck,
    FileText,
    History,
    CheckCircle2,
    BarChart3,
    Key,
    Timer,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/constants";
import { NotificationsPopover } from "@/components/notifications-popover";

// ... imports

const iconMap = {
    LayoutDashboard,
    Users,
    Calendar,
    ClipboardCheck,
    FileText,
    History,
    CheckCircle2,
    BarChart3,
    Timer,
    LogOut,
    User,
    Key,
    Settings,
};

export function AppSidebar() {
    const { user, logout, isAdmin, loading } = useAuth();
    const { settings } = useSettingsContext();
    const pathname = usePathname();
    const navItems = getNavigationItems(user);
    const { setOpen } = useSidebar();

    // specific paths to hide sidebar
    const hideSidebar = pathname.startsWith("/settings") ||
        pathname === "/dashboard/admin/profile" ||
        pathname === "/dashboard/employee/profile" ||
        pathname === "/dashboard/admin/change-password";

    React.useEffect(() => {
        if (hideSidebar) {
            setOpen(false);
        }
    }, [pathname, hideSidebar]);



    // Construct properly prefixed logo URL if it's a relative path from backend
    const logoUrl = React.useMemo(() => {
        if (!settings?.system_logo) return "/quickconnect-logo.png";
        if (settings.system_logo.startsWith("http")) return settings.system_logo;

        // Handle Laravel storage paths
        const backendRoot = API_BASE_URL.replace("/api", "");
        return `${backendRoot}/storage/${settings.system_logo.replace(/^\/?storage\//, "")}`;
    }, [settings?.system_logo]);

    return (
        <Sidebar collapsible={hideSidebar ? "offcanvas" : "icon"}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={isAdmin ? "/dashboard/admin" : "/dashboard/employee"}>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                                    <img
                                        src={logoUrl}
                                        alt="Logo"
                                        className="size-8 object-contain"
                                        onError={(e) => {
                                            e.currentTarget.src = "/quickconnect-logo.png";
                                            e.currentTarget.onerror = null; // Prevent infinite loop
                                        }}
                                    />
                                </div>
                                <div className="flex flex-1 items-center text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                    <span className="truncate font-semibold">{settings?.company_name || "QuickConn Virtual"}</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {navItems.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const Icon = iconMap[item.icon] || LayoutDashboard;

                                    // For items with sub-items, check if ANY sub-item URL matches
                                    const isActive = item.url
                                        ? (pathname === item.url || pathname.startsWith(item.url + "/"))
                                        : false;

                                    // Check if any sub-item is active (for keeping submenu open)
                                    const isSubItemActive = item.items?.some(subItem =>
                                        pathname === subItem.url || pathname.startsWith(subItem.url + "/")
                                    ) || false;

                                    // Submenu should be open if parent is active OR any sub-item is active
                                    const shouldBeOpen = isActive || isSubItemActive;

                                    if (item.items) {
                                        return (
                                            <Collapsible key={item.title} asChild defaultOpen={shouldBeOpen}>
                                                <SidebarMenuItem>
                                                    <CollapsibleTrigger asChild>
                                                        <SidebarMenuButton tooltip={item.title}>
                                                            <Icon className="size-4" />
                                                            <span>{item.title}</span>
                                                            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                        </SidebarMenuButton>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent>
                                                        <SidebarMenuSub>
                                                            {item.items.map((subItem) => (
                                                                <SidebarMenuSubItem key={subItem.title}>
                                                                    <SidebarMenuSubButton
                                                                        asChild
                                                                        isActive={pathname === subItem.url}
                                                                    >
                                                                        <Link href={subItem.url}>
                                                                            <span>{subItem.title}</span>
                                                                        </Link>
                                                                    </SidebarMenuSubButton>
                                                                </SidebarMenuSubItem>
                                                            ))}
                                                        </SidebarMenuSub>
                                                    </CollapsibleContent>
                                                </SidebarMenuItem>
                                            </Collapsible>
                                        );
                                    }

                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                                                <Link href={item.url}>
                                                    <Icon className="size-4" />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8 rounded-full">
                                        <AvatarImage src={user?.avatar} alt={user?.first_name} />
                                        <AvatarFallback className="rounded-full bg-primary/20 text-primary">
                                            {getInitials(user?.first_name, user?.last_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">
                                            {isAdmin ? "Admin User" : "My Account"}
                                        </span>
                                        <span className="truncate text-xs capitalize text-muted-foreground">
                                            {user?.first_name} {user?.last_name}
                                        </span>
                                    </div>
                                    <ChevronRight className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="bottom"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="p-0 font-normal">
                                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                        <Avatar className="h-8 w-8 rounded-full">
                                            <AvatarImage src={user?.avatar} alt={user?.first_name} />
                                            <AvatarFallback className="rounded-full">
                                                {getInitials(user?.first_name, user?.last_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">
                                                {user?.first_name} {user?.last_name}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {user?.email}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer" asChild>
                                    <Link href={isAdmin ? "/dashboard/admin/profile" : "/dashboard/employee/profile"}>
                                        <User className="mr-2 h-4 w-4" />
                                        {isAdmin ? "Profile" : "My Profile"}
                                    </Link>
                                </DropdownMenuItem>
                                {isAdmin && (
                                    <DropdownMenuItem className="cursor-pointer" asChild>
                                        <Link href="/settings/general">
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                {isAdmin && (
                                    <DropdownMenuItem className="cursor-pointer" asChild>
                                        <Link href="/dashboard/admin/change-password">
                                            <Key className="mr-2 h-4 w-4" />
                                            Change Password
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={logout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}

export function DashboardHeader({ title, children }) {
    const pathname = usePathname();
    const { isAdmin } = useAuth();

    const getBreadcrumbs = () => {
        const paths = pathname.split("/").filter(Boolean);
        const breadcrumbs = [];
        let currentPath = "";

        paths.forEach((path, index) => {
            currentPath += `/${path}`;
            const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");
            breadcrumbs.push({
                label,
                href: currentPath,
                isLast: index === paths.length - 1,
            });
        });

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbs.map((crumb, index) => (
                            <div key={crumb.href} className="flex items-center gap-2">
                                {index > 0 && <BreadcrumbSeparator />}
                                <BreadcrumbItem>
                                    {crumb.isLast ? (
                                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </div>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="ml-auto flex items-center gap-2">
                {/* Notifications bell - All users */}
                <NotificationsPopover />
                {children}
            </div>
        </header>
    );
}

export function DashboardLayout({ children, title }) {
    const pathname = usePathname();

    // Updated hide logic for new routes
    const hideHeader = pathname.startsWith("/settings") ||
        pathname === "/dashboard/admin/profile" ||
        pathname === "/dashboard/employee/profile" ||
        pathname === "/dashboard/admin/change-password";

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="overflow-x-hidden">
                {!hideHeader && <DashboardHeader title={title} />}
                <div className="flex-1 w-full overflow-auto p-4 md:p-6 lg:p-8">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
