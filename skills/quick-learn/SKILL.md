---
name: quick-learn
description: Load when a workflow-router-selected owner workflow needs an explicit source-backed learning project, study plan, syllabus, book/technical topic coaching, teach-back, quizzes, or staged review; do not load for routine implementation, one-off facts, or article writing.
license: MIT
metadata:
  source: local-original
  adaptation: "Synthesizes evaluated learning-skill patterns without importing upstream bodies or host-specific runtimes."
---

# Quick Learn

## Purpose

Run a personal, source-backed learning project. Build enough source context first, confirm the custom syllabus with the user, then teach in short sections with questions, teach-back, assessment, progress tracking, and stage-level review.

Use this skill when the user explicitly wants to learn a book, paper, codebase, technology, exam/interview topic, or domain over one or more sessions. Do not use it for one-off factual answers, routine implementation, ordinary article research, or public reposting.

## Non-Negotiables

- Source first: gather and index useful materials before designing the syllabus unless the user explicitly asks for a quick unaided explanation.
- Download when learning needs it and the material is reachable through normal access. Do not bypass paywalls, login walls, robots/anti-scraping controls, or technical access restrictions. Keep downloaded material local for learning and do not reproduce large copyrighted text in responses.
- Confirm the syllabus before teaching. The module boundaries should fit the user's current level and target outcome, not blindly mirror a book or tutorial table of contents.
- Promote concrete module sources before teaching from them. Directory or hub pages can be discovery sources, but specific lesson claims should anchor to article, docs, PDF, repo, or course-page source records.
- Run stage-level review at source pack, syllabus, long module synthesis, and final handoff. Use an independent delegated-agent review when available; otherwise run the deterministic checklist in `references/review-and-orchestration.md` and state the fallback.
- Keep durable state current. After the user confirms a syllabus or teaching starts, clear stale `pending_user_confirmation` state and record the current phase plus next action.
- Keep the first teaching unit small. Prefer active recall, teach-back, transfer questions, and zero-hint checks over long passive lectures.
- Do not build an HTML course artifact in v1 unless the user explicitly asks for that output.

## Session Start

Establish the learning contract. Ask only for missing fields that materially change the plan:

- topic or exact material;
- current level and relevant background;
- target mastery level: recognize, use, modify/debug, design, or transfer;
- timebox, pace, preferred examples, and output needs;
- constraints, non-goals, and allowed source scope.

When enough context exists, state assumptions and log the contract with:

```powershell
python skills/quick-learn/scripts/log_quick_learn_event.py --topic "Topic Name" --event contract --level beginner --target "Use the idea in real decisions" --summary "Established learning contract."
```

## Project Lifecycle

1. Build a source pack with authority tiers, freshness, local paths or URLs, and open gaps. Use `references/source-strategy.md`.
2. Review the source pack before teaching. Record pass/warn/fail evidence.
3. Build a concept map and custom syllabus. Include prerequisites, modules, objectives, source anchors, assessments, and expected artifacts.
4. Ask the user to confirm or adjust module boundaries and depth before the first lesson.
5. Teach one module section at a time: explain, demonstrate, ask, evaluate, repair, teach-back, transfer, assess.
6. Update project state, weak concepts, review queue, and next action after each meaningful section.
7. Finish each session with mastered points, remaining gaps, next review prompts, and the state path.

Default state root:

```text
.quick-learn/projects/<topic-slug>/
```

## Teaching Loop

For each concept:

1. Give the smallest useful explanation and one concrete example.
2. Ask one diagnostic question before assuming understanding.
3. Evaluate the answer for misconception, missing prerequisite, vague language, or false confidence.
4. Repair one gap at a time with a contrast, worked example, analogy, or source excerpt summary.
5. Ask the user to teach it back in their own words.
6. Ask a transfer question that changes the surface details.
7. Grade internally against the target mastery level and log the result.

Read `references/teaching-and-assessment.md` before generating quizzes, teach-back checks, stage tests, or remediation plans.

## Logging

Use durable logs for real learning projects, not trivial chat.

```powershell
python skills/quick-learn/scripts/log_quick_learn_event.py --topic "Investment Basics" --event source --source-title "Official book page" --source-url "https://example.com/book" --quality A --summary "Recorded official source."
python skills/quick-learn/scripts/log_quick_learn_event.py --topic "Investment Basics" --event syllabus --module "Risk basics" --summary "Proposed custom module after source review."
python skills/quick-learn/scripts/log_quick_learn_event.py --topic "Investment Basics" --event assessment --concept "Risk premium" --mastery 3 --summary "Teach-back correct, transfer example still weak."
```

The logger writes `events.jsonl`, `project.json`, `progress.json`, `sources.json`, `reviews.jsonl`, and `notes.md`.

Do not log secrets, credentials, private personal details, or raw large proprietary content. Summarize sensitive material and record source pointers instead.

## References

- `references/source-strategy.md`: source tiers, download policy, freshness, source pack fields, and book/technology collection patterns.
- `references/learning-project-lifecycle.md`: project state layout, lifecycle gates, syllabus confirmation, and session handoff.
- `references/teaching-and-assessment.md`: active recall, Feynman teach-back, zero-hint quizzes, mastery levels, and error taxonomy.
- `references/review-and-orchestration.md`: mandatory stage reviews, delegated-agent boundaries, fallback checklist, and anti-drift criteria.
