# Workflow Router Execution Plan

Date: 2026-05-20

This document turns the accepted workflow-router direction into implementation work. It is the planning track; normative behavior belongs in [Workflow router spec](workflow-router-spec.md), and phase-by-phase source evaluation belongs in [Workflow source dossier](workflow-source-dossier.md).

## Goal

Ship an original platform-neutral workflow system where each non-trivial request is routed to one top-level workflow owner, SDD is the default change lane, TDD is embedded inside accepted specs, and `effective-interact` lowers human interpretation cost at alignment and handoff points.

## Canonical Work Lifecycle

Every non-trivial change request should move through this order. The implementation plan for this redesign exists to make this lifecycle reliable, not to replace it.

| Order | Phase | Output | Acceptance |
|---|---|---|---|
| 1 | Align user need | Goal, actor, current pain, constraints, non-goals, and decision points. | The user agrees the core need and success target are captured. |
| 2 | Gather required material | Repo-local docs, referenced upstream repos/blogs, existing skills, source decisions, code paths, and constraints. | Important referenced sources are checked or explicitly marked out of scope; adopt/adapt/reject reasoning is recorded. |
| 3 | Write spec and acceptance | Target behavior, state transitions, boundaries, acceptance criteria, and verification strategy. | The user can validate product-visible behavior without reviewing implementation details. |
| 4 | Write executable plan and align | File targets, task order, tests, cleanup list, subagent use, validation commands, and rollback/cleanup notes. | The user approves the plan before coding starts. |
| 5 | Clean unneeded files | Removal or demotion plan for obsolete skills, docs, generated files, profile entries, or managed assets. | Only approved, owned, lock-backed, or clearly obsolete files are removed; unrelated/user-owned files are preserved. |
| 6 | Implement | Minimal scoped code/docs/profile changes following the accepted plan. | Every changed line traces to the accepted spec, cleanup, or test plan. |
| 7 | Test and accept | Unit/integration/E2E/deterministic checks plus manual acceptance where needed. | The agreed acceptance criteria are satisfied or residual gaps are reported. |
| 8 | Deliver report | `effective-interact` handoff with changes, evidence, validation, decisions, risks, and next actions. | The user can understand outcome and remaining decisions without reading the whole diff. |

## Release Strategy

Use a staged rollout:

1. Add the workflow source dossier and routing/spec evals without changing the default profile.
2. Introduce a new explicit `sdd` profile for dogfooding.
3. Promote to the default/minimal profile only after disposable-target install/update/remove smoke tests pass for the standard target.

This avoids breaking current users while still moving the hub toward one standard workflow.

Implementation status: the router skill, public owner skills, routing fixture tests, and explicit `sdd` profile now exist. Physical cleanup was approved on 2026-05-21 after source records were retained, and non-component `skills` directories were removed. A disposable standard target `sdd` lifecycle smoke passed after cleanup: `install --dry-run`, `install --yes`, `status`, `update --dry-run`, `remove --dry-run`, and `remove --yes` all preserved lock-backed ownership. Promotion to `minimal`, hook automation, and any future cleanup/removal work remain separate approval gates.

## Workstreams

