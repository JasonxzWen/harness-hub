---
name: diagnosis-workflow
description: "Load when workflow-router selects a request that starts from failure evidence; this Workflow only orchestrates executable small loops."
---

# Diagnosis Workflow

Run, in order:

1. `requirements-loop`
2. `test-loop`
3. `implementation-review-loop`
4. `knowledge-maintain-loop` only when the fix changes durable project facts
5. `delivery-loop`
6. `retro-loop`
7. `report-loop`

The `test-loop` must reproduce or deterministically bound the symptom before accepting a fix. Pass only the immediately preceding compact handoff, stop on deterministic failure, take an explicit no-maintenance branch when facts did not change, and do not duplicate diagnosis, delivery, knowledge, or retry behavior in this Workflow.
