always respond in Chinese unless the user explicitly asks for another language.

# Codex Harness

This repository is prepared for Codex-driven development. Treat tracked harness files as the stable rules, and use ignored local state under `.harness-hub/state/` for the active task, progress, decisions, and handoff.

## Initialization Gate

Do not start implementation until the harness is fully landed and the active task is goal-ready.

- Required files must exist: `AGENTS.md`, `feature_list.json`, `clean-state-checklist.md`, `definition-of-done.md`, `evaluator-rubric.md`, `quality-document.md`, `scripts/harness-validate.mjs`, and `.harness-hub/state/{current-task.md,decisions.md,progress.md,session-handoff.md}`.
- If any required file is missing, stop and run the approved harness init path before coding.
- Run `node scripts/harness-validate.mjs`; fix harness failures before changing product files.
- Fill `.harness-hub/state/current-task.md` with goal, assumptions, non-goals, allowed paths, forbidden paths, acceptance criteria, validation tiers, runtime signals, standard startup path, and checkpoint policy before editing.
- Review recent progress, decisions, handoff, feature state, quality snapshot, branch/worktree, and `git status --short`.

## Operating Rules

- Keep this file short. Move detailed or historical context to task files, docs, or archives.
- Use `feature_list.json` as the stable feature and parallel-write policy inventory.
- Use a separate git worktree or branch for each write task.
- Start from `.harness-hub/state/current-task.md` before changing files.
- Respect the task's allowed paths and forbidden paths.
- Do not run parallel writes against the same file, module, or feature state.
- Use read-only parallel work only for research, review, log analysis, or validation.
- Use P0/P1/P2 validation priorities for implementation tasks: P0 must pass before handoff, P1 is run or risk-assessed for affected boundaries, and P2 is hardening that may be deferred with a reason.
- For Web user-visible changes, record and run agent-run browser acceptance against the local app before handoff, including URL, scenario, viewport, console or network findings, and screenshot or trace evidence when useful.
- After creating or updating a PR, treat PR status as a delivery gate: check mergeability, CI/check-run status, conflicts, and branch-protection blockers before declaring done; resolve in-scope blockers, rerun validation, and push updates unless a user decision, credential, permission, reviewer action, protected-branch override, or external outage is required.
- Do not merge a PR unless the user explicitly asks for that remote mutation.
- Use verified checkpoint commits for completed atomic work units when the task permits commits. Do not commit failing, unrelated, or half-done work. Record each checkpoint commit hash, or the reason commits were skipped, in progress and handoff state.
- Promote repeated review feedback into a harness rule, validation command, or documented follow-up instead of relying on memory.
- Record progress in `.harness-hub/state/progress.md` and leave restart notes in `.harness-hub/state/session-handoff.md`.
- Record decision-level changes in `.harness-hub/state/decisions.md`.
- Run `node scripts/harness-validate.mjs` before handoff.

## Required Handoff

Before ending a session, update `.harness-hub/state/session-handoff.md` with the current status, changed files, validation evidence, PR status when a PR was created or updated, blockers, and the next concrete action. Update `.harness-hub/state/decisions.md` when assumptions, acceptance criteria, allowed paths, validation, user-visible behavior, or risk changed.
