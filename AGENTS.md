always respond in 中文

# Harness Hub Instructions

永远不要在提交信息或推送代码时携带 `Co-Authored-By` 行。

Harness Hub initializes and governs repo-local agent harnesses across multiple projects. Claude Code and Codex provide the native main-Agent runtime; this repository owns deterministic migration, project contracts, Host resources, atomic Skills, source records, validation, and a source-only OKF wiki.

## Core rules

1. Facts first.
   - Inspect current implementation, tests, Git state, and source records before deciding.
   - Do not invent APIs, flags, protocols, configuration keys, paths, or evidence.
2. Simplicity first.
   - Prefer deletion, direct control flow, existing mechanisms, and the fewest entities.
   - Do not add compatibility layers, optional modes, duplicate registries, Host adapters, services, databases, or metrics backends without an unavoidable accepted need.
3. Surgical changes.
   - Touch only files tied to the request and preserve unrelated dirty-worktree changes.
   - Match existing style. Stop before expanding into unrelated modules.
4. Long-term correctness.
   - Optimize total lifecycle cost, deterministic behavior, explicit ownership, and a small public surface.
5. Fail closed.
   - Missing critical evidence, invalid ownership, path escape, impossible Git state, and deterministic validation failures are errors.
   - Agent judgment cannot override a failing test, validator, build, Git check, or security gate.
6. Goal-driven execution.
   - Define accepted behavior and validation before broad changes.
   - Ask only when a reasonable assumption would change user-visible behavior, acceptance criteria, security, data ownership, material cost, remote mutation, or destructive scope.
7. PR closeout is part of delivery.
   - After an authorized push or PR update, check mergeability and CI after the head settles.
   - Do not merge without explicit authorization. Never hide conflicts, release risk, or failed checks.

## Distribution policy

- Git checkout and commit are the only version and distribution source. There is no npm publication or package version.
- Keep every distributed Skill in `skills/<name>/SKILL.md`, with optional `references/`, `scripts/`, and `assets/`.
- Preserve upstream Skill bodies by default. Adapt only when upstream behavior is unsafe, unusable, legally unclear, or conflicts with the repository's distribution boundary.
- Do not add `agents/openai.yaml`, `.opencode/skills/`, user/global configuration, or Host-local metadata to canonical Skill sources.
- Canonical Skills are classified once in `capabilities/index.json`. The optional `host` field is only for a real Host-specific distribution boundary.
- Root `knowledge/`, source records, tests, task state, and Harness Hub governance are source-only and must never be distributed to targets.
- Root `AGENTS.md` is the canonical source-repository contract. Root `CLAUDE.md` contains only `@AGENTS.md`.
- Target `AGENTS.md` must match `harness/target/AGENTS.md`; target `CLAUDE.md` contains only `@AGENTS.md`.

## Native Agent operating model

Claude Code or Codex is the only main-Agent runtime. The main Agent owns alignment, planning, Subagent delegation, parallel work, conflict resolution, integration, validation, remote-authorization decisions, and the final user report.

Harness Hub does not implement or distribute a workflow Router, generic Workflow/Loop runtime, fixed lifecycle sequence, Producer/Verifier/Arbiter scheduler, retry/pause/handoff state machine, path-lease system, Agent dispatcher, internal trace store, or metrics backend.

Use native Subagents only for bounded independent read-only exploration, review, or verification when the Host supports it. The main Agent owns every mutation, plus user alignment, final decisions, integration, remote writes, publishing, and merge. Deterministic checks outrank all Agent verdicts.

## Durable task state and freshness

For non-trivial source mutations, update the existing ignored files under `.harness-hub/state/` when available:

- `current-task.md`: goal, assumptions, non-goals, allowed/forbidden scope, accepted behavior, acceptance criteria, validation, autonomy, and open questions.
- `decisions.md`: accepted and rejected choices with reasons.
- `progress.md`: completed work, current phase, evidence, blockers, and delivery state.
- `session-handoff.md`: restart status, changed files, validation, stale-read result, residual risk, and next action.

Do not create `.harness-hub/state/runs/`, leases, integration records, or a second execution control plane.

