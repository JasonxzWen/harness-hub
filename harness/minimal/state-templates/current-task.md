# Current Task

## Goal

State the concrete outcome for the active Codex goal.

## Assumptions

- Add assumptions before implementation starts.

## Non-goals

- List what this task must not change.

## Worktree / Branch

- Record the worktree or branch used for this write task.

## Allowed paths

- Add exact files or directories the task may modify.

## Forbidden paths

- Add files or directories the task must not modify.

## Acceptance criteria

- Add observable checks that prove the task is done.

## Standard startup path

- Add the command or steps that prove the project can restart from a clean checkout.

## Validation commands

- Add commands that must run before handoff.

## Validation tiers

- P0: Must pass before handoff. Include the new or changed behavior test, nearest relevant suite, required static/runtime gates, and Web browser acceptance when this task changes Web user-visible behavior.
- P1: Run or risk-assess affected module, integration, system, API, data-flow, or cross-boundary checks.
- P2: Hardening checks such as broader regression, repeated runs, cross-browser/mobile viewport, accessibility, or performance. Defer only with a recorded reason.
- Static: lint, typecheck, format, or structural checks.
- Runtime: tests, build, startup, smoke, or health checks.
- User flow: end-to-end, integration, browser, CLI, or scenario checks.

## Web browser acceptance

- Required: yes/no.
- Dev server command:
- Local URL:
- agent-run browser path: `webapp-testing` for one-off local acceptance; `e2e-testing` only for durable Playwright suites.
- Scenario:
- Viewports:
- Console/network checks:
- Evidence: screenshot, trace, video, log, or explicit skip reason.
- Production/credential boundary: do not use production accounts, real payments, or external writes unless explicitly approved.

## Runtime signals

- Logs:
- Traces:
- Health checks:
- Failure messages to preserve:

## PR closeout

- PR expected: yes/no.
- PR URL:
- Remote status command:
- Mergeability:
- CI/check-run status:
- Conflict status:
- Branch-protection blockers:
- In-scope fix policy: resolve conflicts, failing checks, or other actionable blockers; rerun relevant validation and push updates.
- Stop policy: ask the user only for decisions, credentials, permissions, reviewer action, protected-branch overrides, or external outages.
- Merge policy: do not merge unless explicitly requested.

## Checkpoint policy

- Commits permitted: yes/no.
- Checkpoint rule: after each validated atomic work unit, create a small commit or record why committing is skipped.
- Last safe checkpoint: commit hash or `none yet`.

## Spec updates

- Add only decision-level changes that alter assumptions, acceptance, allowed paths, validation, user-visible behavior, or risk.

## Decision log

- Update `.harness-hub/state/decisions.md` for durable decisions that should survive a session restart.

## Parallel writes

- Default: blocked for this task.
- Allowed only with independent worktrees or branches, non-overlapping paths, independent validation, and one integration review point.

## Handoff requirements

- Update `.harness-hub/state/progress.md`.
- Update `.harness-hub/state/decisions.md` when decision-level changes occurred.
- Update `.harness-hub/state/session-handoff.md`.
- Update `quality-document.md` when validation evidence changes the quality snapshot.
- Fill `evaluator-rubric.md` for material implementation or review work.
- Record validation command status, passed/failed counts when available, output location or summary, and checkpoint commit state.
- Record standard startup status, runtime signals, PR status when a PR was created or updated, and review feedback that should become a rule or follow-up.
- Run `node scripts/harness-validate.mjs`.
