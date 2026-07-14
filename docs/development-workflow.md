---
type: workflow
title: Development workflow
---
# Development workflow

The execution hierarchy is `skill -> small loop -> workflow`. Router classification is consumed by the executable runtime. Workflows pass compact handoffs and never duplicate a Loop's implementation.

SDD change sequence:

```text
requirements -> spec -> test -> implementation-review
  -> knowledge-maintain (only when runtime-captured product changes create durable facts)
  -> delivery -> retro -> report
```

Diagnosis omits `spec-loop` but retains the same conditional knowledge, delivery, retro, and report closeout. Review remains read-only and cannot trigger knowledge maintenance without a preceding runtime-captured write set.

Deterministic failures outrank Agent verdicts. User questions pause and resume the same run. Remote writes need explicit authorization; merge always needs explicit authorization.

## Sources

- [Target contract](../harness/target/AGENTS.md)
- [Workflow orchestration](../skills/workflow-router/references/orchestration-policy.md)
