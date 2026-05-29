# managed-capability-lifecycle Specification

## Purpose
Define the lock-backed lifecycle for Harness Hub-managed capabilities, including install ownership records, drift status, update planning boundaries, and safe removal behavior.
## Requirements
### Requirement: Lock-backed installation
The system SHALL write `.harness-hub/lock.json` after mutating installation commands and include enough ownership metadata to support status, update, and removal.

#### Scenario: Install records managed files
- **WHEN** the user runs `harness-hub install <target> --target standard --yes`
- **THEN** the lock records each installed component id, component version, agent, relative destination, file list, file hashes, source identifier, and install timestamp

#### Scenario: Lock paths are safe and portable
- **WHEN** the system writes `.harness-hub/lock.json`
- **THEN** every recorded path is repository-relative, uses forward slashes, and excludes absolute paths or `..` traversal segments

#### Scenario: Lock hashes are deterministic
- **WHEN** the system records a managed file
- **THEN** the lock stores a lowercase hexadecimal SHA-256 hash over the file bytes

#### Scenario: Dry run does not write lock
- **WHEN** the user runs `harness-hub install <target> --dry-run`
- **THEN** the system prints the planned changes without copying files or writing `.harness-hub/lock.json`

#### Scenario: Mutating install requires confirmation
- **WHEN** the user runs `harness-hub install <target>` without `--dry-run` or `--yes`
- **THEN** the system does not mutate files, explains that `--yes` is required for non-interactive mutation, and exits with code 2

### Requirement: Full standard installation
The system SHALL install the complete standard skill set and SHALL overwrite same-name skill destination paths during confirmed installs.

#### Scenario: Existing same-name skill is overwritten
- **WHEN** an install item destination already exists and the user confirms `harness-hub install <target> --target standard --yes`
- **THEN** the system replaces that destination and records the newly written files as Harness Hub-managed files

#### Scenario: Standard install has no named variants
- **WHEN** the user runs `harness-hub install <target> --target standard --dry-run`
- **THEN** the plan includes every standard `kind: "skill"` component and does not require a named install variant or bundle selector

### Requirement: Status detects drift
The system SHALL classify managed components as current, missing, modified, update-available, skipped, or unknown based on the lock and current capability index.

#### Scenario: Managed file is modified
- **WHEN** a file recorded in `.harness-hub/lock.json` exists but its hash differs from the recorded hash
- **THEN** `harness-hub status <target>` reports the component as modified rather than current

#### Scenario: Component version differs from the hub
- **WHEN** the lock records a component version different from the current capability index version
- **THEN** `harness-hub status <target>` reports update-available for that component

#### Scenario: Schema version one lock is readable
- **WHEN** `.harness-hub/lock.json` uses schema version 1
- **THEN** `harness-hub status <target>` reports known component state without crashing and marks hash-dependent details as unknown when hashes are absent

### Requirement: Safe removal of managed files
The system SHALL remove only files and directories recorded in `.harness-hub/lock.json` and SHALL skip modified managed files by default.

#### Scenario: Remove unmodified managed files
- **WHEN** the user runs `harness-hub remove <target> --yes` and all managed file hashes match the lock
- **THEN** the system removes the managed files, deletes `.harness-hub/lock.json`, prunes empty managed directories, and leaves unmanaged files intact

#### Scenario: Modified managed files are protected
- **WHEN** a managed file hash differs from the lock
- **THEN** `harness-hub remove <target> --yes` skips that file, reports that `--force` is required to remove modified managed files, and exits with code 3

#### Scenario: Force removes only managed files
- **WHEN** the user runs `harness-hub remove <target> --force --yes`
- **THEN** the system may remove modified files recorded in the lock but still leaves unmanaged files intact

#### Scenario: Force does not override hashless schema one records
- **WHEN** `.harness-hub/lock.json` uses schema version 1 without per-file hashes and the user runs `harness-hub remove <target> --force --yes`
- **THEN** the system skips hashless records, deletes no unverifiable files, reports the schema limitation, and exits with code 3

#### Scenario: No lock file exists
- **WHEN** the user runs `harness-hub remove <target> --yes` and `.harness-hub/lock.json` does not exist
- **THEN** the system performs no deletion and reports that no Harness Hub-managed installation was found

