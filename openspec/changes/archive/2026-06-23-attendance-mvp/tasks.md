# Tasks: Attendance MVP

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High
Applied as: size:exception (maintainer accepted)

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: DB schema, migrations, basic infra | PR 1 | Base branch = `feature/attendance-mvp` |
| 2 | Core API & auth endpoints | PR 2 | Base = PR 1 |
| 3 | Offline sync & Dexie integration | PR 3 | Base = PR 2 |
| 4 | UI components & state management | PR 4 | Base = PR 3 |
| 5 | Overtime engine, export, RBAC, testing | PR 5 | Base = PR 4 |

> **Note**: All 25 tasks implemented in a single batch per `size:exception` approval.

## Phase 1: Foundation / Infrastructure
- [x] 1.1 Create Drizzle schema files for companies, departments, employees, shifts, time_entries, overtime_configs, audit_logs in `src/infrastructure/db/schema.ts`
- [x] 1.2 Add migration scripts for initial schema and overtime_config addition in `src/infrastructure/db/migrations/`
- [x] 1.3 Configure PostgreSQL connection (Neon) and Drizzle client in `src/infrastructure/db/index.ts`
- [x] 1.4 Set up update_updated_at trigger function and migrations

## Phase 2: Core Implementation
- [x] 2.1 Implement PIN verification API `/api/auth/verify-pin` with bcrypt hash check and short-lived JWT cookie
- [x] 2.2 Implement clock entry API `/api/clock/record` handling clock_in, pause_start, pause_end, clock_out, storing server_ts
- [x] 2.3 Implement shift management CRUD APIs under `/api/shifts/*`
- [x] 2.4 Implement RBAC middleware validating JWT scopes for each endpoint
- [x] 2.5 Implement overtime config API `/api/overtime/config` (GET/POST)

## Phase 3: Offline Sync & State
- [x] 3.1 Set up Dexie.js schema for pending time entries, employee cache, sync metadata in `src/lib/offline/dexie.ts`
- [x] 3.2 Implement background sync queue using Workbox Background Sync in `public/worker.js`
- [x] 3.3 Create sync endpoint `/api/sync` to accept batch of pending entries, resolve conflicts, store server timestamps
- [x] 3.4 Add client‑side sync manager service in `src/lib/offline/syncManager.ts` that triggers on reconnect and on app focus

## Phase 4: UI & Client Logic
- [x] 4.1 Build Clock screen UI (`src/components/clock/ClockEntry.tsx`) with PIN entry, action buttons, and state linking to Zustand store
- [x] 4.2 Implement Shift Settings UI (`src/components/shift/ShiftEditor.tsx`) with create/edit/delete workflows
- [x] 4.3 Add Supervisor dashboard pages for team view and export triggers
- [x] 4.4 Wire Zustand stores for clockEntry, shiftConfig, overtimeConfig, auth session
- [x] 4.5 Integrate offline queue: when offline, enqueue actions and show pending badge

## Phase 5: Overtime Engine, Export & RBAC Polish
- [x] 5.1 Implement pure overtime calculation function in `src/domain/overtime/calculator.ts` with rounding strategies
- [x] 5.2 Add unit tests for overtime scenarios (threshold, multipliers, weekend)
- [x] 5.3 Create export service `src/lib/export/exportService.ts` using SheetJS and jsPDF for CSV/Excel/PDF
- [x] 5.4 Add export UI buttons and API route `/api/reports/export`
- [x] 5.5 Refine RBAC UI: hide/disable components based on role, enforce checks server‑side
- [x] 5.6 Write integration tests for API endpoints (Supertest) and E2E Cypress flows covering clock‑in, sync, export

## Phase 6: Documentation & Cleanup
- [x] 6.1 Update README with setup, dev, and deployment steps
- [x] 6.2 Add API contract documentation (OpenAPI) in `openapi.yaml`
- [x] 6.3 Remove any temporary seed data and ensure migrations are clean
- [x] 6.4 Configure CI pipeline (lint, type‑check, test coverage) in `.github/workflows/ci.yml`

## Critical Fixes Applied
- [x] Fixed db type union issue in `src/infrastructure/db/index.ts`
- [x] Fixed overtime calculator tier logic bugs in `src/domain/overtime/calculator.ts`
- [x] Added proper type augmentation for Cypress commands in `cypress/support/commands.ts`
- [x] Replaced placeholder tests with real Supertest API calls in `src/__tests__/api/verify-pin.test.ts` and `src/__tests__/api/clock-record.test.ts`
- [x] Fixed `clockEntry` reference error and lint issues in `src/components/clock/ClockEntry.tsx`
- [x] Fixed empty interface lint errors in `src/components/ui/input.tsx` and `src/components/ui/select.tsx`
- [x] Round 2: Fixed PgSelectBase type mismatch in `src/app/api/employees/route.ts` (build query restructure)
- [x] Round 2: Fixed overtime weekend multiplier bug — 2x now applies to all overtime tiers when weekend+config enabled
- [x] Round 2: Fixed verify-pin route error message (PIN must be 4-6 digits) to match test expectations
- [x] Round 2: Fixed verify-pin test mocks — proper hoisted factory + correct bcrypt.default.compare mocking
- [x] Round 2: Fixed clock-record test mocks — proper hoisted factory + correct db chain + auth mock
- [x] Round 2: Fixed overtime config route TypeScript error (companyId possibly undefined in insert values)
- [x] Round 2: Fixed syncManager TypeScript errors (ServiceWorkerRegistration.sync + implicit any)
- [x] Round 2: Cleaned up all lint warnings (unused imports: eq, Badge, Input, primaryKey, getSyncMeta, get, customProp, setError; useCallback deps)
- [x] Round 2: Fixed DATABASE_URL build crash — deferred connection creation to allow build without DB env var
