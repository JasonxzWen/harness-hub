---
type: architecture
title: Execution architecture
---
# Execution architecture

Harness Hub uses one execution hierarchy: skills are optional atomic capabilities, executable small loops own role execution and iteration, and workflows only orchestrate loops and branches. The source repository reuses one run-state, lease, audit, and integration model.

## Sources

- [Executable Loop runtime](../skills/workflow-router/scripts/loop-runtime.mjs)
- [Agentic Loop catalog](../docs/agentic-loop-catalog.md)
