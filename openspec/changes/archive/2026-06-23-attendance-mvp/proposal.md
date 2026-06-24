# Proposal: Attendance MVP

## Intent
Build a mobile‑first, offline‑capable Attendance Control application for small‑to‑medium medical clinics. It enables administrative staff to clock employees in/out with a 4‑6 digit PIN, manage simple shift schedules, and export attendance data. The MVP solves the pain of manual time‑sheet entry and lack of reliable offline attendance tracking.

## Scope

### In Scope
- PIN‑based authentication for all flows (clock‑in, pause, resume, clock‑out).
- Shift configuration (no night shifts) and flexible break handling.
- Offline‑first data capture with background sync (Workbox + Dexie.js).
- Overtime engine (configurable thresholds, multipliers, rounding).
- Export to CSV, Excel, PDF with filtering.
- Role‑based UI: Employee, Supervisor, Administrator.
- Single‑tenant deployment (one company).

### Out of Scope
- Multi‑tenant SaaS support.
- GPS/IP location verification.
- Integration with external CRM systems.
- Night‑shift handling.
- Advanced analytics dashboards.

## Capabilities

### New Capabilities
- `attendance-recording`: Capture clock‑in/out events via PIN, store locally, and sync when online.
- `shift-management`: Define daily shift templates and assign them to employees.
- `overtime-engine`: Compute overtime based on configurable rules.
- `data-export`: Generate CSV, Excel, and PDF reports.
- `rbac`: Role‑based UI access for Employee, Supervisor, Administrator.

### Modified Capabilities
- None

## Approach
Leverage the recommended stack from exploration:
- **Frontend**: Next.js 15 (App Router) with React 19, Tailwind 4, and shadcn/ui for components.
- **State**: Zustand for client‑side state, Dexie.js for IndexedDB persistence.
- **Sync**: Workbox Service Worker for background sync, fallback to sync‑on‑focus.
- **Auth**: Custom 4‑6 digit PIN stored securely using Web Crypto, JWT (jose) for session tokens.
- **Backend**: Next.js API routes with Drizzle ORM on PostgreSQL 16 (hosted on Neon/Supabase).
- **Export**: SheetJS for CSV/Excel, jsPDF for PDF generation.
- **Deployment**: Vercel front‑end, Neon database.
The architecture follows Screaming Architecture with `domain/`, `infrastructure/`, and `app/` layers.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `app/pages/*` | New | UI screens for clock‑in/out, shift config, export. |
| `domain/attendance/` | New | Core business logic for PIN auth, shift handling, overtime. |
| `infrastructure/db/` | New | Drizzle schema for employees, shifts, time entries. |
| `public/worker.js` | New | Workbox Service Worker for offline sync. |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Background Sync limited to Chromium | Medium | Fallback sync‑on‑focus, graceful degradation notice. |
| PIN hash stored in IndexedDB | Low | Auto‑clear on logout, encrypt with Web Crypto, short TTL. |
| Device clock drift offline | Medium | Dual timestamps (device + server) with drift flagging; prioritize device timestamp per conflict rule. |

## Rollback Plan
1. Revert deployment on Vercel to previous commit.
2. Restore previous database schema backup (Neon snapshots).
3. Disable Service Worker and clear IndexedDB on client side via a quick hotfix endpoint.
4. Communicate rollback to admins via email template.

## Dependencies
- Next.js 15, React 19, Tailwind 4, shadcn/ui
- PostgreSQL 16 on Neon/Supabase
- Drizzle ORM
- jose (JWT)
- Workbox, Dexie.js
- Zustand, SheetJS, jsPDF
- Vercel hosting

## Success Criteria
- ✅ Employees can clock‑in/out and pause/resume using PIN, both online and offline.
- ✅ Attendance data persists locally and syncs correctly when connectivity returns.
- ✅ Admin can configure shifts and export reports in all three formats.
- ✅ Overtime calculations match configurable rules.
- ✅ No critical bugs reported in a 2‑week pilot with 5 users.
- ✅ Deployment passes automated CI (lint, type‑check, basic e2e smoke test).
