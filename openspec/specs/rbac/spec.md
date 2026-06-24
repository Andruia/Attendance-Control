# Spec: Role-Based Access Control

## Domain: rbac

### Requirement: Role Access
- **The system MUST** enforce role‑based access: Employees can only view own data; Supervisors view their team; Admins have full access.
- **It SHALL** validate JWT scopes on each API call.

#### Scenario: Supervisor Access
- GIVEN a supervisor token requests `/api/reports`.
- WHEN the request is processed.
- THEN the response contains only the supervisor's department employees.