| Workstream | Files | Output | Acceptance |
|---|---|---|---|
| Lifecycle contract | `docs/workflow-router-spec.md`, `docs/workflow-router-execution-plan.md` | The canonical work lifecycle and phase gates. | User need -> source gathering -> spec -> plan -> cleanup -> implementation -> tests -> delivery is explicit and normative. |
| Source dossier | `docs/workflow-source-dossier.md` | Phase-by-phase comparison of Matt Pocock skills, Superpowers, ECC, OpenSpec, Effective Interact, and local docs. | Each source entry has checked version/date, useful idea, rejected parts, and local decision. |
| Router contract | `docs/workflow-router-spec.md`, `tests/fixtures/workflow-router-cases.json`, `tests/workflowRouterContract.test.ts` | One-owner routing rules and ambiguity handling. | Positive, negative, forbidden, and ambiguous cases prove exactly one top-level owner. |
| Router skill | `skills/workflow-router/` | Thin intent classifier and state handoff rules. | `SKILL.md` stays short; detailed taxonomy lives in `references/`; no implementation workflow inside router. |
| Workflow owners | `skills/answer-workflow/`, `skills/sdd-workflow/`, `skills/diagnosis-workflow/`, `skills/review-workflow/`, `skills/delivery-workflow/`, `skills/hub-maintenance-workflow/` | Original owner skills for each state. | Each owner has one description, non-overlap examples, entry/exit gates, and `effective-interact` handoff guidance. |
| Library demotion | `docs/skill-routing.md`, `capabilities/index.json` | Existing narrow skills become tools under workflow owners instead of top-level lifecycle owners. | Matt/OpenSpec/ECC/Superpowers-derived lanes are not removed unless replaced; overlap is documented. |
| Packaging | `capabilities/index.json`, `README.md`, `docs/capability-map.md`, `tests/skillHub.test.ts` | Explicit `sdd` profile for the standard skill target. | Install/status/update/remove remain lock-backed and hash-aware. |
| Hooks and subagents | `skills/workflow-router/references/orchestration-policy.md`, optional host packaging guidance | Advisory hooks and host-native subagent mappings only after core routing is stable. | No hook dispatches agents or performs remote writes; subagents are parent-workflow controlled. |
| Handoff artifacts | `skills/effective-interact/assets/fixtures/`, `reports/` if durable | Example HTML reports for routing choice, SDD alignment, review, and delivery. | Generated artifacts validate with `validate-interaction.mjs --require-browser` when checked in or handed off. |

## Milestones

### Milestone 0: Lifecycle And Planning Contract

Status: in progress.

Tasks:

1. Capture the canonical work lifecycle: align need, gather material, write spec and acceptance, align executable plan, clean unneeded files, implement, test, deliver.
2. Keep [Workflow router redesign](workflow-router-redesign.md) as the overview.
3. Split execution details into this document.
4. Split normative requirements into [Workflow router spec](workflow-router-spec.md).
5. Report the split through an `effective-interact` HTML artifact.

Validation:

- `git diff --check`
- targeted routing/docs tests if touched
- `validate-interaction.mjs --require-browser` for the HTML report

### Milestone 1: Source Dossier

Tasks:

1. Create `docs/workflow-source-dossier.md`.
2. For each phase, compare source views:
   - intent recognition and task routing,
   - brainstorming and requirement alignment,
   - spec and acceptance definition,
   - TDD and implementation,
   - review and security,
   - E2E validation and delivery,
   - cleanup and update/remove lifecycle,
   - subagent orchestration,
   - hooks and automation.
3. Record source status for Matt Pocock skills, Superpowers, ECC, OpenSpec, Effective Interact, and local Skill Hub docs.
4. Mark each idea as `adopt`, `adapt`, `reference-only`, or `reject`.

Acceptance:

- No source is copied wholesale.
- Every adopted idea names the local behavior it will become.
- Every rejected idea states the risk: trigger noise, external side effect, credential boundary, host mismatch, or overlap.

### Milestone 2: Routing Eval Foundation

Tasks:

1. Add `tests/fixtures/workflow-router-cases.json`.
2. Add a contract test that enforces:
   - exactly one top-level owner for every positive case,
   - no owner for trivial or permission-only pauses,
   - clarification required for ambiguous cases,
   - no direct mutation in question/review states.
3. Add examples for workflow-state phrasing differences across common user prompts.

Acceptance:

- A request cannot match both `sdd-workflow` and `review-workflow`.
- A material change request cannot bypass SDD acceptance.
- `effective-interact` can be required as a reporting layer without becoming the top-level owner.

### Milestone 3: Router Skill

Tasks:

