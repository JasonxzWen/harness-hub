# CLI Lifecycle Design

The Harness Hub CLI manages a repo-local agent harness lifecycle in target repositories.

## Goals

- Keep `check` read-only and non-blocking for startup version checks.
- Keep `analyze` read-only.
- Keep `install` limited to standard skill folders in `skills/<name>/`.
- Keep full agent dev harness bootstrap explicit through `init-harness`.
- Validate root harness files through side-effect-free `validate-harness`.
- Keep source-backed post publishing explicit through `harness-hub source-post <action>`.
- Track managed files with `.harness-hub/lock.json`.
- Remove and update only lock-recorded files.
- Keep host-specific packaging outside the lifecycle CLI.

## Commands

```powershell
harness-hub check <target> --json
harness-hub self-check <target> --json
harness-hub self-check <target> --validate-harness --json
harness-hub analyze <target> --json
harness-hub analyze <target> --agent-readiness --harness --json
harness-hub init-harness <target> --dry-run --json
harness-hub init-harness <target> --yes
harness-hub validate-harness <target> --json
harness-hub activate-agents <target> --dry-run --json
harness-hub activate-agents <target> --yes
harness-hub install <target> --target standard --dry-run
harness-hub install <target> --target standard --yes
harness-hub init-harness <target> --target standard --dry-run
harness-hub init-harness <target> --target standard --yes
harness-hub validate-harness <target> --json
harness-hub source-post generate <target> --input input.json --json
harness-hub source-post build <target> --json
harness-hub source-post validate <target> --json
harness-hub source-post publish <target> --dry-run --json
harness-hub status <target> --json
harness-hub update <target> --dry-run --json
harness-hub migrate-lock <target> --dry-run --json
harness-hub remove <target> --dry-run --json
```

`check` is the startup-friendly read-only command. It compares the current `@jasonwen/harness-hub` package version to npm registry latest in a `cli` report section, summarizes the target repository's `.harness-hub/lock.json` managed-component freshness in a separate `target` section, reports missing project-local agent activation as an advisory target recommendation, and reports explicit CodeGraph/Headroom configuration advice in `externalTools`. It does not install packages, apply `update`, rewrite locks, initialize CodeGraph indexes, write Headroom config, sync `.codex/skills` or `.claude/skills`, or fail startup because of update availability, missing locks, registry unavailability, missing agent activation, or external tool suggestions.

`self-check` is the routine read-only aggregate for local or scheduled status checks. It wraps `check`, splits hard failures from advisory items, and conditionally includes `validate-harness`: initialized targets with an installed `harness:minimal` lock record are validated by default, while source checkouts or uninitialized targets skip strict harness validation unless `--validate-harness` is passed. A local runner can schedule `harness-hub self-check <target> --json` at 21:30 daily, but the CLI must not create schedules, webhooks, commits, pushes, tool installs, or target setup as part of self-check.

`--target standard` is the supported skill install target. `install` always selects the complete standard skill set: every `kind: "skill"` component in `capabilities/index.json`. The implementation still stores the selected target in existing `agents` lock fields for schema continuity, but the value is the personal default distribution.

`init-harness` selects explicit harness components such as `harness:minimal`. These components can write stable files such as `AGENTS.md`, `CLAUDE.md`, `feature_list.json`, `clean-state-checklist.md`, `definition-of-done.md`, `evaluator-rubric.md`, `quality-document.md`, and `scripts/harness-validate.mjs`, plus ignored worktree-local state under `.harness-hub/state/`, but only after `--yes`. Dry runs must show the exact planned files and blockers without writing files or lock state.

`init-harness` is the higher-level agent dev bootstrap command. It composes skill installation with the managed `harness:minimal` template and writes continuity artifacts only through this explicit path. Active task state, progress, decision log, session handoff, and generated reports are ignored by `.harness-hub/.gitignore`; stable files and the lock remain visible. It blocks dirty git worktrees and existing harness files by default; `--force` is the explicit override policy. The low-level `install` command remains skills-only.

`activate-agents` is the explicit project-local agent activation command for target repositories that already have installed Harness Hub skills under `skills/<name>`. It syncs those skills into `.codex/skills/<name>` and `.claude/skills/<name>` so Codex and Claude Code can index the frontmatter metadata and helper triggers without global skill installation. It requires `--dry-run` or `--yes`, writes a Harness Hub marker in generated skill-cache directories, blocks unmarked same-name host skill directories, and does not write `.harness-hub/lock.json`.

Local agent dogfooding is intentionally outside the managed target lifecycle: `scripts/sync-agent-skills.mjs` mirrors `skills/` into ignored `.codex/skills/` and `.claude/skills/` copies for this checkout, without adding either host cache to the capability graph or lock-backed install targets. `AGENTS.md` and `CLAUDE.md` are maintained as synchronized root contracts so Codex and Claude Code receive the same project rules. Fresh worktrees should be directly usable from tracked source; the old Codex-specific worktree preflight, setup script, and post-checkout hook are intentionally removed. Host-local absolute paths must stay out of the project design.

Source-post publishing is also explicit, but it is not a target-repo install lifecycle. `post.json` is the editable source of truth, `effective-interact.input.json` is the generation adapter, and `site/` is the Git-only GitHub Pages output. Local publish is preflight-only; `.github/workflows/publish-source-posts.yml` owns the actual Pages deployment after review.

## Data Model

```ts
export type AgentName = 'standard';

export interface CapabilityComponent {
  kind: 'skill' | 'harness-template' | string;
  path: string;
  version: string;
  source: string;
  provides: string[];
  detects: Array<{ path: string; agent?: AgentName }>;
  agents: AgentName[];
  risk: 'low' | 'medium' | 'high';
  recommendation: string;
}
```

## Readiness Analysis

`--agent-readiness` is a read-only `analyze` extension. It reports context surfaces, outcome artifacts, verification gates, routing docs, automation candidates, and learning-capture locations. It does not write files, create schedules, publish, commit, push, or modify third-party systems.

Recognized portable signals include `AGENTS.md`, `skills/`, `docs/skill-routing.md`, OpenSpec changes, test directories, CI workflows, package scripts, changelogs, and docs.

## Harness Analysis

`--harness` is a read-only `analyze` extension. It reports whether a target repository already exposes root agent instructions, feature inventory, progress tracking, decision logging, session handoff, validation commands, and lock-managed harness files. It can compose with `--agent-readiness`, but it must not create `.harness-hub/`, write target files, or change git state.


## Release Gates

Before release-oriented lifecycle changes:

```powershell
bun run typecheck
bun test ./tests
powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal
bun run validate:artifact-policy
bun run build
node bin/harness-hub.mjs --help
node bin/harness-hub.mjs check . --json
npm pack --dry-run
```
