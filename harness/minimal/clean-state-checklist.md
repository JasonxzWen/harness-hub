# Clean State Checklist

Use this checklist before handoff.

- `git status --short` has been reviewed.
- Changed files match the current task's allowed paths.
- Forbidden paths were not modified.
- Temporary logs or generated artifacts are in ignored locations.
- Validation commands from `.harness-hub/state/current-task.md` have been run or explicitly skipped with a reason.
- `.harness-hub/state/progress.md` and `.harness-hub/state/session-handoff.md` reflect the current state.
- `node scripts/harness-validate.mjs` passes.
