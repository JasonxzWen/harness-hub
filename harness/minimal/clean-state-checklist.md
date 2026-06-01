# Clean State Checklist

Use this checklist before handoff.

- `git status --short` has been reviewed.
- Standard startup path has been run or explicitly skipped with a reason.
- Changed files match the current task's allowed paths.
- Forbidden paths were not modified.
- Temporary logs or generated artifacts are in ignored locations.
- Validation commands from `.harness-hub/state/current-task.md` have been run or explicitly skipped with a reason.
- `.harness-hub/state/progress.md` and `.harness-hub/state/session-handoff.md` record each validation command's status, exit code, passed/failed counts when available, evidence, and checkpoint commit state.
- Runtime signals, health checks, or failure messages that affected the work are recorded.
- P0 validation passed before handoff, including behavior tests, nearest suite, static/runtime gates, and Web browser acceptance when required.
- P1 checks are run or risk-assessed for affected module, integration, system, API, data-flow, or cross-boundary behavior.
- P2 hardening checks are run or explicitly deferred with a reason.
- Web browser acceptance records local URL, scenario, viewport, console/network findings, and screenshot or trace evidence when the task touches Web user-visible behavior.
- Review Feedback To Rules entries are updated when a repeated comment should become a durable harness rule.
- Repeated review feedback has been promoted to a rule, validation command, or explicit follow-up.
- Each completed atomic work unit has a verified checkpoint commit when commits are permitted, or the skip reason is recorded.
- `evaluator-rubric.md` and `quality-document.md` were updated when material validation or quality evidence changed.
- `.harness-hub/state/decisions.md` records decision-level changes or explicitly remains unchanged.
- `.harness-hub/state/progress.md` and `.harness-hub/state/session-handoff.md` reflect the current state.
- `node scripts/harness-validate.mjs` passes.
