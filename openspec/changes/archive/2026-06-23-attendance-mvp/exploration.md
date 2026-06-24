## Exploration: Attendance MVP — Stack & Architecture for SMB Time Tracking

### Current State

Greenfield project — empty repo with only `openspec/` configuration. No source code, no framework config, no database. Stack must be defined from scratch.

**Problem domain**: Attendance tracking for administrative staff at a medical consultation center. Core flows are PIN-based clock-in/out with break management, configurable overtime calculation, and exportable reports. Must work offline on mobile devices and sync when connectivity returns.

### Key Challenges

1. **Offline-first on mobile**: Employees must clock in/out even without internet. Requires local storage of time entries + background sync.
2. **PIN-only auth**: Traditional session/JWT auth is overkill. Need a lightweight PIN verification flow that's fast on mobile but still secure server-side.
3. **Timestamp integrity**: Server must be authoritative for timestamps (prevent API injection), but offline mode means device timestamps are used locally and reconciled on sync.
4. **Overtime calculation engine**: Must be 100% configurable (thresholds, multipliers, rounding rules) and compute in real-time for dashboard display.
5. **Single-tenant simplicity**: No multi-tenancy complexity, but architecture should not preclude future scaling.

### Affected Areas

- `(new) app/` — Next.js App Router application shell, PWA manifest, service worker
- `(new) src/domain/` — Business logic: overtime engine, time entry management, shift rules
- `(new) src/infrastructure/` — Database schema, API routes, auth middleware
- `(new) src/lib/offline/` — IndexedDB storage, sync queue, conflict resolution
- `(new) src/components/` — Time clock UI, dashboard, admin panels

### Approaches

#### 1. Framework: Next.js App Router (Recommended)

| Aspect | Analysis |
|--------|----------|
| **Fit** | Strong — SSR for admin pages, client components for interactive clock UI, API routes for backend |
| **PWA support** | Native — Next.js has official PWA guide with `app/manifest.ts`, service worker registration, push notifications |
| **Mobile-first** | Good — responsive by default with Tailwind, `display: standalone` PWA mode |
| **Offline** | Partial — Next.js serves the shell offline via service worker cache, but data layer needs custom IndexedDB + sync logic |

**Alternative considered: Vite + React SPA**
- Pros: Simpler build, no SSR complexity, easier service worker control
- Cons: No built-in API routes (need separate backend), no SSR for admin SEO (minor), more infrastructure to manage
- Verdict: Next.js wins because it unifies frontend + API in one deployable unit, reducing ops complexity for an SMB product.

**Alternative considered: React Native / Expo**
- Pros: True native offline, better device integration
- Cons: Massive complexity increase, app store deployment, overkill for a time clock app
- Verdict: Rejected — PWA covers the use case. GPS/biometrics not in MVP.

#### 2. ORM: Drizzle ORM over Prisma (Recommended)

| Criteria | Drizzle | Prisma |
|----------|---------|--------|
| Type safety | Schema-as-code, inferred types, SQL-like API | Generated client, good types but heavier |
| Performance | Thin SQL layer, no query engine overhead | Rust query engine, cold start penalty |
| Bundle size | ~50KB | ~2MB+ (engine binary) |
| Migrations | `drizzle-kit` push/generate, lightweight | `prisma migrate`, more opinionated |
| Timestamps/UTC | Native `timestamp({ withTimezone: true })`, `defaultNow()` | Supported but less ergonomic for computed columns |
| Serverless fit | Excellent — no binary, fast cold starts | Problematic — engine binary, cold start issues |
| Learning curve | SQL knowledge required | More abstracted, easier for beginners |

**Verdict**: Drizzle wins for this project. The overtime engine needs precise timestamp handling with timezone awareness. Drizzle's `timestamp({ precision: 6, withTimezone: true })` maps directly to PostgreSQL's `timestamptz`. Lighter footprint matters for serverless deployment (Vercel).

#### 3. Offline Strategy: Service Worker + IndexedDB + Sync Queue (Recommended)

