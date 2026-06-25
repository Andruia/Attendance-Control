import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eq, and, or, desc } from "drizzle-orm";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest, getEmployeeId, getEmployeeRole } from "@/infrastructure/auth/middleware";
import { z } from "zod";

const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string().uuid().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth) return auth;

  try {
    const employeeId = getEmployeeId(request);
    const role = getEmployeeRole(request);

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID required" }, { status: 400 });
    }

    let whereCondition;

    if (role === "employee") {
      // Employees can only see their own requests
      whereCondition = eq(schema.leaveRequests.employeeId, employeeId);
    } else if (role === "supervisor") {
      // Supervisors can see pending and approved requests from their department
      const [supervisor] = await db
        .select({ departmentId: schema.employees.departmentId })
        .from(schema.employees)
        .where(eq(schema.employees.id, employeeId))
        .limit(1);

      if (supervisor?.departmentId) {
        const departmentEmployees = await db
          .select({ id: schema.employees.id })
          .from(schema.employees)
          .where(eq(schema.employees.departmentId, supervisor.departmentId));

        const employeeIds = departmentEmployees.map((e) => e.id);
        whereCondition = and(
          or(
            eq(schema.leaveRequests.status, "pending"),
            eq(schema.leaveRequests.status, "approved"),
          ),
          or(
            ...employeeIds.map((id) => eq(schema.leaveRequests.employeeId, id)),
          ),
        );
      }
    }
    // Admin can see all requests (no condition)

    const leaveRequests = await db
      .select({
        id: schema.leaveRequests.id,
        employeeId: schema.leaveRequests.employeeId,
        leaveTypeId: schema.leaveRequests.leaveTypeId,
        startDate: schema.leaveRequests.startDate,
        endDate: schema.leaveRequests.endDate,
        reason: schema.leaveRequests.reason,
        status: schema.leaveRequests.status,
        approvedBy: schema.leaveRequests.approvedBy,
        approvedAt: schema.leaveRequests.approvedAt,
        rejectionReason: schema.leaveRequests.rejectionReason,
        createdAt: schema.leaveRequests.createdAt,
        updatedAt: schema.leaveRequests.updatedAt,
        employeeName: schema.employees.name,
        leaveTypeName: schema.leaveTypes.name,
        leaveTypeColor: schema.leaveTypes.color,
      })
      .from(schema.leaveRequests)
      .leftJoin(schema.employees, eq(schema.leaveRequests.employeeId, schema.employees.id))
      .leftJoin(schema.leaveTypes, eq(schema.leaveRequests.leaveTypeId, schema.leaveTypes.id))
      .where(whereCondition)
      .orderBy(desc(schema.leaveRequests.createdAt));

    return NextResponse.json(leaveRequests, { status: 200 });
  } catch (error) {
    console.error("List leave requests error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth) return auth;

  try {
    const employeeId = getEmployeeId(request);
    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID required" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = createLeaveRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { leaveTypeId, startDate, endDate, reason } = parsed.data;

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: "Start date must be before or equal to end date" },
        { status: 400 },
      );
    }

    const [leaveRequest] = await db
      .insert(schema.leaveRequests)
      .values({
        employeeId,
        leaveTypeId: leaveTypeId || null,
        startDate,
        endDate,
        reason: reason || null,
        status: "pending",
      })
      .returning();

    return NextResponse.json(leaveRequest, { status: 201 });
  } catch (error) {
    console.error("Create leave request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}