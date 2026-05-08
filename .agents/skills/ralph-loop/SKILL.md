---
name: ralph-loop
description: "Prepare and run the Ralph autonomous agent loop with Codex. Use when converting a PRD into scripts/ralph/prd.json, checking Ralph story sizing, setting up progress.txt, or running repeated Codex iterations until all Ralph user stories pass."
license: MIT
metadata:
  source: snarktank/ralph skills/ralph and ralph.sh
---

# Ralph Loop For Codex

Ralph is an autonomous iteration loop. It repeatedly runs a fresh coding agent against the highest-priority unfinished story in `scripts/ralph/prd.json`.

This Codex adaptation uses `scripts/ralph/ralph.ps1` and `scripts/ralph/CODEX.md`.

## Convert PRD To Ralph JSON

When converting a Markdown PRD, write `scripts/ralph/prd.json`:

```json
{
  "project": "ProjectName",
  "branchName": "ralph/feature-name",
  "description": "Short feature description",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "As a user, I want ... so that ...",
      "acceptanceCriteria": [
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

## Conversion Rules

1. Each PRD user story becomes one JSON entry.
2. IDs are sequential: `US-001`, `US-002`, and so on.
3. Priority follows dependency order first, document order second.
4. Every story starts with `passes: false`.
5. `branchName` is kebab-case and prefixed with `ralph/`.
6. Every story includes `Typecheck passes`.
7. UI stories include `Verify in browser using Codex browser or Playwright workflow`.

## Story Sizing

Each story must fit one autonomous Codex execution.

Good:

- Add one schema field and migration
- Implement one route handler
- Add one UI control to an existing view
- Add tests for one behavior

Too large:

- Build an entire dashboard
- Add authentication end to end
- Refactor an API surface

Split oversized stories before running the loop.

## Running

From the project root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ralph\ralph.ps1 -MaxIterations 10
```

The script defaults to:

```text
codex exec -C <repo> --sandbox workspace-write --ask-for-approval never -
```

Use a controlled external sandbox before choosing `-Sandbox danger-full-access`.

## Completion Signal

When every story has `passes: true`, the Codex run must output:

```xml
<promise>COMPLETE</promise>
```

The loop exits successfully when it sees that signal.
