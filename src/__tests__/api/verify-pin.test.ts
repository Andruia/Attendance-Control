import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/verify-pin/route";
import { NextRequest } from "next/server";

// Mock bcryptjs — the route uses `import bcrypt from "bcryptjs"` then `bcrypt.compare()`
// So we need to mock the default export's compare method
vi.mock("bcryptjs", () => {
  const compare = vi.fn();
  return {
    default: { compare },
    compare,
    __esModule: true,
  };
});

// Mock the db — route uses `db.select().from(schema.employees).limit(50)`
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/infrastructure/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
  schema: {
    employees: {
      id: "id",
      name: "name",
      email: "email",
      role: "role",
      pinHash: "pinHash",
      departmentId: "departmentId",
      createdAt: "createdAt",
    },
  },
}));

// Mock JWT
vi.mock("@/infrastructure/auth/jwt", () => ({
  issueSessionToken: vi.fn().mockResolvedValue("session-token"),
  issueClockToken: vi.fn().mockResolvedValue("clock-token"),
  issueRefreshToken: vi.fn().mockResolvedValue("refresh-token"),
}));

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/auth/verify-pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/verify-pin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Wire up the chain: db.select().from(schema.employees).limit(50)
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ limit: mockLimit });
  });

  it("validates PIN format (4-6 digits)", async () => {
    const req = createRequest({ pin: "123" }); // Invalid PIN - too short

    const response = await POST(req);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("PIN must be 4-6 digits");
  });

  it("returns 401 for invalid PIN", async () => {
    const bcrypt = await import("bcryptjs");
    // Route uses bcrypt.compare via the default export
    vi.mocked(bcrypt.default.compare).mockResolvedValue(false as never);

    mockLimit.mockResolvedValue([
      {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "employee",
        pinHash: "$2a$10$hash",
        departmentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const req = createRequest({ pin: "123456" });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("returns tokens on successful PIN verification", async () => {
    const bcrypt = await import("bcryptjs");
    // Route uses bcrypt.compare via the default export
    vi.mocked(bcrypt.default.compare).mockResolvedValue(true as never);

    mockLimit.mockResolvedValue([
      {
        id: "1",
        name: "Test",
        email: "test@test.com",
        role: "employee",
        pinHash: "$2a$10$hash",
        departmentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const req = createRequest({ pin: "123456" });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.employeeId).toBe("1");
    expect(data.sessionToken).toBe("session-token");
  });
});
