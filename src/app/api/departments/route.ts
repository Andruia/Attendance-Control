import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, ["admin", "supervisor"]);
  if (auth) return auth;

  try {
    const departments = await db
      .select({
        id: schema.departments.id,
        name: schema.departments.name,
        companyId: schema.departments.companyId,
      })
      .from(schema.departments)
      .orderBy(schema.departments.name);

    return NextResponse.json(departments, { status: 200 });
  } catch (error) {
    console.error("List departments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
