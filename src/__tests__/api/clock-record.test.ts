import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/clock/record/route";
import { NextRequest, NextResponse } from "next/server";

// Mock auth middleware — default: successful auth (no error response)
vi.mock("@/infrastructure/auth/middleware", () => ({
  authenticateClockAction: vi.fn().mockResolvedValue(null),
}));

// Mock the db — factory must not reference external variables (hoisted)
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

vi.mock("@/infrastructure/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
  schema: {
    employees: { id: "id" },
    timeEntries: {
      id: "id",
      employeeId: "employeeId",
      type: "type",
      deviceTs: "deviceTs",
      serverTs: "serverTs",
      isPending: "isPending",
      driftMinutes: "driftMinutes",
      syncBatchId: "syncBatchId",
      createdAt: "createdAt",
    },
  },
}));

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/clock/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/clock/record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates clock action schema", async () => {
    // Auth passes (default mock), but body is invalid (empty)
    const req = createRequest({}); // Missing required fields

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 401 without valid clock token", async () => {
    // Mock failed authentication — return a 401 response
    const { authenticateClockAction } = await import("@/infrastructure/auth/middleware");
    vi.mocked(authenticateClockAction).mockResolvedValueOnce(
      NextResponse.json({ error: "Clock token required" }, { status: 401 }),
    );

    const req = createRequest({
      employeeId: "550e8400-e29b-41d4-a716-446655440000",
      type: "clock_in",
      deviceTs: new Date().toISOString(),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("creates time entry with server timestamp", async () => {
    // Wire up db chain: db.select().from(schema.employees).where(...).limit(1)
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    mockLimit.mockResolvedValue([{ id: "test-employee-id" }]);

    // Wire up insert chain: db.insert(schema.timeEntries).values(...).returning()
    mockReturning.mockResolvedValue([
      {
        id: "entry-id",
        employeeId: "test-employee-id",
        type: "clock_in",
        deviceTs: new Date(),
        serverTs: new Date(),
        isPending: false,
        driftMinutes: null,
        syncBatchId: null,
        createdAt: new Date(),
      },
    ]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    const req = createRequest({
      employeeId: "550e8400-e29b-41d4-a716-446655440000",
      type: "clock_in",
      deviceTs: new Date().toISOString(),
    });

    const response = await POST(req);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.id).toBe("entry-id");
    expect(data.serverTs).toBeDefined();
  });
});
