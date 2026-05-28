## ADDED Requirements

### Requirement: Dev bootstrap is Codex-only for the initial target
The system SHALL initialize Codex-native project guidance and SHALL NOT create other-agent platform instruction files in the initial implementation.

#### Scenario: Initialize project guidance
- **WHEN** the dev bootstrap workflow plans root guidance files
- **THEN** the planned guidance uses `AGENTS.md`
- **AND** it may use `AGENTS.override.md` only for an explicit Codex override
- **AND** it does not plan non-Codex platform instruction files

### Requirement: Dev bootstrap composes skill distribution and harness setup
The system SHALL provide an explicit one-command development setup capability that can prepare a target repository with the standard skill set and a root harness structure.

#### Scenario: Preview dev bootstrap
- **WHEN** the user runs the dev bootstrap command in dry-run mode for a target repository
- **THEN** the system reports the planned standard skill installation
- **AND** the system reports the planned root harness files
- **AND** the system does not write files or modify `.harness-hub/lock.json`

#### Scenario: Confirm dev bootstrap
- **WHEN** the user runs the dev bootstrap command with explicit confirmation
- **THEN** the system installs the managed standard skill set
- **AND** the system initializes the managed harness files
- **AND** the system records managed ownership so future status, update, and remove behavior can distinguish managed files from user-owned files

### Requirement: Bootstrap initializes the continuity harness before feature work
The system SHALL treat session handoff, clean-state checks, evaluator guidance, feature state, task state, progress state, and validation entry points as bootstrap infrastructure rather than later business functionality.

#### Scenario: Initialize continuity artifacts
- **WHEN** a minimal harness is initialized
- **THEN** the target contains root Codex instructions, feature state, task or current-work state, progress state, session handoff, clean-state checklist, evaluator or definition-of-done guidance, and a validation entry point
- **AND** each artifact contains minimal usable content rather than placeholders that require oral context

#### Scenario: Start a future session
- **WHEN** a new Codex session opens a bootstrapped target
- **THEN** it can identify current work, next action, non-goals, validation commands, and completion evidence from repository artifacts
- **AND** it does not need OpenSpec artifacts unless the current task explicitly escalated to OpenSpec

### Requirement: Low-level install remains skills-only unless explicitly changed
The system SHALL keep low-level skill installation separate from the higher-level dev bootstrap workflow.

#### Scenario: Run low-level install
- **WHEN** the user runs `harness-hub install <target> --target standard --yes`
- **THEN** the command installs the standard skill components
- **AND** the command does not implicitly write root harness files

#### Scenario: User wants full dev setup
- **WHEN** the user wants skills plus harness setup
- **THEN** the user can run the explicit dev bootstrap workflow instead of relying on hidden `install` side effects

### Requirement: Harness template is adapted from source-backed concepts
The system SHALL initialize harness files from locally reviewed templates that preserve the useful Learn Harness Engineering concepts without unreviewed wholesale copying.

#### Scenario: Initialize minimal harness
- **WHEN** the dev bootstrap workflow initializes a minimal harness
- **THEN** the target contains root instructions, feature state, progress or session state, handoff guidance, and validation entry points
- **AND** each file is adapted to Harness Hub's local lifecycle and source policy

#### Scenario: Validate harness continuity
- **WHEN** harness validation runs against a bootstrapped target
- **THEN** it verifies that a future agent session can find current work, next action, verification commands, and completion evidence from repository artifacts

### Requirement: Harness exposes runtime verification entry points
The system SHALL record how to run and verify the target project, including a dev server when the target has a local runtime surface.

#### Scenario: Target has a web or API runtime
- **WHEN** the target project exposes a browser, API, or local runtime surface
- **THEN** the harness records the dev server or equivalent run command
- **AND** it records a smoke or end-to-end verification command when available

#### Scenario: Target has no dev server
- **WHEN** the target is a CLI, library, documentation, or static-only project without a dev server
- **THEN** the harness records the nearest equivalent run, smoke, build, or test action

