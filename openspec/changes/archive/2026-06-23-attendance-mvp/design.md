# Design: Attendance MVP

## Technical Approach
A comprehensive technical design document for the Attendance MVP, structured according to openspec conventions. This captures architecture decisions, database schema, API contracts, and implementation patterns for the attendance system.

## 1. Architectural Overview
### Screaming Architecture Layout
```mermaid
graph TD
    Subdomain[src/domain] --> Infrasctructure[src/infrastructure]
    Subdomain --> Lib[src/lib]
    Lib --> Components[src/components]
    Components --> App[src/app]
    Subdomain --> ClockModule
    Infrasctructure --> PostgreSQL
    Infrasctructure --> Workbox
    App --> Zustand

Rules:
- Domain layer defines business rules
- Infrastructure handles persistence and OS integration
- Lib provides type-safe utilities
- Components follow atomic UI patterns
- ClockModule is the domain-specific engine
- Offline capabilities encapsulate in Workbox/Dexie
```

### Layer Boundaries
- **Domain/Infrastructure Separation**: All database access through Drizzle ORM
- **Offline-First**: Background sync prioritized over UI-driven sync
- **Component Isolation**: State managed only through Zustand

## 2. Database Schema Design (Drizzle)
```ts
// Generated from OpenSpec spec.md
import { define } from 'drizzle-orm'
import type { ZodSchema } from 'zod'

const Clock = define(
  class extends zodTypes(() => { /*TS+Zod integration*/ })
)

// Tables: employee, clockEntry, overtimeConfig, syncMetadata
```

### Migration Strategy
1. version: 1 - Initial schema (spec.sql)
2. version: 2 - Add overtimeConfig table
3. version: 3 - Indexes on employee.email and clockEntry.timestamp

### Index Design
- employee.username: unique text index
- clockEntry.employeeId: GIN index with timestamp
- overtimeConfig.id: single-column index

## 3. API Routes Design
### Endpoints
| Endpoint | Method | DTOs | Purpose |
|----------|--------|------|---------|
| /auth/verify-pin | POST | {pin: string} | Auth flow |
| /clock/record | POST | {hours: number} | Time entry |
| /sync | PUT | {entries: clockEntry[]} | Offline sync |

### Error Handling
- Standardized error codes (400, 422, 500)
- Zod validation errors standardized
- Rate limiting: 100 req/min for /auth endpoints

## 4. Overtime Engine Design
```ts
// Core function
const calculateOvertime = (hours: number, config: OvertimeConfig): OvertimeResult => {
  // Implementation with rounding strategy
}

// Configuration model
interface OvertimeConfig {
  maxOvertimeHours: number
  roundingMinutes: number
  categories: { [key: string]: TimeCategory }
}

// Rounding (15min or 30min increments)
// Time categorization: productive (core work) vs pause (distraction)
```

## 5. Offline Sync Architecture
```diff
// Pending entries schema
- employeeCache: { id: string, name: string, lastSync: Date }
+ syncMetadata: { lastSync: Date, nextAttempt: Date }
```

### Conflict Resolution
- Last-write-wins on employee data
- Vector clocks for clockEntry conflicts

## 6. PIN Auth Flow
```mermaid
graph TD
    User[Client] --> PinInput
    -> API[auth/verify-pin]
    -> Token[JWT]
    -> Cookie[httpOnly, secure, SameSite=Lax]
    Token --> RateLimiter
    RateLimiter --> AuthenticatedUser
```

### Token Lifecycle
- 15min short-lived cookie with refresh token
- Refresh token stored in secure cookie
- Rate limiting: 5 req/min per IP

## 7. UI Component Structure
```tree
ui/
├── atomic/
├── clock/
│   ├── clock-entry.tsx
│   └── overtime-display.tsx
├── dashboard/
└── layout/
```

### State Management
- Zustand stores: { clockEntry: null | { id: string, hours: number }, overtimeConfig: OvertimeConfig }

## 8. Testing Strategy
### Unit Tests
- Jest tests for calculateOvertime (edge cases: negative hours, 0.25h increments)

### Integration Tests
- Supertest coverage for all API endpoints

### E2E Tests
- Cypress flows: clock recording -> sync -> approval

## Risks
- IndexedDB size management
- JWT token security in client-side cookies
- Overtime calculation edge cases

## Skill Resolution
- sdd-design: Follows openspec conventions
- openspec-convention.md: Follows file structure and format rules