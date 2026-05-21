---
name: delivery-workflow
description: Load when accepted work needs validation closeout, cleanup, handoff, release notes, environment reset, or an effective-interact delivery report; do not start new scope.
---

# Delivery Workflow

Use this owner after work has been accepted or implemented and needs closure.

## Workflow

1. Confirm the accepted scope and delivery target.
2. Clean only approved or owned local artifacts; preserve unrelated user edits.
3. Run agreed validation commands and acceptance checks.
4. Record failures, skipped checks, and residual risk honestly.
5. Produce release notes, handoff, or environment cleanup notes as requested.
6. Use `effective-interact` for material handoffs with changes, evidence, validation, cleanup, and next actions.

## Boundaries

- Do not start new feature work.
- Do not hide failed or skipped verification.
- Do not push, publish, merge, post, or mutate third-party resources unless the user explicitly asks.
- Use lock-backed ownership for Skill Hub managed cleanup.
- Follow `workflow-router/references/orchestration-policy.md` for any subagent verification or advisory hook checks; the main agent owns the final handoff.
