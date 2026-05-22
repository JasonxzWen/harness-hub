# Workflow Router Redesign

Date: 2026-05-20

This document records the accepted direction for the next Skill Hub workflow redesign. It is a planning contract, not an implementation claim.

## Document Set

- [Workflow source dossier](workflow-source-dossier.md) owns phase-by-phase source evaluation for the repos, blogs, and local decisions this hub already references.
- [Workflow router execution plan](workflow-router-execution-plan.md) owns phased implementation work, file targets, validation gates, and rollout order.
- [Workflow router spec](workflow-router-spec.md) owns normative MUST/SHOULD behavior, acceptance criteria, and non-goals.
- This document stays as the overview and decision record.

## Decision

Use Option A: build one thin `workflow-router` that identifies the user's task state, then hands the session to exactly one workflow owner. The hub should stop acting like a pile of imported skill packs and instead expose a small original workflow system inspired by, but not copied from, upstream projects.

The workflow owner must drive this lifecycle: align user need -> gather required material -> write spec and acceptance -> write executable plan and align -> clean unneeded files -> implement -> test -> deliver report.

## Assumptions

- The first-class install shape is the standard skills/<name> tree; host packaging stays outside skill bodies.
- npm stays as the versioned install, update, and remove path because direct GitHub pulls do not provide lock-backed cleanup.
- Existing lifecycle guarantees stay intact: analyze is read-only, install/update/remove are lock-backed, and removed managed files can be deleted by update or remove flows.
- OpenSpec, ECC, Superpowers, Matt Pocock skills, and other sources are references. Do not import another project's whole workflow as the default.
- The default engineering habit is SDD-first with embedded TDD.

## Target Workflow States

| State | Owner | Trigger | Hard gate |
|---|---|---|---|
| Question | `answer-workflow` | The user asks for an explanation, codepath lookup, feasibility answer, or comparison without requesting change. | Answer from evidence; do not edit files unless the user redirects. |
| SDD change | `sdd-workflow` | A feature, bug fix, refactor, product change, spec change, or implementation request. | Align core details, target spec, and acceptance criteria before coding. |
| Diagnosis | `diagnosis-workflow` | Failing command, runtime bug, flaky behavior, performance issue, or agent/tool failure. | Reproduce or bound the symptom before fixing. |
| Review | `review-workflow` | Code review, plan review, release review, security review, or confidence check. | Findings first, evidence anchored, no implementation unless requested. |
| Delivery | `delivery-workflow` | Acceptance, handoff, release notes, cleanup, validation closeout, or local environment reset. | Verification and residual risk are explicit before declaring done. |
| Skill Hub maintenance | `hub-maintenance-workflow` | Skill Hub repo maintenance, third-party source evaluation, routing cleanup, npm lifecycle work, or target-repo install policy. | Preserve local originality and lock-backed lifecycle behavior. |

Only one owner should drive a task state. Narrow technical skills may be used underneath that owner, but they should not compete for the top-level workflow.

## SDD And TDD Contract

SDD is the default development spine:

1. Capture the requested outcome, user-facing goal, constraints, and non-goals.
2. Align target spec, acceptance criteria, and test strategy with the user before implementation.
3. Use TDD inside the accepted spec: failing test or equivalent deterministic gate first when the change is testable.
4. Implement the smallest scoped change that satisfies the accepted spec.
5. Run acceptance, regression, and handoff checks before delivery.

The user should not need to inspect implementation details unless the design creates a product, safety, security, or irreversible operational decision.

## Effective Interact Priority

`effective-interact` is mandatory communication infrastructure for non-trivial work. It should be default-considered by every workflow state and required after material repo or skill changes when HTML lowers decision cost.

It owns:

- answer-first reports,
- side-by-side option comparison,
- visual routing or architecture maps,
- evidence-backed implementation and review handoffs,
- validation dashboards,
- local disposable editors with visible export paths.

It does not own production UI, slide decks, bundled React/Tailwind apps, credential tools, repo-writing editors, or external writes.

The core principle should live in `AGENTS.md`: reduce human interpretation cost before optimizing agent convenience.

## Subagent Orchestration

Subagents should be a parent-workflow optimization, not an always-on skill behavior.

Use subagents when the work is independent and mergeable:

- parallel read-only source or repo research,
- focused docs lookup,
- pre-PR review passes,
- independent verification,
- disjoint implementation scopes with clear file ownership.

Avoid subagents when the result is on the critical path, tightly coupled to the next local edit, or likely to create conflicting writes. The main agent owns final synthesis, user-facing conclusions, and integration.

Codex already has project-local agent roles in `.codex/agents` and host-level subagent support. Claude Code has native subagents. Skill Hub should map workflow intent to these host capabilities instead of inventing a second orchestration layer.

## Hook Policy

Hooks are useful later, but they should not be the first enforcement layer.

Start with advisory or deterministic checks:

- warn if coding starts before SDD acceptance is aligned,
- remind the agent to create an `effective-interact` handoff after material repo or skill changes,
- run local validation for generated artifacts,
- block only deterministic unsafe local actions after a separate security review.

Do not add hooks that dispatch agents, publish, push, post, spend money, change credentials, or mutate third-party resources without explicit user approval and a security review.

## Source Positioning

| Source | Useful idea | Local decision |
|---|---|---|
| Matt Pocock skills | Narrow, memorable workflow skills such as pressure testing, diagnosis, and prototypes. | Keep the stage-specific clarity, but do not copy the full worldview or issue-tracker assumptions. |
| Superpowers | A broad "using superpowers" habit plus subagent-driven development and worktree discipline. | Use as a reference for intent routing, subagent boundaries, and finish discipline; do not install wholesale. |
| Everything Claude Code | Broad Claude Code conventions, agents, hooks, MCP patterns, and verification habits. | Keep as a reference/library surface; route only bounded behavior into local skills. |
| OpenSpec | Formal proposal/spec/task/archive lifecycle. | Keep explicit formal mode, not the default planning lane. SDD should be lighter and user-aligned first. |
| Effective Interact | Original local interaction-artifact workflow. | Promote to high-priority communication layer across workflow states. |

## Packaging Boundary

Keep npm. It is the practical way to preserve:

- one-command install for the standard skill target,
- versioned updates,
- lock-backed status,
- safe removal of files the project no longer owns,
- generated `dist/` packaging.

Keep the first-class install target platform-neutral. Host-specific wrappers can stay documented as compatibility references or explicit future work, but they should not drive default workflow design.

## Non-Goals

- No wholesale import of Superpowers, ECC, Matt Pocock, or OpenSpec workflows.
- CLI behavior now uses one standard install set; further lifecycle changes remain out of scope here.
- No new blocking hooks in this planning step.
- No automatic subagent dispatch rule in every skill.
- No broad install-surface mutation before workflow-router evals exist.

## Implementation Plan

See [Workflow router execution plan](workflow-router-execution-plan.md) for the actionable rollout. The summary remains:

1. Create source dossier and routing evals before changing the install surface.
2. Add `workflow-router` as the top-level intent classifier.
3. Add original workflow-owner skills for question, SDD change, diagnosis, review, delivery, and Skill Hub maintenance.
4. Make `effective-interact` the default reporting layer in those workflows without making it the state owner.
5. Keep workflow-owner skills in the single standard install set after tests cover routing behavior.
6. Preserve npm install/update/remove and lock-backed cleanup throughout.

## Open Questions

- Confirm whether future install-surface additions should remain always-on or stay reference-only.
- Confirm whether the six workflow owner names should be public skill names.
