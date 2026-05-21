# Workflow Source Dossier

Date: 2026-05-21

This dossier reorganizes the source projects already referenced by this repository around the canonical work lifecycle. It records what to study, what to adapt, what to reject, and what must remain reference-only before implementing the workflow-router redesign.

This is based on repo-local source records in [Source projects and candidates](source-projects.md), [Skill routing and de-duplication](skill-routing.md), [Capability map](capability-map.md), and installed skill docs. Refresh exact upstream commits and licenses before copying or updating any upstream content.

## Lifecycle Lens

The workflow system must serve this order:

1. Align user need.
2. Gather required material.
3. Write spec and acceptance.
4. Write executable plan and align.
5. Clean unneeded files.
6. Implement.
7. Test and accept.
8. Deliver report.

## Source Index

| Source | Repo-local status | Primary value | Default decision |
|---|---|---|---|
| Matt Pocock skills | `grill-me`, `diagnose`, and `prototype` adapted; other skills rejected or explicit-only. | Narrow, memorable phase skills and feedback-loop framing. | Adapt selected phase patterns only. |
| Superpowers | Referenced, not installed. | Broad disciplined workflow, `using-superpowers`, subagent-driven development, worktree/finish discipline. | Reference for lifecycle and orchestration boundaries; do not install wholesale. |
| Everything Claude Code | Source checkout and compatibility docs retained; only selected helper skills remain active through `capabilities/index.json`. | Rules, agents, hooks, MCP patterns, verification, broad Claude Code conventions. | Reference surface plus bounded helpers; do not restore the broad local skill library. |
| OpenSpec | Installed as explicit formal lifecycle. | Proposal/spec/task/archive artifacts and formal change tracking. | Explicit mode only; do not make default planning lane. |
| Compound Engineering Plugin | `compound-code-review` adapted; rest explicit-only or reference. | Structured review, reviewer lenses, doc-review candidates, side-effect-heavy work loops. | Keep review lane; postpone broader workflows. |
| Effective Interact | Original local skill. | Answer-first visual handoffs, evidence, option comparison, validation dashboards. | High-priority interaction layer across all non-trivial lifecycle phases. |
| Skill Hub CLI lifecycle | Implemented and documented locally. | Lock-backed install/status/update/remove and safe cleanup ownership. | Preserve as mandatory distribution and cleanup boundary. |
| Vercel/Web/React skills | `web-design-guidelines` remains active; other Vercel Web/React skills are source-retained only. | Frontend implementation and UI quality for target repos that need it. | Helper/reference sources only; not top-level lifecycle owners. |
| Ralph | `ralph-prd`, `ralph-loop`, and `scripts/ralph/prd.json.example` retained. | Autonomous story loop and PRD-to-story execution. | Explicit autonomous execution mode, not default SDD workflow. |
| Learn Harness / Learn FASTER | Narrow local adaptations. | Harness templates and learning lifecycle ideas. | Keep outside default engineering lifecycle except as explicit profiles. |

## Phase Dossier

### 1. Align User Need

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| Matt `grill-me` | One-question-at-a-time pressure testing and recommended answers before implementation. | Do not turn every request into an interview. | Use as helper when assumptions or design tradeoffs are unclear. |
| `product-capability` | Capability restatement, constraints, invariants, interfaces, and open decisions. | Do not invent product truth. | Make it a helper under `sdd-workflow` for implementation-ready contracts. |
| OpenSpec explore | Read-only exploration and artifact capture without implementation. | Do not make OpenSpec the default planning lane. | Use only when formal OpenSpec lifecycle is requested or already active. |
| Effective Interact | Visual option comparison and alignment artifacts. | Do not replace simple chat for trivial questions. | Require when comparison, architecture, or evidence lowers user review cost. |

### 2. Gather Required Material

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| `hub-maintenance-workflow` | Inventory source projects, compare upstream versions, preserve local adaptations, and maintain profile/package boundaries. | Do not install off-stack or wholesale sources. | Use as the single maintenance owner for this repository. |
| Former `skill-evaluator` policy | Read upstream README, skill bodies, metadata, license, and compare against local routing before install. | Do not use presence/absence comparison only. | Fold the policy into mandatory source-gathering criteria before workflow adoption. |
| `docs/source-projects.md` | Existing source URLs, versions, decisions, and imported paths. | It may be stale for live upstream content. | Treat as the repo-local starting point; refresh only when copying/updating upstream content. |
| Superpowers tool mapping | Host compatibility checklist for porting broad-trigger workflows. | Do not wrap native host tools just to mirror names. | Use as reference for platform-neutral wording and activation boundaries. |
| ECC local setup | Existing agents/hooks/config and imported skill surface. | Do not let ECC become the default workflow authority. | Use as source evidence and compatibility layer, not final paradigm. |

### 3. Write Spec And Acceptance

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| OpenSpec proposal/spec/tasks | Formal proposal, design, spec, task artifact structure. | Too heavy as the default for every change. | Borrow artifact clarity, keep explicit OpenSpec mode. |
| `product-capability` | SRS-style capability contract and implementation-facing constraints. | Do not scatter ad hoc notes. | Use under `sdd-workflow` before coding. |
| Matt `grill-with-docs` | Context and ADR-oriented design pressure. | It assumes `CONTEXT.md`/ADR writes that this hub has not standardized. | Reference-only until domain-doc conventions are decided. |
| CE doc-review / plan confidence | Persona-based plan review and confidence checks. | Unclear persistence model and overlaps existing planning lanes. | Medium-priority future review helper after plan artifact ownership is defined. |
| Effective Interact | Spec/acceptance dashboards and decision-first summaries. | Do not hide unsupported claims in polished HTML. | Use for user alignment when the spec has options, risks, or evidence. |

