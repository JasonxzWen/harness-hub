# CLI Lifecycle Design

Date: 2026-05-11

This document is the migration design for turning Skill Hub from a local installer skeleton into a released CLI that other repositories can use safely.

The related OpenSpec change is `openspec/changes/release-cli-capability-lifecycle/`.

## Product Goal

Target repositories should be able to use Skill Hub without cloning this repository:

```powershell
npx skill-hub analyze D:\path\to\target --json
npx skill-hub install D:\path\to\target --profile minimal --agent codex --yes
npx skill-hub status D:\path\to\target --html
npx skill-hub remove D:\path\to\target --yes
```

The CLI should answer four questions:

1. What agent capabilities does this target repo already have?
2. What high-signal capabilities can Skill Hub add?
3. Which files did Skill Hub install and how have they drifted?
4. How can Skill Hub remove only the files it owns?

## Command Contract

| Command | Side effect | Purpose |
|---|---|---|
| `analyze <target>` | Read-only by default | Inventory repo signals, existing capabilities, missing capabilities, recommendations, and conflicts. |
| `install <target>` | Mutating | Copy selected components, write `.skill-hub/lock.json`, and produce an install report. |
| `init <target>` | Mutating alias | Compatibility alias for `install` during migration. |
| `status <target>` | Read-only by default | Read the lock and current hub index, then report current, missing, modified, update-available, skipped, and unknown components. |
| `update <target> --dry-run` | Read-only in first release | Show a replacement plan for managed components whose current index version differs from the lock. Mutating update is deferred. |
| `remove <target>` | Mutating | Remove only schema version 2 lock-recorded, unmodified managed files unless `--force` is provided for modified schema version 2 files. |
| `profiles` | Read-only | List install profiles. |
| `components` | Read-only | List installable components and metadata. |

First release command decisions:

- `install` is the canonical verb; `init` is an alias that must produce the same plan, writes, lock, report, and exit behavior.
- `update` is plan-only in the first release. `skill-hub update <target> --dry-run` is valid; `skill-hub update <target>` without `--dry-run` exits with usage error code `2` and explains that mutating update is deferred.
- Report-capable commands write to stdout unless the user passes `--output <file>`. `--html` selects HTML format; it does not imply `.skill-hub/reports/` for read-only commands.
- Mutating commands may write default reports under `.skill-hub/reports/` because they already create or modify Skill Hub-managed state.
- First-release mutating commands are non-interactive. `install`, `init`, and `remove` require either `--dry-run` or `--yes`; without either flag they exit with code `2` and explain the required confirmation flag.

## CLI Options

| Option | Commands | Contract |
|---|---|---|
| `--profile <name>` | `analyze`, `install`, `init`, `update --dry-run` | Selects a capability profile. Defaults to `capabilities.index.defaults.profile`. |
| `--agent <name>` | `analyze`, `install`, `init`, `update --dry-run` | May be repeated. Defaults to `capabilities.index.defaults.agents`. |
| `--json` | `analyze`, `install`, `init`, `status`, `update --dry-run`, `remove` | Prints the stable JSON report to stdout. |
| `--html` | `analyze`, `install`, `init`, `status`, `update --dry-run`, `remove` | Prints HTML to stdout unless `--output` is provided. |
| `--output <file>` | reporting commands | Writes the selected report format to an explicit path. Parent directories may be created. |
| `--dry-run` | `install`, `init`, `update`, `remove` | Plans the mutation without copying, replacing, or deleting files. |
| `--yes` | `install`, `init`, `remove` | Confirms mutating behavior in non-interactive use. |
| `--overwrite` | `install`, `init` | Replaces existing destinations and records the new files as managed. |
| `--force` | `remove` | Allows removal of modified schema version 2 managed files. Does not remove unmanaged or schema version 1 hashless files. |

Unsupported options must fail with exit code `2`.

Relative `--output` paths resolve against the current working directory, not the target repository, unless the user explicitly includes the target path.

## Capability Analysis

`analyze` should be deterministic and evidence-based. It should combine:

- repo signals from known files such as `package.json`, `tsconfig.json`, `.agents/`, `.codex/`, `.claude/`, and `.opencode/`;
- component metadata from `capabilities/index.json`;
- explicit V1 detection rules using exact relative skill or config paths;
- selected `--profile` and `--agent` options.

Every recommendation should include:

- capability id or tag;
- component id;
- target agent;
- planned destination path;
- reason;
- evidence, when available;
- default action: install, skip, conflict, or already-present.

The CLI should prefer "unknown" over false certainty. If a repo has custom skills that do not match known detection rules, the report can mark them as existing agent assets without claiming semantic equivalence.

## Capability Index Migration

`capabilities/index.json` should remain the install source of truth, but each component should gain lifecycle metadata:

```json
{
  "kind": "skill",
  "path": ".agents/skills/verification-loop",
  "version": "0.1.0",
  "source": "everything-claude-code",
  "provides": ["completion-verification"],
  "detects": [
    { "path": ".agents/skills/verification-loop/SKILL.md" },
    { "path": ".claude/skills/verification-loop/SKILL.md" }
  ],
  "agents": ["codex", "opencode", "claude-code"],
  "risk": "low",
  "recommendation": "Adds a final verification gate before work is declared complete."
}
```

