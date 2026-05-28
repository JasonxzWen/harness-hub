## ADDED Requirements

### Requirement: Harness files are lock-managed
The system SHALL record confirmed harness initialization files in `.skill-hub/lock.json` with deterministic hashes, portable paths, and a harness component id.

#### Scenario: Harness init records managed files
- **WHEN** the user runs `skill-hub init-harness <target> --yes`
- **THEN** `.skill-hub/lock.json` records a component such as `harness:minimal` with repository-relative file paths, SHA-256 hashes, source, kind, status, and install timestamp

#### Scenario: Status detects harness drift
- **WHEN** a lock-recorded harness file is modified or removed
- **THEN** `skill-hub status <target>` reports the harness component as modified or missing

### Requirement: Harness removal respects ownership
The system SHALL remove only lock-recorded harness files and protect modified harness files by default.

#### Scenario: Remove unmodified harness files
- **WHEN** the user runs `skill-hub remove <target> --yes` and lock-recorded harness files match their hashes
- **THEN** the system removes those managed harness files and leaves unmanaged root files intact

#### Scenario: Protect modified harness files
- **WHEN** a lock-recorded harness file hash differs from the lock
- **THEN** `skill-hub remove <target> --yes` skips that file and reports that `--force` is required

### Requirement: Harness update uses component source
The system SHALL update lock-recorded managed harness files from the current harness component source only when safety checks pass.

#### Scenario: Harness update is available
- **WHEN** `.skill-hub/lock.json` records an older `harness:minimal` version and current package metadata has a newer version
- **THEN** `skill-hub update <target> --dry-run --component harness:minimal --json` reports an update without mutating files

#### Scenario: Harness update preserves skipped root files
- **WHEN** `init-harness` skipped an existing root file because it was not lock-managed
- **THEN** `skill-hub update <target> --yes --component harness:minimal` does not overwrite that skipped root file
