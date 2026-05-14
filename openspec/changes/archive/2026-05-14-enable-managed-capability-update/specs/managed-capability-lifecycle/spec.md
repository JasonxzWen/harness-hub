## ADDED Requirements

### Requirement: Update preview remains side-effect free
The system SHALL keep update preview commands read-only while reporting version differences and blockers from the lock and current capability index.

#### Scenario: Dry-run update reports available updates
- **WHEN** `.skill-hub/lock.json` records a schema version 2 installed component whose version differs from the current `capabilities/index.json` component version
- **THEN** `skill-hub update <target> --dry-run --json` reports the component as update-available without copying files, deleting files, or rewriting `.skill-hub/lock.json`

#### Scenario: Dry-run update reports blockers
- **WHEN** an update-available component has modified managed files, missing managed files, unsafe managed paths, schema version 1 hashless records, skipped status, or no matching current capability index component
- **THEN** `skill-hub update <target> --dry-run --json` reports the blocker reason without mutating the target repository

#### Scenario: Dry-run update can be scoped to selected components
- **WHEN** the user runs `skill-hub update <target> --dry-run --component skill:grill-me --json`
- **THEN** the update preview includes only the selected managed component and excludes unselected update-available components from the planned update set

### Requirement: Safe managed update
The system SHALL apply normal updates only to schema version 2 installed components whose managed files still match the lock, and SHALL require explicit force confirmation before overwriting modified or restoring missing schema version 2 managed files.

#### Scenario: Confirmed update refreshes an unmodified component
- **WHEN** `.skill-hub/lock.json` records a schema version 2 installed component, all recorded file hashes match the current target files, and the current capability index has a newer component version
- **THEN** `skill-hub update <target> --yes` replaces only the lock-recorded managed files for that component with the current Skill Hub component assets
- **AND** unmanaged files in the same destination directory remain intact
- **AND** the lock records the current component version, source metadata, file list, file hashes, hub version, and update timestamp
- **AND** the command exits with code 0

#### Scenario: Confirmed update with no version differences is a no-op
- **WHEN** every installed component version in `.skill-hub/lock.json` matches the current capability index
- **THEN** `skill-hub update <target> --yes` reports no updates, mutates no managed files, leaves the lock unchanged, and exits with code 0

#### Scenario: Confirmed update can be scoped to selected components
- **WHEN** multiple managed components are update-available and the user runs `skill-hub update <target> --component skill:grill-me --yes`
- **THEN** the system updates only the selected managed component
- **AND** unselected update-available components remain unchanged in `.skill-hub/lock.json`
- **AND** the command exits with code 0 when the selected component passes safety checks

#### Scenario: Modified managed files block update
- **WHEN** an update-available schema version 2 component has at least one managed file whose current hash differs from the lock
- **THEN** `skill-hub update <target> --yes` reports the component as blocked, mutates no files for any component, leaves the lock unchanged, and exits with code 3

#### Scenario: Missing managed files block update
- **WHEN** an update-available schema version 2 component is missing at least one lock-recorded managed file
- **THEN** `skill-hub update <target> --yes` reports the component as blocked, mutates no files for any component, leaves the lock unchanged, and exits with code 3

#### Scenario: Force update overwrites modified managed files
- **WHEN** an update-available schema version 2 component has modified lock-recorded managed files and the user runs `skill-hub update <target> --force --yes`
- **THEN** the system replaces only lock-recorded managed files for that component with the current Skill Hub component assets
- **AND** unmanaged files in the same destination directory remain intact
- **AND** the report identifies the component as force-updated
- **AND** the command exits with code 0 when no non-force-overridable blockers exist

#### Scenario: Force update restores missing managed files
- **WHEN** an update-available schema version 2 component is missing lock-recorded managed files and the user runs `skill-hub update <target> --force --yes`
- **THEN** the system restores the current Skill Hub component assets for that component
- **AND** the refreshed lock records the resulting managed file list and hashes
- **AND** the command exits with code 0 when no non-force-overridable blockers exist

#### Scenario: Schema version one locks block update
- **WHEN** `.skill-hub/lock.json` uses schema version 1 and a component version differs from the current capability index
- **THEN** `skill-hub update <target> --yes` reports that hashless records require explicit migration before update, mutates no files, leaves the lock unchanged, and exits with code 3

#### Scenario: Unknown or skipped components are not updated
- **WHEN** the lock contains an update-available component id missing from the current capability index or a component record with status `skipped`
- **THEN** `skill-hub update <target> --yes` reports that record as non-updatable, mutates no files for any component, leaves the lock unchanged, and exits with code 3 when an update was requested

### Requirement: Schema version one migration
The system SHALL provide an explicit migration command for converting verifiable schema version 1 lock records into schema version 2 records.

#### Scenario: Migration dry run reports convertible records
- **WHEN** `.skill-hub/lock.json` uses schema version 1 and its managed destination files exactly match the current Skill Hub component assets
- **THEN** `skill-hub migrate-lock <target> --dry-run --json` reports the records that can be converted without rewriting `.skill-hub/lock.json`

#### Scenario: Confirmed migration writes schema version two hashes
- **WHEN** `.skill-hub/lock.json` uses schema version 1 and all selected records exactly match the current Skill Hub component assets
- **THEN** `skill-hub migrate-lock <target> --yes` writes a schema version 2 lock with managed file lists, SHA-256 hashes, component versions, source metadata, hub version, and migration timestamp
- **AND** the command exits with code 0

#### Scenario: Divergent schema version one records block migration
- **WHEN** a schema version 1 record has missing files, modified files, unsafe paths, skipped status, or no matching current capability index component
- **THEN** `skill-hub migrate-lock <target> --yes` reports the blocker, leaves `.skill-hub/lock.json` unchanged, and exits with code 3

#### Scenario: Migrated lock can drive managed lifecycle commands
- **WHEN** `skill-hub migrate-lock <target> --yes` successfully converts a schema version 1 lock to schema version 2
- **THEN** subsequent `skill-hub status <target> --json`, `skill-hub update <target> --yes`, and `skill-hub remove <target> --yes` use the migrated hashes as the ownership boundary
