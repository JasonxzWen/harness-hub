# Source Projects And Candidates

Date: 2026-05-08

This file tracks source projects that are worth studying or adapting for Codex.

## Primary Sources

| Project | Why it matters | Codex adaptation notes |
|---|---|---|
| [Superpowers](https://github.com/obra/superpowers) | High-signal disciplined engineering workflow: brainstorming, planning, TDD, debugging, review, worktrees, and completion verification. | Optional source only for now. Not installed because ECC plus adapted built-ins already cover most workflow behavior, and installing the full pack would add trigger noise. |
| [Superpowers Codex tool mapping](https://github.com/obra/superpowers/blob/main/skills/using-superpowers/references/codex-tools.md) | Explicit mapping from Claude Code tools to Codex equivalents. | Treat as the first compatibility checklist for any ported skill. |
| [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) | Broad agent harness performance system with agents, skills, rules, hooks, MCP configs, and command shims. | Imported selectively for Codex: `.agents/skills`, `.codex/AGENTS.md`, `.codex/agents`, and adapted `.codex/config.toml`. |
| [Vercel Labs Skills](https://github.com/vercel-labs/skills) | CLI/package manager for the open agent skills ecosystem, with Codex listed as a supported agent. | Installed the bundled `find-skills` skill into `.agents/skills/find-skills` and kept the source checkout under `vendor/` for reference. |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | Vercel-maintained Web, React, Next.js, View Transition, deployment, and React Native skills. | Installed only the low-risk Web/React subset; deployment, token, and React Native skills remain explicit-only candidates. |
| [Ralph](https://github.com/snarktank/ralph) | Autonomous PRD story loop that repeatedly launches a fresh coding agent until every story passes. | Installed as a Codex-specific PowerShell runner plus two focused skills. The upstream Bash runner remains reference-only because it targets Amp and Claude Code. |
| [OpenAI Codex plugins and skills](https://openai.com/academy/codex-plugins-and-skills/) | Official explanation of Codex plugins and skills. | Use for terminology and product-aligned guidance. |

## Imported Sources

| Source | Local path | Version |
|---|---|---|
| `affaan-m/everything-claude-code` | `vendor/everything-claude-code/` (ignored) | `2.0.0-rc.1` at `841beea45cb25ba51f29fa45b7e272938d19b80a` |
| `vercel-labs/skills` | `vendor/vercel-labs-skills/` (ignored) | package `1.5.5` at `eec87fd44fca572d5275a472ea13c31aaceb65d0` |
| `vercel-labs/agent-skills` | `vendor/vercel-labs-agent-skills/` (ignored) | at `b9c8ee0643d87d3c5a953d1e22382ff2ead39229` |
| `snarktank/ralph` | `vendor/snarktank-ralph/` (ignored) | at `6c53cb0b831ebe8739c6a003e22af14902d8b0b5` |
| ECC Codex skill surface | `.agents/skills/` | Copied from upstream `.agents/skills/` |
| ECC Codex config supplement | `.codex/AGENTS.md`, `.codex/agents/` | Copied from upstream `.codex/` |
| Vercel `find-skills` skill | `.agents/skills/find-skills/` | Copied from upstream `skills/find-skills/` |
| Vercel Web/React skills | `.agents/skills/vercel-react-best-practices/`, `.agents/skills/web-design-guidelines/`, `.agents/skills/vercel-composition-patterns/`, `.agents/skills/vercel-react-view-transitions/` | Copied from upstream `skills/` with Codex metadata added |
| Ralph Codex skills and runner | `.agents/skills/ralph-prd/`, `.agents/skills/ralph-loop/`, `scripts/ralph/` | Adapted from upstream PRD skills and loop prompt under MIT |

## Secondary Candidates

| Candidate | Target area |
|---|---|
| `fullstack-dev-skills` | Full-stack engineering skill pack across languages, backend, frontend, infra, security, and testing. |
| `dotnet/skills` | .NET, C#, ASP.NET, MAUI, Blazor, Aspire, EF Core, Native AOT. |
| `expo/skills` | Expo and EAS mobile app workflows. |
| `playwright-skill` and browser QA skills | Browser automation, UI validation, screenshots, critical flows. |
| `frontend-design` and design-system skills | Frontend quality, visual taste, accessibility, reusable design systems. |
| `agent-eval` and eval-harness skills | Repeatable evaluation of agent workflows and task outcomes. |
| `continuous-learning` skills | Extract reusable project patterns from sessions and convert them into skills or instincts. |

## Import Policy

- Do not copy large third-party skill bodies without checking license and attribution.
- Prefer adaptation notes and small original Codex-native skills over bulk prompt mirroring.
- Record source URL, license, upstream version/date, and local modifications for every imported skill.
- Keep optional high-context packs behind named install profiles.
- Run security review before enabling hooks, MCP servers, shell automation, or credential-handling workflows.
