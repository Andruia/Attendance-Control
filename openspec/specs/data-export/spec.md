# Spec: Data Export

## Domain: data-export

### Requirement: Export Formats
- **The system MUST** provide CSV, Excel, and PDF exports of attendance reports for a selected date range.
- **It SHALL** allow filtering by employee, department, and status.

#### Scenario: Export CSV
- GIVEN a supervisor requests CSV for Jan 1‑15.
- WHEN export is triggered.
- THEN a file named `attendance_2025-01-01_to_2025-01-15.csv` is downloaded.
