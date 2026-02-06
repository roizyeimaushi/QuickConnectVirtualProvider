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
import { getLogoUrl } from "@/lib/constants";
import { NotificationsPopover } from "@/components/notifications-popover";

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
    const { user, logout, isAdmin } = useAuth();
    const { settings } = useSettingsContext();
    const pathname = usePathname();
    const navItems = getNavigationItems(user);
    const { setOpen, isMobile } = useSidebar();

    const hideSidebar = pathname.startsWith("/settings") ||
        pathname === "/dashboard/admin/profile" ||
        pathname === "/dashboard/employee/profile" ||
        pathname === "/dashboard/admin/change-password";

    React.useEffect(() => {
        if (hideSidebar) {
            setOpen(false);
        }
    }, [pathname, hideSidebar, setOpen]);

    const logoUrl = getLogoUrl(settings?.system_logo);

    return (
        <Sidebar collapsible={hideSidebar ? "offcanvas" : "icon"} className="border-r border-sidebar-border shadow-md transition-all duration-300">
            <SidebarHeader className="p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-sidebar-accent transition-colors">
                            <Link href={isAdmin ? "/dashboard/admin" : "/dashboard/employee"} className="flex items-center gap-3">
                                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary/10 overflow-hidden ring-1 ring-primary/20">
                                    <img
                                        src={logoUrl}
                                        alt="Logo"
                                        className="size-8 object-contain"
                                        onError={(e) => {
                                            e.currentTarget.src = "/quickconnect-logo.png";
                                            e.currentTarget.onerror = null;
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col items-start leading-none group-data-[collapsible=icon]:hidden">
                                    <span className="font-bold text-lg text-sidebar-foreground truncate w-40">
                                        {settings?.company_name || "QuickConn"}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                                        Virtual Management
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-2">
                {navItems.map((group) => (
                    <SidebarGroup key={group.label} className="mt-4">
                        <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-4 mb-2">
                            {group.label}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-1">
                                {group.items.map((item) => {
                                    const Icon = iconMap[item.icon] || LayoutDashboard;
                                    const isActive = item.url
                                        ? (pathname === item.url || pathname.startsWith(item.url + "/"))
                                        : false;

                                    const isSubItemActive = item.items?.some(subItem =>
                                        pathname === subItem.url || pathname.startsWith(subItem.url + "/")
                                    ) || false;

                                    const shouldBeOpen = isActive || isSubItemActive;

                                    if (item.items) {
                                        return (
                                            <Collapsible key={item.title} asChild defaultOpen={shouldBeOpen}>
                                                <SidebarMenuItem>
                                                    <CollapsibleTrigger asChild>
                                                        <SidebarMenuButton tooltip={item.title} className={`py-6 px-4 rounded-xl ${shouldBeOpen ? 'bg-sidebar-accent/50' : ''}`}>
                                                            <Icon className={`size-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                                            <span className="font-medium">{item.title}</span>
                                                            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                        </SidebarMenuButton>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="animate-collapsible-down pl-4">
                                                        <SidebarMenuSub className="border-l border-sidebar-border/50 ml-6 pl-4 mt-1 gap-1">
                                                            {item.items.map((subItem) => (
                                                                <SidebarMenuSubItem key={subItem.title}>
                                                                    <SidebarMenuSubButton
                                                                        asChild
                                                                        isActive={pathname === subItem.url}
                                                                        className="rounded-lg py-4"
                                                                    >
                                                                        <Link href={subItem.url}>
                                                                            <span className="text-sm">{subItem.title}</span>
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
                                            <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="py-6 px-4 rounded-xl">
                                                <Link href={item.url}>
                                                    <Icon className={`size-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    <span className="font-medium">{item.title}</span>
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

            <SidebarFooter className="p-4 border-t border-sidebar-border/50 bg-sidebar/50">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent rounded-xl"
                                >
                                    <Avatar className="h-9 w-9 rounded-lg ring-1 ring-primary/20">
                                        <AvatarImage src={user?.avatar} alt={user?.first_name} />
                                        <AvatarFallback className="rounded-lg bg-primary/20 text-primary font-bold">
                                            {getInitials(user?.first_name, user?.last_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                                        <span className="truncate font-bold">
                                            {user?.first_name} {user?.last_name}
                                        </span>
                                        <span className="truncate text-[10px] uppercase text-muted-foreground">
                                            {isAdmin ? "Administrator" : "Employee"}
                                        </span>
                                    </div>
                                    <ChevronRight className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-64 rounded-xl shadow-xl border-border/50 p-2"
                                side="right"
                                align="end"
                                sideOffset={8}
                            >
                                <DropdownMenuLabel className="px-3 py-4 font-normal">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Signed in as</p>
                                        <p className="text-sm font-bold truncate">{user?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="my-2" />
                                <DropdownMenuItem className="cursor-pointer rounded-lg py-3" asChild>
                                    <Link href={isAdmin ? "/dashboard/admin/profile" : "/dashboard/employee/profile"}>
                                        <User className="mr-3 h-4 w-4" />
                                        Profile Overview
                                    </Link>
                                </DropdownMenuItem>
                                {isAdmin && (
                                    <DropdownMenuItem className="cursor-pointer rounded-lg py-3" asChild>
                                        <Link href="/settings/general">
                                            <Settings className="mr-3 h-4 w-4" />
                                            System Settings
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="my-2" />
                                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-3" onClick={logout}>
                                    <LogOut className="mr-3 h-4 w-4" />
                                    Log Out Securely
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
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 transition-all">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="h-9 w-9 border shadow-sm rounded-lg hover:bg-muted" />
                <Separator orientation="vertical" className="h-6 hidden sm:block" />
                <Breadcrumb className="hidden md:block">
                    <BreadcrumbList>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.href}>
                                {index > 0 && <BreadcrumbSeparator />}
                                <BreadcrumbItem>
                                    {crumb.isLast ? (
                                        <BreadcrumbPage className="font-bold text-primary">{crumb.label}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink href={crumb.href} className="text-muted-foreground hover:text-foreground">
                                            {crumb.label}
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </React.Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="flex items-center gap-3">
                <NotificationsPopover />
                {children}
            </div>
        </header>
    );
}

export function DashboardLayout({ children, title }) {
    const pathname = usePathname();

    const hideHeader = pathname.startsWith("/settings") ||
        pathname === "/dashboard/admin/profile" ||
        pathname === "/dashboard/employee/profile" ||
        pathname === "/dashboard/admin/change-password";

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-[#f8f8ff] dark:bg-slate-950 overflow-hidden">
                <AppSidebar />
                <SidebarInset className="flex flex-col flex-1 min-w-0 bg-transparent lg:border-l border-border/10">
                    {!hideHeader && <DashboardHeader title={title} />}
                    <main className="flex-1 overflow-y-auto scrollbar-hidden">
                        <div className="mx-auto w-full max-w-[1600px] min-h-[calc(100vh-64px)] flex flex-col">
                            <div className="flex-1 p-4 sm:p-6 lg:p-10 animate-fade-in">
                                {children}
                            </div>

                            {/* Dashboard Footer */}
                            <footer className="p-4 sm:p-6 border-t border-border/5 bg-background/50 text-[10px] sm:text-xs text-muted-foreground/60 flex items-center justify-between">
                                <p>© 2026 QuickConnect Virtual Management. All rights reserved.</p>
                            </footer>
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
