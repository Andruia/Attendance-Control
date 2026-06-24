# Spec: Attendance Recording

## Domain: attendance-recording

### Requirement: PIN Clock In/Out
- **The system MUST** receive a 4‑6 digit PIN, validate it client‑side, and generate a timestamped event.
- **It SHALL** store the event locally in Dexie.js and tag it as pending for sync.

#### Scenario: Successful Clock In
- GIVEN a valid PIN entered by an employee.
- WHEN the employee taps *Clock In*.
- THEN a `timeentry` record is created with `type=clock_in`, `device_ts` and a `server_ts` placeholder, marked `pending=True`.
- AND the UI transitions to *On‑Break* state.
