import { NextResponse } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/auth/login", "/auth/admin/login", "/auth/employee/login", "/auth/logout"];

// Admin-only routes
const adminRoutes = [
    "/dashboard/admin",
    "/employees",
    "/schedules",
    "/attendance/sessions",
    "/attendance/reports",
    "/audit-logs",
];

// Employee-only routes
const employeeRoutes = [
    "/dashboard/employee",
    "/attendance/confirm",
    "/attendance/history",
];

export function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get("quickcon_token")?.value;

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        // If already logged in, redirect to dashboard (client routes by role)
        if (token && pathname.startsWith("/auth/")) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return NextResponse.next();
    }

    // Check if user is authenticated
    if (!token) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    const role = request.cookies.get("quickcon_role")?.value;

    // Role-based protection to avoid "flash" of unauthorized content
    if (role) {
        // 1. Employee trying to access Admin routes
        if (role === "employee" && adminRoutes.some(route => pathname.startsWith(route))) {
            return NextResponse.redirect(new URL("/dashboard/employee", request.url));
        }

        // 2. Admin trying to access Employee routes
        if (role === "admin" && employeeRoutes.some(route => pathname.startsWith(route))) {
            return NextResponse.redirect(new URL("/dashboard/admin", request.url));
        }

        // 3. Generic dashboard redirect
        if (pathname === "/dashboard") {
            const target = role === "admin" ? "/dashboard/admin" : "/dashboard/employee";
            return NextResponse.redirect(new URL(target, request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         * - api routes
         */
        "/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
    ],
};
