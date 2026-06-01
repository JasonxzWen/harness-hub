# Definition Of Done

A Codex task is done only when the worktree proves it.

- The goal and non-goals are stated in `.harness-hub/state/current-task.md`.
- Acceptance criteria are satisfied by direct evidence.
- Changed files stay within allowed paths and avoid forbidden paths.
- P0 validation has passed before handoff; P1 checks are run or risk-assessed; P2 hardening is run or explicitly deferred.
- Static checks, runtime checks, and the relevant user-flow or end-to-end path have been run when relevant.
- Web user-visible changes include agent-run browser acceptance against the local app, with URL, scenario, viewport, console/network findings, and screenshot or trace evidence when useful.
- Standard startup path still works or has an explicit, recorded blocker.
- Validation evidence records each command's status, exit code, passed/failed counts when available, output summary or path, and related checkpoint commit.
- Runtime logs, health checks, or failure messages that informed the result are captured in progress or handoff state.
- If commits are permitted, completed atomic work is saved as verified checkpoint commits instead of one large end-of-task commit.
- Material implementation or review work has an evaluator rubric verdict and any quality snapshot updates.
- Decision-level changes are recorded in `.harness-hub/state/decisions.md`.
- `.harness-hub/state/session-handoff.md` records the outcome, validation, residual risk, and next action.
- OpenSpec is used only when the task affects public contracts, cross-module architecture, publishing side effects, irreversible decisions, or long-lived specs.
