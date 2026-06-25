import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  role: z.enum(["employee", "supervisor", "admin"]).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  pin: z.string().min(4).max(6).regex(/^\d{4,6}$/).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request, ["admin"]);
  if (auth) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.email) updateData.email = parsed.data.email;
    if (parsed.data.role) updateData.role = parsed.data.role;
    if (parsed.data.departmentId !== undefined) updateData.departmentId = parsed.data.departmentId;
    if (parsed.data.pin) {
      updateData.pinHash = await bcrypt.hash(parsed.data.pin, 10);
    }
    updateData.updatedAt = new Date();

    const [employee] = await db
      .update(schema.employees)
      .set(updateData)
      .where(eq(schema.employees.id, id))
      .returning({
        id: schema.employees.id,
        name: schema.employees.name,
        email: schema.employees.email,
        role: schema.employees.role,
        departmentId: schema.employees.departmentId,
      });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    console.error("Update employee error:", error);
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

    // Prevent deleting yourself
    const requestingEmployeeId = request.headers.get("x-employee-id");
    if (requestingEmployeeId === id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(schema.employees)
      .where(eq(schema.employees.id, id))
      .returning({ id: schema.employees.id });

    if (!deleted) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete employee error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
