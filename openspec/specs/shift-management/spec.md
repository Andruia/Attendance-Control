# Spec: Shift Management

## Domain: shift-management

### Requirement: Shift Definition
- **The system MUST** allow admins to create, edit, and delete daily shift templates, each with a `start`, `end`, optional `break_start`, `break_end`.
- **It SHOULD** warn when times overlap or are outside business hours.

#### Scenario: Create Shift
- GIVEN admin in **Shift Settings**.
- WHEN admin saves `09:00‑17:00` with a 15‑min break.
- THEN the shift is persisted and appears in the employee shift list.
