## ADDED Requirements

### Requirement: Readiness can inform harness gaps
The system SHALL allow read-only agent-readiness signals to inform harness recommendations without changing the side-effect-free readiness contract.

#### Scenario: Harness recommendations reference readiness evidence
- **WHEN** `skill-hub analyze <target> --agent-readiness --harness --json` detects verification, outcome, routing, or learning-capture gaps
- **THEN** harness findings may cite those gaps as evidence for root harness initialization recommendations

#### Scenario: Readiness remains non-mutating
- **WHEN** readiness and harness analysis run together
- **THEN** the system does not create `.skill-hub/`, target files, schedules, webhooks, commits, pushes, or external resources
