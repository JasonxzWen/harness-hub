always respond in Chinese unless the user explicitly asks for another language.

# Codex Harness

This repository is prepared for Codex-driven development. Treat the repository as the system of record: current work, validation commands, handoff notes, and completion evidence must be discoverable from tracked files.

## Operating Rules

- Keep this file short. Move detailed or historical context to task files, docs, or archives.
- Use a separate git worktree or branch for each write task.
- Start from `tasks/current-task.md` before changing files.
- Respect the task's allowed paths and forbidden paths.
- Do not run parallel writes against the same file, module, or feature state.
- Use read-only parallel work only for research, review, log analysis, or validation.
- Record progress in `progress.md` and leave restart notes in `session-handoff.md`.
- Run `node scripts/harness-validate.mjs` before handoff.

## Required Handoff

Before ending a session, update `session-handoff.md` with the current status, changed files, validation evidence, blockers, and the next concrete action.