#### Scenario: Schema version one removal is blocked
- **WHEN** `.harness-hub/lock.json` uses schema version 1 without per-file hashes and the user runs `harness-hub remove <target> --yes`
- **THEN** the system skips hashless records, deletes no unverifiable files, reports the schema limitation, and exits with code 3

#### Scenario: Mutating remove requires confirmation
- **WHEN** the user runs `harness-hub remove <target>` without `--dry-run` or `--yes`
- **THEN** the system does not mutate files, explains that `--yes` is required for non-interactive mutation, and exits with code 2

### Requirement: Migration alias compatibility
The system SHALL preserve existing `init` command behavior as an alias for `install` during the migration.

#### Scenario: Init alias installs using install semantics
- **WHEN** the user runs `harness-hub init <target> --target standard --yes`
- **THEN** the system executes the same planning, copying, lock writing, and reporting behavior as `harness-hub install <target> --target standard --yes`

### Requirement: Update preview remains side-effect free
The system SHALL keep update preview commands read-only while reporting version differences and blockers from the lock and current capability index.

#### Scenario: Dry-run update reports available updates
- **WHEN** `.harness-hub/lock.json` records a schema version 2 installed component whose version differs from the current `capabilities/index.json` component version
- **THEN** `harness-hub update <target> --dry-run --json` reports the component as update-available without copying files, deleting files, or rewriting `.harness-hub/lock.json`

#### Scenario: Dry-run update reports blockers
- **WHEN** an update-available component has modified managed files, missing managed files, unsafe managed paths, schema version 1 hashless records, skipped status, or no matching current capability index component
- **THEN** `harness-hub update <target> --dry-run --json` reports the blocker reason without mutating the target repository

#### Scenario: Dry-run update can be scoped to selected components
- **WHEN** the user runs `harness-hub update <target> --dry-run --component skill:grill-me --json`
- **THEN** the update preview includes only the selected managed component and excludes unselected update-available components from the planned update set

### Requirement: Safe managed update
The system SHALL apply normal updates only to schema version 2 installed components whose managed files still match the lock, and SHALL require explicit force confirmation before overwriting modified or restoring missing schema version 2 managed files.

#### Scenario: Confirmed update refreshes an unmodified component
- **WHEN** `.harness-hub/lock.json` records a schema version 2 installed component, all recorded file hashes match the current target files, and the current capability index has a newer component version
- **THEN** `harness-hub update <target> --yes` replaces only the lock-recorded managed files for that component with the current Harness Hub component assets
- **AND** unmanaged files in the same destination directory remain intact
- **AND** the lock records the current component version, source metadata, file list, file hashes, hub version, and update timestamp
- **AND** the command exits with code 0

#### Scenario: Confirmed update with no version differences is a no-op
- **WHEN** every installed component version in `.harness-hub/lock.json` matches the current capability index
- **THEN** `harness-hub update <target> --yes` reports no updates, mutates no managed files, leaves the lock unchanged, and exits with code 0

#### Scenario: Confirmed update can be scoped to selected components
- **WHEN** multiple managed components are update-available and the user runs `harness-hub update <target> --component skill:grill-me --yes`
- **THEN** the system updates only the selected managed component
- **AND** unselected update-available components remain unchanged in `.harness-hub/lock.json`
- **AND** the command exits with code 0 when the selected component passes safety checks

#### Scenario: Modified managed files block update
- **WHEN** an update-available schema version 2 component has at least one managed file whose current hash differs from the lock
- **THEN** `harness-hub update <target> --yes` reports the component as blocked, mutates no files for any component, leaves the lock unchanged, and exits with code 3

#### Scenario: Missing managed files block update
- **WHEN** an update-available schema version 2 component is missing at least one lock-recorded managed file
- **THEN** `harness-hub update <target> --yes` reports the component as blocked, mutates no files for any component, leaves the lock unchanged, and exits with code 3

#### Scenario: Force update overwrites modified managed files
- **WHEN** an update-available schema version 2 component has modified lock-recorded managed files and the user runs `harness-hub update <target> --force --yes`
- **THEN** the system replaces only lock-recorded managed files for that component with the current Harness Hub component assets
- **AND** unmanaged files in the same destination directory remain intact
- **AND** the report identifies the component as force-updated
- **AND** the command exits with code 0 when no non-force-overridable blockers exist

