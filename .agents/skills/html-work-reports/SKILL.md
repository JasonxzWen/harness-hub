---
name: html-work-reports
description: Load when a non-trivial task has a complete conclusion needing a concise Chinese-first self-contained HTML report, review, plan, status dashboard, research explainer, architecture walkthrough, or lightweight export editor; skip permission pauses, simple chat answers, production UI, slide decks, and bundled web apps.
---

# HTML Work Reports

## Overview

Turn completed work into one portable Chinese `.html` only when HTML makes the handoff shorter, clearer, or easier to scan than chat.

## Decision Rule

Use when a completed non-trivial task needs findings, tradeoffs, metrics, next actions, or a report/review/plan/status/explainer/dashboard/editor that would otherwise become a Markdown wall.

Skip this skill for:

- permission pauses before publishing, pushing, spending money, installing, changing credentials, or mutating third-party resources
- short answers, one-command summaries, tiny fixes, or ordinary chat
- implementation/debugging while work is still in progress
- product UI, websites, apps, decks, or bundled React/Tailwind artifacts

## Trigger Examples

Use this skill for requests like:

- "Turn the completed implementation summary into a visual HTML report with file evidence."
- "Create an interactive PR review report with severity filters and highlighted snippets."
- "Explain this module call path as a self-contained page with a rendered diagram."
- "Build an incident timeline page with impact, logs, and follow-up status."
- "Convert the research result into a skimmable HTML explainer with citations."
- "Make a small prompt/config editor that exports JSON or Markdown."

Do not use this skill for:

- approval gates such as "ask before pushing" or "confirm before installing"
- code implementation, bug fixes, or test runs while work is still in progress
- short answers, simple explanations, or ordinary chat summaries
- product UI or website work; use `frontend-design`
- complex bundled React/Tailwind artifacts; use `web-artifacts-builder`
- slide decks; use `frontend-slides`

## Output Contract

Write one single static `.html` as UTF-8 Chinese under `reports/` unless the repo has a better convention. Link the file and verification.

Start with the shortest useful conclusion. Add visual blocks, tables, timelines, diagrams, cards, code panels, chips, or controls only when they reduce reading effort for this report. Use only inlineable HTML/CSS and vanilla JS. Runtime-cdn may reference pinned browser libraries for Mermaid, Markdown, sanitization, and code highlighting; do not add React, Tailwind, Vite, or another build step.

For code-changing work, include code only when prose cannot carry the point. If used, include a source file link label with line number, copy only the decisive snippet, and highlight exact lines. Keep snippets short. Add a `diff` block only when before/after evidence matters.

For complex sequence, architecture, call-path, or data-flow changes, render Mermaid in HTML only when the diagram is faster than text. Keep source fallback as hidden machine-verifiable data.

## Generator First Workflow

Prefer the internal generator:

1. Write a UTF-8 JSON input that follows `references/report-input-schema.json`; omit `renderMode` for the default `runtime-cdn` Codex-visible report, or use `pre-rendered` only when offline primary content is required.
2. Run `scripts/create-report.mjs --input <input.json> --out-dir reports --slug <name> --json`.
3. Run `scripts/validate-html-report.mjs reports/<name>.html --json --require-browser` for runtime-cdn reports.
4. Hand off the report link and the verification result.

Use hand-written HTML only for custom visual exceptions.

## Template Assets

Start from the closest template when it fits: `implementation-handoff`, `conclusion-dashboard`, `review-findings`, `research-explainer`, or `decision-matrix`.

Use `assets/components/report-ui.css` and `assets/components/report-ui.js` for cards, filters, tabs, copy buttons, hover focus, and dim/blur behavior.

## Visual And Rich Content Rules

- Put conclusion first: decision, status, top risks, next action.
- Use grouped navigation that follows the report's argument, not the component inventory. Prefer groups like 摘要、变更、影响、风险、验证、下一步、细节.
- Prefer bullets and short tables. Use diagrams, code, evidence cards, tabs, and filters only when they serve a concrete reader need.
- Render Markdown, Mermaid, and code through pinned runtime-cdn libraries by default; preserve machine-readable state, but do not show effect tags such as `Markdown rendered`, `code highlighted`, or `Source fallback`.
- Code reports need source link, line number, copied snippet, highlighted line or diff, but reports do not need code by default.
- Escape/sanitize mixed-trust content; code and paths stay inert.
- Use jump links, filters, tabs, copy buttons, selected states, and dim/blur focus without layout-shifting hover transforms.

## Failure Lessons

- 必须使用 UTF-8 中文输入和输出。连续问号乱码通常来自 PowerShell/stdin/codepage 把中文转成非 UTF-8；优先写 UTF-8 JSON 文件。
- 不要外显 Source fallback、Code source 或 rich render status。它们只应作为隐藏 fallback 和校验状态存在，否则报告会显得像调试页面。
- 代码行必须紧凑。逐行 `<span>` 之间不要插入换行文本节点，CSS 行高保持接近正常代码阅读密度。
- 不要为了展示能力硬加图标、代码、证据、Mermaid 或效果标签。组件必须服务于内容，否则它们会把目录和正文变成噪音。
- 模板先给结论，再按本次汇报的实际问题分组；避免固定套用“图表/代码/证据/验证/行动”的组件目录。
- 假定读者没耐心。能一句话讲清的内容不要拆成两句，能用三个短点讲清的内容不要堆成长段。

## Verification

Before handing off:

Run `scripts/validate-html-report.mjs`; for runtime-cdn reports, prefer `--require-browser` so Codex-visible rendering, overflow, overlap, Mermaid containment, code tokens, and controls are actually checked.

For patterns, schema, template selection, rich-content handling, and validation, read `references/html-report-patterns.md`.
