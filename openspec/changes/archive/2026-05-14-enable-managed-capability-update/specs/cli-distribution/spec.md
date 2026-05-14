## MODIFIED Requirements

### Requirement: Command surface is documented
The system SHALL document the stable lifecycle commands and their side effects.

#### Scenario: Help lists lifecycle commands
- **WHEN** the user runs `skill-hub --help`
- **THEN** help output includes `analyze`, `install`, `status`, `update --dry-run`, `update --yes`, `update --force --yes`, `update --component <id>`, `migrate-lock`, `remove`, `profiles`, and `components`

#### Scenario: Documentation distinguishes read-only and mutating commands
- **WHEN** the user reads README command examples
- **THEN** the docs identify `analyze`, `status`, `update --dry-run`, and `migrate-lock --dry-run` as read-only and `install`, `update --yes`, `update --force --yes`, `migrate-lock --yes`, and `remove` as mutating

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

## ADDED Requirements

### Requirement: Managed update acceptance validation
The system SHALL include a repeatable local acceptance path for the managed update lifecycle.

#### Scenario: Smoke script validates update lifecycle
- **WHEN** maintainers prepare a managed update implementation for review
- **THEN** they can run a checked-in script or documented equivalent that creates disposable target repositories and validates install, stale-version detection, update preview, confirmed update, component-scoped update, force update, schema version 1 migration, divergent migration blockers, and safe removal
