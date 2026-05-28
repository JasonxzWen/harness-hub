## ADDED Requirements

### Requirement: Harness analysis flag
The system SHALL expose harness gap analysis as an opt-in extension of repository analysis.

#### Scenario: Harness analysis appears only when requested
- **WHEN** the user runs `skill-hub analyze <target> --json`
- **THEN** the analysis output omits harness gap findings unless `--harness` is provided

#### Scenario: Harness analysis can compose with agent readiness
- **WHEN** the user runs `skill-hub analyze <target> --agent-readiness --harness --json`
- **THEN** the output includes both agent-readiness findings and harness gap findings while preserving deterministic ordering
