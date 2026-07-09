---
name: sdd-workflow
description: Load when workflow-router selects the sdd-change state for feature, bug fix, refactor, product/spec change, or implementation work; run SDD-first lifecycle with embedded TDD.
---

# SDD Workflow

Use this owner for change work. SDD is the spine; TDD is embedded inside the accepted spec.

## Canonical Lifecycle

Do not start implementation until the user-visible gates are aligned.

1. **Align user need**: outcome, actor, pain, constraints, non-goals, and success target.
2. **Gather required material and explore directions**: repo docs, code paths, and 2-3 evidence-backed directions. Recommend one, record rejected alternatives, and call helpers such as `grill-with-docs` when useful.
3. **Write spec and acceptance**: target behavior, boundaries, acceptance criteria, verification strategy, and open questions.
4. **Write executable plan and align**: file targets, task order, tests, cleanup list, subagent use, hook checks, and validation commands.
5. **Clean unneeded files**: delete, demote, archive, or retain only after ownership and safety are clear.
6. **Implement**: make the smallest scoped change that satisfies the accepted spec.
7. **Test and accept**: run agreed unit, integration, E2E, or deterministic checks.
8. **Finish closeout**: after tests pass or residual risk is known, run the required closeout loop for every mutation, drive requested PR work to merge-ready or explicitly authorized merge completion, and run or explicitly skip `agent-interaction-audit` to audit tool-calling quality, workflow drift, and skill/workflow improvement candidates.
9. **Deliver report**: use `effective-interact` for material work, with changes, evidence, final review outcome, agent interaction audit recommendations, validation, risks, and next actions.

During implementation, update `Spec updates` only for decision-level changes to assumptions, acceptance, allowed paths, validation, user-visible behavior, or risk. Progress belongs in the harness progress file.

## Repo Harness State

When `.harness-hub/state/` exists, persist the plan before implementation instead of relying on chat memory:

- `current-task.md`: goal, assumptions, non-goals, paths, discovery, target spec, P0/P1/P2 matrix, validation, open questions, alignment, autonomy envelope, subagent auto-arbiter, and checkpoint policy.
- `decisions.md`: accepted direction, rationale, rejected alternatives, and any decision-level changes.
- `progress.md`: current phase, completed work, validation records, runtime signals, stale-read gate result, blockers, PR status, and checkpoint commit state.
- `session-handoff.md`: restart status, changed files, validation evidence, stale-read result, final review, agent interaction audit recommendations, residual risk, and next action before ending the session.

Ask only blocking open questions before implementation: answers that change behavior, safety, data ownership, compatibility, cost, release/rollback, external side effects, allowed paths, or acceptance.

## TDD

- Choose the fastest honest feedback loop before implementation: a failing test when behavior is testable, or a deterministic substitute.
- Keep test scope tied to the accepted spec; do not add speculative coverage.
- If feedback is awkward because boundary is muddy, record the design finding before shallow tests.

## Helper Skills

Use helpers only under this owner:

- `product-capability` for implementation-ready constraints.
- `doc-coauthoring` for PRDs, RFCs, proposals, specs, or decision records that need collaborative drafting before implementation.
- `tdd-workflow` for test-first implementation detail.
- `claude-api` for Anthropic API or SDK changes; verify current provider docs before writing code.
- `mcp-builder` for MCP server, tool schema, resource, prompt, or evaluation work.
- `skill-creator` for standard skill creation or adaptation inside a change.
- `theme-factory` when an accepted artifact needs visual theming; use `frontend-design` for production UI.
- `slack-gif-creator` only for explicit Slack GIF deliverables.
- `e2e-testing` when user-visible flows require durable browser checks.
- `verification-loop` before delivery.
- `agent-interaction-audit` during finish closeout when the work should be audited for tool-calling quality, repeated manual corrections, doc/code conflicts, AI infrastructure lessons, or possible skill/workflow extraction.
- Native goal/story workflows only when the user explicitly asks for repeated execution; do not start autonomous repeated execution without approval.
- `effective-interact` for alignment and handoff artifacts.

## Agentic Loops

Use host-neutral agentic loops from `workflow-router/references/agentic-loops.md`. For mutation work, run the required closeout loop before handoff; small edits can use lower evidence, but do not skip review:

- `plan-review` before implementation for material plans, especially architecture, data, workflow, or UI changes.
- `test-design` before implementation when P0/P1/P2 coverage or deterministic substitutes are uncertain.
- `implementation-review` after a behavior slice to inspect technical debt, first-principles fit, test gaps, and rule drift.
- `frontend-acceptance` when Web UI work needs fresh-context browser evidence and a separate acceptance arbiter.
- `docs-consistency` during closeout when workflow, public behavior, templates, tests, and docs/code drift matter.

Record planned loops in `current-task.md` and actual loop evidence in `progress.md`. The main agent owns final synthesis and user-facing decisions.

## Subagents

Use subagents aggressively but controllably for independent source gathering, docs/web research, log analysis, review, verification, stale-read checks, closeout review, or leased disjoint writes. Skip tiny, judgment-bound, unsupported, or high-risk work. In generic loop evidence, write `delegated-agent`, not host-specific tool names. Follow `workflow-router/references/orchestration-policy.md`: subagent questions go first to the main agent, which may auto-arbitrate inside the autonomy envelope; final synthesis stays with the main agent, and hooks stay advisory.

During finish closeout, derive required loops from dirty paths or a base/head diff. Prefer isolated review when required; otherwise record the fallback reason and deterministic substitute. Do not hide review findings, PR conflicts, merge risks, or agent interaction audit recommendations.
