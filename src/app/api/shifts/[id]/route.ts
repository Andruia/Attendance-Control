import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";
import { z } from "zod";

const updateShiftSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  breakStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  monday: z.boolean().optional(),
  tuesday: z.boolean().optional(),
  wednesday: z.boolean().optional(),
  thursday: z.boolean().optional(),
  friday: z.boolean().optional(),
  saturday: z.boolean().optional(),
  sunday: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request, ["admin", "supervisor"]);
  if (auth) return auth;

  try {
    const { id } = await params;
    const [shift] = await db
      .select()
      .from(schema.shifts)
      .where(eq(schema.shifts.id, id))
      .limit(1);

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    return NextResponse.json(shift, { status: 200 });
  } catch (error) {
    console.error("Get shift error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request, ["admin"]);
  if (auth) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateShiftSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid shift data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [shift] = await db
      .update(schema.shifts)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.shifts.id, id))
      .returning();

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    return NextResponse.json(shift, { status: 200 });
  } catch (error) {
    console.error("Update shift error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request, ["admin"]);
  if (auth) return auth;

  try {
    const { id } = await params;
    const [shift] = await db
      .delete(schema.shifts)
      .where(eq(schema.shifts.id, id))
      .returning({ id: schema.shifts.id });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Shift deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete shift error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