1. Create `skills/workflow-router/SKILL.md`.
2. Keep the description under the local routing quality target.
3. Move taxonomy and examples to `references/intent-taxonomy.md`.
4. Add `references/state-handoff.md` with required handoff fields:
   - selected state,
   - confidence,
   - reason,
   - required owner,
   - user alignment gate,
   - allowed helper skills,
   - whether `effective-interact` is required.

Acceptance:

- Router does not contain implementation, testing, or review procedures.
- Router never selects more than one workflow owner.
- Low-confidence classification asks one concise clarification instead of guessing.

### Milestone 4: Workflow Owner Skills

Tasks:

1. Add the six owner skills.
2. Each owner must define:
   - load trigger,
   - do-not-load cases,
   - required entry context,
   - user alignment gate,
   - internal helper skill policy,
   - subagent policy,
   - test/validation gate,
   - handoff contract.
3. `sdd-workflow` must include the SDD/TDD loop:
   - align goal, constraints, non-goals,
   - define target spec,
   - define acceptance,
   - define tests,
   - implement,
   - verify,
   - hand off.

Acceptance:

- Every development phase has one owner.
- Existing narrow skills remain usable only as helpers or explicit specialized routes.
- The user can ignore implementation details after spec and acceptance are aligned.

### Milestone 5: Distribution Profile

Tasks:

1. Add an explicit `sdd` profile to `capabilities/index.json`.
2. Include only standard skill target support.
3. Add component metadata for new workflow skills.
4. Add update/remove smoke coverage for deleted or renamed managed workflow files.

Acceptance:

- `skill-hub install <target> --profile sdd --target standard --dry-run` shows the complete workflow set.
- `skill-hub status`, `update`, and `remove` preserve lock-backed ownership rules.

### Milestone 6: Advisory Hooks And Subagents

Status: in progress. Advisory hooks only and Subagents are parent-workflow controlled are now normative policy. A side-effect-free `scripts/advisory-check.mjs` core exists for manual checks or future host hooks; No automatic subagent dispatch and No remote writes from hooks remain hard gates before any enabled hook.

Tasks:

1. Add guidance for host-native subagents:
   - exploration,
   - docs lookup,
   - review,
   - independent verification,
   - disjoint write scopes only.
2. Add advisory hook candidates only after a security review:
   - SDD acceptance reminder before coding,
   - `effective-interact` handoff reminder after material changes,
   - generated artifact validation.

Acceptance:

- No hook dispatches a subagent.
- No hook performs remote writes, pushes, publishes, posts, credential changes, or paid actions.
- Main agent remains responsible for final synthesis and user-facing conclusions.

## Required User Alignment Gates

Ask the user before:

- promoting `sdd` into `minimal`,
- deleting or renaming existing public skills,
- changing CLI lifecycle semantics,
- adding blocking hooks,
- adding remote or credential-bearing automation,
- adding host-specific first-class targets again.

The user should not need to approve implementation details inside an already accepted spec unless the change creates a product, safety, security, or irreversible operational decision.

## Verification Stack

Use this order as the default local gate:

1. `git diff --check`
2. `bun test ./tests/routingDocs.test.ts ./tests/skillRoutingCases.test.ts`
3. new workflow-router contract tests
4. `powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal`
5. `bun run validate` when TypeScript, tests, capability metadata, or CLI behavior changes
6. disposable target smoke tests before publishing profile changes

## Completion Definition

The redesign is ready for broader use when:

- the canonical lifecycle is visible in the router and owner skills,
- all non-trivial requests route to one top-level owner,
- SDD acceptance blocks implementation work by default,
- required source gathering happens before spec and plan lock-in,
- cleanup is planned and approved before new implementation starts,
- TDD is embedded in the change workflow,
- Effective Interact produces validated handoff artifacts for material work,
- standard-target installs are smoke-tested,
- update/remove can clean up deleted managed workflow files safely,
- source decisions are documented and reproducible.
