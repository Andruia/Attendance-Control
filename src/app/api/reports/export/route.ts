import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";
import { z } from "zod";

const exportRequestSchema = z.object({
  format: z.enum(["csv", "xlsx", "pdf"]).default("csv"),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  employeeFilter: z.array(z.string().uuid()).optional(),
  departmentFilter: z.string().optional(),
  statusFilter: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, ["admin", "supervisor"]);
  if (auth) return auth;

  try {
    const body = await request.json();
    const parsed = exportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { dateRange, employeeFilter } = parsed.data;

    // Build query conditions
    const conditions = [];
    conditions.push(gte(schema.timeEntries.deviceTs, new Date(dateRange.start)));
    conditions.push(lte(schema.timeEntries.deviceTs, new Date(dateRange.end + "T23:59:59Z")));

    if (employeeFilter && employeeFilter.length > 0) {
      conditions.push(
        // @ts-expect-error - drizzle ORM in array support
        schema.timeEntries.employeeId.in(employeeFilter),
      );
    }

    // Get time entries with employee info
    const entries = await db
      .select({
        id: schema.timeEntries.id,
        employeeId: schema.timeEntries.employeeId,
        type: schema.timeEntries.type,
        deviceTs: schema.timeEntries.deviceTs,
        serverTs: schema.timeEntries.serverTs,
        employeeName: schema.employees.name,
        employeeEmail: schema.employees.email,
        departmentId: schema.employees.departmentId,
      })
      .from(schema.timeEntries)
      .leftJoin(schema.employees, eq(schema.timeEntries.employeeId, schema.employees.id))
      .where(and(...conditions))
      .orderBy(schema.timeEntries.deviceTs);

    // Transform to export rows (group by employee/date)
    const rows = entries.map((entry) => ({
      date: entry.deviceTs.toISOString().slice(0, 10),
      employeeName: entry.employeeName ?? "Unknown",
      employeeEmail: entry.employeeEmail ?? "",
      department: entry.departmentId ?? "",
      clockIn: entry.type === "clock_in" ? entry.deviceTs.toISOString() : "",
      clockOut: entry.type === "clock_out" ? entry.deviceTs.toISOString() : "",
      breakDuration: "",
      totalHours: "",
      overtimeHours: "",
      status: entry.type,
    }));

    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
