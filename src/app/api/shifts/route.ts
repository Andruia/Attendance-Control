import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";
import { z } from "zod";

const createShiftSchema = z.object({
  name: z.string().min(1).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format"),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format").nullable().optional(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm format").nullable().optional(),
  monday: z.boolean().default(true),
  tuesday: z.boolean().default(true),
  wednesday: z.boolean().default(true),
  thursday: z.boolean().default(true),
  friday: z.boolean().default(true),
  saturday: z.boolean().default(false),
  sunday: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, ["admin", "supervisor"]);
  if (auth) return auth;

  try {
    const companyId = request.headers.get("x-company-id");
    const shifts = companyId
      ? await db
          .select()
          .from(schema.shifts)
          .where(eq(schema.shifts.companyId, companyId))
          .orderBy(schema.shifts.name)
      : await db.select().from(schema.shifts).orderBy(schema.shifts.name);

    return NextResponse.json(shifts, { status: 200 });
  } catch (error) {
    console.error("List shifts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, ["admin"]);
  if (auth) return auth;

  try {
    const body = await request.json();
    const parsed = createShiftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid shift data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const companyId = request.headers.get("x-company-id") ?? undefined;

    const [shift] = await db
      .insert(schema.shifts)
      .values({
        ...data,
        companyId,
        breakStart: data.breakStart ?? null,
        breakEnd: data.breakEnd ?? null,
      })
      .returning();

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error("Create shift error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
