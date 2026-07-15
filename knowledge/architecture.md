---
type: architecture
title: Execution architecture
---
# Execution architecture

Claude Code and Codex are the only main-Agent runtimes. Harness Hub owns deterministic migration, project contracts, Host resources, atomic Skills, source records, validators, and a source-only OKF wiki. It does not implement a generic Agent Runtime or duplicate native orchestration.

The native Host main Agent owns requirements alignment, planning, Subagent delegation, parallel execution, conflict resolution, integration, validation, and user reporting. Harness Hub contributes atomic Skills and deterministic validators without a Router, fixed lifecycle, scheduler, or internal run state.

## Sources

- [Repository migration](../scripts/migrate.mjs)
- [Repository agent contract](../AGENTS.md)
- [Atomic Skill routing](../docs/skill-routing.md)
