always respond in the user's language

# Repo Harness Instructions

Use this file as the target repository's always-loaded agent contract.

## Operating Rules

1. Inspect the current worktree before relying on assumptions.
2. Keep implementation scoped to the requested outcome.
3. Preserve unrelated user changes.
4. Prefer the repository's existing scripts, tests, and conventions.
5. Verify changes with the nearest deterministic command before handoff.

## Harness Files

- `feature_list.json`: current feature and acceptance inventory.
- `progress.md`: durable task progress and validation notes.
- `session-handoff.md`: restart notes for future agent sessions.
- `scripts/harness-validate.mjs`: local harness file presence check.
