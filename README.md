# Attendance Control

PIN-based attendance clock-in/out system for small-to-medium medical clinics.

Built with Next.js 15, React 19, Tailwind CSS 4, and PostgreSQL 16 (Neon).

## Features

- **PIN-based Authentication**: 4-6 digit PIN verification with JWT session tokens
- **Clock In/Out**: Record clock-in, pause, resume, and clock-out events
- **Offline Support**: Time entries stored locally in IndexedDB (Dexie.js), synced via Workbox Background Sync
- **Shift Management**: Create/Edit/Delete shift templates with day-of-week configuration
- **Overtime Engine**: Configurable thresholds, multipliers, and rounding strategies
- **Export Reports**: CSV, Excel (xlsx), and PDF export with date range filtering
- **Role-Based Access**: Employee, Supervisor, and Admin roles with scoped API access
- **PWA Ready**: Installable on mobile devices with offline capability

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| Database | PostgreSQL 16 (Neon) |
| ORM | Drizzle ORM |
| Auth | Custom PIN auth + jose (JWT) |
| Offline | Workbox (SW) + Dexie.js (IndexedDB) |
| Validation | Zod |
| State | Zustand |
| Export | xlsx (SheetJS) + jsPDF |
| Testing | Vitest + Cypress + Supertest |
| CI | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL 16 (or Neon account)
- npm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd control-asistencia

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database URL and secrets
```

### Database Setup

```bash
# Generate migrations from schema
npm run db:generate

# Push migrations to database
npm run db:migrate

# (Optional) Open Drizzle Studio
npm run db:studio

# Seed database with test data
npm run db:seed
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run type-check

# Lint
npm run lint
```

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth layout group
│   ├── (employee)/         # Employee screens
│   ├── (supervisor)/       # Supervisor screens
│   ├── (admin)/            # Admin screens
│   └── api/                # API routes
├── domain/                 # Business logic (pure, no dependencies)
│   ├── overtime/           # Overtime calculation engine
│   ├── time-entry/         # Time entry types and validation
│   └── shift/              # Shift configuration types
├── infrastructure/         # External concerns
│   ├── db/                 # Drizzle schema and migrations
│   ├── auth/               # JWT and RBAC middleware
│   └── sync/               # Sync conflict resolution
├── lib/                    # Shared utilities
│   ├── offline/            # IndexedDB + sync management
│   ├── export/             # CSV/Excel/PDF generation
│   └── stores/             # Zustand state stores
├── components/             # UI components
│   ├── ui/                 # shadcn/ui primitives
│   ├── clock/              # Clock entry components
│   └── shift/              # Shift editor components
└── __tests__/              # Integration tests
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/verify-pin` | None | Verify PIN and get session |
| POST | `/api/clock/record` | Clock Token | Record clock action |
| GET | `/api/shifts` | Session | List shifts |
| POST | `/api/shifts` | Admin | Create shift |
| PUT | `/api/shifts/:id` | Admin | Update shift |
| DELETE | `/api/shifts/:id` | Admin | Delete shift |
| GET | `/api/overtime/config` | Session | Get overtime config |
| POST | `/api/overtime/config` | Admin | Update overtime config |
| GET | `/api/employees` | Session | List employees |
| PATCH | `/api/employees/:id` | Admin | Update employee |
| POST | `/api/sync` | Session | Sync offline entries |
| POST | `/api/reports/export` | Session | Export report |

See [openapi.yaml](./openapi.yaml) for full API documentation.

## Test Credentials

After running `npm run db:seed`, the following test accounts are available:

| PIN | Role | Name |
|-----|------|------|
| `123456` | Admin | Admin Principal |
| `111111` | Supervisor | Supervisor Pérez |
| `222222` | Employee | Empleado García |
| `333333` | Employee | Empleado López |

All PINs work on the login screen at `/login`.

## Deployment

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `JWT_SECRET` | Secret key for session JWT (min 32 chars) |
| `JWT_CLOCK_SECRET` | Secret key for clock tokens (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Application public URL |
| `NEXT_PUBLIC_APP_NAME` | Application display name |

## License

MIT