V1 detection supports only exact relative file or directory paths:

```ts
export interface PathDetectRule {
  path: string;
  agent?: AgentName;
}
```

Rules:

- `path` is relative to the target repository root.
- `path` must use forward slashes in JSON and be normalized for the local platform at runtime.
- absolute paths, `..` traversal, globs, and content matching are invalid in V1.
- a directory detect rule matches when the directory exists.
- a file detect rule matches when the file exists.

Globs, content matching, and frontmatter parsing are deferred to a later OpenSpec change.

## TypeScript Contracts

These interfaces are the implementation target. Additive fields are allowed, but the first implementation should not rename these fields without updating specs and fixtures.

```ts
export type AgentName = 'codex' | 'opencode' | 'claude-code';
export type ReportFormat = 'text' | 'json' | 'html';
export type LifecycleRisk = 'low' | 'medium' | 'high';

export interface CapabilityComponent {
  kind: 'skill' | 'config' | 'script' | 'rule' | 'hook' | 'mcp';
  path: string;
  version: string;
  source: string;
  provides: string[];
  detects: PathDetectRule[];
  agents: AgentName[];
  risk: LifecycleRisk;
  recommendation: string;
  overlapsWith?: string[];
  routing?: string;
}

export interface CapabilityFinding {
  capability: string;
  componentId: string;
  agent: AgentName;
  state: 'detected' | 'recommended' | 'conflict' | 'already-managed' | 'unknown';
  evidence: string[];
  reason: string;
  defaultAction: 'none' | 'install' | 'skip' | 'overwrite-required';
  dest?: string;
}

export interface AnalysisResult {
  schemaVersion: 1;
  generatedAt: string;
  hubVersion: string;
  targetDir: string;
  profile: string;
  agents: AgentName[];
  signals: RepoSignals;
  findings: CapabilityFinding[];
}

export interface ManagedFileRecord {
  path: string;
  sha256: string;
  size: number;
}

export interface ManagedComponentRecord {
  id: string;
  version: string;
  agent: AgentName;
  kind: string;
  source: string;
  dest: string;
  files: ManagedFileRecord[];
  installedAt: string;
  status: 'installed' | 'skipped';
}

export interface SkillHubLockV2 {
  schemaVersion: 2;
  generatedAt: string;
  hubVersion: string;
  profile: string;
  agents: AgentName[];
  components: ManagedComponentRecord[];
}

export type StatusState =
  | 'current'
  | 'missing'
  | 'modified'
  | 'update-available'
  | 'skipped'
  | 'unknown-component';

export interface StatusRow {
  id: string;
  version: string;
  latestVersion: string | null;
  agent: AgentName;
  dest: string;
  state: StatusState;
  evidence: string[];
  reason: string;
}
```

## Path And Hash Rules

- All lock paths are relative to the target repository root and serialized with forward slashes.
- Runtime path resolution must reject absolute paths and any path containing `..` traversal segments before filesystem access.
- Hashes use SHA-256 over raw file bytes and are serialized as lowercase hexadecimal.
- Directory entries are not hashed; each file under a managed destination is recorded separately.
- File records are sorted by relative path for deterministic reports.
- Removal prunes empty directories from deepest to shallowest, stopping at the target repository root and never deleting the root itself.

## Lock Ownership

`.skill-hub/lock.json` is the ownership boundary. Future schema versions should record:

- schema version;
- hub version;
- install profile;
- target agents;
- component id and component version;
- source identifier;
- relative destination;
- file list;
- hash for each managed file;
- status at install time;
- install timestamp.

The lock should use relative paths so target repos remain portable across machines.

Schema compatibility:

- Schema version 1 locks must be readable by `status`.
- Schema version 1 locks do not contain per-file hashes, so `remove --yes` must skip those components and exit `3` rather than deleting unverifiable files.
- `--force` does not override schema version 1 hash absence in the first release; force applies only to schema version 2 files that are explicitly recorded in the lock.
- Schema version 1 locks can be upgraded only by a future explicit migration or reinstall flow; V1 removal must not infer file ownership from directory names.

## Removal Safety

`remove` must never delete by loose name matching. It should:

1. read `.skill-hub/lock.json`;
2. compare current file hashes with recorded hashes;
3. delete matching managed files;
4. skip modified managed files unless `--force` is present;
5. delete `.skill-hub/lock.json` after a successful full removal;
6. prune only empty directories that were created as part of managed destinations;
7. leave unmanaged same-name skills and user-created files intact.

If no lock exists, `remove` reports that no managed installation was found and exits without deletion.

If a lock exists but lacks per-file hashes, `remove` reports a safety blocker and does not delete those components. The first release prefers a manual or future migration path over unsafe deletion.

## Update Semantics

Mutating update is explicitly out of scope for the first release.

First release behavior:

1. `status` reports `update-available` when current `capabilities/index.json` component versions differ from the lock.
2. `skill-hub update <target> --dry-run` shows the replacement plan and modified-file blockers.
3. `skill-hub update <target>` without `--dry-run` exits with code `2` and does not mutate files.

This keeps the riskiest operation, replacing existing managed files, behind a tested install/remove lock model.

## Exit Codes

| Code | Meaning | Examples |
|---:|---|---|
| `0` | Command completed successfully | Recommendations found; conflicts reported by `analyze`; no lock found by idempotent `remove`; install completed with skips. |
| `1` | Unexpected runtime failure | unreadable target after validation, filesystem error, malformed current capability index, report write failure. |
| `2` | Invalid usage or unsupported request | unknown command, unsupported option, unknown profile, unsupported agent, missing `--yes` for non-dry-run mutation, mutating `update` without `--dry-run`. |
| `3` | Safety blocker prevented full requested mutation | `remove --yes` skipped modified managed files without `--force`; `install --strict` finds conflicts if strict mode is later added. |

Default install conflicts are skipped and exit `0` because the command completed with a report. Safety blockers exit `3` only when the user requested a mutation that could not be fully applied.

## Report Formats

JSON is the primary contract for tests and wrappers. HTML reports should render the same data model for human review.

Recommended report families:

- `.skill-hub/reports/install-<timestamp>.html`
- `.skill-hub/reports/remove-<timestamp>.html`

For CI, JSON output should avoid timestamps in sorted arrays and ids so snapshots are stable. Timestamp fields are acceptable when tests normalize them.

Report output rules:

- `--json` prints JSON to stdout unless `--output` is supplied.
- `--html` prints HTML to stdout unless `--output` is supplied.
- `--output <file>` writes the selected format to that exact file.
- Mutating commands may additionally create timestamped reports under `.skill-hub/reports/`.
- Read-only commands must not create `.skill-hub/` unless the explicit `--output` path points there.
- Read-only HTML files should use explicit output paths such as `--output .skill-hub/reports/analyze-<timestamp>.html` when the user intentionally wants a saved report.

## Release Readiness

Before publishing, maintainers should be able to run:

```powershell
bun run typecheck
bun test ./tests
powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal
bun run build
npm pack
```

The packed artifact should include:

- `bin/skill-hub.mjs`;
- built `dist/`;
- `capabilities/index.json`;
- installable `.agents/skills/`, `.codex/skills/`, `.codex/agents/`, and `.codex/config.toml` assets that are referenced by profiles;
- docs needed for user-facing reports and package context;
- `scripts/ralph/` and `scripts/validate-skills.ps1` when they are referenced by installable components or validation docs.

It should not include ignored vendor checkouts.

## Migration Phases

### Phase 1: Spec and docs

- Create OpenSpec proposal, design, specs, and tasks.
- Document command semantics and lock safety.
- Update README and capability map so future implementation has one product contract.

### Phase 2: Read-only analysis

- Extend capability metadata.
- Implement deterministic `analyze --json`.
- Add fixtures for empty repos, repos with existing skills, and destination conflicts.
- Lock down path detection rules before adding content or frontmatter matching.

### Phase 3: Install lifecycle

- Add `install` command and keep `init` alias.
- Extend lock records with file hashes.
- Keep existing profile install behavior compatible.
- Add schema version 1 compatibility for existing locks before writing schema version 2.

### Phase 4: Drift and removal

- Extend `status` with modified and update-available states.
- Implement `remove --dry-run` and safe `remove --yes`.
- Add `--force` only after modified-file protection is covered by tests.
- Add `update --dry-run`; defer mutating update.

### Phase 5: Release candidate

- Validate Node-only execution from `dist/`.
- Run a local package smoke test from `npm pack`.
- Update package docs and release notes.

## Acceptance Criteria

- `analyze` can run on a disposable target repo without creating `.skill-hub/`.
- `analyze --json` returns stable sorted findings with capability id, component id, target agent, evidence, reason, and default action.
- `install` writes selected assets plus a lock that can drive future status and removal.
- `init` produces behavior equivalent to `install`.
- `status` reports missing, modified, and update-available managed components.
- `remove` deletes only unmodified lock-recorded files by default.
- `remove --yes` exits `3` when modified managed files block full removal, and `remove --force --yes` removes only lock-recorded files.
- Schema version 1 locks are readable by `status`, and `remove` does not delete unverifiable hashless records.
- `update --dry-run` reports replacement plans, while mutating `update` exits `2`.
- The package can be built and smoke-tested through the Node-compatible binary.

## Review Checklist

Before implementation starts, reviewers should be able to answer "yes" to every item:

- Are every command's side effects and default output locations explicit?
- Are all writable operations backed by tests that use disposable target repos?
- Are all delete operations lock-backed and hash-aware?
- Is every new JSON field either required by the interfaces above or explicitly optional?
- Are all target paths relative, normalized, and traversal-checked before filesystem access?
- Can a user run the released package through Node without Bun?
- Can old schema version 1 locks still be read without crashing, while `remove` avoids deleting unverifiable hashless records?
