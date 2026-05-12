---
name: html-work-reports
description: Load when the user needs a self-contained HTML report, review, plan, status update, research explainer, architecture walkthrough, or lightweight export editor; do not load for simple chat answers, normal code edits, production UI, slide decks, or bundled web apps.
---

# HTML Work Reports

## Overview

Turn agent work products into one portable `.html` file when the user needs to inspect, compare, navigate, present, or edit the result. The goal is a local artifact that opens directly in a browser and makes the work easier to use than a long Markdown document.

## Decision Rule

Use this skill when both are true:

1. The user needs a work artifact such as a report, plan, review, explainer, status update, incident writeup, architecture walkthrough, or task-specific editor.
2. The output benefits from at least one HTML-native affordance:

- side-by-side alternatives or tradeoffs
- tables that need filtering, sorting, or scanning
- timelines, dependency maps, module maps, diagrams, or call flows
- code review annotations, severity tags, or jump links
- collapsible explainers, tabs, glossaries, or progressive disclosure
- status reports, incident reports, or recurring updates
- small task-specific editors that export Markdown, JSON, diffs, or checklists

Keep Markdown or chat when the answer is short, linear, or mainly conversational.

## Trigger Examples

Use this skill for requests like:

- "把这次改动做成一个可以打开的 HTML 汇报"
- "给这个 PR 做一个交互式 review 总结，按严重程度过滤"
- "把这个模块调用链解释成一个自包含网页"
- "给这次 incident 做时间线、影响范围和 follow-up 页面"
- "把研究结果做成可折叠、可复制结论的 HTML 说明"
- "做一个小页面让我调整 prompt 参数并导出 JSON"

Do not use this skill for:

- direct code implementation or bug fixes
- short answers, simple explanations, or ordinary chat summaries
- product UI or website work; use `frontend-design`
- complex bundled React/Tailwind artifacts; use `web-artifacts-builder`
- slide decks; use `frontend-slides`

## Artifact Types

Use the narrowest artifact that fits:

- **Planning**: milestones, risk table, architecture sketch, task checklist.
- **Code review**: annotated diff, changed-file tour, findings by severity, reviewer focus areas.
- **Understanding**: module map, request path, dependency graph, entry points.
- **Design**: token swatches, component contact sheet, variant/state matrix.
- **Prototype**: single interaction, animation sandbox, click-through flow.
- **Research**: TL;DR box, tabs for examples, collapsible sections, glossary.
- **Report**: status summary, timeline, small chart, follow-up checklist.
- **Editor**: focused interface for triage, feature flags, prompts, ordering, or config changes.

## Build Rules

1. Produce one self-contained `.html` file with inline CSS and JS.
2. Default to no network dependencies. If a CDN library is materially useful, pin the version and explain why.
3. Use semantic HTML, accessible controls, readable contrast, and keyboard-friendly interactions.
4. Put an executive summary or TL;DR at the top.
5. Preserve evidence: include source paths, commands, dates, and assumptions where relevant.
6. Add copy/export controls when the user needs to feed the result back into an agent or commit it.
7. Keep styling purposeful and restrained for engineering reports. Avoid decorative excess.
8. Save generated work artifacts under `reports/` unless the user or repo already has a better convention.

## Minimum Structure

Every report artifact should include:

- title and generated timestamp
- short summary
- navigation for major sections
- the main visual or interactive workspace
- evidence and assumptions
- next actions or export output

For editor artifacts, include an explicit export area or button. The exported text should be directly usable as Markdown, JSON, a patch summary, or a task list.

## Verification

Before handing off:

- Open or inspect the file enough to confirm it is not blank.
- Check that text does not overlap and the layout works at a narrow viewport.
- Verify interactive controls that affect the output.
- If the artifact summarizes code or research, ensure linked evidence is present.

## Related Skills

- Use `web-artifacts-builder` when the artifact needs a bundled React/Tailwind/shadcn implementation.
- Use `frontend-slides` for a viewport-safe presentation deck.
- Use `frontend-design` for polished product UI, websites, or applications.
- Use `webapp-testing` or browser tooling when the HTML must be visually verified in a real browser.

For detailed patterns and source inspiration, read `references/html-report-patterns.md` only when designing a non-trivial artifact.
