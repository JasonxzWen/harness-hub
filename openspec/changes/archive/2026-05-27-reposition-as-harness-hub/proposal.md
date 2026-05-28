## Why

Skill Hub has grown beyond skill distribution: the user need is now to initialize and govern repeatable repo-local agent harnesses across projects. Keeping the product framed only as a skill installer hides the more important lifecycle: analyze a repository, install the right agent workflow assets, initialize root harness files, validate the harness, and migrate naming safely.

## What Changes

- Reposition the product as Harness Hub while preserving Skill Hub as the compatible skill-distribution subsystem during migration.
- Add an explicit repo harness lifecycle for dry-run planning, confirmed initialization, validation, status, update, and removal of root-level harness files.
- Extend lock-backed ownership so managed root harness files are recorded and protected like managed skill files.
- Add a `harness-hub` CLI alias and package/documentation compatibility plan without breaking existing `skill-hub` users.
- Add a source-reviewed advanced harness pack lane for evaluated harness patterns, without wholesale importing host-specific upstream metadata.

Non-goals:

- No immediate filesystem repository rename in the first implementation step.
- No hidden mutation in `analyze`, `install`, or existing skill lifecycle commands.
- No hosted service, leaderboard, LLM judge, external automation, webhook, commit, push, or remote runner.
- No wholesale import of `walkinglabs/learn-harness-engineering` or `harness-creator` content until license, metadata, and distribution boundaries are documented.

## Capabilities

### New Capabilities

- `harness-lifecycle`: Repo-local harness planning, initialization, validation, ownership tracking, status, update, and removal.
- `harness-source-evaluation`: Source-reviewed advanced harness packs and evaluated upstream references.

### Modified Capabilities

- `repo-capability-analysis`: Add harness gap analysis while preserving read-only behavior.
- `agent-readiness-analysis`: Feed harness gap reporting without changing the side-effect-free readiness contract.
- `managed-capability-lifecycle`: Extend lock ownership from skill directories to managed harness files and future harness packs.
- `cli-distribution`: Add Harness Hub naming, binary alias, and package compatibility requirements.

## Impact

- `src/skillHub.ts`: CLI commands, aliases, harness planning, harness file writes, validation, report rendering, and lock handling.
- `bin/skill-hub.mjs` and new `bin/harness-hub.mjs`: compatible CLI entrypoints.
- `package.json`: package metadata, binary map, package files, release checks, and compatibility naming.
- `capabilities/index.json`: future component-kind boundaries for skill, harness template, and advanced pack metadata.
- `README.md`, `AGENTS.md`, `docs/capability-map.md`, `docs/cli-lifecycle-design.md`, `docs/source-projects.md`, and routing docs: product positioning and user-facing command contracts.
- `openspec/specs/*`: requirements for harness lifecycle, source evaluation, analysis, managed ownership, and distribution.
- `tests/*`: CLI contract, harness smoke, lock safety, package manifest, and no-side-effect regression coverage.
