import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db, schema } from "@/infrastructure/db";
import { authenticateRequest } from "@/infrastructure/auth/middleware";
import { syncBatchSchema } from "@/domain/time-entry/validation";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const parsed = syncBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid sync payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { entries } = parsed.data;
    const employeeId = request.headers.get("x-employee-id");
    const syncBatchId = crypto.randomUUID();

    const results: Array<{
      id: string;
      deviceTs: string;
      serverTs: string;
      status: "ok" | "conflict";
    }> = [];

    for (const entry of entries) {
      // Verify the entry belongs to the authenticated employee
      if (employeeId && entry.employeeId !== employeeId) {
        results.push({
          id: entry.id ?? crypto.randomUUID(),
          deviceTs: entry.deviceTs,
          serverTs: new Date().toISOString(),
          status: "conflict",
        });
        continue;
      }

      const serverTs = new Date();
      const [created] = await db
        .insert(schema.timeEntries)
        .values({
          employeeId: entry.employeeId,
          type: entry.type,
          deviceTs: new Date(entry.deviceTs),
          serverTs,
          isPending: false,
          syncBatchId,
        })
        .returning();

      results.push({
        id: created.id,
        deviceTs: created.deviceTs.toISOString(),
        serverTs: serverTs.toISOString(),
        status: "ok",
      });
    }

    // Update sync metadata
    if (employeeId) {
      await db
        .insert(schema.syncMetadata)
        .values({
          employeeId,
          lastSyncAt: new Date(),
          deviceId: request.headers.get("x-device-id") ?? null,
        })
        .onConflictDoNothing({ target: schema.syncMetadata.id });
    }

    return NextResponse.json({
      batchId: syncBatchId,
      results,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
