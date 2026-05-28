# CLI Lifecycle Design

The Harness Hub CLI manages a repo-local agent harness lifecycle in target repositories. Skill Hub remains the compatible subsystem for the personal distributed skill set.

## Goals

- Keep `analyze` read-only.
- Keep `install` limited to standard skill folders in `skills/<name>/`.
- Keep full Codex dev harness bootstrap explicit through `init-harness`.
- Validate root harness files through side-effect-free `validate-harness`.
- Keep source-backed insight publishing explicit through `insight-*`.
- Track managed files with `.skill-hub/lock.json`.
- Remove and update only lock-recorded files.
- Keep host-specific packaging outside the lifecycle CLI.

## Commands

```powershell
skill-hub analyze <target> --json
skill-hub analyze <target> --agent-readiness --harness --json
skill-hub init-harness <target> --dry-run --json
skill-hub init-harness <target> --yes
skill-hub validate-harness <target> --json
skill-hub install <target> --target standard --dry-run
skill-hub install <target> --target standard --yes
skill-hub init-harness <target> --target standard --dry-run
skill-hub init-harness <target> --target standard --yes
skill-hub validate-harness <target> --json
skill-hub insight-generate <target> --input input.json --json
skill-hub insight-build <target> --json
skill-hub insight-validate <target> --json
skill-hub insight-publish <target> --dry-run --json
skill-hub status <target> --json
skill-hub update <target> --dry-run --json
skill-hub remove <target> --dry-run --json
```

`--target standard` is the supported skill install target. `install` always selects the complete standard skill set: every `kind: "skill"` component in `capabilities/index.json`. The implementation still stores the selected target in existing `agents` lock fields for schema continuity, but the value is the personal default distribution.

`init-harness` selects explicit harness components such as `harness:minimal`. These components can write root files such as `AGENTS.md`, `feature_list.json`, `progress.md`, and `session-handoff.md`, but only after `--yes`. Dry runs must show the exact create/skip/overwrite plan without writing files or lock state.

`init-harness` is the higher-level Codex-only dev bootstrap command. It composes skill installation with the managed `harness:minimal` template and writes root continuity artifacts only through this explicit path. It blocks dirty git worktrees and existing harness files by default; `--force` is the explicit override policy. The low-level `install` command remains skills-only.

Local Codex dogfooding is intentionally outside the managed target lifecycle: `scripts/sync-codex-skills.mjs` mirrors `skills/` into ignored `.codex/skills/` copies for this checkout, without adding `.codex/` to the capability graph or lock-backed install targets.

Insight publishing is also explicit, but it is not a target-repo install lifecycle. `post.json` is the editable source of truth, `effective-interact.input.json` is the generation adapter, and `site/` is the Git-only GitHub Pages output. Local publish is preflight-only; `.github/workflows/publish-insights.yml` owns the actual Pages deployment after review.

## Data Model

```ts
export type AgentName = 'standard';

export interface CapabilityComponent {
  kind: 'skill' | 'harness-template' | 'harness-pack' | string;
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

`--harness` is a read-only `analyze` extension. It reports whether a target repository already exposes root agent instructions, feature inventory, progress tracking, session handoff, validation commands, and lock-managed harness files. It can compose with `--agent-readiness`, but it must not create `.skill-hub/`, write target files, or change git state.

## Naming Compatibility

The package exposes both `skill-hub` and `harness-hub` binaries. `harness-hub` is the forward product name; `skill-hub` remains a compatibility command and keeps existing scripts working. Package and repository physical rename remain separate release decisions.

## Release Gates

Before release-oriented lifecycle changes:

```powershell
bun run typecheck
bun test ./tests
powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal
bun run validate:artifact-policy
bun run build
node bin/skill-hub.mjs --help
node bin/harness-hub.mjs --help
npm pack --dry-run
```
