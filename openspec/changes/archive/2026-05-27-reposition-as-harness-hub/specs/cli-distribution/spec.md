## ADDED Requirements

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
