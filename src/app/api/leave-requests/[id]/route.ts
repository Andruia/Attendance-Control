import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest, getEmployeeId } from "@/infrastructure/auth/middleware";
import { z } from "zod";

const updateLeaveRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request, ["supervisor", "admin"]);
  if (auth) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateLeaveRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const employeeId = getEmployeeId(request);
    const { status, rejectionReason } = parsed.data;

    // If rejecting, rejection reason is required
    if (status === "rejected" && !rejectionReason) {
      return NextResponse.json(
        { error: "Rejection reason is required when rejecting a leave request" },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      approvedBy: employeeId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };

    if (status === "rejected") {
      updateData.rejectionReason = rejectionReason;
    }

    const [updated] = await db
      .update(schema.leaveRequests)
      .set(updateData)
      .where(eq(schema.leaveRequests.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Update leave request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