### 4. Write Executable Plan And Align

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| Superpowers | Planning discipline and finish/worktree habits. | Full pack would duplicate existing skills. | Adapt only plan discipline and explicit completion gates. |
| ECC rules | Conservative execution, hooks, agents, and verification practices. | Avoid turning broad conventions into another prompt pack. | Keep broad rules in `AGENTS.md`; conditional details in workflow skills. |
| Ralph PRD/story loop | Story sizing and autonomous execution boundaries. | Not the default for normal user-supervised SDD. | Explicit mode for repeated autonomous story execution. |
| OpenSpec tasks | Implementation task checklist tied to spec artifacts. | Do not require OpenSpec for every change. | Borrow task/acceptance traceability in `sdd-workflow`. |

### 5. Clean Unneeded Files

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| Skill Hub CLI lifecycle | Lock-backed `status`, `update`, `remove`, schema migration, safe ownership checks. | Do not delete by path/name alone. | Make cleanup a pre-implementation gate and preserve lock-backed ownership. |
| `hub-maintenance-workflow` | Preserve local adaptations and reject trigger-noise sources. | Do not remove unrelated local edits or source evidence. | Cleanup must distinguish delete, demote, archive, and retain. |
| Superpowers finish/worktree discipline | Finish cleanly and avoid lingering branch/runtime state. | Do not import full worktree workflow by default. | Reference for delivery cleanup and local state hygiene. |
| Effective Interact | Handoff can show cleanup list and residual risks. | HTML report is not the cleanup mechanism. | Use report to make cleanup visible and reviewable. |

### 6. Implement

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| `tdd-workflow` | Write failing tests or deterministic gates before implementation. | TDD must not compete with SDD as top-level workflow. | Embed TDD inside accepted SDD spec. |
| Matt `tdd` | Reinforces test-first habit. | Rejected by local routing due to overlap with installed TDD/Ralph/OpenSpec surfaces. | Reference-only; do not install by default. |
| ECC coding standards | General code quality and conservative edits. | Avoid duplicating root project instructions inside every skill. | Keep as helper/library behavior. |
| OpenSpec apply | Task-by-task implementation from formal change artifacts. | Explicit formal lifecycle only. | Use when an OpenSpec change already exists. |

### 7. Test And Accept

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| `verification-loop` | Completion gates before declaring done. | Not root-cause diagnosis or review analysis. | Use as helper under delivery and implementation workflows. |
| `e2e-testing` and `webapp-testing` | Durable Playwright suites and one-off browser validation. | Only for repos/surfaces that actually need browser validation. | Helper skills based on target-repo evidence. |
| Compound code review | Findings-first structured review with confidence and fix routing. | Do not import CE's commit/PR/tracker side effects by default. | Use under `review-workflow`. |
| Effective Interact validator | Browser-validated HTML artifacts and evidence checks. | Validator warnings are advisory unless they reduce decision quality. | Required for material HTML handoffs. |

### 8. Deliver Report

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| Effective Interact | Chinese-first static HTML reports with evidence, validation, risks, and next actions. | Do not use for trivial chat, production UI, decks, bundled apps, credentials, or repo-writing editors. | Mandatory communication layer for material work. |
| Skill Hub CLI lifecycle docs | Release/checklist handoff with concrete commands. | Do not conflate CLI package self-update with target-repo managed `update`. | Preserve package-vs-target update distinction. |
| CE code review artifact handoff | Stable finding numbering and artifact-style review output. | Keep only the review lane. | Use for review handoffs when findings matter. |
| OpenSpec archive | Formal closeout and spec archive. | Use only for explicit OpenSpec changes. | Reference for lifecycle closure, not default delivery. |

## Adopt / Adapt / Reference / Reject Summary

| Decision | Sources | Local behavior |
|---|---|---|
| Adopt | Effective Interact, Skill Hub CLI lifecycle, local AGENTS constraints. | Make them high-priority local infrastructure. |
| Adapt | Matt `grill-me`/`diagnose`/`prototype`, Compound `ce-code-review`, Ralph PRD/story loop, selected Vercel/Web guidance. | Keep bounded helper lanes with local routing. |
| Reference-only | Superpowers full pack, ECC broad system, OpenSpec formal lifecycle, Matt `grill-with-docs`, CE doc review, frontend-slides upstream. | Study specific ideas without default installation. |
| Reject for default | Full Superpowers, full CE plugin, Matt issue/triage/setup flows, side-effect-heavy PR/publish/credential workflows. | Prevent trigger noise and unsafe external actions. |

## Required Before Implementation

Before implementing workflow-router or workflow owners:

1. Convert this dossier into routing/spec test fixtures.
2. Keep source refresh separate from local workflow design.
3. Ask the user before any default-profile promotion, blocking hook, or future broad cleanup.

Subagent and hook source decision: Superpowers and ECC are useful references for orchestration, but local policy keeps Subagents are parent-workflow controlled, Advisory hooks only, No automatic subagent dispatch, and No remote writes from hooks.
4. Preserve source notes even when a referenced skill is demoted or rejected.
