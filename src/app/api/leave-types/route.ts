import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";
import { z } from "zod";

const createLeaveTypeSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3b82f6"),
  daysPerYear: z.number().int().positive().nullable().optional(),
  isPaid: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth) return auth;

  try {
    const companyId = request.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const leaveTypes = await db
      .select()
      .from(schema.leaveTypes)
      .where(eq(schema.leaveTypes.companyId, companyId))
      .orderBy(schema.leaveTypes.name);

    return NextResponse.json(leaveTypes, { status: 200 });
  } catch (error) {
    console.error("List leave types error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, ["admin"]);
  if (auth) return auth;

  try {
    const companyId = request.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = createLeaveTypeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, color, daysPerYear, isPaid, requiresApproval } = parsed.data;

    const [leaveType] = await db
      .insert(schema.leaveTypes)
      .values({
        companyId,
        name,
        color,
        daysPerYear: daysPerYear ?? null,
        isPaid,
        requiresApproval,
      })
      .returning();

    return NextResponse.json(leaveType, { status: 201 });
  } catch (error) {
    console.error("Create leave type error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}