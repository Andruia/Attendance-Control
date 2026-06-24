import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db, schema } from "@/infrastructure/db";
import { issueSessionToken, issueClockToken, issueRefreshToken } from "@/infrastructure/auth/jwt";
import { z } from "zod";

const verifyPinSchema = z.object({
  pin: z.string().min(4).max(6).regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyPinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "PIN must be 4-6 digits", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { pin } = parsed.data;

    // Find employee by PIN hash (iterate and compare since PIN isn't an indexed field)
    // In production, consider storing a salted PIN prefix index for faster lookup
    const employees = await db
      .select()
      .from(schema.employees)
      .limit(50);

    let matchedEmployee: typeof schema.employees.$inferSelect | null = null;

    for (const emp of employees) {
      const isValid = await bcrypt.compare(pin, emp.pinHash);
      if (isValid) {
        matchedEmployee = emp;
        break;
      }
    }

    if (!matchedEmployee) {
      return NextResponse.json(
        { error: "Invalid PIN" },
        { status: 401 },
      );
    }

    // Issue tokens
    const sessionToken = await issueSessionToken(
      matchedEmployee.id,
      matchedEmployee.role,
      matchedEmployee.departmentId ?? undefined,
    );
    const clockToken = await issueClockToken(matchedEmployee.id);
    const refreshToken = await issueRefreshToken(matchedEmployee.id);

    const response = NextResponse.json(
      {
        employeeId: matchedEmployee.id,
        name: matchedEmployee.name,
        role: matchedEmployee.role,
        sessionToken,
      },
      { status: 200 },
    );

    // Set cookies
    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 30, // 30 min
    });

    response.cookies.set("clock_token", clockToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 5, // 5 min
    });

    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("PIN verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
