import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";
import { calculateOvertime } from "@/domain/overtime/calculator";
import type { OvertimeConfig, TimeEntryBatch } from "@/domain/overtime/config";
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

/** Default overtime config when no company config exists */
const DEFAULT_OVERTIME_CONFIG: OvertimeConfig = {
  dailyThresholdMinutes: 480,
  weeklyThresholdMinutes: 2880,
  roundingMinutes: 15,
  roundingStrategy: "nearest",
  multiplier1_25xMinutes: 480,
  multiplier1_5xHours: 0,
  multiplier2xWeekends: false,
};

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
        employeeName: schema.employees.name,
        employeeEmail: schema.employees.email,
        departmentId: schema.employees.departmentId,
      })
      .from(schema.timeEntries)
      .leftJoin(schema.employees, eq(schema.timeEntries.employeeId, schema.employees.id))
      .where(and(...conditions))
      .orderBy(schema.timeEntries.deviceTs);

    // Fetch overtime config (company-level)
    const companyId = request.headers.get("x-company-id");
    let overtimeConfig = DEFAULT_OVERTIME_CONFIG;
    if (companyId) {
      const [config] = await db
        .select()
        .from(schema.overtimeConfigs)
        .where(eq(schema.overtimeConfigs.companyId, companyId))
        .limit(1);
      if (config) {
        overtimeConfig = {
          dailyThresholdMinutes: config.dailyThresholdMinutes,
          weeklyThresholdMinutes: config.weeklyThresholdMinutes,
          roundingMinutes: config.roundingMinutes,
          roundingStrategy: config.roundingStrategy as OvertimeConfig["roundingStrategy"],
          multiplier1_25xMinutes: config.multiplier1_25xMinutes,
          multiplier1_5xHours: config.multiplier1_5xHours,
          multiplier2xWeekends: config.multiplier2xWeekends,
        };
      }
    }

    // Group entries by employee + date
    type EntryGroup = {
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
      departmentId: string;
      date: string;
      clockIn: Date | null;
      clockOut: Date | null;
      pauses: Array<{ start: Date; end: Date }>;
    };

    const groups: Record<string, EntryGroup> = {};

    for (const entry of entries) {
      const dateKey = entry.deviceTs.toISOString().slice(0, 10);
      const groupKey = `${entry.employeeId}_${dateKey}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          employeeId: entry.employeeId,
          employeeName: entry.employeeName ?? "Unknown",
          employeeEmail: entry.employeeEmail ?? "",
          departmentId: entry.departmentId ?? "",
          date: dateKey,
          clockIn: null,
          clockOut: null,
          pauses: [],
        };
      }

      const group = groups[groupKey];
      switch (entry.type) {
        case "clock_in":
          group.clockIn = entry.deviceTs;
          break;
        case "clock_out":
          group.clockOut = entry.deviceTs;
          break;
        case "pause_start":
          group.pauses.push({ start: entry.deviceTs, end: new Date(0) });
          break;
        case "pause_end": {
          const lastPause = group.pauses[group.pauses.length - 1];
          if (lastPause && lastPause.end.getTime() === 0) {
            lastPause.end = entry.deviceTs;
          }
          break;
        }
      }
    }

    // Calculate overtime for each group
    const rows = Object.values(groups).map((group) => {
      let totalHours = 0;
      let overtimeHours = 0;
      let morningHours = 0;
      let afternoonHours = 0;

      if (group.clockIn) {
        const lastEvent = group.clockOut || new Date();
        const clockOut = group.clockOut || lastEvent;

        // Calculate morning (clock_in → pause_start)
        if (group.pauses.length > 0 && group.pauses[0].start.getTime() > 0) {
          morningHours =
            (group.pauses[0].start.getTime() - group.clockIn.getTime()) / (1000 * 60 * 60);
        }

        // Calculate afternoon (pause_end → clock_out)
        if (group.clockOut && group.pauses.length > 0) {
          const lastPause = group.pauses[group.pauses.length - 1];
          if (lastPause.end.getTime() > 0) {
            afternoonHours =
              (group.clockOut.getTime() - lastPause.end.getTime()) / (1000 * 60 * 60);
          }
        }

        // If no pauses, total is clock_in → clock_out
        if (group.pauses.length === 0 && group.clockOut) {
          morningHours =
            (group.clockOut.getTime() - group.clockIn.getTime()) / (1000 * 60 * 60);
        }

        totalHours = morningHours + afternoonHours;

        // Apply overtime calculator
        if (group.clockOut) {
          const date = new Date(group.date);
          const dayOfWeek = date.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          const validPauses = group.pauses.filter(
            (p) => p.start.getTime() > 0 && p.end.getTime() > 0,
          );

          const batch: TimeEntryBatch = {
            date,
            clockIn: group.clockIn,
            clockOut,
            pauses: validPauses,
            isWeekend,
          };

          const result = calculateOvertime(batch, overtimeConfig);
          overtimeHours = result.overtimeMinutes / 60;
        }
      }

      return {
        date: group.date,
        employeeName: group.employeeName,
        employeeEmail: group.employeeEmail,
        department: group.departmentId,
        clockIn: group.clockIn?.toISOString() ?? "",
        clockOut: group.clockOut?.toISOString() ?? "",
        morningHours: Math.round(morningHours * 100) / 100,
        afternoonHours: Math.round(afternoonHours * 100) / 100,
        breakDuration: group.pauses.length > 0
          ? `${group.pauses
              .filter((p) => p.end.getTime() > 0)
              .reduce(
                (sum, p) => sum + (p.end.getTime() - p.start.getTime()) / (1000 * 60 * 60),
                0,
              )
              .toFixed(1)}h`
          : "",
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        status: group.clockOut ? "complete" : "incomplete",
      };
    });

    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
