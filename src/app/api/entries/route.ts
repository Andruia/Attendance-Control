import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest, getEmployeeId } from "@/infrastructure/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, ["employee", "supervisor", "admin"]);
  if (auth) return auth;

  try {
    const employeeId = getEmployeeId(request);
    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Default: last 30 days
    const toDate = to ? new Date(to + "T23:59:59Z") : new Date();
    const fromDate = from
      ? new Date(from + "T00:00:00Z")
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const entries = await db
      .select({
        id: schema.timeEntries.id,
        type: schema.timeEntries.type,
        deviceTs: schema.timeEntries.deviceTs,
      })
      .from(schema.timeEntries)
      .where(
        and(
          eq(schema.timeEntries.employeeId, employeeId),
          gte(schema.timeEntries.deviceTs, fromDate),
          lte(schema.timeEntries.deviceTs, toDate),
        ),
      )
      .orderBy(schema.timeEntries.deviceTs);

    // Group entries by date
    const grouped: Record<
      string,
      {
        date: string;
        clockIn: Date | null;
        pauseStart: Date | null;
        pauseEnd: Date | null;
        clockOut: Date | null;
      }
    > = {};

    for (const entry of entries) {
      const dateKey = entry.deviceTs.toISOString().slice(0, 10);
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          clockIn: null,
          pauseStart: null,
          pauseEnd: null,
          clockOut: null,
        };
      }
      const day = grouped[dateKey];
      switch (entry.type) {
        case "clock_in":
          day.clockIn = entry.deviceTs;
          break;
        case "pause_start":
          day.pauseStart = entry.deviceTs;
          break;
        case "pause_end":
          day.pauseEnd = entry.deviceTs;
          break;
        case "clock_out":
          day.clockOut = entry.deviceTs;
          break;
      }
    }

    // Calculate hours per day
    const result = Object.values(grouped)
      .map((day) => {
        let morningHours = 0;
        let afternoonHours = 0;

        if (day.clockIn && day.pauseStart) {
          morningHours =
            (day.pauseStart.getTime() - day.clockIn.getTime()) / (1000 * 60 * 60);
        }
        if (day.pauseEnd && day.clockOut) {
          afternoonHours =
            (day.clockOut.getTime() - day.pauseEnd.getTime()) / (1000 * 60 * 60);
        }
        // If no pause, use clock_in to clock_out as total
        if (day.clockIn && day.clockOut && !day.pauseStart && !day.pauseEnd) {
          morningHours =
            (day.clockOut.getTime() - day.clockIn.getTime()) / (1000 * 60 * 60);
        }

        const totalHours = Math.round((morningHours + afternoonHours) * 100) / 100;

        return {
          date: day.date,
          clockIn: day.clockIn?.toISOString() ?? null,
          pauseStart: day.pauseStart?.toISOString() ?? null,
          pauseEnd: day.pauseEnd?.toISOString() ?? null,
          clockOut: day.clockOut?.toISOString() ?? null,
          morningHours: Math.round(morningHours * 100) / 100,
          afternoonHours: Math.round(afternoonHours * 100) / 100,
          totalHours,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

    // Calculate summaries
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalHoursThisWeek = result
      .filter((d) => new Date(d.date) >= weekStart)
      .reduce((sum, d) => sum + d.totalHours, 0);

    const totalHoursThisMonth = result
      .filter((d) => new Date(d.date) >= monthStart)
      .reduce((sum, d) => sum + d.totalHours, 0);

    return NextResponse.json({
      entries: result,
      summary: {
        totalHoursThisWeek: Math.round(totalHoursThisWeek * 100) / 100,
        totalHoursThisMonth: Math.round(totalHoursThisMonth * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Entries fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
