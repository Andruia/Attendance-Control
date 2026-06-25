import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest, getEmployeeRole } from "@/infrastructure/auth/middleware";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createEmployeeSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  role: z.enum(["employee", "supervisor", "admin"]),
  departmentId: z.string().uuid().nullable().optional(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

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

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, ["admin"]);
  if (auth) return auth;

  try {
    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, email, role, departmentId, pin } = parsed.data;

    // Check for duplicate email
    if (email) {
      const [existing] = await db
        .select({ id: schema.employees.id })
        .from(schema.employees)
        .where(eq(schema.employees.email, email))
        .limit(1);

      if (existing) {
        return NextResponse.json(
          { error: "An employee with this email already exists" },
          { status: 409 },
        );
      }
    }

    const pinHash = await bcrypt.hash(pin, 10);

    const [employee] = await db
      .insert(schema.employees)
      .values({
        name,
        email: email || null,
        role,
        departmentId: departmentId || null,
        pinHash,
      })
      .returning({
        id: schema.employees.id,
        name: schema.employees.name,
        email: schema.employees.email,
        role: schema.employees.role,
        departmentId: schema.employees.departmentId,
      });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
