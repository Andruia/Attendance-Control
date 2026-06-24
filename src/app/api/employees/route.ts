import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest, getEmployeeRole } from "@/infrastructure/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, ["admin", "supervisor"]);
  if (auth) return auth;

  try {
    const role = getEmployeeRole(request);
    const employeeId = request.headers.get("x-employee-id");

    // Build where condition based on role
    let whereCondition;
    if (role === "supervisor" && employeeId) {
      const [supervisor] = await db
        .select({ departmentId: schema.employees.departmentId })
        .from(schema.employees)
        .where(eq(schema.employees.id, employeeId))
        .limit(1);

      if (supervisor?.departmentId) {
        whereCondition = eq(schema.employees.departmentId, supervisor.departmentId);
      }
    }

    const employees = await db
      .select({
        id: schema.employees.id,
        name: schema.employees.name,
        email: schema.employees.email,
        role: schema.employees.role,
        departmentId: schema.employees.departmentId,
        createdAt: schema.employees.createdAt,
      })
      .from(schema.employees)
      .where(whereCondition)
      .orderBy(schema.employees.name);

    return NextResponse.json(employees, { status: 200 });
  } catch (error) {
    console.error("List employees error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
