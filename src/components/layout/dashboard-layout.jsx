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
import { Skeleton } from "@/components/ui/skeleton";
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
import { getLogoUrl, getAvatarUrl } from "@/lib/constants";
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
    const { user, logout, isAdmin, loading } = useAuth();
    const { settings } = useSettingsContext();
    const pathname = usePathname();
    const navItems = getNavigationItems(user);
    const { setOpen } = useSidebar();
    const sidebarScrollRef = React.useRef(null);

    const hideSidebar = pathname.startsWith("/settings") ||
        pathname === "/dashboard/admin/profile" ||
        pathname === "/dashboard/employee/profile" ||
        pathname === "/dashboard/admin/change-password";

    React.useEffect(() => {
        if (hideSidebar) {
            setOpen(false);
        }
    }, [pathname, hideSidebar, setOpen]);

    // Restore sidebar scroll position on mount
    React.useEffect(() => {
        const savedScroll = sessionStorage.getItem("sidebar-scroll-pos");
        if (savedScroll && sidebarScrollRef.current) {
            // Use a small timeout to ensure content is fully rendered
            setTimeout(() => {
                if (sidebarScrollRef.current) {
                    sidebarScrollRef.current.scrollTop = parseInt(savedScroll);
                }
            }, 0);
        }
    }, []);

    const handleSidebarScroll = (e) => {
        sessionStorage.setItem("sidebar-scroll-pos", e.currentTarget.scrollTop.toString());
    };

    const logoUrl = getLogoUrl(settings?.system_logo);

    const { state, isMobile } = useSidebar();
    const isCollapsed = state === "collapsed" && !isMobile;

    const userProfileButton = (
        <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-white/5 rounded-lg transition-all p-2 h-12"
        >
            {loading ? (
                <Skeleton className="h-8 w-8 rounded-full bg-white/10 shrink-0" />
            ) : (
                <Avatar className="h-8 w-8 rounded-full border border-white/10 shrink-0">
                    <AvatarImage src={getAvatarUrl(user?.avatar)} alt={user?.first_name} />
                    <AvatarFallback className="rounded-full bg-white/10 text-white text-xs font-bold">
                        {getInitials(user?.first_name, user?.last_name)}
                    </AvatarFallback>
                </Avatar>
            )}
            <div className="grid flex-1 text-left text-sm leading-tight ml-2.5 group-data-[collapsible=icon]:hidden overflow-hidden">
                {loading ? (
                    <>
                        <Skeleton className="h-3 w-20 mb-1.5 bg-white/10" />
                        <Skeleton className="h-2 w-24 bg-white/5" />
                    </>
                ) : (
                    <>
                        <span className="truncate font-bold text-white text-[13px]">
                            {user?.first_name} {user?.last_name}
                        </span>
                        <span className="truncate text-[11px] text-white/40 font-medium capitalize">
                            {user?.role === 'admin' ? "Administrator" : (user?.role || "Staff Member")}
                        </span>
                    </>
                )}
            </div>
            <ChevronRight className="ml-auto size-3.5 text-white/20 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden shrink-0" />
        </SidebarMenuButton>
    );

    const ProfileMenuItems = ({ isCollapsible = false }) => (
        <div className={isCollapsible ? "space-y-1 mb-2" : "space-y-1"}>


            <Link
                href={isAdmin ? "/dashboard/admin/profile" : "/dashboard/employee/profile"}
                scroll={false}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isCollapsible ? 'hover:bg-white/5 text-white/60 hover:text-white' : 'hover:bg-white/5 text-white/70 focus:bg-white/5 focus:text-white'}`}
            >
                <User className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-[13px] font-medium">Profile</span>
            </Link>

            {isAdmin && (
                <Link
                    href="/settings/general"
                    scroll={false}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isCollapsible ? 'hover:bg-white/5 text-white/60 hover:text-white' : 'hover:bg-white/5 text-white/70 focus:bg-white/5 focus:text-white'}`}
                >
                    <Settings className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-[13px] font-medium">Settings</span>
                </Link>
            )}

            {isCollapsible && <div className="h-px bg-white/5 my-1 mx-2" />}

            <button
                onClick={logout}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left ${isCollapsible ? 'hover:bg-red-500/10 text-red-400/80 hover:text-red-400' : 'hover:bg-red-500/10 text-red-400 focus:bg-red-500/10 focus:text-red-400'}`}
            >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="text-[13px] font-bold">Logout</span>
            </button>
        </div>
    );

    return (
        <Sidebar collapsible="icon" className="border-r border-white/5">
            <SidebarHeader className="p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="hover:bg-transparent transition-all">
                            <Link href={isAdmin ? "/dashboard/admin" : "/dashboard/employee"} scroll={false} className="flex items-center gap-3">
                                <div className="flex items-center justify-center shrink-0">
                                    <img
                                        src={logoUrl}
                                        alt="Logo"
                                        className="h-8 w-auto object-contain"
                                        onError={(e) => {
                                            e.currentTarget.src = "/quickconnect-logo.png";
                                            e.currentTarget.onerror = null;
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden transition-all duration-300">
                                    <span className="font-bold text-[16px] text-white tracking-tight leading-none">
                                        {settings?.company_name || "QuickConn Virtual"}
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent
                ref={sidebarScrollRef}
                onScroll={handleSidebarScroll}
                className="px-2 scrollbar-hidden"
            >
                {navItems.map((group) => (
                    <SidebarGroup key={group.label} className="mt-4">
                        <SidebarGroupLabel className="text-[12px] font-medium text-white/60 px-4 mb-2 group-data-[collapsible=icon]:hidden">
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
                                                        <SidebarMenuButton
                                                            tooltip={item.title}
                                                            className={`h-10 px-3 rounded-lg transition-all ${shouldBeOpen ? 'bg-white/5' : 'hover:bg-white/5 group/btn'}`}
                                                        >
                                                            <Icon className={`size-4 ${isActive || isSubItemActive ? 'text-white' : 'text-white/50 group-hover/btn:text-white'}`} />
                                                            <span className="text-white text-[13.5px] group-data-[collapsible=icon]:hidden">{item.title}</span>
                                                            <ChevronRight className="ml-auto size-3.5 text-white/30 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                                                        </SidebarMenuButton>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="animate-collapsible-down group-data-[collapsible=icon]:hidden">
                                                        <SidebarMenuSub className="border-l border-white/10 ml-5 pl-3 mt-1 gap-1">
                                                            {item.items.map((subItem) => (
                                                                <SidebarMenuSubItem key={subItem.title}>
                                                                    <SidebarMenuSubButton
                                                                        asChild
                                                                        isActive={pathname === subItem.url}
                                                                        className={`rounded-md h-9 px-3 transition-all ${pathname === subItem.url ? 'bg-primary/20 text-white font-medium' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                                                    >
                                                                        <Link href={subItem.url} scroll={false}>
                                                                            <span className="text-[13px]">{subItem.title}</span>
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
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                tooltip={item.title}
                                                className={`h-10 px-3 rounded-lg transition-all ${isActive ? 'bg-primary text-white font-medium' : 'hover:bg-white/5 text-white/60 hover:text-white group/btn'}`}
                                            >
                                                <Link href={item.url} scroll={false}>
                                                    <Icon className={`size-4 ${isActive ? 'text-white' : 'text-white/50 group-hover/btn:text-white'}`} />
                                                    <span className="text-[13.5px] group-data-[collapsible=icon]:hidden">{item.title}</span>
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

            <SidebarFooter className="p-3 border-t border-white/5">
                <SidebarMenu>
                    <SidebarMenuItem className="group/collapsible">
                        {isCollapsed ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    {userProfileButton}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-64 rounded-xl shadow-2xl border-white/10 p-2 bg-[#0a1f16] text-white"
                                    side="right"
                                    align="end"
                                    sideOffset={8}
                                >
                                    <ProfileMenuItems />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Collapsible>
                                <CollapsibleTrigger asChild>
                                    {userProfileButton}
                                </CollapsibleTrigger>
                                <CollapsibleContent className="animate-collapsible-down px-1 pt-1 mt-1 border-t border-white/5">
                                    <ProfileMenuItems isCollapsible />
                                </CollapsibleContent>
                            </Collapsible>
                        )}
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
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors" />
                <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block" />
                <Breadcrumb className="hidden md:block">
                    <BreadcrumbList>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={crumb.href}>
                                {index > 0 && <BreadcrumbSeparator />}
                                <BreadcrumbItem>
                                    {crumb.isLast ? (
                                        <BreadcrumbPage className="font-bold text-primary">{crumb.label}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild className="text-muted-foreground hover:text-foreground">
                                            <Link href={crumb.href} scroll={false}>
                                                {crumb.label}
                                            </Link>
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
                {!hideHeader && <AppSidebar />}
                <SidebarInset className={`flex flex-col flex-1 min-w-0 bg-transparent ${!hideHeader ? 'lg:border-l' : ''} border-border/10`}>
                    {!hideHeader && <DashboardHeader title={title} />}
                    <main
                        className="flex-1 overflow-y-auto scrollbar-hidden no-scroll-jump"
                        onScroll={(e) => {
                            // Only save if it's a real scroll event
                            if (e.currentTarget.scrollTop > 0) {
                                sessionStorage.setItem(`scroll-pos-${pathname}`, e.currentTarget.scrollTop.toString());
                            }
                        }}
                        ref={(el) => {
                            if (el) {
                                const saved = sessionStorage.getItem(`scroll-pos-${pathname}`);
                                if (saved) el.scrollTop = parseInt(saved);
                            }
                        }}
                    >
                        <div className="mx-auto w-full max-w-[1600px] min-h-[calc(100vh-64px)] flex flex-col">
                            <div className="flex-1 p-4 sm:p-6 lg:p-10 animate-fade-in">
                                {children}
                            </div>
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
