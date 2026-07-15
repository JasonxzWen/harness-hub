---
name: grill-with-docs
description: "Load when a task needs a source-backed interview that reconciles repository facts, Google OKF project knowledge, assumptions, and blocking decisions before specification."
argument-hint: "<goal-or-draft>"
user-invocable: true
---

# Grill With Docs

Use this as an atomic requirements skill called directly by the native Host main Agent.

1. Read the active task state, relevant implementation/tests, and `knowledge/index.md`.
2. Follow links only to relevant OKF concepts and their repository sources.
3. Separate facts, user decisions, inferences, contradictions, and open questions.
4. Ask only one blocking question at a time. A question is blocking only when the answer changes behavior, ownership, safety, cost, remote state, or acceptance criteria.
5. Continue autonomously on local reversible details covered by the existing contract.
6. Return constraints, accepted details, contradictions, open questions, and source anchors to the main Agent.

Do not write knowledge during the interview. If durable project facts changed, return the evidence to the main Agent; the project contract owns the write and deterministic OKF validation.

Read `references/domain-modeling.md` when the request changes vocabulary, concept relationships, or knowledge structure.
