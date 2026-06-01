always respond in Chinese unless the user explicitly asks for another language.

# Codex Harness

This repository is prepared for Codex-driven development. Treat tracked harness files as the stable rules, and use ignored local state under `.harness-hub/state/` for the active task, progress, decisions, and handoff.

## Operating Rules

- Keep this file short. Move detailed or historical context to task files, docs, or archives.
- Use `feature_list.json` as the stable feature and parallel-write policy inventory.
- Use a separate git worktree or branch for each write task.
- Start from `.harness-hub/state/current-task.md` before changing files.
- Respect the task's allowed paths and forbidden paths.
- Do not run parallel writes against the same file, module, or feature state.
- Use read-only parallel work only for research, review, log analysis, or validation.
- Record progress in `.harness-hub/state/progress.md` and leave restart notes in `.harness-hub/state/session-handoff.md`.
- Record decision-level changes in `.harness-hub/state/decisions.md`.
- Run `node scripts/harness-validate.mjs` before handoff.

## Required Handoff

Before ending a session, update `.harness-hub/state/session-handoff.md` with the current status, changed files, validation evidence, blockers, and the next concrete action. Update `.harness-hub/state/decisions.md` when assumptions, acceptance criteria, allowed paths, validation, user-visible behavior, or risk changed.
