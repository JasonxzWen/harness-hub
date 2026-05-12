## Context

Skill Hub currently has a Node-compatible `skill-hub` binary, a TypeScript implementation, `capabilities/index.json`, profile-based `init`, `status`, lock writing, and HTML reports. The missing product layer is a full target-repo lifecycle: a user should be able to run the released CLI from another repository, understand which agent capabilities already exist, install curated Skill Hub assets, check drift later, and remove Skill Hub-owned files without damaging local work.

The target users are maintainers of Codex, Claude Code, OpenCode, and compatible agent-workflow repositories. They need deterministic CLI output, conservative file writes, and clear provenance because installed assets are prompts, skills, config, scripts, and potentially future MCP or hook definitions.

## Goals / Non-Goals

**Goals:**

- Define an npm-first CLI lifecycle for `analyze`, `install`, `status`, `update`, and `remove`.
- Make target-repo analysis read-only, deterministic, and explainable.
- Extend the capability index so recommendations are based on explicit metadata instead of hidden heuristics.
- Make `.skill-hub/lock.json` the ownership boundary for updates and deletion.
- Preserve `init` as a temporary alias for `install` to avoid breaking existing docs and tests.
- Keep Bun as a development/build tool only; released users run through Node.

**Non-Goals:**

- Publishing to npm or GitHub in this change.
- Automatically enabling hooks, MCP servers, credentials, or third-party integrations.
- Solving every agent host at once. Codex and `.agents/skills` remain the first-class path; Claude Code and OpenCode support is metadata-driven and tested where practical.
- Installing optional upstream packs wholesale.

## Decisions

### 1. Keep a single CLI package as the primary release artifact

The released shape should be `npx skill-hub ...`, backed by the existing npm package metadata and `bin/skill-hub.mjs`. This is simpler than a GitHub Action or Codex plugin because it works in local repos, CI, and disposable test directories without a host-specific installer.

Alternative considered: ship only a Codex plugin. That would make Codex integration nicer later, but it would not help Claude Code/OpenCode repos and would make safe file lifecycle testing harder.

### 2. Split lifecycle commands by side effect

`analyze` and `status` are read-only. `install` and `remove` are mutating and require explicit confirmation unless `--yes` or `--dry-run` makes the behavior unambiguous. Existing `init` becomes an alias for `install` during migration. First-release mutating commands are non-interactive: without `--yes` or `--dry-run`, they exit with usage error code `2`. `update` is read-only plan mode in the first release: only `update --dry-run` is valid, and mutating `update` exits with usage error code `2`.

Alternative considered: keep `init` as the only install verb. That is ambiguous once the tool also supports update and remove. `install` better describes the side effect.

### 3. Treat `capabilities/index.json` as the recommendation source of truth

The index should grow from profile/component metadata into capability metadata:

- `provides`: normalized capability tags.
- `detects`: exact target paths that indicate equivalent local capability already exists.
- `agents`: supported target agents.
- `profiles`: default or explicit profiles that include the component.
- `risk`: low, medium, or high operational risk.
- `recommendation`: short explanation used in CLI and HTML reports.

V1 detection supports only exact relative path rules. The CLI can add repo signal helpers, but recommendations must cite index entries rather than hidden agent judgment. Globs, content matching, and frontmatter parsing are deferred until a concrete target repo needs them.

### 4. Make the lock file the ownership and rollback boundary

The lock should record each installed component, destination path, file list, file hashes, component version, agent, profile, source path, and install timestamp. `status`, `update`, and `remove` should operate from this lock, not from loose path scanning.

Alternative considered: delete by matching known skill directory names. That is unsafe because a target repo could already have same-named local skills or user modifications.

### 5. Prefer conservative conflict handling over overwrite defaults

If a destination exists before install, the default behavior is skip with a conflict report. `--overwrite` can replace an existing destination, but the lock should still record that Skill Hub now owns only the files it wrote. If a managed file hash changes later, `remove` and `update` skip it by default and require `--force` for destructive behavior.

### 6. Produce machine-readable output first, HTML second

Every lifecycle command that returns a report should support JSON. HTML reports remain useful for human review, but JSON is the contract for tests, CI, and future wrappers. Read-only commands write to stdout unless `--output <file>` is provided; `--html` selects format and does not imply `.skill-hub/reports/`.

## Risks / Trade-offs

- [Risk] Detection rules can become stale as agent hosts evolve. -> Mitigation: keep rules explicit in `capabilities/index.json`, test them with fixtures, and prefer "unknown" over false certainty.
- [Risk] Users may expect `remove` to clean all matching skill names. -> Mitigation: document that removal is lock-backed and intentionally skips unmanaged files.
- [Risk] Lock schema changes can strand old installations. -> Mitigation: add `schemaVersion` and migration behavior before changing current lock shape.
- [Risk] Multi-agent install paths may diverge across hosts. -> Mitigation: keep destination mapping per `agent` and require tests for each supported root before marking an agent first-class.
- [Risk] HTML reports may become polished before the CLI contract is stable. -> Mitigation: implement JSON and status codes first; HTML renders the same data model.

## Migration Plan

1. Document the lifecycle contract in README and `docs/capability-map.md`.
2. Add `docs/cli-lifecycle-design.md` as the living implementation design for command semantics, data models, and safety rules.
3. Extend `capabilities/index.json` metadata without changing existing profile behavior.
4. Add analysis and lifecycle tests against disposable target repos.
5. Implement `analyze` as read-only JSON output.
6. Rename/alias `init` to `install` while keeping existing tests green.
7. Extend lock records with hashes and file lists.
8. Implement `status` drift detection for current, missing, modified, update-available, skipped, and unknown-component states.
9. Implement `remove` with dry-run, default hash protection, and explicit force behavior.
10. Implement `update --dry-run` only; defer mutating update until a later OpenSpec change.
11. Add release-readiness validation: typecheck, tests, skill validation, build, and local package smoke test.

Rollback is straightforward before publishing: keep `init/status` behavior unchanged and leave new commands behind tests. After publishing, preserve aliases and schema migration rather than removing behavior.

## Resolved Choices

- Mutating `update` is not in the first release. `update --dry-run` is the only valid update mode.
- Profile membership remains the primary recommendation unit. Repo signals can annotate recommendations, but they do not create hidden recommendations outside `capabilities/index.json`.
- Unmanaged same-name destinations are conflicts in V1 unless an exact path detection rule marks the capability as detected. Semantic equivalence from `SKILL.md` frontmatter is deferred.
