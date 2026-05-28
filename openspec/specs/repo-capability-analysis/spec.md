# repo-capability-analysis Specification

## Purpose
Define the read-only target repository analysis contract for deterministic capability detection, explainable recommendations, conflict reporting, and stable JSON output.
## Requirements
### Requirement: Read-only target inventory
The system SHALL analyze a target repository without writing files, creating directories, changing git state, or modifying external resources.

#### Scenario: Analyze a repository with no Skill Hub state
- **WHEN** the user runs `skill-hub analyze <target>`
- **THEN** the system reports detected repo signals and capability findings without creating `.skill-hub/`

#### Scenario: Analyze with HTML output
- **WHEN** the user runs `skill-hub analyze <target> --html`
- **THEN** the system prints HTML to stdout without creating `.skill-hub/`

#### Scenario: Analyze with explicit output path
- **WHEN** the user runs `skill-hub analyze <target> --html --output <file>`
- **THEN** the system writes the report to the requested file path and does not install or remove capabilities

### Requirement: Capability matching from explicit metadata
The system SHALL derive detected, missing, and recommended capabilities from explicit capability index metadata such as `provides`, `detects`, `agents`, installable skill components, and component routing.

#### Scenario: Path-only detection rule
- **WHEN** the capability index contains a V1 detect rule
- **THEN** the rule uses an exact repository-relative path and does not use absolute paths, traversal segments, globs, or file-content matching

#### Scenario: Existing capability is detected
- **WHEN** the target repository contains a path listed in a component detection rule
- **THEN** the analysis result marks the matching capability as existing and includes the evidence path

#### Scenario: Missing installable capability is recommended
- **WHEN** an installable skill component is not detected in the target repository
- **THEN** the analysis result marks that capability as recommended and cites the component that caused the recommendation

### Requirement: Explainable recommendation output
The system SHALL include enough reason data for every recommendation, conflict, and skip so users can understand why the CLI reached that result.

#### Scenario: Recommendation has a reason
- **WHEN** the analysis recommends `verification-loop`
- **THEN** the JSON result includes the capability id, component id, target agent, destination path, and human-readable reason

#### Scenario: Conflict has evidence
- **WHEN** the target repository already has a destination path that Skill Hub would install into
- **THEN** the analysis result reports the conflict with the existing path and the action that would be taken by default

### Requirement: Stable JSON report contract
The system SHALL provide a JSON report for analysis that is deterministic for the same target files, capability index, and agent options.

#### Scenario: Repeated analysis is stable
- **WHEN** the user runs the same `skill-hub analyze <target> --json` command twice without file changes
- **THEN** the capability ids, recommendation ids, conflict ids, and evidence paths appear in the same order

#### Scenario: JSON includes required fields
- **WHEN** the user runs `skill-hub analyze <target> --json`
- **THEN** the JSON result includes schema version, hub version, target directory, agents, repo signals, and sorted findings

#### Scenario: Unknown repo type is handled
- **WHEN** the target repository has no recognized language or agent markers
- **THEN** the system still reports component-based recommendations and marks repo signals as absent rather than failing

### Requirement: Harness analysis flag
The system SHALL expose harness gap analysis as an opt-in extension of repository analysis.

#### Scenario: Harness analysis appears only when requested
- **WHEN** the user runs `skill-hub analyze <target> --json`
- **THEN** the analysis output omits harness gap findings unless `--harness` is provided

#### Scenario: Harness analysis can compose with agent readiness
- **WHEN** the user runs `skill-hub analyze <target> --agent-readiness --harness --json`
- **THEN** the output includes both agent-readiness findings and harness gap findings while preserving deterministic ordering
