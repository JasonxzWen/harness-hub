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

## Validation commands

- Add commands that must run before handoff.

## Parallel writes

- Default: blocked for this task.
- Allowed only with independent worktrees or branches, non-overlapping paths, independent validation, and one integration review point.

## Handoff requirements

- Update `progress.md`.
- Update `session-handoff.md`.
- Run `node scripts/harness-validate.mjs`.
