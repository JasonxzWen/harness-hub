---
type: workflow
title: Workflow and Loop ownership
---
# Workflow and Loop ownership

The Router selects exactly one owner workflow. A workflow consumes that decision and sequences small loops. Producer, Verifier, optional Arbiter, deterministic validation, iteration, pause/resume, and compact handoff remain inside the executable Loop runtime.

## Sources

- [Workflow Router skill](../skills/workflow-router/SKILL.md)
- [Skill routing policy](../docs/skill-routing.md)
