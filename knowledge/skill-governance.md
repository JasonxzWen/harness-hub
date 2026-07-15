---
type: governance
title: Skill governance
---
# Skill governance

Canonical skills remain under `skills/<skill-name>/`. Imported bodies retain upstream style by default; local routing, safety, source, and distribution policy stay in Harness Hub-owned overlays and capability metadata.

Development atoms use direct names that describe their bounded capability: `tdd`, `verification`, `code-review`, and `codebase-design`. `to-tickets` emits tracer-bullet scope and blocking edges under the target project's existing task convention instead of creating a Harness-owned task registry.

Prompt-level feedback loops may live inside a Skill when they have an independent trigger and checkable stopping condition. The native main Agent selects them under the project contract; they do not create a Router, workflow owner, Runtime, Hook, retry state, or dispatcher.

## Sources

- [Skill quality guide](../docs/skill-quality-guide.md)
- [Capability index](../capabilities/index.json)
- [Skill routing](../docs/skill-routing.md)
- [Source project records](../docs/source-projects.md)
