# Everything Claude Code Local Setup

Date: 2026-05-06

This project has a local Everything Claude Code (ECC) setup for Codex.

## Source Snapshot

- Upstream: https://github.com/affaan-m/everything-claude-code
- Local checkout: `vendor/everything-claude-code/`
- Version: `2.0.0-rc.1`
- Commit: `841beea45cb25ba51f29fa45b7e272938d19b80a`
- License: MIT, see upstream `LICENSE`

The local checkout is ignored by Git so the repository does not accidentally vendor a full third-party repo. The imported Codex-facing skill surface is tracked separately under `.agents/skills/`.

## Installed Project Files

| Path | Purpose |
|---|---|
| `.agents/skills/` | ECC's 32 Codex-ready skills with `SKILL.md` and `agents/openai.yaml`. |
| `.codex/AGENTS.md` | Codex-specific ECC guidance. |
| `.codex/config.toml` | Project-local Codex config adapted from ECC's reference config. |
| `.codex/agents/` | ECC explorer, reviewer, and docs-researcher multi-agent role configs. |
| `AGENTS.md` | Project-level operating rules plus ECC integration note. |

## Adaptations

- Removed the upstream macOS `terminal-notifier` notify command from `.codex/config.toml` because this workspace is Windows-based.
- Kept `approval_policy = "on-request"` and `sandbox_mode = "workspace-write"`.
- Kept `features.multi_agent = true` as an older-CLI/ECC compatibility setting; current Codex releases enable subagent workflows by default.
- Kept ECC's baseline MCP server definitions: GitHub, Context7, Exa, Memory, Playwright, and Sequential Thinking.

## Usage Notes

- Restart Codex after adding or changing project-local skills.
- Use ECC skills only when their descriptions match the task.
- Treat networked MCP tools as read-only unless the user explicitly approves an external action.
- If MCP startup downloads packages through `npx`, Codex may ask for network approval in restricted environments.

## Refresh Procedure

```powershell
git -C vendor\everything-claude-code pull --ff-only
Copy-Item -Recurse -Force vendor\everything-claude-code\.agents\skills\* .agents\skills\
Copy-Item -Recurse -Force vendor\everything-claude-code\.codex\agents\* .codex\agents\
Copy-Item -Force vendor\everything-claude-code\.codex\AGENTS.md .codex\AGENTS.md
```

After refreshing, compare `.codex/config.toml` with the upstream reference before copying it directly, because this project keeps a Windows-safe local variant.