```
OFFLINE ARCHITECTURE:
├── Service Worker (Workbox)
│   ├── Cache app shell (HTML, CSS, JS)
│   ├── Cache API responses (read-only data: shifts, config)
│   └── Queue failed mutations (clock events)
├── IndexedDB (via idb or Dexie.js)
│   ├── Pending time entries (clock-in, pause, resume, clock-out)
│   ├── Local employee data cache
│   └── Sync metadata (last sync timestamp, queue status)
└── Background Sync API
    ├── On reconnect: flush queue to server
    ├── Conflict resolution: employee record wins (device timestamp)
    └── Server validates and stores with server timestamp alongside
```

**Alternative considered: Local-first with CRDTs (e.g., Automerge, Yjs)**
- Pros: Elegant conflict resolution, real-time sync
- Cons: Massive complexity for simple append-only time entries, overkill
- Verdict: Rejected — time entries are append-only with rare edits (supervisor corrections). Simple queue + last-write-wins is sufficient.

**Alternative considered: PouchDB/CouchDB sync**
- Pros: Built-in sync protocol
- Cons: Requires CouchDB backend (not PostgreSQL), different data model
- Verdict: Rejected — PostgreSQL is the right choice for relational attendance data with complex overtime queries.

#### 4. Auth: Custom PIN Auth with Session Tokens (Recommended over NextAuth)

**Why NOT NextAuth/Auth.js**:
- NextAuth is designed for OAuth/social login flows. PIN-only auth doesn't fit its provider model.
- Adding a "credentials provider" in NextAuth for PIN is possible but fights the framework — session management overhead for what should be a simple lookup.
- NextAuth adds complexity (callbacks, adapters, JWT rotation) that provides no value for PIN auth.

**Recommended approach**:
```
PIN AUTH FLOW:
├── Employee enters 4-6 digit PIN on clock screen
├── POST /api/auth/verify-pin { pin: "1234" }
├── Server: bcrypt.compare(pin, employee.pin_hash)
├── Server: issue short-lived session token (httpOnly cookie)
│   ├── For clock actions: token valid 5 minutes (just enough for the flow)
│   └── For admin sessions: standard JWT with refresh (30min/7d)
├── Clock action: POST /api/clock { action: "clock-in", token }
│   └── Server generates authoritative timestamp
└── Offline: PIN verified against cached hash locally, entry queued
```

**Security considerations**:
- PINs are 4-6 digits — brute-force risk. Mitigate with: rate limiting (5 attempts/minute), account lockout after 10 failures, PIN complexity rules (no sequential, no repeated digits).
- PIN hashed with bcrypt (cost factor 10) server-side.
- Offline PIN verification uses cached bcrypt hash in IndexedDB (encrypted at rest if possible).

#### 5. Overtime Calculation Engine: Domain-Driven, Rule-Based

```
OVERTIME ENGINE DESIGN:
├── Configuration (stored in DB, cached)
│   ├── daily_threshold_minutes: 480 (8h)
│   ├── weekly_threshold_minutes: 2880 (48h)
│   ├── rounding_minutes: 15
│   ├── rounding_strategy: "nearest" | "up" | "down"
│   └── multipliers: [
│       { after_daily: 480, rate: 1.25 },
│       { weekend: true, rate: 2.0 }
│   ]
├── Calculator (pure function, no side effects)
│   ├── Input: TimeEntry[] + OvertimeConfig
│   ├── Step 1: Calculate gross duration (clock-out - clock-in)
│   ├── Step 2: Subtract break durations
│   ├── Step 3: Apply rounding rules
│   ├── Step 4: Classify hours (normal vs overtime tiers)
│   └── Output: { normalMinutes, overtimeTiers[], totalPay? }
└── Shared: Same engine runs server-side AND client-side (real-time dashboard)
```

**Key design decision**: The overtime calculator MUST be a pure function that runs identically on server and client. This enables real-time dashboard display without API calls and ensures server recalculation matches what the employee sees.

### Recommended Stack

