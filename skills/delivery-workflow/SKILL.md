---
name: delivery-workflow
description: Load when workflow-router selects the delivery state for accepted validation closeout, PR status triage, cleanup, handoff, release notes, environment reset, or reporting; do not start new scope.
---

# Delivery Workflow

Use this owner after work has been accepted or implemented and needs closure.

## Workflow

1. Confirm the accepted scope and delivery target.
2. Clean only approved or owned local artifacts; preserve unrelated user edits.
3. Run agreed validation commands and acceptance checks.
4. Record failures, skipped checks, and residual risk honestly.
5. Run finish closeout for every mutation: derive the required closeout loop, use subagent or independent review evidence when the level calls for isolation, or record a fallback reason plus deterministic substitute. Inspect technical debt, architecture drift, deep-module fit, project-rule drift, and refactor or warning recommendations.
6. Run a stale-read gate before final handoff: recheck status, inspect changed paths, reread or diff task-critical files consulted earlier when they may have changed, and record the result or why stale reads cannot affect delivery.
7. If a PR was created or updated, check remote PR state after push: mergeability, CI/check runs, conflicts, and branch protection blockers.
8. Resolve actionable PR blockers in scope, rerun relevant validation, and push updates; expose conflict decisions and risk to the user instead of handling them silently. Stop only for user decisions, credentials, permissions, reviewer action, protected-branch overrides, or external outages.
9. Run or explicitly skip `agent-interaction-audit` when the session has meaningful workflow, tool-calling, or repo-rule lessons. Use it to audit tool-calling quality, repeated low-value lookup loops, misleading evidence, code/docs conflicts, AI infrastructure improvements, and whether the workflow should become a skill, source record, eval case, or existing workflow change.
10. Report the PR URL or number, branch, target base, commit, validation status, skipped checks, stale-read gate result, final review outcome, agent interaction audit recommendations, PR blockers, fixes pushed, residual risk, and next action.
11. Produce release notes, handoff, or environment cleanup notes as requested.
12. Use `effective-interact` for material handoffs with changes, evidence, validation, cleanup, PR status, stale-read result, final review, agent interaction audit recommendations, and next actions.

## Agentic Loops

Use agentic loops from `workflow-router/references/agentic-loops.md` during delivery. For every mutation, derive the required loop from dirty paths or a base/head diff when available; small changes can use lower evidence but do not skip review:

- `frontend-acceptance`: a fresh-context verifier gathers browser/user-flow evidence, then a read-only arbiter judges the original task, acceptance criteria, current evidence, and residual risk.
- `implementation-review`: parallel read-only review lenses inspect correctness, maintainability, tests, security, performance, and harness compliance when relevant.
- `test-review`: a read-only verifier checks that new or changed tests cover the risk boundary, fail for the intended regression, and avoid brittle fixture-only confidence.
- `workflow-review`: a read-only verifier checks owner workflow fit, required loop integration, routing drift, and project-rule alignment.
- `security-review`: a focused read-only verifier checks security-sensitive paths such as auth, credentials, unsafe IO, injection, remote mutation, publishing, or destructive behavior.
- `docs-consistency`: a documentation/code verifier compares changed docs, installable templates, tests, and implementation; a read-only arbiter reports drift, accepted exceptions, or required fixes.
- `pr-closeout`: a PR status verifier gathers mergeability, CI/check-run, conflict, and branch-protection evidence; a release-risk arbiter decides which blockers are in-scope and which require user interrupt.
- `agent-interaction-retro`: `agent-interaction-audit` produces trace evidence; a workflow-learning arbiter recommends rule, eval, source-record, skill, or no-op outcomes.

Record loop evidence in progress and handoff state. Verifiers may be `delegated-agent` passes or deterministic checks. Record iteration controls only when a loop may repeat. Arbiters remain read-only; the main agent owns synthesis, fixes, and final user-facing decisions.

## Helper Atoms

- Use `internal-comms` for accepted announcements or status updates.
- Use `doc-coauthoring` for final PRDs, decision records, or handoff docs that need reader testing.
- Use `theme-factory` only when a delivered artifact needs a final visual theme pass.
- Use `agent-interaction-audit` for private closeout audits of traces and tool-call decisions.

## Boundaries

- Do not start new feature work.
- Do not hide failed or skipped verification.
- Do not push, publish, merge, post, or mutate third-party resources unless the user explicitly asks; PR status checks are read-only, while PR updates require the user's requested delivery scope.
- Do not merge a pull request unless the user explicitly asks for that remote mutation.
- Do not mark a PR ready, resolve review threads, or reply on the remote unless the user explicitly asks.
- Do not silently resolve conflicts that change behavior, ownership, compatibility, release risk, or user-visible semantics; surface the decision and recommendation first.
- Use lock-backed ownership for Harness Hub managed cleanup.
- Follow `workflow-router/references/orchestration-policy.md` for any subagent verification or advisory hook checks; the main agent owns the final handoff.
