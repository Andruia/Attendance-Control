import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";
import { z } from "zod";

const updateLeaveTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  daysPerYear: z.number().int().positive().nullable().optional(),
  isPaid: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request, ["admin"]);
  if (auth) return auth;

  try {
    const companyId = request.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateLeaveTypeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updateData = parsed.data;

    const [updated] = await db
      .update(schema.leaveTypes)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.leaveTypes.id, id),
          eq(schema.leaveTypes.companyId, companyId),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Update leave type error:", error);
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
    const companyId = request.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const { id } = await params;

    const [deleted] = await db
      .delete(schema.leaveTypes)
      .where(
        and(
          eq(schema.leaveTypes.id, id),
          eq(schema.leaveTypes.companyId, companyId),
        ),
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Leave type deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete leave type error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
