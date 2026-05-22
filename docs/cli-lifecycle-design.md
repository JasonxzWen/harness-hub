# CLI Lifecycle Design

The Skill Hub CLI manages platform-neutral skills in target repositories.

## Goals

- Keep `analyze` read-only.
- Install only standard skill folders into `skills/<name>/`.
- Track managed files with `.skill-hub/lock.json`.
- Remove and update only lock-recorded files.
- Keep host-specific packaging outside the lifecycle CLI.

## Commands

```powershell
skill-hub analyze <target> --json
skill-hub install <target> --target standard --dry-run
skill-hub install <target> --target standard --yes
skill-hub status <target> --json
skill-hub update <target> --dry-run --json
skill-hub remove <target> --dry-run --json
```

`--target standard` is the supported install target. `install` always selects the complete standard skill set: every `kind: "skill"` component in `capabilities/index.json`. The implementation still stores the selected target in existing `agents` lock fields for schema continuity, but the value is platform-neutral.

Local Codex dogfooding is intentionally outside the managed target lifecycle: `scripts/sync-codex-skills.mjs` mirrors `skills/` into ignored `.codex/skills/` copies for this checkout, without adding `.codex/skills/` to the capability graph or lock-backed install targets.

## Data Model

```ts
export type AgentName = 'standard';

export interface CapabilityComponent {
  kind: 'skill' | string;
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

## Release Gates

Before release-oriented lifecycle changes:

```powershell
bun run typecheck
bun test ./tests
powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal
bun run validate:artifact-policy
bun run build
npm pack --dry-run
```
