import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "default-dev-secret-change-in-production",
);

// Routes that require authentication
const protectedRoutes = ["/clock", "/history", "/team", "/settings", "/users", "/reports"];

// Routes that require admin role
const adminRoutes = ["/settings", "/users"];

// Routes that require admin or supervisor role
const supervisorRoutes = ["/reports", "/team"];

// Public routes (no auth needed)
const publicRoutes = ["/login", "/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith("/api/"))) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // Get session token
  const token = request.cookies.get("session_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "attendance-control",
    });

    const role = payload.role as string;

    // Check admin routes
    if (adminRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/clock", request.url));
      }
    }

    // Check supervisor routes
    if (supervisorRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      if (role !== "admin" && role !== "supervisor") {
        return NextResponse.redirect(new URL("/clock", request.url));
      }
    }

    // Add employee info to headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-employee-id", payload.employeeId as string);
    requestHeaders.set("x-employee-role", role);
    if (payload.companyId) {
      requestHeaders.set("x-company-id", payload.companyId as string);
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    // Invalid or expired token
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
