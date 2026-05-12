## ADDED Requirements

### Requirement: Lock-backed installation
The system SHALL write `.skill-hub/lock.json` after mutating installation commands and include enough ownership metadata to support status, update, and removal.

#### Scenario: Install records managed files
- **WHEN** the user runs `skill-hub install <target> --profile minimal --agent codex --yes`
- **THEN** the lock records each installed component id, component version, agent, relative destination, file list, file hashes, source identifier, profile, and install timestamp

#### Scenario: Lock paths are safe and portable
- **WHEN** the system writes `.skill-hub/lock.json`
- **THEN** every recorded path is repository-relative, uses forward slashes, and excludes absolute paths or `..` traversal segments

#### Scenario: Lock hashes are deterministic
- **WHEN** the system records a managed file
- **THEN** the lock stores a lowercase hexadecimal SHA-256 hash over the file bytes

#### Scenario: Dry run does not write lock
- **WHEN** the user runs `skill-hub install <target> --dry-run`
- **THEN** the system prints the planned changes without copying files or writing `.skill-hub/lock.json`

#### Scenario: Mutating install requires confirmation
- **WHEN** the user runs `skill-hub install <target>` without `--dry-run` or `--yes`
- **THEN** the system does not mutate files, explains that `--yes` is required for non-interactive mutation, and exits with code 2

### Requirement: Conservative destination conflict handling
The system SHALL skip existing destination paths by default unless the user explicitly requests overwrite behavior.

#### Scenario: Existing destination is skipped
- **WHEN** an install item destination already exists and `--overwrite` is not provided
- **THEN** the system skips that item, records the skip reason in the report, and does not modify the existing destination

#### Scenario: Overwrite is explicit
- **WHEN** an install item destination already exists and `--overwrite --yes` is provided
- **THEN** the system replaces the destination and records the newly written files as Skill Hub-managed files

### Requirement: Status detects drift
The system SHALL classify managed components as current, missing, modified, update-available, skipped, or unknown based on the lock and current capability index.

#### Scenario: Managed file is modified
- **WHEN** a file recorded in `.skill-hub/lock.json` exists but its hash differs from the recorded hash
- **THEN** `skill-hub status <target>` reports the component as modified rather than current

#### Scenario: Component version differs from the hub
- **WHEN** the lock records a component version different from the current capability index version
- **THEN** `skill-hub status <target>` reports update-available for that component

#### Scenario: Schema version one lock is readable
- **WHEN** `.skill-hub/lock.json` uses schema version 1
- **THEN** `skill-hub status <target>` reports known component state without crashing and marks hash-dependent details as unknown when hashes are absent

### Requirement: Safe removal of managed files
The system SHALL remove only files and directories recorded in `.skill-hub/lock.json` and SHALL skip modified managed files by default.

#### Scenario: Remove unmodified managed files
- **WHEN** the user runs `skill-hub remove <target> --yes` and all managed file hashes match the lock
- **THEN** the system removes the managed files, deletes `.skill-hub/lock.json`, prunes empty managed directories, and leaves unmanaged files intact

#### Scenario: Modified managed files are protected
- **WHEN** a managed file hash differs from the lock
- **THEN** `skill-hub remove <target> --yes` skips that file, reports that `--force` is required to remove modified managed files, and exits with code 3

#### Scenario: Force removes only managed files
- **WHEN** the user runs `skill-hub remove <target> --force --yes`
- **THEN** the system may remove modified files recorded in the lock but still leaves unmanaged files intact

#### Scenario: Force does not override hashless schema one records
- **WHEN** `.skill-hub/lock.json` uses schema version 1 without per-file hashes and the user runs `skill-hub remove <target> --force --yes`
- **THEN** the system skips hashless records, deletes no unverifiable files, reports the schema limitation, and exits with code 3

#### Scenario: No lock file exists
- **WHEN** the user runs `skill-hub remove <target> --yes` and `.skill-hub/lock.json` does not exist
- **THEN** the system performs no deletion and reports that no Skill Hub-managed installation was found

#### Scenario: Schema version one removal is blocked
- **WHEN** `.skill-hub/lock.json` uses schema version 1 without per-file hashes and the user runs `skill-hub remove <target> --yes`
- **THEN** the system skips hashless records, deletes no unverifiable files, reports the schema limitation, and exits with code 3

#### Scenario: Mutating remove requires confirmation
- **WHEN** the user runs `skill-hub remove <target>` without `--dry-run` or `--yes`
- **THEN** the system does not mutate files, explains that `--yes` is required for non-interactive mutation, and exits with code 2

### Requirement: Migration alias compatibility
The system SHALL preserve existing `init` command behavior as an alias for `install` during the migration.

#### Scenario: Init alias installs using install semantics
- **WHEN** the user runs `skill-hub init <target> --profile minimal --agent codex --yes`
- **THEN** the system executes the same planning, copying, lock writing, and reporting behavior as `skill-hub install <target> --profile minimal --agent codex --yes`
