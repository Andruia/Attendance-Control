import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, verifyClockToken } from "./jwt";

export type Role = "employee" | "supervisor" | "admin";

/**
 * Authenticate a request using the session token cookie.
 * Injects employee info into request headers for downstream handlers.
 */
export async function authenticateRequest(
  request: NextRequest,
  allowedRoles?: Role[],
): Promise<NextResponse | null> {
  try {
    const token =
      request.cookies.get("session_token")?.value ??
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const payload = await verifySessionToken(token);

    // Role check
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(payload.role as Role)) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 },
        );
      }
    }

    // Forward employee info to downstream
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-employee-id", payload.employeeId);
    requestHeaders.set("x-employee-role", payload.role);
    if (payload.companyId) {
      requestHeaders.set("x-company-id", payload.companyId);
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }
}

/**
 * Authenticate a clock action request using the clock token.
 */
export async function authenticateClockAction(
  request: NextRequest,
): Promise<NextResponse | null> {
  try {
    const token =
      request.cookies.get("clock_token")?.value ??
      request.headers.get("x-clock-token") ??
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Clock token required" },
        { status: 401 },
      );
    }

    const payload = await verifyClockToken(token);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-employee-id", payload.employeeId);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired clock token" },
      { status: 401 },
    );
  }
}

/**
 * Helper to get employee ID from request headers (set by middleware).
 */
export function getEmployeeId(request: NextRequest): string | null {
  return request.headers.get("x-employee-id");
}

/**
 * Helper to get employee role from request headers.
 */
export function getEmployeeRole(request: NextRequest): Role | null {
  return request.headers.get("x-employee-role") as Role | null;
}
