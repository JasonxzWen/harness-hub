# Skill Quality Guide

Date: 2026-05-12

This guide defines the quality bar for Skill Hub skills. It turns the public Agent Skills guidance provided in the May 2026 Perplexity write-up into local, reviewable rules for this repository.

## Core Principle

A skill is context for an agent, not documentation for a human reader. Every skill adds routing and context cost. Add or keep a skill only when it changes agent behavior in a way that a short prompt or existing global instruction cannot.

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
- The content duplicates root `AGENTS.md`, Codex system instructions, or common project conventions.
- The source changes faster than Skill Hub can maintain it.
- The capability belongs in a named CLI/profile decision rather than automatic routing.
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

## Frontmatter Standard

The root `SKILL.md` must have:

- `name`: lower-case, hyphenated, and exactly matching the directory name.
- `description`: a routing trigger, not a feature summary.
- `license` or source metadata when copied or adapted from an external project.
- `metadata.source`, `metadata.upstream_commit`, or equivalent source notes for imported/adapted skills.

Preferred description form:

```yaml
description: "Load when the user asks to <intent phrase>, <nearby phrase>, or <real query wording>; do not load for <adjacent non-goal>."
```

Description rules:

- Prefer starting with `Load when`.
- Target 50 words or fewer.
- Describe user intent and real query language.
- Include one sharp exclusion when the nearest overlap is risky.
- Do not summarize the workflow.
- Do not list implementation steps.
- Do not include volatile tool versions or remote service details.

Changing a description is a routing change. It requires positive, negative, and forbidden-load evaluation coverage before merge unless the edit is purely mechanical and leaves trigger meaning unchanged.

## Body Standard

The loaded `SKILL.md` body should stay short and high-signal. A useful target is under 5,000 tokens; local tests may use byte or word-count proxies when token counting is not available.

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

Every new installable skill should have an evaluation story before it is treated as default-route material.

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
- Prefer selective adaptation over wholesale imports.
- Keep broad workflow principles in `AGENTS.md`; keep conditional workflow context in skills.
- Keep volatile API/tool behavior in live documentation lookup, not static skills.
- Keep side-effect-heavy workflows explicit-only until the repo has confirmed safety boundaries.
- Run `scripts/validate-skills.ps1 -SkipExternal` after skill file changes.
- Run `bun run validate` before claiming repo-level changes are complete.

## Review Checklist

Use this checklist when reviewing a new or changed skill:

1. Does the skill fill a real gap not already covered by existing skills or global instructions?
2. Does `description` describe when to load, in 50 words or fewer?
3. Are nearest overlaps and forbidden loads documented?
4. Is heavy or conditional content moved to spokes?
5. Are scripts/assets/references reusable rather than copied into the body?
6. Are gotchas concrete and failure-derived?
7. Are source, license, and upstream version recorded?
8. Are routing docs and capability metadata updated?
9. Are positive, negative, and forbidden evals present or explicitly planned?
10. Did validation pass?
