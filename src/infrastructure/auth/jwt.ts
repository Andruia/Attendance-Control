import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "default-dev-secret-change-in-production",
);

const CLOCK_SECRET = new TextEncoder().encode(
  process.env.JWT_CLOCK_SECRET ?? "default-clock-secret-change-in-production",
);

export interface SessionPayload extends JWTPayload {
  employeeId: string;
  role: "employee" | "supervisor" | "admin";
  companyId?: string;
}

export interface ClockTokenPayload extends JWTPayload {
  employeeId: string;
  type: "clock";
}

/**
 * Issue a short-lived session JWT for admin/supervisor dashboard access.
 * 30-minute expiry with 7-day refresh token.
 */
export async function issueSessionToken(employeeId: string, role: string, companyId?: string): Promise<string> {
  return await new SignJWT({ employeeId, role, companyId } as SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .setIssuer("attendance-control")
    .sign(JWT_SECRET);
}

/**
 * Issue a very short-lived clock token (5 min) — just enough for a clock action.
 */
export async function issueClockToken(employeeId: string): Promise<string> {
  return await new SignJWT({ employeeId, type: "clock" } as ClockTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setIssuer("attendance-control")
    .sign(CLOCK_SECRET);
}

/**
 * Verify and decode a session token.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET, {
    issuer: "attendance-control",
  });
  return payload as unknown as SessionPayload;
}

/**
 * Verify and decode a clock token.
 */
export async function verifyClockToken(token: string): Promise<ClockTokenPayload> {
  const { payload } = await jwtVerify(token, CLOCK_SECRET, {
    issuer: "attendance-control",
  });
  return payload as unknown as ClockTokenPayload;
}

/**
 * Issue a long-lived refresh token (7 days).
 */
export async function issueRefreshToken(employeeId: string): Promise<string> {
  return await new SignJWT({ employeeId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("attendance-control")
    .sign(JWT_SECRET);
}
