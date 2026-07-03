# Orchestration Policy

Use this policy when a workflow owner considers subagents or hooks.

## Subagents

The parent workflow owner controls orchestration. Subagents are an executor mode inside an accepted workflow, not a separate workflow owner. Required loops may ask for subagent evidence; material or multi-scope reviews should split independent read-only lenses unless a fallback is recorded. The main agent still owns integration and final decisions.

Allowed subagent work:

- read-only source gathering;
- current documentation lookup;
- independent review passes;
- independent verification;
- disjoint write scopes only, when the executable plan names the owned files or modules.
- current-worktree writes only after a path lease records non-overlapping owned paths and the main agent remains the integration owner.

Forbidden subagent work:

- critical-path blockers stay local when the main agent needs the answer before its next step;
- overlapping writes;
- direct writes to root progress, decisions, or handoff state by subagents;
- final user-facing conclusions;
- final product, safety, or release decisions;
- hidden cleanup or rollback.

The main agent owns synthesis, integration, validation, and final user-facing conclusions.

## Agentic Loops

Agentic loops are workflow-stage mechanics that separate Producer, Verifier, Arbiter, and Main Agent Decision. Use `workflow-router/references/agentic-loops.md` as the installable canonical loop catalog.

For any mutation, derive required loops from dirty paths or a base/head diff when the CLI runtime is available:

- run `harness-hub loop required <target> --json`, or `harness-hub loop required <target> --base <ref> --head <ref> --json` after a checkpoint commit, after validation or before handoff;
- record loop runtime evidence under `.harness-hub/state/runs/<runId>/`;
- run `harness-hub loop verify <target> --input <file> --json` before final handoff, or record why the runtime could not be used.

Small changes do not skip loop review. They can use a lower evidence level and a deterministic fallback, but the fallback reason must be explicit.

Allowed loop carriers:

- delegated-agent reviews or acceptance runs, split into independent lenses for L2 or multi-scope review when available;
- deterministic tests, validators, browser runs, CI checks, or local scripts;
- read-only arbiters that judge evidence against the original task and acceptance criteria.
- local orchestration records under `.harness-hub/state/runs/<runId>/` for subagent state, leases, traces, and main-agent integration.

Forbidden loop behavior:

- arbiters editing files or resolving conflicts;
- arbiters pushing, publishing, merging, posting, or mutating third-party resources;
- majority vote without evidence and severity;
- treating a delegated-agent verdict as stronger than failing deterministic validation.
- treating "small change" as a reason to omit implementation, test, or docs-consistency review evidence.

Generic skills should say `delegated-agent`, `verifier`, and `arbiter`. Host-specific details for Codex or Claude Code belong in adapter docs, not generic skill bodies.

## Hooks

Hooks are advisory by default until they have a security review, deterministic tests, and an explicit rollout gate.

Allowed advisory hooks:

- remind before coding when SDD alignment or acceptance is missing;
- remind after material changes when closeout review, PR readiness, insight, or an `effective-interact` handoff is missing;
- validate generated interaction artifacts;
- run local deterministic checks that do not mutate repo or remote state.

Forbidden hooks:

- No hook dispatches subagents.
- No hook dispatches delegated agents for agentic loops.
- No hook performs remote writes.
- No hook bypasses SDD alignment.
- No hook pushes, publishes, posts, merges, spends money, changes credentials, or mutates third-party resources.

Any blocking hook requires security review, fixture coverage, local dry-run output, and explicit user approval before it becomes default behavior.

Use `scripts/advisory-check.mjs` as the shared side-effect-free core for manual checks or future host hooks:

```powershell
node skills/workflow-router/scripts/advisory-check.mjs --state sdd-change --phase pre-implementation --json
node skills/workflow-router/scripts/advisory-check.mjs --state sdd-change --phase pre-implementation --current-task .harness-hub/state/current-task.md --json
node skills/workflow-router/scripts/advisory-check.mjs --state diagnosis --phase pre-implementation --has-reproduction --has-evidence --json
node skills/workflow-router/scripts/advisory-check.mjs --state review --phase pre-implementation --will-mutate --json
node skills/workflow-router/scripts/advisory-check.mjs --state delivery --phase pre-delivery --material-changes --json
node skills/workflow-router/scripts/advisory-check.mjs --state delivery --phase pre-delivery --material-changes --has-validation --has-closeout-review --has-pr-readiness --has-insight --has-html-handoff --json
node skills/workflow-router/scripts/advisory-check.mjs --state delivery --phase pre-delivery --material-changes --has-validation --has-closeout-review --has-pr-readiness --has-insight --has-acceptance-arbiter --has-final-review-arbiter --html-handoff-waiver "Tiny packaging-only change; chat handoff is sufficient." --json
```

The script emits JSON warnings for missing SDD/maintenance scope/spec/acceptance/plan gates, explicit read-only owner mutation attempts, diagnosis without reproduction/evidence, state/phase mismatches, and delivery without validation or handoff evidence. The delivery gate also checks closeout review, PR readiness, insight evidence, and arbiter evidence for material changes. Use `--html-handoff-waiver <reason>` or `--handoff-waiver <reason>` only when the human-facing handoff is intentionally waived and the reason is explicit; it does not waive validation, PR readiness, review, insight, or arbiter evidence. When `--current-task <path>` is provided, that file is inspected first. Without an explicit path, the script only auto-discovers `.harness-hub/state/current-task.md` in the current working directory; it does not recurse upward into parent directories. It always reports `blocking: false`, and never writes local or remote state.

## Planning Contract

When orchestration matters, the active owner writes an orchestration line in the executable plan:

```text
ORCHESTRATION: none | local-only | parallel-read-only | parallel-disjoint-write | advisory-hook-check
OWNER: <main workflow owner>
SUBAGENTS: <roles and scopes, or none>
LEASES: <owned paths per writing subagent, or none>
HOOKS: <advisory checks, or none>
INTEGRATION: main agent synthesizes and reports
```
