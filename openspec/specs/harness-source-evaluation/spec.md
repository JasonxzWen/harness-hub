# harness-source-evaluation Specification

## Purpose
Govern source-reviewed harness packs so advanced repo harness content remains explicit, attributable, and excluded from default skill installation until redistribution and side-effect risks are resolved.

## Requirements
### Requirement: Source-reviewed harness packs
The system SHALL document evaluated harness sources before redistributing advanced harness pack content.

#### Scenario: Record evaluated harness source
- **WHEN** an upstream harness source is used as rationale or candidate material
- **THEN** `docs/source-projects.md` records its repository URL, observed revision when available, license evidence, host-specific metadata risks, and adoption decision

#### Scenario: Block wholesale advanced pack import without review
- **WHEN** upstream content includes host-specific agent metadata, runner assumptions, or unclear repository-level license evidence
- **THEN** the system keeps that content reference-only or explicit-only until the risk is resolved

### Requirement: Advanced pack remains explicit
The system SHALL keep advanced harness packs out of default standard skill installation.

#### Scenario: Standard install excludes advanced pack
- **WHEN** the user runs `skill-hub install <target> --target standard --yes`
- **THEN** no advanced harness pack files are written to the target repository

#### Scenario: Advanced pack is discoverable as source metadata
- **WHEN** the user reads the capability map or source records
- **THEN** advanced harness packs are described as evaluated candidates with explicit activation requirements
