---
name: workflow-router
description: Load when a non-trivial request needs intent recognition before work starts; classify it into exactly one workflow owner, or ask a clarification; do not load for explicit owner-skill invocations, trivial chat, or execution steps already routed.
---

# Workflow Router

Classify the user's request into exactly one workflow owner before substantive work starts.

This skill owns intent recognition and handoff only. It does not implement, test, review, deliver work, or replace the selected owner.

## Owners

| State | Owner |
|---|---|
| question | `answer-workflow` |
| sdd-change | `sdd-workflow` |
| diagnosis | `diagnosis-workflow` |
| review | `review-workflow` |
| delivery | `delivery-workflow` |
| skill-hub-maintenance | `hub-maintenance-workflow` |

## Workflow

1. Read `references/intent-taxonomy.md` when the state is not obvious.
2. Select exactly one owner, or ask one concise clarification.
3. Use `references/state-handoff.md` to hand off:
   - selected state
   - confidence
   - reason
   - owner
   - next gate
   - allowed helper skills
   - whether `effective-interact` is required
4. If subagents or hooks are relevant, point the owner to `references/orchestration-policy.md`.
5. Stop. The selected owner drives the work.

## Guardrails

- If the user explicitly names an owner skill, do not re-route unless the request conflicts with that owner.
- If the request is trivial chat, no owner is needed.
- If the request is ambiguous between mutation and review/question, ask or choose the safer non-mutating state.
- `effective-interact` is a reporting layer, not a workflow owner.
- Hooks and subagents stay under `references/orchestration-policy.md`; the router never dispatches them.
