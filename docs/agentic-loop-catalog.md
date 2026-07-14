---
type: architecture
title: Executable Loop catalog
---
# Executable Loop catalog

The canonical runtime is [`loop-runtime.mjs`](../skills/workflow-router/scripts/loop-runtime.mjs). A Router result, prompt, checklist, or audit record is not execution.

| Loop | Goal |
| --- | --- |
| requirements | Brainstorm from facts, extract constraints, grill assumptions, pause/resume real user questions. |
| spec | Draft a minimal executable spec and independently review it. |
| test | Design boundaries, prove causal RED, prove GREEN, review test value. |
| implementation-review | Run one independent review of the current implementation; rejection returns to the main Agent for a real change before another review. |
| delivery | In one pass, use a read-only delegated review, then runtime-owned cleanup → validation → optional commit of reviewed bytes; expose completed actions on failure and return rejection to the main Agent. |
| report | Produce plain text or deterministically invoke/validate effective-interact for complex handoff. |
| retro | Audit run history and improve existing entities only when evidence warrants it. |
| knowledge-init | Generate the smallest source-traceable target OKF wiki. |
| knowledge-maintain | Maintain project knowledge from real changes outside distribution migration. |

Each contract owns Producer, Verifier, optional read-only Arbiter, deterministic gates, bounded iteration, stop conditions, pause/resume, path/authorization boundaries, and compact handoff. Workflows only order these Loops.

## Sources

- [Workflow Router](../skills/workflow-router/SKILL.md)
- [Loop contracts](../skills/workflow-router/scripts/loop-runtime.mjs)