Every mutation session starts with branch, upstream, `git status --short`, and relevant remote-state inspection. `git fetch --prune` is allowed as a read-only freshness step. Dirty, diverged, detached, or conflicting states must be preserved and surfaced; never reset, clean, or discard them without explicit authorization.

Before final handoff, recheck status and reread or diff task-critical files that may have changed since they informed the implementation.

## Atomic Skill routing

Select the narrowest atomic Skill that adds domain value. There is no top-level owner workflow.

- `ponytail`: YAGNI, minimum change, entity-count, and subtraction review.
- `grill-me`: one alignment pass for every repository mutation; an already aligned task exits with zero questions.
- `grill-with-docs`: source-backed alignment for durable contracts, specifications, ADRs, architecture, or OKF changes; it reuses the same `grill-me` decision graph rather than starting a second interview.
- `product-capability`: implementation-ready capability and acceptance boundaries.
- `to-tickets`: split accepted multi-part work into independently verifiable tracer-bullet tickets with explicit blocking edges.
- `diagnose`: runtime bugs or performance regressions with unknown root cause.
- `agent-introspection-debugging`: Agent/tool harness failures.
- `tdd`: red-green-refactor guidance for confirmed behavior changes.
- `verification`: final command and artifact validation guidance; it cannot waive failures.
- `code-review`: deep multi-lens code review.
- `codebase-design`: deep-module, information-hiding, seam, and deletion-test guidance.
- `security-review`: focused security review.
- `effective-interact`: complex delivery, comparisons, and important handoffs.
- `agent-interaction-audit`: failed, long, high-cost, tool-abnormal, or explicitly requested retrospectives.
- `decision-ui`: Codex-only blocking/high-impact/external-authorization choices; unavailable native UI falls back honestly to text.
- `agent-reach`: read-only routing to an already installed user-level CLI; run doctor first and never install/configure/authenticate/copy credentials.
- `stop-slop`: English prose only, not Chinese output or code/spec/status.
- `documentation-lookup`: current official library/API/CLI documentation.
- `prototype` and `frontend-design`: throwaway exploration and production UI respectively.

Explicit user invocation remains supported. A Skill is a prompt capability selected by the native main Agent, not a workflow owner or execution runtime. No Router or orchestration Hook imposes a Skill sequence.

## Development and closeout

For feature, bug-fix, refactor, policy, documentation, test, or distribution work:

1. Inspect current facts and record accepted behavior, non-goals, scope, and P0/P1/P2 validation.
2. Run one `grill-me` alignment pass for the mutation task. Ask zero questions and continue when no unresolved decision can change behavior, ownership, safety, material cost, remote state, or acceptance criteria. For durable documentation or knowledge changes, use `grill-with-docs`; it applies the same graph and replaces a separate `grill-me` interview.
3. Use the native Host main Agent to plan and execute. Keep low-risk implementation details autonomous; use `to-tickets` only when accepted work genuinely needs multiple independently verifiable slices.
4. Prefer public-behavior tests and deterministic validators over tests of private implementation shape.
5. Use `ponytail` before and after material architecture changes to challenge extra branches, entities, and files.
6. Obtain independent read-only implementation/test/security review proportional to risk. The main Agent integrates findings and performs any resulting mutation.
7. For complex delivery or important handoff, use `effective-interact`; simple outcomes return as plain text.
8. Run `agent-interaction-audit` for failed, long, high-cost, tool-abnormal, or explicitly requested retrospectives. It may recommend changes to an existing Skill, rule, Eval, SOP, or OKF page; it adds no entity by default. Missing trace, duration, token, or cost evidence is `unknown`.
9. Update the four task-state files and report exact validation evidence. Do not claim completion from plans or intent.

## Local dogfooding

Canonical Skill sources live only under `skills/<name>/`. Mirror them into ignored Host-local caches with:

```powershell
bun run sync:agent-skills
```

Use `bun run sync:agent-skills:dry-run` before broad maintenance when a preview helps. The generated `.agents/skills/` and `.claude/skills/` trees are caches, not distribution sources or capability metadata.

When visibility looks stale, check the actual workspace root, canonical source, local mirrors, global Host skill roots, and Host index cache in that order. A sync in another checkout does not update this workspace.

