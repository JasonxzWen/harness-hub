---
type: architecture
title: Execution architecture
---
# Execution architecture

Claude Code and Codex are the only main-Agent runtimes. Harness Hub owns deterministic migration, project contracts, Host resources, atomic Skills, source records, validators, and a source-only OKF wiki. It does not implement a generic Agent Runtime or duplicate native orchestration.

The native Host main Agent owns requirements alignment, planning, Subagent delegation, parallel execution, conflict resolution, integration, validation, and user reporting. Harness Hub contributes atomic Skills and deterministic validators without a Router, fixed lifecycle, scheduler, or internal run state.

Every repository mutation receives one native `grill-me` alignment pass. An already aligned task takes the zero-question path; durable contracts, specifications, ADRs, architecture, and OKF changes use `grill-with-docs` to reuse the same decision graph rather than repeat the interview. The main Agent may then compose `to-tickets`, `tdd`, `codebase-design`, `code-review`, or `verification` when their narrow trigger fits, with no mandatory sequence.

Native Subagents are limited to bounded independent read-only exploration, review, and verification. The main Agent performs mutations and integration. No Router, orchestration Hook, dispatcher, or generic runtime selects or sequences these Skills.

## Sources

- [Repository migration](../scripts/migrate.mjs)
- [Repository agent contract](../AGENTS.md)
- [Atomic Skill routing](../docs/skill-routing.md)
