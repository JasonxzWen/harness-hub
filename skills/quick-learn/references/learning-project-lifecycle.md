# Learning Project Lifecycle

Use this reference for multi-session learning projects, books, technologies, or source-heavy topics.

## State Layout

Default root:

```text
.quick-learn/projects/<topic-slug>/
  events.jsonl
  project.json
  progress.json
  sources.json
  reviews.jsonl
  notes.md
  materials/
  source-index.md
  syllabus.json
  misconceptions.md
```

Generated state is local runtime data and should stay ignored by git.

## Phase 1: Learning Contract

Capture:

- topic/material;
- current level;
- target mastery level;
- user context and intended use;
- pace/timebox;
- preferred examples and language;
- non-goals;
- source permissions and access constraints.

Do not over-interview. Ask only questions that change source collection, syllabus shape, depth, or assessment.

## Phase 2: Source Pack

Gather sources before designing the syllabus. For broad or difficult topics, split research into lanes:

- authority and primary sources;
- practical tutorials and examples;
- critiques, common misconceptions, and failure modes;
- assessments, exercises, and case studies.

Each lane returns citations, local paths when downloaded, quality/freshness grades, gaps, and a recommendation for how much weight to give the source.

Run source review before moving on.

## Phase 3: Diagnosis

Ask a short diagnostic set after the source pack:

- one background/current-use question;
- one vocabulary question;
- one mechanism or prediction question;
- one transfer or practical scenario question;
- one preference question if it changes examples or pacing.

Diagnostic answers calibrate the syllabus. They do not count as mastered evidence unless followed by a teach-back or transfer check.

## Phase 4: Custom Syllabus

Create a proposed syllabus with:

- module title and objective;
- prerequisites;
- source anchors;
- key concepts and confusion pairs;
- exercises/quiz types;
- target mastery level;
- estimated effort;
- acceptance criteria.

Ask the user to confirm module boundaries, order, and depth before teaching. If the user changes the goal, revise the syllabus and log the decision.

When the user confirms the syllabus, update durable state before teaching:

- mark the syllabus/project status as `confirmed` or `in_progress`;
- record the confirmation decision and next action;
- clear or supersede `pending_user_confirmation` so later sessions do not ask for a decision that already happened.

## Phase 5: Module Session

For each confirmed module:

1. Start with retrieval from prior weak concepts.
2. Teach one small concept or source section.
3. Ask one diagnostic or prediction question.
4. Repair the highest-impact gap.
5. Require teach-back.
6. Ask one transfer or application question.
7. Log mastery, weak points, next review, and source coverage.

Do not let a session become a passive summary. If the user asks a direct question, answer clearly, then return to active checking.

Before the first explanation in a source-heavy module, check that the concrete module sources are recorded. If the module will rely on a specific article, docs page, repository example, PDF section, or course lesson that is not yet in `sources.json` or `source-index.md`, add it first rather than relying only on a broad entry page.

When teaching begins, update project state to `in_progress` and record the current module plus next action. Keep handoff state aligned with the active phase.

## Phase 6: Assessment And Review

Use a mix of:

- multiple choice with plausible distractors;
- short written explanation;
- teach-back;
- compare/contrast;
- scenario application;
- debugging or correction when learning technology;
- mini project or decision memo when the target is practical mastery.

Update `progress.json`, weak concepts, and review queue after assessment.

## Phase 7: Handoff

End with:

- what was covered;
- evidence of mastery;
- remaining gaps;
- next 1 to 3 review prompts;
- next module recommendation;
- state path and source index path.

Use `effective-interact` only for dense source maps, syllabus comparisons, progress reports, or final handoffs where structure lowers reading cost.
