# Workflow Router Spec

Date: 2026-05-20

This document is the normative contract for the workflow-router redesign. Execution sequencing belongs in [Workflow router execution plan](workflow-router-execution-plan.md).

Source evaluation belongs in [Workflow source dossier](workflow-source-dossier.md).

## Capability Statement

Harness Hub MUST provide a personal workflow routing overlay where each non-trivial user request is classified into one task state, handed to one workflow owner, and completed through explicit alignment, verification, and handoff gates.

## Terms

| Term | Definition |
|---|---|
| Task state | The top-level intent class for the user request. |
| Workflow owner | The single skill responsible for driving a task state from entry to handoff. |
| Helper skill | A narrow domain skill used underneath a workflow owner. It must not compete for top-level ownership. |
| Interaction layer | `effective-interact`, used to reduce human interpretation cost through HTML reports, comparisons, maps, and handoffs. |
| Alignment gate | A required checkpoint where user-visible goal, constraints, target spec, and acceptance criteria are confirmed before implementation. |
| Verification gate | A deterministic command, test, inspection, or acceptance check required before delivery. |

## Task States

| State | Required owner | Must load when | Must not do |
|---|---|---|---|
| Question | `answer-workflow` | The user asks for explanation, lookup, feasibility, comparison, or evidence. | Edit files or start implementation unless the user redirects. |
| SDD change | `sdd-workflow` | The user requests a feature, bug fix, refactor, behavior change, product change, or spec change. | Code before alignment gate passes. |
| Diagnosis | `diagnosis-workflow` | The user reports a failing command, runtime bug, flaky behavior, performance issue, or agent/tool failure. | Apply a fix before the symptom is reproduced or bounded. |
| Review | `review-workflow` | The user asks for code review, plan review, release review, security review, or confidence check. | Hide findings behind summaries or implement without permission. |
| Delivery | `delivery-workflow` | The user asks for acceptance, handoff, cleanup, release notes, validation closeout, or environment reset. | Declare done without verification and residual-risk notes. |
| Harness Hub maintenance | `hub-maintenance-workflow` | The user asks to maintain this hub, evaluate skill sources, adjust routing, or change install/update/remove policy. | Wholesale import another workflow or bypass lock-backed lifecycle rules. |

Post-PR closeout belongs to delivery. The user asks for post-PR status, mergeability, CI/check-run triage, conflict resolution, or branch-protection blocker handling after accepted work has been pushed.

## Canonical Lifecycle

Every non-trivial change request MUST follow this order unless the selected state is explicitly read-only, such as a pure question or review.

| Order | Phase | Required behavior |
|---|---|---|
| 1 | Align user need | Capture the user's actual goal, current pain, constraints, non-goals, success target, and decisions that require user input. |
| 2 | Gather required material | Inspect the needed repo-local docs, code paths, prior source decisions, and especially referenced upstream repos/blogs when the change depends on external workflow ideas. |
| 3 | Write spec and acceptance | Produce target behavior, boundaries, acceptance criteria, verification strategy, and unresolved questions. |
| 4 | Write executable plan and align | Produce task order, file targets, cleanup list, test plan, subagent plan, and validation commands; wait for user alignment before coding. |
| 5 | Clean unneeded files | Remove, demote, or mark obsolete files only after ownership and safety are clear. |
| 6 | Implement | Make the smallest scoped changes that satisfy the accepted spec and plan. |
| 7 | Test and accept | Run agreed tests, deterministic checks, E2E/manual acceptance, and regression gates. |
| 8 | Deliver report | Produce a user-facing handoff, using `effective-interact` when the work is material or visual comparison/evidence lowers review cost. |

## Requirements

### WR-1: Single Owner Routing

- The router MUST select exactly one workflow owner for a non-trivial request.
- If a request is ambiguous between states, the router MUST ask one concise clarification or choose the safer non-mutating state.
- The router MUST expose the selected state, reason, and next gate to the active workflow owner.
- The router MUST NOT implement, test, review, or deliver work itself.
- Explicit owner references MUST NOT override contradictory no-mutation, Harness Hub maintenance, or mixed review-and-implementation signals.

### WR-2: SDD-First Change Flow

`sdd-workflow` MUST gate implementation on the canonical lifecycle:

