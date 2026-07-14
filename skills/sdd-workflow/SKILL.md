---
name: sdd-workflow
description: "Load when workflow-router selects a feature, fix, refactor, policy, documentation, or test change; this Workflow only orchestrates executable small loops."
---

# SDD Workflow

Run, in order:

1. `requirements-loop`
2. `spec-loop`
3. `test-loop`
4. `implementation-review-loop`
5. `knowledge-maintain-loop` only when durable project facts changed
6. `delivery-loop`
7. `retro-loop`
8. `report-loop`

Pass only the immediately preceding Loop's compact handoff into the next. Stop on failure. If `requirements-loop` pauses for a real user decision, return its questions and resume the same run after answers arrive. Skip knowledge maintenance explicitly when no durable fact changed; migration never owns that branch. Do not reproduce brainstorming, specification, TDD, review, delivery, retry, knowledge, or reporting logic in this Workflow.
