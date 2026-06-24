import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";
import { z } from "zod";

const overtimeConfigSchema = z.object({
  companyId: z.string().uuid().optional(),
  dailyThresholdMinutes: z.number().int().min(0).max(1440).default(480),
  weeklyThresholdMinutes: z.number().int().min(0).max(10080).default(2880),
  roundingMinutes: z.number().int().min(1).max(60).default(15),
  roundingStrategy: z.enum(["nearest", "up", "down"]).default("nearest"),
  multiplier1_25xMinutes: z.number().int().min(0).default(480),
  multiplier1_5xHours: z.number().int().min(0).default(0),
  multiplier2xWeekends: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, ["admin", "supervisor"]);
  if (auth) return auth;

  try {
    const companyId = request.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json(
        { error: "Company context required" },
        { status: 400 },
      );
    }

    const [config] = await db
      .select()
      .from(schema.overtimeConfigs)
      .where(eq(schema.overtimeConfigs.companyId, companyId))
      .limit(1);

    if (!config) {
      // Return defaults if no config exists
      return NextResponse.json(overtimeConfigSchema.parse({}), { status: 200 });
    }

    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    console.error("Get overtime config error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, ["admin"]);
  if (auth) return auth;

  try {
    const body = await request.json();
    const parsed = overtimeConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid config", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const companyId = request.headers.get("x-company-id");
    const data = { ...parsed.data, companyId: companyId ?? parsed.data.companyId };

    if (!data.companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 },
      );
    }

    // Upsert: insert or update
    const [config] = await db
      .insert(schema.overtimeConfigs)
      .values({
        companyId: data.companyId,
        dailyThresholdMinutes: data.dailyThresholdMinutes,
        weeklyThresholdMinutes: data.weeklyThresholdMinutes,
        roundingMinutes: data.roundingMinutes,
        roundingStrategy: data.roundingStrategy,
        multiplier1_25xMinutes: data.multiplier1_25xMinutes,
        multiplier1_5xHours: data.multiplier1_5xHours,
        multiplier2xWeekends: data.multiplier2xWeekends,
      })
      .onConflictDoUpdate({
        target: schema.overtimeConfigs.companyId,
        set: {
          dailyThresholdMinutes: data.dailyThresholdMinutes,
          weeklyThresholdMinutes: data.weeklyThresholdMinutes,
          roundingMinutes: data.roundingMinutes,
          roundingStrategy: data.roundingStrategy,
          multiplier1_25xMinutes: data.multiplier1_25xMinutes,
          multiplier1_5xHours: data.multiplier1_5xHours,
          multiplier2xWeekends: data.multiplier2xWeekends,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    console.error("Upsert overtime config error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
