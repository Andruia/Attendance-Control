/**
 * Database Seed Script
 *
 * Creates test data for local development:
 * - 1 company, 2 departments, 4 employees with known PINs
 *
 * Usage: npx tsx src/infrastructure/db/seed.ts
 */
import 'dotenv/config'; // <-- Esta línea mágica carga tu .env
import { db, schema } from "./index";
import bcrypt from "bcryptjs";

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
    { pin: "123456", name: "Admin Principal", role: "admin" as const, departmentId: adminDept.id },
    { pin: "111111", name: "Supervisor Pérez", role: "supervisor" as const, departmentId: adminDept.id },
    { pin: "222222", name: "Empleado García", role: "employee" as const, departmentId: medDept.id },
    { pin: "333333", name: "Empleado López", role: "employee" as const, departmentId: medDept.id },
  ];

  for (const emp of employees) {
    const pinHash = await bcrypt.hash(emp.pin, 10);
    await db.insert(schema.employees).values({
      name: emp.name,
      role: emp.role,
      pinHash,
      departmentId: emp.departmentId,
    });
  }

  console.log(`✓ Created ${employees.length} employees with known PINs\n`);
  console.log("═══════════════════════════════════════");
  console.log("  Test Credentials:");
  console.log("───────────────────────────────────────");
  console.log(`  ${"PIN".padEnd(10)} ${"Role".padEnd(15)} Name`);
  console.log(`  ${"------".padEnd(10)} ${"----".padEnd(15)} ----`);
  for (const emp of employees) {
    console.log(`  ${emp.pin.padEnd(10)} ${emp.role.padEnd(15)} ${emp.name}`);
  }
  console.log("═══════════════════════════════════════\n");

  console.log("✅ Seed complete! Run `npm run dev` and log in with any PIN above.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
