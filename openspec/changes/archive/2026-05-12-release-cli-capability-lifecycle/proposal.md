## Why

Skill Hub already has a TypeScript CLI skeleton and a machine-readable capability graph, but target repositories still lack a clear product contract for using this repo as a released tool. The next migration should turn the local installer into a safe CLI lifecycle: analyze a target repo, recommend missing capabilities, install managed assets, report drift, and remove only files owned by Skill Hub.

## What Changes

- Add a target-repo analysis contract that reports existing agent capabilities, missing capabilities, Skill Hub recommendations, and conflicts without modifying the target repo.
- Extend the installer contract from profile copying to a managed lifecycle with `install`, `status`, `update`, and `remove` semantics backed by `.skill-hub/lock.json`.
- Define safe removal rules based on lock records and file hashes so user-edited target files are skipped by default.
- Define npm-first distribution expectations so users can run the tool with `npx skill-hub ...` without cloning this repository or installing Bun.
- Keep existing `init` behavior as a compatibility alias during migration; prefer `install` in new docs.

Non-goals:

- No remote publishing, GitHub release creation, or npm publishing is performed by this change.
- No automatic mutation of third-party services, credentials, hooks, or MCP servers.
- No wholesale import of optional upstream packs. Capability recommendations still come from curated `capabilities/index.json` entries.

## Capabilities

### New Capabilities

- `repo-capability-analysis`: Read-only target-repo inventory, capability matching, gap detection, recommendation ranking, and JSON/HTML reporting.
- `managed-capability-lifecycle`: Lock-backed install, status, update planning, and safe removal of Skill Hub-managed target files.
- `cli-distribution`: Node-compatible CLI packaging, command naming, migration aliases, and release-readiness validation.

### Modified Capabilities

None.

## Impact

- `src/skillHub.ts`: CLI command model, analysis engine, lock schema, lifecycle operations, and report generation.
- `capabilities/index.json`: capability taxonomy, detection rules, install destinations, compatibility metadata, and recommendation fields.
- `README.md`: user-facing command examples and release-oriented positioning.
- `docs/capability-map.md`: product contract for analysis, recommendations, installation, status, update, and removal.
- `docs/cli-lifecycle-design.md`: migration design for command semantics, data flow, safety rules, and rollout phases.
- `tests/skillHub.test.ts` and focused test fixtures: deterministic coverage for analysis, install locks, modified-file protection, remove, and compatibility aliases.
- `package.json`, `bin/skill-hub.mjs`, and build validation: npm package readiness and Node-compatible entrypoint behavior.
