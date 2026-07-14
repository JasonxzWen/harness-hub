---
name: workflow-router
description: "Load when handling any non-trivial request to select exactly one executable owner workflow and run its small-loop sequence; do not use it as an advisory-only classifier or duplicate Loop implementation inside a workflow."
argument-hint: "<request>"
user-invocable: true
---

# Workflow Router

Route a request into exactly one owner:

| State | Owner workflow |
| --- | --- |
| question | `answer-workflow` |
| change | `sdd-workflow` |
| diagnosis | `diagnosis-workflow` |
| review | `review-workflow` |
| delivery | `delivery-workflow` |

The Router is executable. Its classification must be consumed by `scripts/loop-runtime.mjs route`; returning an owner name without starting the workflow is incomplete.

## Execution model

```text
skill -> small loop -> workflow
```

- Skills are optional atomic capabilities.
- A small loop is independently executable and owns Producer, Verifier, optional Arbiter, deterministic gates, bounded iteration, pause/resume, authorization, and compact handoff.
- A workflow only sequences small loops and handles branches. It never copies a Loop's prompt, validation, or retry implementation.
- CLI/delegated Agents are executor modes. The main Agent retains final decisions and reporting.

Run `scripts/loop-runtime.mjs contracts --json` to inspect the canonical Loop contracts. Use `run`, `workflow`, or `route` for direct Loop execution, explicit Workflow execution, or Router-to-Workflow execution.

Read:

- `references/intent-taxonomy.md` for owner boundaries;
- `references/agentic-loops.md` for the executable contract and evidence model;
- `references/orchestration-policy.md` for Workflow composition;
- `references/state-handoff.md` for compact handoff rules.

`effective-interact` remains an atomic presentation skill. `report-loop` invokes it from lifecycle context for complex decisions and handoffs even when the user's prompt contains no visualization keyword.
