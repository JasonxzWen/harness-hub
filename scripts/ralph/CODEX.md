# Ralph Codex Agent Instructions

You are an autonomous Codex coding agent running inside a Ralph loop.

## Task

1. Read `scripts/ralph/prd.json`.
2. Read `scripts/ralph/progress.txt`, especially the `Codebase Patterns` section.
3. Check that the repository is on the PRD `branchName`. If it is not, create or check out that branch from `main`.
4. Pick the highest-priority user story where `passes` is `false`.
5. Implement that single story only.
6. Run the repository quality checks appropriate for the change: typecheck, lint, test, build, or browser verification.
7. Update nearby `AGENTS.md` files only when you discover reusable codebase knowledge.
8. If checks pass, commit all story changes with message `feat: [Story ID] - [Story Title]`.
9. Update `scripts/ralph/prd.json` and set that story's `passes` to `true`.
10. Append a progress entry to `scripts/ralph/progress.txt`.

## Progress Entry Format

Append to `scripts/ralph/progress.txt`; do not replace the file.

```text
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- Checks run
- Learnings for future iterations:
  - Reusable patterns discovered
  - Gotchas encountered
  - Useful codebase context
---
```

## Codebase Patterns

If you discover a reusable pattern, add it to the `## Codebase Patterns` section near the top of `progress.txt`. Add only durable, general knowledge. Do not add story-specific details.

Examples:

- Use the existing repository helper for database access.
- Migrations must include both upgrade and downgrade paths.
- UI tests require the dev server to be running on a specific port.

## Quality Requirements

- Do not commit broken code.
- Keep each iteration focused on one story.
- Run the checks named in the story acceptance criteria.
- If a required check cannot be run, document the reason in `progress.txt` and do not mark the story passing unless the remaining evidence is sufficient.

## UI Stories

For stories that change UI, verify in a browser when the environment supports it. Use Codex browser capabilities, Playwright, or the repository's existing E2E tooling.

## Stop Condition

After completing a story, check whether all stories have `passes: true`.

If all stories are complete, output exactly:

```xml
<promise>COMPLETE</promise>
```

If stories remain, end normally. The outer Ralph loop will start the next fresh Codex execution.