1. user need alignment: outcome, actor, pain, surface, constraints, and non-goals;
2. required material: repo-local references, existing source decisions, relevant code paths, upstream repos/blogs that the repo has cited or that the change depends on, and lightweight brainstorming over 2-3 evidence-backed directions;
3. target spec: behavior, state transitions, interfaces, compatibility constraints, and non-goals;
4. acceptance criteria: observable success, regression scope, and verification commands;
5. executable plan: file targets, task order, cleanup list, test strategy, subagent policy, and rollback/cleanup notes;
6. cleanup safety: what will be removed, demoted, retained, or migrated before implementation;
7. test plan: unit, integration, E2E, or deterministic substitute.

Implementation MUST NOT start until the alignment gate is satisfied.

### WR-3: Embedded TDD

TDD MUST be part of the SDD change workflow, not a competing top-level workflow.

- When behavior is testable, write or identify the failing test before the implementation.
- When a direct test is not practical, define the deterministic substitute before implementation.
- The test scope MUST match the accepted spec and avoid speculative coverage.

### WR-4: User Attention Boundary

The user MUST align on product-visible goals, target spec, acceptance criteria, and irreversible decisions. The user SHOULD NOT need to inspect coding details after those gates pass.

The workflow owner MUST surface implementation details only when they change:

- user-facing behavior,
- security or privacy posture,
- data ownership,
- external side effects,
- compatibility,
- cost,
- release or rollback semantics.

### WR-5: Effective Interact

`effective-interact` MUST be default-considered for every non-trivial session as a Chinese-first expression and handoff layer, not as the substantive workflow owner.

It is REQUIRED when:

- material repo or skill behavior changed,
- two or more options need comparison,
- state, routing, architecture, timeline, or call path matters,
- evidence, validation, or residual risk needs to remain inspectable,
- an HTML artifact lowers user review cost more than chat.

Question forecasting is required only when the answer can affect the next decision. `grill-me` or the selected review owner handles pressure-testing questions; `effective-interact` structures the result and creates the handoff surface. HTML is required after material repo or skill changes unless explicitly waived; otherwise choose the lightest output rung that lowers understanding, choice, verification, navigation, memory, or rework cost.

It MUST NOT replace production UI, slide decks, bundled apps, credential tools, repo-writing editors, or external writes.

### WR-6: Helper Skill Policy

Workflow owners MAY call helper skills for specialized work. Helper skills MUST stay subordinate to the owner.

Examples:

- `sdd-workflow` may use `product-capability`, `tdd-workflow`, `e2e-testing`, and `verification-loop`.
- `diagnosis-workflow` may use `diagnose`, `agent-introspection-debugging`, and `webapp-testing`.
- `review-workflow` may use `compound-code-review`, `security-review`, and `web-design-guidelines`.
- `hub-maintenance-workflow` may use source records, routing docs, capability metadata, lifecycle CLI dry-runs, and targeted repo/source inspection.

Native goal/story loops are outside Harness Hub's distributed skill set. They MUST NOT bypass SDD alignment or start autonomous repeated execution without user approval.

### WR-7: Subagent Orchestration

Subagents are parent-workflow controlled. Subagents MAY be used only when the active workflow owner can assign independent work and integrate results.

Allowed uses:

- parallel read-only research,
- docs lookup,
- review passes,
- independent verification,
- disjoint implementation write scopes.

Forbidden uses:

- critical-path blockers that the main agent needs immediately,
- overlapping writes,
- agent dispatch from hooks,
- final decision delegation,
- user-facing conclusion delegation.

The main agent MUST own synthesis, integration, and final handoff.

No automatic subagent dispatch is allowed from router logic, hooks, or helper skills.

### WR-8: Hook Policy

Advisory hooks only in the first phase. Hooks MAY start as advisory or deterministic local checks.

Allowed first-phase hooks:

- remind before coding when SDD acceptance is missing,
- remind after material changes when an Effective Interact report is missing,
- validate generated interaction artifacts.

Forbidden default hooks:

- subagent dispatch,
- pushing, publishing, posting, or merging,
- credential or third-party mutation,
- paid or irreversible actions,
- broad blocking behavior without security review.

