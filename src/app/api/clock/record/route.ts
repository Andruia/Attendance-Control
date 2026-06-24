import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateClockAction } from "@/infrastructure/auth/middleware";
import { clockActionSchema } from "@/domain/time-entry/validation";

export async function POST(request: NextRequest) {
  // Authenticate using clock token
  const authResult = await authenticateClockAction(request);
  if (authResult) return authResult; // Error response

  try {
    const body = await request.json();
    const parsed = clockActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { employeeId, type, deviceTs } = parsed.data;

    // Verify the employee from token matches the request body
    const tokenEmployeeId = request.headers.get("x-employee-id");
    if (tokenEmployeeId && tokenEmployeeId !== employeeId) {
      return NextResponse.json(
        { error: "Employee ID mismatch" },
        { status: 403 },
      );
    }

    // Check if employee exists
    const employee = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, employeeId))
      .limit(1);

    if (employee.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Create time entry with server timestamp
    const serverTs = new Date();
    const deviceDate = new Date(deviceTs);

    // Calculate drift (server vs device)
    const driftMinutes = Math.round(
      (serverTs.getTime() - deviceDate.getTime()) / 60000,
    );

    const [entry] = await db
      .insert(schema.timeEntries)
      .values({
        employeeId,
        type,
        deviceTs: deviceDate,
        serverTs,
        isPending: false,
        driftMinutes: Math.abs(driftMinutes) > 5 ? driftMinutes : null, // Flag only if >5min drift
      })
      .returning();

    return NextResponse.json(
      {
        id: entry.id,
        type: entry.type,
        serverTs: entry.serverTs?.toISOString(),
        status: "ok",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Clock record error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
