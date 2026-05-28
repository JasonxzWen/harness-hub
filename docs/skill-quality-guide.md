# Skill Quality Guide

Date: 2026-05-15

This guide defines the quality bar for Harness Hub's personal workflow distribution. It is strict for local routing and workflow-owner skills, and intentionally lighter for imported skill bodies that should preserve upstream style by default.

## Core Principle

A skill is context for an agent, not documentation for a human reader. Every distributed skill adds routing and context cost, but imported skills do not need to share one local writing style. Add or keep a skill only when it changes agent behavior in a way that a short prompt or existing global instruction cannot.

Use this test for every sentence in a skill:

> Would the agent likely get this wrong without this sentence?

If the answer is no, remove the sentence or move it into ordinary project documentation.

## When A Skill Is Needed

Create or install a skill when at least one condition is true:

- The agent repeatedly fails without durable domain or workflow context.
- The workflow needs consistent behavior across runs and models.
- The domain has durable know-how that is not reliably in model training data.
- The skill provides scripts, templates, schemas, references, or gotchas that the agent would otherwise reinvent.
- The behavior is a narrow, recurring user intent with clear trigger boundaries.

Do not create or install a skill when:

- The content is only a list of ordinary commands the model already knows.
- The content duplicates root `AGENTS.md`, host system instructions, or common project conventions.
- The content only reimplements host-native UI, orchestration, automation, review, browser, or multi-agent behavior already supplied by the active agent host.
- The source changes faster than Harness Hub can maintain it.
- The capability belongs in an explicit user-requested workflow rather than automatic routing.
- The main value is broad advice, not a bounded workflow or durable special case.

## Skill Directory Standard

Every installed skill should be treated as a directory, even when it currently has only `SKILL.md`.

Use these spokes when they reduce loaded context:

| Path | Use for |
|---|---|
| `SKILL.md` | Routing frontmatter, short core workflow, gotchas, and pointers to spokes. |
| `scripts/` | Deterministic logic the agent should run or compose instead of rewriting. |
| `references/` | Heavy or conditional guidance loaded only for a branch of the workflow. |
| `assets/` | Templates, schemas, report formats, examples, and reusable data. |
| `config.json` or config files | Runtime setup that should not pollute model context. |

Avoid deep hierarchy until it solves a real navigation problem. If a skill needs multiple levels of hierarchy, include short index files or lookup helpers so the agent does not pay excessive indirection.

## Frontmatter And Source Standard

Local routing, workflow-owner, and locally authored skill `SKILL.md` files should have:

- `name`: lower-case, hyphenated, and exactly matching the directory name.
- `description`: a routing trigger, not a feature summary.

Imported skills need enough source information to update, remove, or audit them later. That can live in the upstream body, frontmatter, `capabilities/index.json`, `docs/source-projects.md`, or `docs/source-skill-inventory.md`; do not edit an imported body solely to move source notes into frontmatter.

Preferred local overlay description form:

```yaml
description: "Load when the user asks to <intent phrase>, <nearby phrase>, or <real query wording>; do not load for <adjacent non-goal>."
```

Description rules for local overlay skills:

- Prefer starting with `Load when`.
- Target 50 words or fewer.
- Describe user intent and real query language.
- Include one sharp exclusion when the nearest overlap is risky.
- Do not summarize the workflow.
- Do not list implementation steps.
- Do not include volatile tool versions or remote service details.

Imported descriptions can keep upstream wording. Change them only when the wording creates a real routing conflict that cannot be fixed in `docs/skill-routing.md`, `capabilities/index.json`, or an owner workflow.

Changing a local routing-sensitive description is a routing change. It requires positive, negative, and forbidden-load evaluation coverage before merge unless the edit is purely mechanical and leaves trigger meaning unchanged.

## Body Standard

Locally authored `SKILL.md` bodies should stay short and high-signal. A useful target is under 5,000 tokens; local tests may use byte or word-count proxies when token counting is not available. Imported bodies are allowed to keep upstream structure unless they create excessive context cost in normal routing.

Write the body for model behavior, not human onboarding:

- State the hard judgment calls and constraints.
- Keep gotchas and negative examples close to the workflow they affect.
- Use intent-level instructions instead of brittle command transcripts.
- Point to scripts and references instead of embedding long tables or examples.
- Keep source notes short; put large attribution or evaluation history in `docs/`.
- Remove obvious content that a model already knows.

Bad:

```text
Run git log, check out main, create a branch, cherry-pick the commit, resolve conflicts, run tests.
```

Better:

```text
Cherry-pick the intended change onto a clean branch. Resolve conflicts while preserving intent. If it cannot land cleanly, explain the blocker with evidence.
```

## Gotchas Standard

Gotchas are the highest-value maintenance surface.

Add a gotcha when:

- The agent failed in a concrete way.
- The skill loaded for the wrong adjacent intent.
- The skill did not read a needed spoke file.
- A system prompt or project convention changed the skill's behavior.
- A user corrected an assumption that is likely to recur.

Gotchas should be append-mostly. Prefer adding a specific negative example over rewriting the main workflow. Change the description only when routing evals prove the trigger needs to move.

## Evaluation Standard

Every new installable local overlay skill should have an evaluation story before it is treated as default-route material. Imported skills need enough routing placement to avoid obvious conflicts; deeper evals should be added when a recurring conflict appears.

Minimum evaluation set:

| Eval type | Purpose |
|---|---|
| Positive routing | The skill loads for representative real user intents. |
| Negative routing | Adjacent user intents route to a narrower or more appropriate skill. |
| Forbidden load | The skill must not load for broad, generic, or side-effect-heavy requests. |
| Progressive loading | The agent reads the right `scripts/`, `references/`, or `assets/` file only when needed. |
| Completion check | A representative workflow reaches the intended output or decision. |

For third-party evaluations, capture the eval rationale in docs even if the skill is rejected. Rejections and explicit-only decisions are useful because they protect the index from trigger noise.

## Maintenance Rules

- Treat the skill index as a scarce shared budget.
- Preserve upstream skill bodies by default; adapt only for safety, license clarity, usability, or direct routing conflict.
- Keep broad workflow principles in `AGENTS.md`; keep conditional workflow context in skills.
- Keep volatile API/tool behavior in live documentation lookup, not static skills.
- Re-check current host capabilities before adding host-specific wrappers or workflow docs; keep host assumptions out of the local overlay unless explicitly needed.
- Keep side-effect-heavy workflows explicit-only until the repo has confirmed safety boundaries.
- Run `scripts/validate-skills.ps1 -SkipExternal` after skill file changes or install-surface changes.
- Run `bun run validate` before claiming repo-level changes are complete.

## Review Checklist

Use this checklist when reviewing a new or changed skill:

1. Does the skill fill a real gap not already covered by existing skills or global instructions?
2. For local overlay skills, does `description` describe when to load, in 50 words or fewer?
3. Are nearest overlaps and forbidden loads documented?
4. Is heavy or conditional content moved to spokes?
5. Are scripts/assets/references reusable rather than copied into the body?
6. Are gotchas concrete and failure-derived?
7. Are source, license, and upstream version recorded somewhere durable?
8. Are routing docs and capability metadata updated?
9. Are positive, negative, and forbidden evals present or explicitly planned?
10. Did validation pass?
