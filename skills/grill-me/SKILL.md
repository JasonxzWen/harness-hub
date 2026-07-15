---
name: grill-me
description: Load when a task needs cases where the user says grill me or explicitly asks to be challenged or pressure-tested before implementation; run a dependency-layered batch interview with recommended answers so assumptions are surfaced; do not use for routine implementation or durable documentation work.
license: MIT
metadata:
  source: "mattpocock/skills skills/productivity/grill-me"
  upstream_commit: "d574778f94cf620fcc8ce741584093bc650a61d3"
---

# Grill Me

## Purpose

Use this skill to turn a vague plan, design, product idea, or implementation approach into a sharper decision set before any code or artifact work starts.

The goal is shared understanding with as few interaction rounds as possible. Ask all high-leverage questions that can currently be answered independently in one batch, and move dependency-bound questions to later batches.

## When To Use

Use this skill when the user:

- says "grill me" or asks to be grilled
- asks you to challenge, pressure-test, sanity-check, or poke holes in a plan
- has a design with unclear tradeoffs, dependencies, scope, or success criteria
- wants assumptions surfaced before committing to implementation

Do not use this skill when:

- the user already gave clear implementation instructions and wants execution
- a normal brainstorming session is enough
- the user wants the interview to update glossary, context wiki, domain model, or ADR-style decisions; use `grill-with-docs`
- the next step is producing an implementation-ready capability plan; use `product-capability`
- the user asks for a code review; use the normal review posture or `verification-loop`

## Workflow

1. Restate the current plan in two or three sentences.
2. List the assumptions you are about to test.
3. If a question can be answered by inspecting the repository, inspect the repository first instead of asking the user.
4. Build a lightweight dependency graph of the unresolved decisions.
5. Ask every unresolved decision whose complete row—question, options, recommendation, rationale, tradeoff, and downstream impact—can be stated without another open answer in one batch.
6. Defer a decision when any part of that row depends on an unresolved answer.
7. After the user answers the batch, update the decisions and dependencies, then repeat with the next dependency layer.

## Batch Format

Present each dependency layer as one Markdown table:

| ID | Decision question | Options | Recommended | Why / tradeoff | Downstream impact | Answer |
|---|---|---|---|---|---|---|
| D1 | A decision the user can make now | A / B / C | A | Why A is the best default | Which later decisions become answerable and which constraints change | Pending |

Every row must include a recommended default, a short rationale, the main tradeoff, and the likely downstream consequence. Keep options mutually distinct and include `Other` only when it is useful.

Do not impose an arbitrary batch-size cap. If the current dependency layer is large, group rows by theme or priority in the same response instead of serializing independent questions across turns.

When later questions are dependency-bound, show only a compact waiting list:

| Deferred topic | Prerequisite | Why it waits |
|---|---|---|
| Cache and offline behavior | D1 authority choice | The valid options depend on which source is authoritative |

Do not finalize the wording or options for a deferred question until its prerequisite is resolved.

Invite one compact reply with one line per decision, for example:

```text
D1: choose A
D2: accept recommendation
D3: pause until <condition>
```

The user may reply `accept this batch` to approve every current recommendation or answer in prose when the options are wrong. Also recognize `default`, `defaults`, and `defer` as concise aliases. Do not silently apply a recommendation to an unanswered row.

Treat `pause until ...` as an explicit deferred state. Record its reason and re-entry condition, and keep it out of later batches until that condition becomes true or the user explicitly reopens it. The same lifecycle applies to the `defer` alias.

After a batch reply, show the smallest useful result table before asking the next dependency layer:

| ID | Decision | Consequence | Status |
|---|---|---|---|
| D1 | The accepted option | What it resolved, unlocked, or pruned | Resolved |

Batching is the default. If the user explicitly asks for one question at a time, honor that request without changing the rest of the workflow.

## Question Style

Prefer questions that force a decision:

- "Should this optimize for first-use clarity or repeat-use speed?"
- "Is this state authoritative, derived, or cached?"
- "What is the smallest version that would prove the design works?"
- "Which failure mode is acceptable, and which one is not?"

Avoid vague prompts:

- "Can you tell me more?"
- "What are your thoughts?"
- "Any preferences?"

## Stopping Rule

Stop grilling when the remaining uncertainty no longer changes the next action. Then summarize:

- decisions made
- assumptions still open
- deferred questions and their prerequisites
- recommended next step
- verification criteria for the next step

Do not start implementation unless the user explicitly asks you to continue into execution.
