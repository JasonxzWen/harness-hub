# agent-readiness-analysis Specification

## Purpose
Define the read-only `skill-hub analyze <target> --agent-readiness` contract for deterministic, evidence-backed assessment of target repositories before higher-autonomy agent work.
## Requirements
### Requirement: Read-only agent readiness analysis
The system SHALL provide an opt-in agent-readiness analysis for a target repository without writing files, creating directories, changing git state, or modifying external resources.

#### Scenario: Run readiness analysis without side effects
- **WHEN** the user runs `skill-hub analyze <target> --agent-readiness --json`
- **THEN** the system reports agent-readiness findings without creating `.skill-hub/`, writing reports by default, changing target files, or changing git state

#### Scenario: Unknown target signals do not fail analysis
- **WHEN** the target repository lacks recognized agent, test, or documentation markers
- **THEN** the system returns readiness findings with unknown or not-detected states rather than failing

### Requirement: Context budget findings
The system SHALL report context-budget findings from deterministic repo evidence.

#### Scenario: Detect agent instruction surfaces
- **WHEN** the target repository contains files or directories such as `AGENTS.md` or `skills/`
- **THEN** the readiness report includes those paths as context-budget evidence

#### Scenario: Report duplicated always-loaded instruction roots
- **WHEN** multiple always-loaded instruction surfaces are detected for the same target agent
- **THEN** the readiness report includes a context-budget finding explaining the potential context duplication risk

### Requirement: Outcome criteria findings
The system SHALL report whether the target repository exposes explicit success criteria that agents can work toward.

#### Scenario: Detect outcome-like artifacts
- **WHEN** the target repository contains acceptance criteria, OpenSpec tasks, PR templates, release checklists, or Definition of Done documents in known paths
- **THEN** the readiness report includes those paths as outcome evidence

#### Scenario: Recommend outcome criteria when absent
- **WHEN** no outcome-like artifact is detected
- **THEN** the readiness report recommends adding reviewable success criteria before increasing agent autonomy

### Requirement: Verification gate findings
The system SHALL report discoverable verification gates for target repositories.

#### Scenario: Detect package verification scripts
- **WHEN** `package.json` contains scripts such as `test`, `lint`, `typecheck`, `build`, or `validate`
- **THEN** the readiness report includes those commands as verification evidence

#### Scenario: Detect project validation files
- **WHEN** the target repository contains known CI, test, or validation paths
- **THEN** the readiness report includes those paths as verification evidence

#### Scenario: Recommend verification before routines
- **WHEN** no verification gate is detected
- **THEN** the readiness report warns that routine-style or multi-agent execution should remain manual until a checkable gate exists

### Requirement: Agent routing findings
The system SHALL report whether target work can be decomposed into narrow agent responsibilities.

#### Scenario: Detect routing assets
- **WHEN** the target repository contains skill routing docs, agent role configs, OpenSpec changes, or equivalent known routing files
- **THEN** the readiness report includes those paths as agent-routing evidence

#### Scenario: Recommend routing decomposition
- **WHEN** no routing assets are detected
- **THEN** the readiness report recommends starting with one or two narrow workflows instead of broad autonomous execution

### Requirement: Automation candidate findings
The system SHALL produce reviewable automation candidates without creating or running automations.

#### Scenario: Suggest candidate routines
- **WHEN** verification gates, CI files, review docs, or recurring validation scripts are detected
- **THEN** the readiness report may suggest candidate routines such as CI failure triage, code-review preparation, docs freshness checks, or nightly validation

#### Scenario: Do not create external automation
- **WHEN** automation candidates are reported
- **THEN** the system does not create schedules, webhooks, pull requests, commits, pushes, or third-party resources

### Requirement: Reviewable learning capture findings
The system SHALL recommend learning-capture locations as reviewable guidance only.

#### Scenario: Detect durable learning locations
- **WHEN** the target repository contains docs, skill gotchas, changelogs, retrospectives, or memory-note proposal paths known to the analyzer
- **THEN** the readiness report includes those paths as learning-capture evidence

#### Scenario: Learning capture is not automatic memory mutation
- **WHEN** the readiness report recommends learning capture
- **THEN** the system does not write to host memory, target repo files, or `.skill-hub/lock.json`

### Requirement: Stable readiness report contract
The system SHALL provide stable JSON ordering and enough evidence for each readiness finding.

#### Scenario: Repeated readiness output is stable
- **WHEN** the same `skill-hub analyze <target> --agent-readiness --json` command runs twice without target file changes
- **THEN** categories, finding ids, states, recommendations, and evidence paths appear in the same order after normalizing timestamps

#### Scenario: Finding includes required fields
- **WHEN** the readiness report emits a finding
- **THEN** the finding includes category, state, severity, reason, recommendation, and evidence fields

### Requirement: Documentation references
The system SHALL keep project documentation linked to the agent-readiness planning artifacts and source rationale.

#### Scenario: README links readiness planning
- **WHEN** the user reads the README docs index or milestones
- **THEN** the documentation links to the agent-readiness OpenSpec change or a project document that summarizes it

#### Scenario: Design docs cite source rationale
- **WHEN** the user reads the agent-readiness design
- **THEN** the document includes links to the motivating Code with Claude and Reiner Pope materials

### Requirement: Readiness can inform harness gaps
The system SHALL allow read-only agent-readiness signals to inform harness recommendations without changing the side-effect-free readiness contract.

#### Scenario: Harness recommendations reference readiness evidence
- **WHEN** `skill-hub analyze <target> --agent-readiness --harness --json` detects verification, outcome, routing, or learning-capture gaps
- **THEN** harness findings may cite those gaps as evidence for root harness initialization recommendations

#### Scenario: Readiness remains non-mutating
- **WHEN** readiness and harness analysis run together
- **THEN** the system does not create `.skill-hub/`, target files, schedules, webhooks, commits, pushes, or external resources