No remote writes from hooks are allowed. A hook MUST NOT bypass SDD alignment, user approval gates, or the active workflow owner's plan.

### WR-9: Packaging And Lifecycle

The workflow system MUST preserve existing npm and lock-backed lifecycle guarantees.

- The standard target is the first-class install shape; host packaging belongs outside skill bodies.
- Imported skill bodies may preserve upstream style; routing and safety decisions belong in the overlay first.
- New workflow skills SHOULD enter the standard install surface only after routing and lifecycle tests cover them.
- Managed files MUST be removable through lock-backed `remove`.
- Deleted or renamed managed workflow files MUST be handled by `update` or migration metadata.
- Direct GitHub pulls MUST NOT replace npm as the release/update/remove path.

### WR-10: Source Dossier

The project MUST keep a source dossier before implementing broad workflow changes. For ordinary product/code changes, the owner MUST still gather the required repo material and source context before writing the final spec and plan.

For each source and phase, the dossier MUST record:

- source URL or local path,
- checked version, date, or commit when available,
- useful idea,
- rejected or constrained idea,
- local decision,
- reason.

No upstream workflow may be installed wholesale as the default workflow.

### WR-11: Pre-Implementation Cleanup

Cleanup MUST happen before new implementation when obsolete files, duplicate routes, rejected imported skills, generated artifacts, or deprecated managed components would otherwise keep the workflow noisy.

Cleanup MUST:

- be listed in the executable plan before coding;
- distinguish delete, demote to reference-only, archive, and retain;
- preserve unrelated user edits;
- use lock-backed ownership for managed target files;
- update docs, routing, capability metadata, or migration metadata when deletion changes public behavior.

Cleanup MUST NOT:

- delete unmanaged target files by name alone;
- remove third-party source notes needed for reproducibility;
- hide unresolved decisions by deleting evidence;
- change CLI lifecycle semantics without user approval.

### WR-12: Validation

Workflow changes MUST include:

- routing eval cases,
- skill description trigger coverage,
- docs link consistency,
- `scripts/validate-skills.ps1 -SkipExternal`,
- `bun run validate` when TypeScript, tests, capabilities, or CLI behavior change,
- disposable target smoke tests before install-surface changes.

After a requested PR is created or updated, delivery MUST verify the remote PR state before declaring completion:

- check mergeability or merge-state status after the pushed head settles;
- inspect CI/check-run status and identify failing checks;
- resolve in-scope conflicts, CI failures, or other actionable blockers;
- rerun relevant validation and push updates when the fix changes files;
- stop only for user decisions, credentials, permissions, reviewer action, protected-branch overrides, or external service recovery;
- do not merge the PR unless the user explicitly requests that remote mutation.

### WR-13: Non-Goals

The workflow-router redesign MUST NOT:

- become a general prompt pack mirror,
- make OpenSpec the default planning lane,
- make Superpowers, ECC, or Matt Pocock workflows authoritative,
- support every agent host equally in the first release,
- add blocking automation before routing and SDD gates are stable.

## Acceptance Criteria

The redesign is accepted when:

1. Every non-trivial request fixture resolves to exactly one owner or a clarification.
2. SDD implementation fixtures cannot pass without aligned spec and acceptance gates.
3. Source gathering fixtures prove referenced repos/docs are checked or explicitly scoped out before spec lock-in.
4. Executable plan fixtures include cleanup decisions before implementation.
5. Review and question fixtures do not mutate files.
6. Effective Interact handoff fixtures validate in browser mode.
7. Standard-target install dry runs include the expected workflow set.
8. Status/update/remove smoke tests preserve managed-file ownership and deleted-file cleanup.
9. Source dossier entries justify each adopted, adapted, rejected, and reference-only idea.

## Open Decisions

| Decision | Default recommendation | Why |
|---|---|---|
| Install surface | Use one standard install set. | Avoids bundle selection complexity and keeps lifecycle behavior deterministic. |
| Owner names | Use explicit skill names. | Each stage should have a clear and unique owner in the personal routing overlay. |
| Hooks timing | Defer blocking hooks. | Advisory checks are enough until routing and SDD gates are proven. |
| Other agent hosts | Keep as explicit compatibility work. | The install graph should stay simple for personal project reuse; host packaging can wrap the standard skill tree separately. |