| Layer | Technology | Reasoning |
|-------|-----------|-----------|
| **Framework** | Next.js 15+ (App Router) | Unified frontend + API, native PWA support, Vercel deployment |
| **UI** | React 19 + Tailwind CSS 4 + shadcn/ui | Mobile-first responsive, accessible components, rapid UI development |
| **Database** | PostgreSQL 16 | Relational model fits attendance data, strong timestamp/timezone support, JSON columns for config |
| **ORM** | Drizzle ORM | Type-safe, lightweight, excellent PostgreSQL timestamp handling, serverless-friendly |
| **Auth** | Custom PIN auth + jose (JWT) | Lightweight, purpose-built for PIN flows, no framework overhead |
| **Offline** | Workbox (SW) + Dexie.js (IndexedDB) | Proven offline toolkit, good DX, Background Sync API support |
| **Validation** | Zod | Runtime + static type validation, shared between client/server |
| **State** | Zustand | Lightweight client state for clock UI, offline queue management |
| **Export** | xlsx (SheetJS) + jsPDF | Client-side export generation, works offline |
| **Hosting** | Vercel (frontend) + Supabase or Neon (PostgreSQL) | Zero-ops for SMB, generous free tiers, auto-scaling |

### Architecture Overview

```
ARCHITECTURE (Screaming Architecture):
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth layout group
│   │   └── login/                # PIN entry for admin
│   ├── (employee)/               # Employee layout
│   │   ├── clock/                # Time clock screen (main UX)
│   │   └── history/              # Personal history
│   ├── (supervisor)/             # Supervisor layout
│   │   ├── team/                 # Team records
│   │   └── corrections/          # Edit employee errors
│   ├── (admin)/                  # Admin layout
│   │   ├── settings/             # Company rules, overtime config
│   │   ├── users/                # User management
│   │   └── reports/              # Global reports + export
│   ├── api/                      # API routes
│   │   ├── auth/                 # PIN verification
│   │   ├── clock/                # Clock actions
│   │   ├── employees/            # CRUD
│   │   ├── reports/              # Report generation
│   │   └── sync/                 # Offline sync endpoint
│   ├── manifest.ts               # PWA manifest
│   └── layout.tsx                # Root layout
├── domain/                       # Business logic (PURE, no framework deps)
│   ├── overtime/                 # Overtime calculation engine
│   │   ├── calculator.ts         # Pure function
│   │   ├── config.ts             # Types for overtime rules
│   │   └── calculator.test.ts    # Unit tests
│   ├── time-entry/               # Time entry management
│   │   ├── types.ts
│   │   └── validation.ts
│   └── shift/                    # Shift configuration
├── infrastructure/               # External concerns
│   ├── db/                       # Drizzle schema + migrations
│   │   ├── schema.ts
│   │   └── migrations/
│   ├── auth/                     # PIN auth implementation
│   └── sync/                     # Offline sync logic
├── lib/                          # Shared utilities
│   ├── offline/                  # IndexedDB + sync queue
│   └── export/                   # CSV/Excel/PDF generation
└── components/                   # UI components (atomic design)
    ├── ui/                       # shadcn/ui primitives
    ├── clock/                    # Time clock components
    ├── dashboard/                # Dashboard widgets
    └── layout/                   # Shell, nav, responsive layout
```

### Risks

1. **Offline PIN security**: Cached PIN hashes in IndexedDB are accessible to anyone with device access. Mitigation: auto-clear after inactivity, consider Web Crypto API for encryption at rest. Acceptable risk for MVP given physical device access is already a trust boundary.

2. **Background Sync browser support**: Background Sync API is Chromium-only (no Firefox/Safari). Mitigation: fallback to sync-on-focus (when app regains visibility). This covers the primary use case (employee opens app → it syncs).

3. **Timestamp reconciliation complexity**: Offline entries use device time, which could be wrong (user changed clock). Mitigation: server stores both `device_timestamp` and `server_received_at`, flags entries with large drift (>5 min) for supervisor review.

4. **PWA install friction**: Users must manually "Add to Home Screen". Mitigation: onboarding flow with clear instructions, install prompt banner. Not a technical blocker.

5. **Export file size**: Large date ranges with many employees could produce heavy Excel/PDF files. Mitigation: pagination, server-side generation for large exports (streaming response).

6. **Scope creep risk**: The MVP feature set is well-defined but substantial. The overtime engine alone has significant configuration surface. Mitigation: strict MVP boundary — no GPS, no CRM, no night shifts, no multi-tenant.

### Ready for Proposal

**Yes** — The problem space is well-understood, the stack is validated against requirements, and the architecture approach is clear. The orchestrator should proceed to `sdd-propose` to formalize the scope, approach, and rollback plan for the attendance MVP.
