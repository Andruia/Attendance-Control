/**
 * Database Seed Script
 *
 * Creates test data for local development:
 * - 1 company, 2 departments, 4 employees with known PINs
 * - Sample time entries for the last 7 days
 *
 * Usage: npx tsx src/infrastructure/db/seed.ts
 */
import 'dotenv/config'; // <-- Esta línea mágica carga tu .env
import { db, schema } from "./index";
import bcrypt from "bcryptjs";

/**
 * Create a sample time entry
 */
async function createEntry(
  employeeId: string,
  type: "clock_in" | "pause_start" | "pause_end" | "clock_out",
  date: Date,
  hours: number,
  minutes: number,
) {
  const ts = new Date(date);
  ts.setHours(hours, minutes, 0, 0);
  await db.insert(schema.timeEntries).values({
    employeeId,
    type,
    deviceTs: ts,
    serverTs: ts,
    isPending: false,
  });
}

/**
 * Generate sample entries for an employee for a given date range
 */
async function generateSampleEntries(
  employeeId: string,
  startDate: Date,
  days: number,
) {
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Skip weekends (Saturday=6, Sunday=0)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const isPartial = i % 5 === 0; // Every 5th workday is partial (no clock_out)
    const isLate = i % 3 === 0; // Every 3rd day has late start

    // Clock in: 7:30 or 8:15 (late)
    await createEntry(employeeId, "clock_in", date, isLate ? 8 : 7, isLate ? 15 : 30);

    // Pause start: 12:00
    await createEntry(employeeId, "pause_start", date, 12, 0);

    if (!isPartial) {
      // Pause end: 13:00
      await createEntry(employeeId, "pause_end", date, 13, 0);

      // Clock out: 16:30 or 17:00
      await createEntry(employeeId, "clock_out", date, i % 2 === 0 ? 16 : 17, 30);
    }
    // Partial day: missing clock_out → incomplete entry
  }
}

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ── Company ────────────────────────────────────────────────────────────────
  const [company] = await db
    .insert(schema.companies)
    .values({ name: "Mi Clínica Salud" })
    .returning();
  console.log(`✓ Created company: ${company.name}`);

  // ── Departments ────────────────────────────────────────────────────────────
  const [adminDept] = await db
    .insert(schema.departments)
    .values({ companyId: company.id, name: "Administración" })
    .returning();

  const [medDept] = await db
    .insert(schema.departments)
    .values({ companyId: company.id, name: "Enfermería" })
    .returning();
  console.log(`✓ Created ${2} departments`);

  // ── Employees with known PINs ──────────────────────────────────────────────
  const employees = [
    { pin: "1234", name: "Admin Principal", role: "admin" as const, departmentId: adminDept.id },
    { pin: "1111", name: "Supervisor Pérez", role: "supervisor" as const, departmentId: adminDept.id },
    { pin: "2222", name: "Empleado García", role: "employee" as const, departmentId: medDept.id },
    { pin: "3333", name: "Empleado López", role: "employee" as const, departmentId: medDept.id },
  ];

  const createdEmployees = [];
  for (const emp of employees) {
    const pinHash = await bcrypt.hash(emp.pin, 10);
    const [created] = await db
      .insert(schema.employees)
      .values({
        name: emp.name,
        role: emp.role,
        pinHash,
        departmentId: emp.departmentId,
      })
      .returning();
    createdEmployees.push({ ...emp, id: created.id });
  }

  console.log(`✓ Created ${employees.length} employees with known PINs`);

  // ── Sample Time Entries (last 7 days) ─────────────────────────────────────
  console.log("\n⏰ Generating sample time entries...");
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Generate entries for employees (skip admin)
  const employeesWithEntries = createdEmployees.filter(
    (e) => e.role !== "admin",
  );

  for (const emp of employeesWithEntries) {
    await generateSampleEntries(emp.id, sevenDaysAgo, 7);
  }

  const totalEntries = await db
    .select({ count: schema.timeEntries.id })
    .from(schema.timeEntries);

  console.log(`✓ Created ${totalEntries.length} sample time entries`);

  console.log("\n═══════════════════════════════════════");
  console.log("  Test Credentials (4-digit PINs):");
  console.log("───────────────────────────────────────");
  console.log(`  ${"PIN".padEnd(8)} ${"Role".padEnd(15)} Name`);
  console.log(`  ${"----".padEnd(8)} ${"----".padEnd(15)} ----`);
  for (const emp of employees) {
    console.log(`  ${emp.pin.padEnd(8)} ${emp.role.padEnd(15)} ${emp.name}`);
  }
  console.log("═══════════════════════════════════════\n");

  console.log("✅ Seed complete! Run `npm run dev` and log in with any PIN above.");
  console.log("   History page now has sample data for the last 7 days.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
