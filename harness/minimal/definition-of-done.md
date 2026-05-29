# Definition Of Done

A Codex task is done only when the worktree proves it.

- The goal and non-goals are stated in `.harness-hub/state/current-task.md`.
- Acceptance criteria are satisfied by direct evidence.
- Changed files stay within allowed paths and avoid forbidden paths.
- The dev server, smoke command, build, test, or equivalent validation path has been run when relevant.
- `.harness-hub/state/session-handoff.md` records the outcome, validation, residual risk, and next action.
- OpenSpec is used only when the task affects public contracts, cross-module architecture, publishing side effects, irreversible decisions, or long-lived specs.
