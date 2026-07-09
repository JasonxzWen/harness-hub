---
name: grill-with-docs
description: Load when a workflow-router-selected owner workflow or explicit user request needs a grill-with-docs interview: one-question-at-a-time pressure testing plus glossary, domain model, ADR, context wiki, or code/documentation contradiction capture; do not use for routine implementation and do not write wiki knowledge without human confirmation.
license: MIT
metadata:
  source: "mattpocock/skills skills/engineering/grill-with-docs"
  upstream_commit: "d574778f94cf620fcc8ce741584093bc650a61d3"
---

# Grill With Docs

## Purpose

Use this skill when a plan needs the `grill-me` interview loop and the answers are likely to create durable project language, context, or decisions.

This is a Harness Hub adaptation of Matt Pocock's `grill-with-docs`: keep the one-question-at-a-time pressure test, but map durable documentation to the standard Harness Hub context model instead of writing root `CONTEXT.md` or `docs/adr/` directly.

## Boundaries

Use `grill-me` when the user only wants assumption pressure. Use `product-capability` when the next artifact is an implementation-ready capability contract. Use `doc-coauthoring` when the main task is drafting a durable document.

Do not implement the plan during the interview. Do not create or edit `.harness-hub/context/wiki/` knowledge files until the user confirms the file-level update plan. Active task progress, validation records, blockers, and restart notes belong in `.harness-hub/state/`, not the wiki.

## Workflow

1. Restate the current plan and identify the terms, relationships, or decisions that may need durable capture.
2. If `.harness-hub/context/` exists, read its `README.md`, `llm-wiki-schema.md`, `wiki/index.md`, and `wiki/contradictions.md` before proposing context updates.
3. Inspect repository facts when a question can be answered from code, tests, docs, source records, or current task state.
4. Ask exactly one high-leverage question at a time, with:
   - why it matters
   - your recommended answer
   - the main tradeoff or alternative
   - any candidate glossary, wiki, contradiction, or ADR note the answer would create
5. Apply the domain-modeling checks in `references/domain-modeling.md` during the interview.
6. When a term or decision crystallizes, propose the smallest file-level documentation update immediately. Ask for confirmation before writing knowledge content.
7. Stop when remaining uncertainty no longer changes the next action or the context update plan.

## Handoff

End with:

- decisions made
- unresolved assumptions
- recommended next action
- context/wiki or decision-record updates written or intentionally deferred
- validation or source checks needed before implementation

Do not continue into implementation unless the user explicitly asks.
