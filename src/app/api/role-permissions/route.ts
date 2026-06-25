import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";
import { z } from "zod";

const updateRolePermissionsSchema = z.object({
  role: z.enum(["employee", "supervisor", "admin"]),
  canViewTeam: z.boolean().optional(),
  canApproveLeave: z.boolean().optional(),
  canManageUsers: z.boolean().optional(),
  canManageShifts: z.boolean().optional(),
  canManageOvertime: z.boolean().optional(),
  canViewReports: z.boolean().optional(),
  canExportReports: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, ["admin"]);
  if (auth) return auth;

  try {
    const companyId = request.headers.get("x-company-id");
    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 });
    }

    const rolePermissions = await db
      .select()
      .from(schema.rolePermissions)
      .where(eq(schema.rolePermissions.companyId, companyId))
      .orderBy(schema.rolePermissions.role);

    return NextResponse.json(rolePermissions, { status: 200 });
  } catch (error) {
    console.error("List role permissions error:", error);
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
    const parsed = updateRolePermissionsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { role, ...permissions } = parsed.data;

    // Check if role permissions already exist
    const [existing] = await db
      .select()
      .from(schema.rolePermissions)
      .where(
        and(
          eq(schema.rolePermissions.companyId, companyId),
          eq(schema.rolePermissions.role, role),
        ),
      )
      .limit(1);

    let result;

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(schema.rolePermissions)
        .set({
          ...permissions,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.rolePermissions.companyId, companyId),
            eq(schema.rolePermissions.role, role),
          ),
        )
        .returning();
      result = updated;
    } else {
      // Create new
      const [created] = await db
        .insert(schema.rolePermissions)
        .values({
          companyId,
          role,
          ...permissions,
        })
        .returning();
      result = created;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Update role permissions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}