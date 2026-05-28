# harness-lifecycle Specification

## Purpose
Define the explicit repo-local harness lifecycle for planning, initializing, validating, and keeping root harness files separate from the standard skill install path.

## Requirements
### Requirement: Harness gap analysis
The system SHALL provide an opt-in harness analysis that reports target repository harness gaps without mutating target files, git state, lock files, or external resources.

#### Scenario: Run harness analysis without side effects
- **WHEN** the user runs `skill-hub analyze <target> --harness --json`
- **THEN** the system reports harness findings without creating `.skill-hub/`, writing reports by default, changing target files, or changing git state

#### Scenario: Existing harness evidence is reported
- **WHEN** the target repository contains files such as `AGENTS.md`, `feature_list.json`, `progress.md`, `session-handoff.md`, or a Skill Hub lock with harness components
- **THEN** the harness analysis includes those paths as evidence

### Requirement: Harness initialization planning
The system SHALL provide a side-effect-free harness initialization plan before writing root-level harness files.

#### Scenario: Preview minimal harness initialization
- **WHEN** the user runs `skill-hub init-harness <target> --dry-run --json`
- **THEN** the system reports the files it would create, skip, or overwrite without writing target files or `.skill-hub/lock.json`

#### Scenario: Existing user files are skipped by default
- **WHEN** a planned harness destination already exists and is not managed by the lock
- **THEN** the dry-run plan marks that file as skipped unless `--force` is provided

### Requirement: Confirmed harness initialization
The system SHALL initialize a minimal repo-local harness only when the user confirms mutation.

#### Scenario: Confirm minimal harness initialization
- **WHEN** the user runs `skill-hub init-harness <target> --yes --json`
- **THEN** the system writes missing minimal harness files, records the harness component in `.skill-hub/lock.json`, and reports installed and skipped files

#### Scenario: Unconfirmed harness initialization does not mutate
- **WHEN** the user runs `skill-hub init-harness <target>` without `--dry-run` or `--yes`
- **THEN** the system does not write files and exits with an explanation that confirmation is required

### Requirement: Harness validation
The system SHALL validate the observable target harness contract without mutating target files.

#### Scenario: Validate complete harness
- **WHEN** the user runs `skill-hub validate-harness <target> --json` after successful harness initialization
- **THEN** the system reports required harness files as present and exits successfully

#### Scenario: Validate incomplete harness
- **WHEN** the target repository is missing required minimal harness files
- **THEN** the system reports missing files and exits with a non-zero code

### Requirement: Default skill installation remains separate
The system SHALL keep root harness initialization separate from standard skill installation.

#### Scenario: Standard install omits root harness files
- **WHEN** the user runs `skill-hub install <target> --target standard --yes`
- **THEN** the system installs standard skill directories and does not create root files such as `AGENTS.md`, `feature_list.json`, `progress.md`, or `session-handoff.md`
