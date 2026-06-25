import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  time,
  bigserial,
  jsonb,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Companies ───────────────────────────────────────────────────────────────
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Departments ─────────────────────────────────────────────────────────────
export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Employees ───────────────────────────────────────────────────────────────
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    role: text("role", { enum: ["employee", "supervisor", "admin"] }).notNull().default("employee"),
    pinHash: text("pin_hash").notNull(),
    email: text("email").unique(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("idx_employees_email").on(table.email),
  }),
);

// ─── Shifts ──────────────────────────────────────────────────────────────────
export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startTime: time("start_time", { withTimezone: false }).notNull(),
  endTime: time("end_time", { withTimezone: false }).notNull(),
  breakStart: time("break_start", { withTimezone: false }),
  breakEnd: time("break_end", { withTimezone: false }),
  monday: boolean("monday").default(true).notNull(),
  tuesday: boolean("tuesday").default(true).notNull(),
  wednesday: boolean("wednesday").default(true).notNull(),
  thursday: boolean("thursday").default(true).notNull(),
  friday: boolean("friday").default(true).notNull(),
  saturday: boolean("saturday").default(false).notNull(),
  sunday: boolean("sunday").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Employee-Shift Assignment ───────────────────────────────────────────────
export const employeeShifts = pgTable("employee_shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  shiftId: uuid("shift_id")
    .notNull()
    .references(() => shifts.id, { onDelete: "cascade" }),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).defaultNow().notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Time Entries ────────────────────────────────────────────────────────────
export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["clock_in", "pause_start", "pause_end", "clock_out"],
    }).notNull(),
    deviceTs: timestamp("device_ts", { withTimezone: true }).notNull(),
    serverTs: timestamp("server_ts", { withTimezone: true }),
    isPending: boolean("is_pending").default(false).notNull(),
    driftMinutes: integer("drift_minutes"),
    syncBatchId: text("sync_batch_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    employeeDateIdx: index("idx_time_entries_employee_date").on(table.employeeId, table.deviceTs.desc()),
  }),
);

// ─── Overtime Configs ────────────────────────────────────────────────────────
export const overtimeConfigs = pgTable("overtime_configs", {
  companyId: uuid("company_id")
    .primaryKey()
    .references(() => companies.id, { onDelete: "cascade" }),
  dailyThresholdMinutes: integer("daily_threshold_minutes").notNull().default(480),
  weeklyThresholdMinutes: integer("weekly_threshold_minutes").notNull().default(2880),
  roundingMinutes: integer("rounding_minutes").notNull().default(15),
  roundingStrategy: text("rounding_strategy", {
    enum: ["nearest", "up", "down"],
  })
    .notNull()
    .default("nearest"),
  multiplier1_25xMinutes: integer("multiplier_1_25x_minutes").notNull().default(480),
  multiplier1_5xHours: integer("multiplier_1_5x_hours").notNull().default(0),
  multiplier2xWeekends: boolean("multiplier_2x_weekends").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Audit Logs ──────────────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  details: jsonb("details"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Sync Metadata ───────────────────────────────────────────────────────────
export const syncMetadata = pgTable("sync_metadata", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  deviceId: text("device_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Leave Types ─────────────────────────────────────────────────────────────
export const leaveTypes = pgTable("leave_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  daysPerYear: integer("days_per_year"),
  isPaid: boolean("is_paid").default(true).notNull(),
  requiresApproval: boolean("requires_approval").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Leave Requests ──────────────────────────────────────────────────────────
export const leaveRequests = pgTable("leave_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  leaveTypeId: uuid("leave_type_id").references(() => leaveTypes.id, { onDelete: "set null" }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  approvedBy: uuid("approved_by").references(() => employees.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Role Permissions ────────────────────────────────────────────────────────
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["employee", "supervisor", "admin"] }).notNull(),
    canViewTeam: boolean("can_view_team").default(false).notNull(),
    canApproveLeave: boolean("can_approve_leave").default(false).notNull(),
    canManageUsers: boolean("can_manage_users").default(false).notNull(),
    canManageShifts: boolean("can_manage_shifts").default(false).notNull(),
    canManageOvertime: boolean("can_manage_overtime").default(false).notNull(),
    canViewReports: boolean("can_view_reports").default(false).notNull(),
    canExportReports: boolean("can_export_reports").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    companyRoleIdx: uniqueIndex("idx_role_permissions_company_role").on(table.companyId, table.role),
  }),
);
