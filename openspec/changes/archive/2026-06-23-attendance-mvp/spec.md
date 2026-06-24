# Delta Specifications: Attendance MVP

## Domain: attendance-recording
### Requirement: PIN Clock In/Out
- **The system MUST** receive a 4‑6 digit PIN, validate it client‑side, and generate a timestamped event.
- **It SHALL** store the event locally in Dexie.js and tag it as pending for sync.

#### Scenario: Successful Clock In
- GIVEN a valid PIN entered by an employee.
- WHEN the employee taps *Clock In*.
- THEN a `timeentry` record is created with `type=clock_in`, `device_ts` and a `server_ts` placeholder, marked `pending=True`.
- AND the UI transitions to *On‑Break* state.

### Domain: shift-management
### Requirement: Shift Definition
- **The system MUST** allow admins to create, edit, and delete daily shift templates, each with a `start`, `end`, optional `break_start`, `break_end`.
- **It SHOULD** warn when times overlap or are outside business hours.

#### Scenario: Create Shift
- GIVEN admin in **Shift Settings**.
- WHEN admin saves `09:00‑17:00` with a 15‑min break.
- THEN the shift is persisted and appears in the employee shift list.

## Domain: overtime-engine
### Requirement: Overtime Calculation
- **The system MUST** calculate overtime based on configuration: `threshold_hours`, `multiplier`, `rounding_strategy`.
- **It SHALL** return total regular and overtime hours per time entry batch.

#### Scenario: Overtime Over Threshold
- GIVEN an employee works 9 h on a 8 h shift.
- WHEN the overtime engine runs.
- THEN 1 h is marked as overtime multiplied by system multiplier.

## Domain: data-export
### Requirement: Export Formats
- **The system MUST** provide CSV, Excel, and PDF exports of attendance reports for a selected date range.
- **It SHALL** allow filtering by employee, department, and status.

#### Scenario: Export CSV
- GIVEN a supervisor requests CSV for Jan 1‑15.
- WHEN export is triggered.
- THEN a file named `attendance_2025-01-01_to_2025-01-15.csv` is downloaded.

## Domain: rbac
### Requirement: Role Access
- **The system MUST** enforce role‑based access: Employees can only view own data; Supervisors view their team; Admins have full access.
- **It SHALL** validate JWT scopes on each API call.

#### Scenario: Supervisor Access

### Database Schema

The following tables capture the core entities required for the MVP. All time fields are stored as `timestamptz` (UTC) to ensure consistent comparisons across time zones. Indexes target the most frequent query patterns (by employee, department, date range) and enforce referential integrity.

```sql
-- Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Employees
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('employee','supervisor','admin')),
  pin_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Shifts (daily templates, no night shift)
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- TimeEntries (clock_in, pause_start, pause_end, clock_out)
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('clock_in','pause_start','pause_end','clock_out')),
  device_ts timestamptz NOT NULL,
  server_ts timestamptz,
  is_pending BOOLEAN NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- OvertimeConfig (per company)
CREATE TABLE overtime_configs (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  daily_threshold_minutes INT NOT NULL DEFAULT 480,
  weekly_threshold_minutes INT NOT NULL DEFAULT 2880,
  rounding_minutes INT NOT NULL DEFAULT 15,
  rounding_strategy TEXT NOT NULL CHECK (rounding_strategy IN ('nearest','up','down')),
  multiplier_1_25x_minutes INT NOT NULL DEFAULT 480,
  multiplier_1_5x_hours INT NOT NULL DEFAULT 0,
  multiplier_2x_weekends BOOLEAN NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- AuditLog (for security and rollback tracing)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common filters
CREATE INDEX idx_time_entries_employee_date ON time_entries(employee_id, device_ts DESC);
CREATE INDEX idx_overtime_configs_company ON overtime_configs(company_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_update_updated_at
BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER trg_update_updated_at_shift
BEFORE UPDATE ON shifts
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
```

All tables use `gen_random_uuid()` for primary keys, simplifying table joins and ensuring uniqueness across distributed deployments. The schema intentionally keeps `pivot` tables for inter‑departmental many‑to‑many relations (e.g., employee roles) out of scope for the MVP.

Please review and let me know if you want adjustments before we move to the design phase.
- GIVEN a supervisor token requests `/api/reports`.
- WHEN the request is processed.
- THEN the response contains only the supervisor’s department employees.
