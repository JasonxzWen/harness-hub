---
name: ralph-prd
description: "Create Ralph-ready Product Requirements Documents for autonomous agent iteration. Use when the user asks to create a PRD for Ralph, plan a feature for the Ralph loop, break work into one-iteration stories, or prepare requirements that will later be converted to scripts/ralph/prd.json."
license: MIT
metadata:
  source: snarktank/ralph skills/prd
---

# Ralph PRD Generator

Create a detailed Product Requirements Document that can later be converted into `scripts/ralph/prd.json`.

Do not implement the feature while using this skill. The output is a planning artifact.

## Workflow

1. Receive the feature description.
2. Ask only essential clarifying questions when scope, users, constraints, or success criteria are ambiguous.
3. Write a PRD to `tasks/prd-[feature-name].md`.
4. Make every user story small enough for one Ralph iteration.
5. Include verifiable acceptance criteria.

## Question Format

When clarification is needed, ask 3-5 questions with lettered options:

```text
1. What is the implementation scope?
   A. Minimal viable version
   B. Full feature
   C. Backend/API only
   D. UI only
```

## PRD Structure

Use these sections:

- Introduction/Overview
- Goals
- User Stories
- Functional Requirements
- Non-Goals
- Design Considerations, when relevant
- Technical Considerations, when relevant
- Success Metrics
- Open Questions

## User Story Rules

Each story needs:

- A stable ID, such as `US-001`
- A short title
- A description in this form: `As a [user], I want [feature] so that [benefit]`
- Acceptance criteria that can be checked objectively

Right-sized examples:

- Add one database column and migration
- Add one UI component to an existing page
- Update one server action
- Add one filter dropdown

Too large:

- Build an entire dashboard
- Add authentication
- Refactor the API

Split large items before saving the PRD.

## Acceptance Criteria

Every story should include:

- `Typecheck passes`

When logic is testable, include:

- `Tests pass`

When UI changes are involved, include:

- `Verify in browser using browser or Playwright workflow`

Avoid vague criteria such as `works correctly`, `good UX`, or `handles edge cases`.

## Output

Save the PRD as Markdown:

```text
tasks/prd-[feature-name].md
```
