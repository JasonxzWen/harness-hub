# Codex Skill Feature Inventory

Date: 2026-05-08

This document summarizes the functional surface worth adapting from famous Claude Code skill ecosystems into Codex-friendly skills.

## P0: Engineering Workflow Core

| Capability | Codex version should provide |
|---|---|
| Skill dispatch | Check applicable skills before major work while respecting user instructions. |
| Brainstorming | Explore intent, constraints, alternatives, and non-goals before implementation. |
| Spec creation | Capture accepted requirements in a concise design/spec artifact. |
| Planning | Break work into small, verifiable tasks with target files, commands, risks, and checkpoints. |
| TDD | Enforce RED-GREEN-REFACTOR: failing test first, minimal implementation, refactor after green. |
| Code review | Review for behavior regressions, security risks, maintainability, and missing tests. |
| Debugging | Use reproducible symptoms, hypotheses, root-cause tracing, fix verification, and regression tests. |
| Completion verification | Run relevant tests/checks before declaring work done. |

## P0: Codex Adaptation Layer

| Claude Code assumption | Codex adaptation |
|---|---|
| `Task` tool | Use Codex multi-agent tools such as `spawn_agent`, `wait_agent`, and `close_agent` when available. |
| Named agents | Represent as Codex worker/explorer prompts until native named-agent registries exist. |
| `TodoWrite` | Use `update_plan` or local checklist artifacts. |
| Claude file tools | Use Codex native file read/edit tools and `apply_patch` for manual edits. |
| Claude shell tool | Use Codex shell execution with sandbox and escalation rules. |
| Claude slash commands | Prefer model-invoked skills; keep command shims only when they add real compatibility. |

## ECC Codex Surface Installed Here

| Surface | Count | Local path |
|---|---:|---|
| Codex-ready ECC skills | 32 | `.agents/skills/` |
| Vercel skills | 5 | `.agents/skills/` |
| Ralph loop skills | 2 | `.agents/skills/` |
| Adapted Anthropic/Claude built-ins | 20 | `.codex/skills/` |
| Codex role configs | 3 | `.codex/agents/` |
| Codex reference supplement | 1 | `.codex/AGENTS.md` |
| Project Codex config | 1 | `.codex/config.toml` |

## Minimal Import Profile

The first usable Codex profile should include:

1. Skill dispatch and Codex tool mapping.
2. Brainstorming, planning, TDD, debugging, review, and completion verification.
3. Git branch/worktree finishing guidance.
4. Ralph-style repeated execution for PRD stories, when the user explicitly wants autonomous iteration.
5. A small set of reviewer prompts: planner, code reviewer, security reviewer, build resolver.
6. A source/license note for every adapted skill.
