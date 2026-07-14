---
type: workflow
title: Skill routing
---
# Skill routing

Select exactly one owner workflow before helper skills:

| Intent | Owner |
| --- | --- |
| Read-only evidence or explanation | `answer-workflow` |
| Feature/fix/refactor/policy/docs/test mutation | `sdd-workflow` |
| Failure, regression, flaky behavior, performance symptom | `diagnosis-workflow` |
| Report-only code/security/UI/test/risk review | `review-workflow` |
| Accepted-scope validation, cleanup, PR/CI closure, handoff | `delivery-workflow` |

Owner workflows only orchestrate small Loops. Helpers never compete for ownership. Use the narrowest helper whose description matches the active Loop; explicit invocation remains supported.

Important boundaries:

- `effective-interact` is the atomic complex-presentation skill; `report-loop` owns lifecycle activation.
- `grill-me` is a requirements atom inside `requirements-loop`: it batches every independently answerable decision in the current dependency layer with recommendations, defers dependency-bound questions, and serializes only when the user explicitly requests one question at a time. `grill-with-docs` owns requirements interviews that also maintain project knowledge.
- `tdd-workflow` provides testing guidance inside `test-loop`; it is not a second top-level workflow.
- `agent-interaction-audit` supplies evidence to `retro-loop`; real project cases stay in that project.
- `verification-loop` supplies deterministic command evidence; it cannot waive failures.
- `stop-slop` applies only to English prose editing, not Chinese reports or code.

## Sources

- [Router](../skills/workflow-router/SKILL.md)
- [Intent taxonomy](../skills/workflow-router/references/intent-taxonomy.md)
