# cli-distribution Specification

## Purpose
Define the release-facing Skill Hub CLI package contract, including Node-compatible execution, documented command behavior, validation gates, predictable exit codes, and report output policy.
## Requirements
### Requirement: Node-compatible CLI package
The system SHALL ship a Node-compatible CLI entrypoint so users can run Skill Hub without installing Bun.

#### Scenario: Package entrypoint invokes built CLI
- **WHEN** the npm package is installed or run with `npx skill-hub`
- **THEN** the `skill-hub` binary loads the built Node-compatible CLI from `dist/`

#### Scenario: Bun remains development-only
- **WHEN** a target user runs a released CLI command
- **THEN** the command does not require Bun to be installed on the target machine

### Requirement: Command surface is documented
The system SHALL document the stable lifecycle commands and their side effects.

#### Scenario: Help lists lifecycle commands
- **WHEN** the user runs `skill-hub --help`
- **THEN** help output includes `analyze`, `install`, `status`, `update --dry-run`, `remove`, `profiles`, and `components`

#### Scenario: Documentation distinguishes read-only commands
- **WHEN** the user reads README command examples
- **THEN** the docs identify `analyze`, `status`, and `update --dry-run` as read-only and `install` and `remove` as mutating

### Requirement: Release readiness validation
The system SHALL provide a repeatable validation path before publishing a package.

#### Scenario: Validate release candidate
- **WHEN** maintainers prepare a release candidate
- **THEN** they can run a documented sequence covering typecheck, tests, skill validation, build, and local package smoke testing

#### Scenario: Package includes installable assets
- **WHEN** maintainers inspect the packed npm artifact
- **THEN** it includes the CLI entrypoint, built `dist/`, capability index, docs needed by reports, and installable skill/config assets listed in `package.json`

### Requirement: CLI exits predictably
The system SHALL use predictable exit behavior for automation.

#### Scenario: Read-only success exits zero
- **WHEN** `skill-hub analyze <target> --json` completes with recommendations or conflicts
- **THEN** it exits with code 0 because the command succeeded

#### Scenario: Invalid command exits non-zero
- **WHEN** the user runs an unsupported lifecycle command or invalid option
- **THEN** the CLI prints a clear error and exits non-zero

#### Scenario: Missing mutation confirmation exits two
- **WHEN** the user runs a first-release mutating command without `--dry-run` or `--yes`
- **THEN** the CLI prints the required confirmation flag and exits with code 2

#### Scenario: Mutating update is rejected in first release
- **WHEN** the user runs `skill-hub update <target>` without `--dry-run`
- **THEN** the CLI prints that mutating update is deferred and exits with code 2

#### Scenario: Safety blocker exits three
- **WHEN** a requested mutation cannot fully complete because of modified managed files
- **THEN** the CLI exits with code 3 and reports the blocker

### Requirement: Report output policy
The system SHALL keep read-only commands side-effect free unless the user provides an explicit output path.

#### Scenario: Read-only HTML prints to stdout
- **WHEN** the user runs a read-only command with `--html` and no `--output`
- **THEN** the CLI prints HTML to stdout without creating `.skill-hub/`

#### Scenario: Explicit report output may create directories
- **WHEN** the user runs a read-only command with `--output <file>`
- **THEN** the CLI writes the selected report to that file and may create the file's parent directories
