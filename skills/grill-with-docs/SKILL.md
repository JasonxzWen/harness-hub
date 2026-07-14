---
name: grill-with-docs
description: "Load when requirements-loop needs a source-backed interview that reconciles repository facts, Google OKF project knowledge, assumptions, and blocking decisions before specification."
argument-hint: "<goal-or-draft>"
user-invocable: true
---

# Grill With Docs

Use this as an atomic requirements skill inside `requirements-loop`, not as a separate workflow.

1. Read the active task state, relevant implementation/tests, and `knowledge/index.md`.
2. Follow links only to relevant OKF concepts and their repository sources.
3. Separate facts, user decisions, inferences, contradictions, and open questions.
4. Ask only one blocking question at a time. A question is blocking only when the answer changes behavior, ownership, safety, cost, remote state, or acceptance criteria.
5. Continue autonomously on local reversible details covered by the existing contract.
6. Return constraints, accepted details, contradictions, open questions, and source anchors to `requirements-loop`.

Do not write knowledge during the interview. If durable project facts changed, propose the evidence to `knowledge-maintain-loop`; that Loop owns the write and deterministic OKF validation.

Read `references/domain-modeling.md` when the request changes vocabulary, concept relationships, or knowledge structure.
