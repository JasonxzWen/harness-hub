# Ralph Loop Codex Setup

Date: 2026-05-08

Ralph is an autonomous agent loop from `snarktank/ralph`. Upstream supports Amp and Claude Code. This repository installs a Codex-specific adaptation instead of copying the upstream Bash loop directly.

## Source

| Source | Local use | License/status |
|---|---|---|
| `snarktank/ralph` | Ralph loop pattern, PRD skill, PRD-to-JSON skill, sample schema | MIT, vendored source ignored |

Downloaded source is kept at `vendor/snarktank-ralph/` for local reference and is excluded from Git.

## Installed Files

| Path | Purpose |
|---|---|
| `.agents/skills/ralph-prd/` | Codex skill for writing Ralph-ready PRDs. |
| `.agents/skills/ralph-loop/` | Codex skill for converting PRDs and running the loop. |
| `scripts/ralph/ralph.ps1` | Windows/Codex-native loop runner. |
| `scripts/ralph/CODEX.md` | Prompt used for each fresh Codex iteration. |
| `scripts/ralph/prd.json.example` | Example Ralph story file. |

Runtime state is ignored:

- `scripts/ralph/prd.json`
- `scripts/ralph/progress.txt`
- `scripts/ralph/.last-branch`
- `scripts/ralph/archive/`

## Usage

1. Create a PRD with the `ralph-prd` skill.
2. Convert it with the `ralph-loop` skill into `scripts/ralph/prd.json`.
3. Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\ralph\ralph.ps1 -MaxIterations 10
```

The runner defaults to:

```text
codex exec -C <repo> --sandbox workspace-write --ask-for-approval never -
```

This is intentionally safer than the upstream Claude example that bypasses permissions. Use `-Sandbox danger-full-access` only inside an external sandbox.
