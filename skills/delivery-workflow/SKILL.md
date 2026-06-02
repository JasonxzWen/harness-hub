---
name: delivery-workflow
description: Load when workflow-router selects the delivery state for accepted validation closeout, cleanup, handoff, release notes, environment reset, or reporting; do not start new scope.
---

# Delivery Workflow

Use this owner after work has been accepted or implemented and needs closure.

## Workflow

1. Confirm the accepted scope and delivery target.
2. Clean only approved or owned local artifacts; preserve unrelated user edits.
3. Run agreed validation commands and acceptance checks.
4. Record failures, skipped checks, and residual risk honestly.
5. Produce release notes, handoff, or environment cleanup notes as requested.
6. When a pull request has been opened or updated, report the PR URL or number, branch, target base, commit, validation status, skipped checks, residual risk, and next action.
7. Use `effective-interact` for material handoffs with changes, evidence, validation, cleanup, and next actions.

## Helper Atoms

- Use `internal-comms` for accepted internal announcements, status updates, incident follow-ups, or FAQs.
- Use `doc-coauthoring` for final PRDs, decision records, or handoff docs that need reader testing.
- Use `theme-factory` only when a delivered artifact needs a final visual theme pass.

## Boundaries

- Do not start new feature work.
- Do not hide failed or skipped verification.
- Do not push, publish, merge, post, or mutate third-party resources unless the user explicitly asks.
- Do not mark a PR ready, merge it, resolve review threads, or reply on the remote unless the user explicitly asks.
- Use lock-backed ownership for Harness Hub managed cleanup.
- Follow `workflow-router/references/orchestration-policy.md` for any subagent verification or advisory hook checks; the main agent owns the final handoff.
