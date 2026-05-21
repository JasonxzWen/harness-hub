---
name: sdd-workflow
description: Load when the user requests a feature, bug fix, refactor, product/spec change, or implementation; run SDD-first lifecycle with embedded TDD and user-aligned spec/acceptance before coding.
---

# SDD Workflow

Use this owner for change work. SDD is the spine; TDD is embedded inside the accepted spec.

## Canonical Lifecycle

Do not start implementation until the user-visible gates are aligned.

1. **Align user need**: outcome, actor, pain, constraints, non-goals, and success target.
2. **Gather required material**: repo docs, code paths, existing source decisions, and referenced repos/blogs needed for the change.
3. **Write spec and acceptance**: target behavior, boundaries, acceptance criteria, verification strategy, and open questions.
4. **Write executable plan and align**: file targets, task order, tests, cleanup list, subagent use, hook checks, and validation commands.
5. **Clean unneeded files**: delete, demote, archive, or retain only after ownership and safety are clear.
6. **Implement**: make the smallest scoped change that satisfies the accepted spec.
7. **Test and accept**: run agreed unit, integration, E2E, or deterministic checks.
8. **Deliver report**: use `effective-interact` for material work, with changes, evidence, validation, risks, and next actions.

## TDD

- Write or identify the failing test before implementation when behavior is testable.
- If a direct test is not practical, define the deterministic substitute before implementation.
- Keep test scope tied to the accepted spec; do not add speculative coverage.

## Helper Skills

Use helpers only under this owner:

- `product-capability` for implementation-ready constraints.
- `tdd-workflow` for test-first implementation detail.
- `e2e-testing` when user-visible flows require durable browser checks.
- `verification-loop` before delivery.
- `ralph-prd` and `ralph-loop` only when the user explicitly wants a goal/story loop bridge before native goal support is available; do not start autonomous repeated execution without approval.
- `effective-interact` for alignment and handoff artifacts.

## Subagents

Use subagents only for independent source gathering, docs lookup, review, verification, or disjoint write scopes. Follow `workflow-router/references/orchestration-policy.md`: the main agent owns final synthesis and user-facing conclusions, and hooks stay advisory until separately approved.
