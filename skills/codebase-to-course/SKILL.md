---
name: codebase-to-course
description: Load when a user wants a source-backed interactive HTML course that explains how a codebase works; do not load for chat tutoring, repository review, articles, slide decks, or general browser artifacts.
license: MIT
metadata:
  source: "local-original"
  evaluated_source: "zarazhangrui/codebase-to-course@ff8837ecf8e9f6ce9874ffa42e42633394a52a00"
  provenance_boundary: "The evaluated repository had no redistribution license at this revision; no upstream Skill body or assets are copied."
---

# Codebase to Course

Turn a real codebase into a factual, interactive HTML course for a reader who needs to understand and change the system, not memorize terminology.

## Routing

This Skill owns a course artifact whose subject is a codebase.

- Use `quick-learn` for multi-session teaching, assessment, and durable learner progress.
- Use `code-review` for findings about correctness or maintainability.
- Use `source-post` for a public article.
- Use `frontend-slides` for a presentation.
- Use `web-artifacts-builder` only when accepted course interactions genuinely need an application framework rather than a self-contained document.

Do not combine those outputs by default. A course is a learning artifact, not a review report with quizzes attached.

## Evidence Contract

Inspect before explaining:

1. Read the repository contract, README, entry points, configuration, tests, and the smallest set of implementation files needed to trace one representative user or operator journey.
2. Identify the system's real actors, ownership boundaries, data movement, external dependencies, and one meaningful failure or debugging path.
3. Separate observed facts from inference. Every implementation claim in the course must point to a current repository-relative file and line or symbol anchor.
4. Use only short, exact source snippets. Do not simplify source code and present the result as verbatim code.
5. Exclude credentials, secrets, customer data, generated vendor trees, and unrelated proprietary material. A course never expands access authority.

If the subject is a public repository URL, use read-only access or a temporary checkout. Do not modify or publish back to the source repository.

## Course Shape

Choose the fewest modules that form a coherent teaching arc. Cover only what the source proves and the learner needs:

- what the product or tool does and the concrete journey being traced;
- the main actors and why each owns its responsibility;
- how control and data cross boundaries;
- one or more exact code-to-plain-language explanations;
- a failure path that builds practical debugging intuition;
- scenario questions that ask the learner to apply the model to a change or incident.

Define unfamiliar terms at first use. Prefer a diagram, annotated flow, or compact comparison when it teaches the relationship more clearly than prose. Avoid decorating every section with the same card pattern.

Scenario questions must test transfer, such as which boundary should change or where a symptom likely originates. Do not quiz acronym expansion, syntax trivia, or filename recall.

## Artifact Contract

Default to one self-contained `codebase-course.html` with inline CSS and JavaScript. Use adjacent assets only when the course needs user-supplied images that cannot reasonably be embedded.

The artifact must provide:

- a clear reading order and module navigation;
- visible progress without locking the reader into mandatory scroll snapping;
- at least one source-backed architecture or data-flow visual;
- short exact code excerpts paired with plain-language interpretation and source anchors;
- at least one interactive scenario check with accessible controls and non-punitive feedback;
- keyboard access, visible focus, responsive layout, sufficient contrast, and reduced-motion behavior;
- a source index that lets a maintainer reopen every cited file.

Keep interactions native and small. Add a framework, build pipeline, persistence layer, or external font only when the accepted course behavior requires it.

## Verification

Before handoff:

1. Re-read every cited source anchor and correct stale line references or claims.
2. Confirm no source excerpt contains secrets or unrelated personal/project data.
3. Open the final HTML and exercise navigation plus every scenario control.
4. Check the console and inspect the densest module at desktop and narrow mobile widths.
5. Verify the artifact works without a network connection when it is described as self-contained.

Report any inference, inaccessible source, unverified browser behavior, or intentionally omitted subsystem. A visually polished course with stale code facts is a failed artifact.
