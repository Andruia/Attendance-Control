# Spec: Overtime Engine

## Domain: overtime-engine

### Requirement: Overtime Calculation
- **The system MUST** calculate overtime based on configuration: `threshold_hours`, `multiplier`, `rounding_strategy`.
- **It SHALL** return total regular and overtime hours per time entry batch.

#### Scenario: Overtime Over Threshold
- GIVEN an employee works 9 h on a 8 h shift.
- WHEN the overtime engine runs.
- THEN 1 h is marked as overtime multiplied by system multiplier.