## Repository migration CLI

There is exactly one target capability and one public command:

```text
node bin/harness-hub.mjs migrate <target> --yes [--host claude|codex|both] [--primary claude|codex] [--force]
```

- Node performs deterministic copy, Host-surface selection, manifest/ownership, stale cleanup, source-HEAD byte verification, collision checks, rollback, and final validation.
- When an update request includes `https://github.com/JasonxzWen/harness-hub`, clone it into a temporary standalone checkout outside the current repository, use the default branch current HEAD, treat the current repository as the target, read `.harness-hub/manifest.json`, and run `node bin/harness-hub.mjs migrate <current-repository> --yes` from the temporary checkout.
- A valid schemaVersion 1 manifest supplies omitted `hosts` and `primaryHost`; do not ask the user to repeat Host mode. Explicit `--host` and `--primary` take priority. The resulting manifest records the actual source commit.
- Recognized HTTPS and SSH spellings of the official remote record the canonical source URL `https://github.com/JasonxzWen/harness-hub`; normalization performs no remote call or mutation.
- Without a manifest, first migration requires `--host`; first migration in `both` mode also requires `--primary`. Primary only selects the CLI used for first-time OKF initialization; it does not own shared copying.
- The target and source must be clean standalone Git worktrees with an existing `HEAD`; use the current repository as target only when `.git` is a real directory. A linked or submodule worktree must stop with `E_LINKED_WORKTREE` and rerun from a clean standalone clone. Do not migrate a replacement target and copy its result or Git metadata back. Managed paths reject symlinks, junctions, and path escape.
- Every migration removes stale resources still owned by the prior manifest.
- Normal and force may replace only managed generic resources. They never overwrite target-owned Skills, `knowledge/**`, Evals, product files, credentials, browser state, or user/global configuration.
- First migration, only when no manifest and no `knowledge/` exist, calls the primary CLI once to inspect the target and create a source-traceable Google OKF v0.1 wiki.
- That first CLI call uses an isolated temporary user/config directory and only the selected Host API key (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`) plus network/TLS environment. It never consumes normal Host profiles, keychains, browser state, unrelated credentials, or user configuration.
- Later normal/force migrations validate and preserve the complete target wiki byte-for-byte and do not call a Host CLI to rewrite knowledge. An existing manifest with missing knowledge fails closed.
- The selected Host configs use one deterministic local PreTool safety hook. It has no Router, state machine, Agent dispatch, remote action, or credential mutation.
- Migration never commits, pushes, publishes, merges, modifies remote state, changes credentials, changes Host trust, or modifies user/global configuration.
- A failed migration restores Git control state and managed/protected paths. If unrelated ignored content prevents exact restoration, return `rolledBack: false` rather than claim success.

When another repository receives only this repository URL, follow `BOOTSTRAP-TARGET.md`. Never manually copy source-only knowledge, docs, tests, source records, or fixtures.

Before changing migration or distribution boundaries, run focused migration/OKF/Hook tests, `bun run validate`, and `git diff --check`.

## OKF governance

Harness Hub's root `knowledge/` is its source-only Google OKF v0.1 wiki. Distributed projects receive the OKF maintenance contract and `.harness-hub/okf-validate.mjs`, not Harness Hub's own facts.

For project knowledge changes, update an existing canonical owner page before adding a page, deduplicate facts, preserve provenance, synchronize index/log/related links, and run the deterministic validator. If no durable fact changed, keep knowledge byte-for-byte unchanged.

Real-project task cards, paths, sessions, traces, and Eval details stay in those projects. Harness Hub may receive only anonymous aggregate results when the user explicitly provides them.

## Third-party Skill evaluation

Read upstream README, Skill body, metadata, current revision, and license before deciding. Compare against current atomic Skills and distribution rules. Install only when the candidate fills a bounded gap. Preserve upstream content unless safety or distribution requires a documented adaptation.

Update `docs/source-projects.md`, `docs/skill-routing.md`, and `README.md` when source or distribution state changes. Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal
```

Do not create a Router, owner Workflow, compatibility layer, or new registry for a third-party Skill.