### Requirement: Harness setup is safe for existing repositories
The system SHALL protect existing target files during harness initialization.

#### Scenario: Target file already exists
- **WHEN** a planned harness destination already exists
- **THEN** dry-run output reports the conflict
- **AND** confirmed execution only overwrites when the chosen policy explicitly allows it

#### Scenario: Remove or update managed harness files
- **WHEN** later lifecycle behavior touches harness files
- **THEN** the system uses managed ownership evidence rather than deleting files by name alone

### Requirement: Harness enforces worktree and task isolation
The system SHALL define repository, worktree, feature, task, and goal boundaries so Codex can work without reorganizing project code solely for isolation.

#### Scenario: Start a write task
- **WHEN** a Codex goal or implementation task is prepared for a bootstrapped repository
- **THEN** the task records its worktree or branch context, feature area, allowed paths, forbidden paths, validation commands, and completion evidence
- **AND** the system treats the worktree as the default write isolation boundary

#### Scenario: Code organization remains architecture-owned
- **WHEN** a project is bootstrapped
- **THEN** source code remains organized by the target project's architecture
- **AND** the harness uses task scope and worktree state for isolation instead of physically moving code by feature or task

### Requirement: Harness prevents dirty writes
The system SHALL detect and control writes that would mix unrelated local changes with managed bootstrap or task output.

#### Scenario: Target worktree is dirty before bootstrap
- **WHEN** dry-run or confirmed bootstrap starts against a target with existing uncommitted changes
- **THEN** the system reports the dirty paths
- **AND** confirmed execution stops unless the user has explicitly accepted a policy for working with those paths

#### Scenario: Task writes outside scope
- **WHEN** a task completes or requests handoff
- **THEN** the system compares changed paths with the task's allowed and forbidden paths
- **AND** it reports out-of-scope changes before declaring the task ready for handoff

### Requirement: Harness constrains parallel write work
The system SHALL allow parallel work only when the coordination boundary is explicit.

#### Scenario: Parallel read-heavy work
- **WHEN** research, review, log analysis, or validation can be performed independently
- **THEN** the harness may allow parallel agents or parallel tasks to return summarized evidence

#### Scenario: Parallel write-heavy work
- **WHEN** multiple tasks would edit code or durable state
- **THEN** each write task must use an independent worktree or branch, non-overlapping path scope, independent validation, and a single integration review point
- **AND** same-file or same-feature-state writes are treated as non-parallel by default

### Requirement: Harness limits always-loaded and handoff file size
The system SHALL keep always-loaded instructions and current-state files small enough to remain useful to Codex.

#### Scenario: Validate file-size policy
- **WHEN** harness validation runs
- **THEN** it checks configured size limits for root instructions, handoff, progress, and current task artifacts
- **AND** it reports when content should be summarized, split, or archived

#### Scenario: Preserve long evidence
- **WHEN** a task produces long logs, source notes, or generated artifacts
- **THEN** the durable current-state files keep summaries and paths
- **AND** long evidence is stored in explicit archive, log, source-ledger, or ignored artifact locations according to its purpose

### Requirement: Harness prepares goal-ready task artifacts
The system SHALL make it possible to start a Codex goal from a bounded task artifact without requiring a separate OpenSpec proposal for ordinary work.

#### Scenario: Prepare goal-ready task
- **WHEN** the user finishes brainstorming and pressure-testing a requirement
- **THEN** the harness can record a task with goal text, assumptions, non-goals, allowed paths, acceptance criteria, validation commands, and handoff requirements
- **AND** the task is sufficient for a Codex goal to decide whether it has succeeded

#### Scenario: Escalate to OpenSpec
- **WHEN** a task changes public CLI contracts, cross-module architecture, publishing side effects, irreversible decisions, or long-lived specs
- **THEN** the workflow can escalate to OpenSpec before implementation
- **AND** ordinary bounded tasks do not require OpenSpec by default
