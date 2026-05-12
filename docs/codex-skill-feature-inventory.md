# Codex Skill Feature Inventory

Date: 2026-05-11

This document summarizes the functional surface worth adapting from famous Claude Code skill ecosystems into Codex-friendly skills.

## P0: Engineering Workflow Core

| Capability | Codex version should provide |
|---|---|
| Skill dispatch | Check applicable skills before major work while respecting user instructions. |
| Skill quality governance | Keep descriptions routing-oriented, require eval evidence for trigger changes, and move heavy conditional content into progressive spokes. |
| Brainstorming | Explore intent, constraints, alternatives, and non-goals before implementation. |
| Spec creation | Capture accepted requirements in a concise design/spec artifact. |
| Planning | Break work into small, verifiable tasks with target files, commands, risks, and checkpoints. |
| Plan pressure testing | Ask one high-leverage question at a time, with recommended answers, until the important decision branches are resolved. |
| Throwaway prototyping | Build disposable logic or UI prototypes that answer one design question, then delete or absorb the result. |
| TDD | Enforce RED-GREEN-REFACTOR: failing test first, minimal implementation, refactor after green. |
| Debugging | Use reproducible symptoms, hypotheses, root-cause tracing, fix verification, and regression tests. |
| Code review | Review for behavior regressions, security risks, maintainability, and missing tests. `compound-code-review` provides the dedicated structured lane adapted from Compound Engineering `ce-code-review`. |
| Completion verification | Run relevant tests/checks before declaring work done. |
| HTML work reports | Produce self-contained HTML reports, plans, reviews, research explainers, status dashboards, and lightweight editors when Markdown is too flat. |
| Feynman learning coach | Scope a learning target, teach from first principles, ask progressive diagnostic questions, require teach-back, and log learning events for future review. |
| Capability lifecycle CLI | Analyze target repos, recommend missing capabilities, install managed assets, report drift, and safely remove only Skill Hub-owned files. |

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
| Matt Pocock adapted skills | 3 | `.agents/skills/` |
| Compound Engineering adapted skills | 1 | `.agents/skills/` |
| Local learning skills | 1 | `.agents/skills/` |
| Local governance/reporting skills | 2 | `.agents/skills/` |
| Adapted Anthropic/Claude built-ins | 20 | `.codex/skills/` |
| Codex role configs | 3 | `.codex/agents/` |
| Codex reference supplement | 1 | `.codex/AGENTS.md` |
| Project Codex config | 1 | `.codex/config.toml` |
| Capability graph | 1 | `capabilities/index.json` |
| Node CLI | 1 | `bin/skill-hub.mjs` |
| CLI lifecycle design | 1 | `docs/cli-lifecycle-design.md` |

## Minimal Import Profile

The first usable Codex profile should include:

1. Skill dispatch and Codex tool mapping.
2. Brainstorming, plan pressure testing, throwaway prototyping, planning, TDD, debugging, review, and completion verification.
3. Git branch/worktree finishing guidance.
4. Ralph-style repeated execution for PRD stories, when the user explicitly wants autonomous iteration.
5. A small set of reviewer prompts: planner, code reviewer, security reviewer, build resolver.
6. A source/license note for every adapted skill.
7. Routing eval examples for high-overlap/default skills before broader description refactors.
8. A capability graph that marks overlap, routing, source, and install profiles before copying skills into target repos.
9. A released CLI lifecycle that can analyze, install, report status, and remove Skill Hub-managed files from other repositories.

## Evaluated Gap Candidates

| Candidate | Gap it could fill | Decision |
|---|---|---|
| Compound Engineering `ce-code-review` | Dedicated, structured code review with reviewer lenses, JSON findings, anchored confidence, safe-auto/gated/manual routing, report-only/autofix modes, artifact handoff, and stable finding numbers. | Adapted and installed as `compound-code-review`; the rest of the CE plugin remains uninstalled. |
| Compound Engineering `ce-doc-review` | Persona-based review for requirements and plan artifacts before implementation. | Medium-priority adaptation candidate after this hub defines its durable plan-review artifact conventions. |
| Compound Engineering `ce-compound` and `ce-sessions` | Institutional learning capture and session-history research. | Explicit-only reference until this hub decides whether `docs/solutions/`, Codex memory, or another store owns durable learnings. |
| Compound Engineering `ce-optimize` | Metric-driven parallel experiment loop with durable logs and judge-budget controls. | Library candidate for a future optimization/eval profile, not default engineering workflow. |
| Compound Engineering `coding-tutor` plugin | Personalized learning path, tutorials from real code, and spaced-repetition quizzes. | Separate learning profile candidate, not part of the default engineering execution surface. |
| Learn FASTER learning lifecycle | Scoped learning modes, topic state, teach-back, progress logs, quizzes, and spaced repetition. | Adapted as `feynman-learning-coach` with a lighter Codex-native Feynman loop and local logging script; not part of the default minimal profile. |
