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
- **THEN** help output includes `analyze`, `install`, `status`, `update --dry-run`, `update --yes`, `update --force --yes`, `update --component <id>`, `migrate-lock`, `remove`, and `components`

#### Scenario: Documentation distinguishes read-only and mutating commands
- **WHEN** the user reads README command examples
- **THEN** the docs identify `analyze`, `status`, `update --dry-run`, and `migrate-lock --dry-run` as read-only and `install`, `update --yes`, `update --force --yes`, `migrate-lock --yes`, and `remove` as mutating

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
- **WHEN** the user runs a mutating command, including `install`, `init`, `update`, `migrate-lock`, or `remove`, without `--dry-run` or `--yes`
- **THEN** the CLI prints the required confirmation flag and exits with code 2

#### Scenario: Confirmed update success exits zero
- **WHEN** the user runs `skill-hub update <target> --yes` and all update-available components pass safety checks
- **THEN** the CLI applies the managed updates, prints the requested report format, and exits with code 0

#### Scenario: Confirmed force update success exits zero
- **WHEN** the user runs `skill-hub update <target> --force --yes` and all blockers are force-overridable schema version 2 modified or missing managed files
- **THEN** the CLI applies the forced managed updates, prints the requested report format, and exits with code 0

#### Scenario: Invalid component selector exits two
- **WHEN** the user runs `skill-hub update <target> --component <id> --yes` and `<id>` does not match a managed component in the lock
- **THEN** the CLI prints a clear selector error and exits with code 2

#### Scenario: Safety blocker exits three
- **WHEN** a requested mutation cannot fully complete because of non-force-overridable modified, missing, hashless, unsafe, skipped, or unknown managed component records
- **THEN** the CLI exits with code 3 and reports the blocker

### Requirement: Report output policy
The system SHALL keep read-only commands side-effect free unless the user provides an explicit output path.

#### Scenario: Read-only HTML prints to stdout
- **WHEN** the user runs a read-only command with `--html` and no `--output`
- **THEN** the CLI prints HTML to stdout without creating `.skill-hub/`

#### Scenario: Explicit report output may create directories
- **WHEN** the user runs a read-only command with `--output <file>`
- **THEN** the CLI writes the selected report to that file and may create the file's parent directories

### Requirement: Managed update acceptance validation
The system SHALL include a repeatable local acceptance path for the managed update lifecycle.

#### Scenario: Smoke script validates update lifecycle
- **WHEN** maintainers prepare a managed update implementation for review
- **THEN** they can run a checked-in script or documented equivalent that creates disposable target repositories and validates install, stale-version detection, update preview, confirmed update, component-scoped update, force update, schema version 1 migration, divergent migration blockers, and safe removal

### Requirement: Harness Hub CLI alias
The system SHALL expose `harness-hub` as a compatible CLI binary while keeping `skill-hub` functional.

#### Scenario: Harness Hub help works
- **WHEN** the user runs `harness-hub --help`
- **THEN** the CLI prints help that leads with Harness Hub and lists the same lifecycle commands as the compatible `skill-hub` binary

#### Scenario: Skill Hub command remains compatible
- **WHEN** the user runs `skill-hub --help`
- **THEN** the CLI continues to work and identifies `skill-hub` as a compatibility command for Harness Hub

### Requirement: Package metadata describes Harness Hub migration
The system SHALL update package metadata and release validation to publish the Harness Hub-compatible command surface.

#### Scenario: Package exposes both binaries
- **WHEN** the npm package is packed
- **THEN** `package.json` exposes both `skill-hub` and `harness-hub` binaries

#### Scenario: Release validation checks both help commands
- **WHEN** release validation runs
- **THEN** it checks both `node bin/skill-hub.mjs --help` and `node bin/harness-hub.mjs --help`