#### Scenario: Force update restores missing managed files
- **WHEN** an update-available schema version 2 component is missing lock-recorded managed files and the user runs `harness-hub update <target> --force --yes`
- **THEN** the system restores the current Harness Hub component assets for that component
- **AND** the refreshed lock records the resulting managed file list and hashes
- **AND** the command exits with code 0 when no non-force-overridable blockers exist

#### Scenario: Schema version one locks block update
- **WHEN** `.harness-hub/lock.json` uses schema version 1 and a component version differs from the current capability index
- **THEN** `harness-hub update <target> --yes` reports that hashless records require explicit migration before update, mutates no files, leaves the lock unchanged, and exits with code 3

#### Scenario: Unknown or skipped components are not updated
- **WHEN** the lock contains an update-available component id missing from the current capability index or a component record with status `skipped`
- **THEN** `harness-hub update <target> --yes` reports that record as non-updatable, mutates no files for any component, leaves the lock unchanged, and exits with code 3 when an update was requested

### Requirement: Schema version one migration
The system SHALL provide an explicit migration command for converting verifiable schema version 1 lock records into schema version 2 records.

#### Scenario: Migration dry run reports convertible records
- **WHEN** `.harness-hub/lock.json` uses schema version 1 and its managed destination files exactly match the current Harness Hub component assets
- **THEN** `harness-hub migrate-lock <target> --dry-run --json` reports the records that can be converted without rewriting `.harness-hub/lock.json`

#### Scenario: Confirmed migration writes schema version two hashes
- **WHEN** `.harness-hub/lock.json` uses schema version 1 and all selected records exactly match the current Harness Hub component assets
- **THEN** `harness-hub migrate-lock <target> --yes` writes a schema version 2 lock with managed file lists, SHA-256 hashes, component versions, source metadata, hub version, and migration timestamp
- **AND** the command exits with code 0

#### Scenario: Divergent schema version one records block migration
- **WHEN** a schema version 1 record has missing files, modified files, unsafe paths, skipped status, or no matching current capability index component
- **THEN** `harness-hub migrate-lock <target> --yes` reports the blocker, leaves `.harness-hub/lock.json` unchanged, and exits with code 3

#### Scenario: Migrated lock can drive managed lifecycle commands
- **WHEN** `harness-hub migrate-lock <target> --yes` successfully converts a schema version 1 lock to schema version 2
- **THEN** subsequent `harness-hub status <target> --json`, `harness-hub update <target> --yes`, and `harness-hub remove <target> --yes` use the migrated hashes as the ownership boundary

### Requirement: Harness files are lock-managed
The system SHALL record confirmed harness initialization files in `.harness-hub/lock.json` with deterministic hashes, portable paths, and a harness component id.

#### Scenario: Harness init records managed files
- **WHEN** the user runs `harness-hub init-harness <target> --yes`
- **THEN** `.harness-hub/lock.json` records a component such as `harness:minimal` with repository-relative file paths, SHA-256 hashes, source, kind, status, and install timestamp

#### Scenario: Status detects harness drift
- **WHEN** a lock-recorded harness file is modified or removed
- **THEN** `harness-hub status <target>` reports the harness component as modified or missing

### Requirement: Harness removal respects ownership
The system SHALL remove only lock-recorded harness files and protect modified harness files by default.

#### Scenario: Remove unmodified harness files
- **WHEN** the user runs `harness-hub remove <target> --yes` and lock-recorded harness files match their hashes
- **THEN** the system removes those managed harness files and leaves unmanaged root files intact

#### Scenario: Protect modified harness files
- **WHEN** a lock-recorded harness file hash differs from the lock
- **THEN** `harness-hub remove <target> --yes` skips that file and reports that `--force` is required

### Requirement: Harness update uses component source
The system SHALL update lock-recorded managed harness files from the current harness component source only when safety checks pass.

#### Scenario: Harness update is available
- **WHEN** `.harness-hub/lock.json` records an older `harness:minimal` version and current package metadata has a newer version
- **THEN** `harness-hub update <target> --dry-run --component harness:minimal --json` reports an update without mutating files

#### Scenario: Harness update preserves unowned root files
- **WHEN** a root file exists in the target repository but is not recorded in the `harness:minimal` lock record
- **THEN** `harness-hub update <target> --yes --component harness:minimal` does not overwrite that unowned root file
