# Workflow orchestration policy

A Workflow may only:

1. choose and order small loops;
2. pass the previous Loop's compact handoff into the next Loop;
3. branch on `completed`, `paused`, or `failed` status;
4. return the final compact handoff to the main Agent.

It must not duplicate Producer prompts, Verifier criteria, retry logic, deterministic checks, path boundaries, or state persistence.

Canonical sequences:

| Workflow | Small loops |
| --- | --- |
| `answer-workflow` | `report-loop` |
| `sdd-workflow` | `requirements-loop` -> `spec-loop` -> `test-loop` -> `implementation-review-loop` -> conditional `knowledge-maintain-loop` -> `delivery-loop` -> `retro-loop` -> `report-loop` |
| `diagnosis-workflow` | `requirements-loop` -> `test-loop` -> `implementation-review-loop` -> conditional `knowledge-maintain-loop` -> `delivery-loop` -> `retro-loop` -> `report-loop` |
| `review-workflow` | `implementation-review-loop` -> `report-loop` |
| `delivery-workflow` | `implementation-review-loop` -> `delivery-loop` -> `retro-loop` -> `report-loop` |

Stop immediately on deterministic failure. Preserve a paused Loop's run id and return its real open questions. Never fabricate user acceptance. Delegated CLI Agents never perform remote actions or merge; only the main Agent may perform an explicitly authorized remote action or merge.
