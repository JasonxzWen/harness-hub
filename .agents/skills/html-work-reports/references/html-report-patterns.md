# HTML Work Report Patterns

## Current Limits To Correct

The previous versions failed in two opposite ways:

- **Trigger debt**: it waited for explicit "make an HTML report" wording and missed substantial completed-task handoffs.
- **Asset debt**: it described report shapes but offered no templates, so every page started from scratch.
- **Visual debt**: it allowed Markdown-like pages with long paragraphs instead of requiring scan-first structure.
- **Rich-text debt**: Mermaid, Markdown, and code snippets were mentioned but not enforced as rendered content.
- **Evidence debt**: file paths, command output, and code anchors were preserved only as generic notes.
- **Interaction debt**: hover focus, filters, dim/blur states, copy buttons, and motion were optional instead of reusable defaults.
- **Code-review debt**: source-linked code evidence, line numbers, highlighted snippets, and diff views were not treated as mandatory when reports discuss code changes.
- **Showcase debt**: after rich rendering was added, reports started forcing diagrams, code, evidence, tags, and dependency panels even when the reader only needed a concise conclusion.
- **Information-architecture debt**: navigation grouped by component type instead of by the report's argument, so the directory looked systematic while failing the content.

## Source Inspiration

The main pattern comes from "The unreasonable effectiveness of HTML" by Thariq Shihipar: replace skimmable walls of Markdown with self-contained HTML artifacts that can show comparisons, diagrams, timelines, reports, decks, and task-specific editors directly in a browser.

Related third-party skills were evaluated as references:

- `michalvavra/agents/archive/skills/html-tools`: strong single-file utility guidance, but focused on converters and developer tools rather than work reports.
- `Cocoon-AI/architecture-diagram-generator`: useful architecture diagram conventions, but too narrow and visually opinionated for the default reporting layer.
- Anthropic `web-artifacts-builder`: already present in this repo for complex bundled artifacts.

Live docs checked while strengthening this skill:

- Mermaid usage docs prefer `mermaid.run` for DOM rendering and `mermaid.render` for programmatic SVG output.
- MDN documents CSS transitions as the standard way to animate element state changes such as hover, focus, and scripted selection.

Keep volatile library details out of `SKILL.md`. Runtime-cdn reports may depend on CDN libraries, but the generated HTML must pin exact versions, expose a machine-readable dependency manifest, expose render state, and keep source fallbacks hidden unless rendering fails. The dependency manifest is hidden by default; show it only when dependency behavior is part of the report.

## Template Catalogue

Use the closest asset and delete sections that do not apply:

| Template | Use when | Core blocks |
|---|---|---|
| `assets/templates/implementation-handoff.html` | Completed implementation work needs changed areas, file evidence, verification gates, risks, and next actions. | conclusion strip, changed-area cards, evidence cards, verification gates, risk cards |
| `assets/templates/conclusion-dashboard.html` | A non-trivial task is complete and the user needs the conclusion, files, verification, and next actions in one place. | conclusion strip, metric cards, timeline, file evidence, highlighted snippet, Mermaid/SVG diagram slot |
| `assets/templates/review-findings.html` | A PR/code/doc review has multiple findings, severity levels, or reviewer focus areas. | severity filters, finding cards, annotated code panel, file tour, action export |
| `assets/templates/research-explainer.html` | Research, architecture, or module understanding needs citations, diagrams, examples, and a glossary. | TL;DR grid, rendered rich-text sections, tabbed examples, diagram panel, source rail |
| `assets/templates/decision-matrix.html` | Multiple options, product choices, or implementation approaches need trade-off comparison. | option cards, recommendation, risk notes, confirmation questions |
| `assets/components/report-ui.css` | A custom page needs common visual primitives. | cards, chips, source links, code blocks, diff panels, Mermaid evidence panels, focus/dim effects, responsive grids |
| `assets/components/report-ui.js` | A custom page needs simple interactions. | filters, tabs, search, copy/export buttons, evidence spotlight, selected-state focus |
| `assets/components/rich-render-runtime.css` | A report needs runtime-rendered Markdown, Mermaid, or highlighted code. | rendered Markdown styling, Mermaid fallback styling, highlight token affordances |
| `assets/components/rich-render-runtime.js` | A report needs runtime-rendered Markdown, Mermaid, or highlighted code. | Marked + DOMPurify bridge, per-diagram Mermaid `render`, highlight.js tokenization, status badges |

## Static Component Boundary

Report components must preserve the single-file static HTML contract. Use inlineable HTML, CSS, and vanilla JS only for report components. Runtime-cdn reports may reference pinned browser libraries for Mermaid, Markdown parsing, sanitization, and code highlighting. If a visual idea requires React, Tailwind compilation, Vite, bundling, or a long-lived app runtime, do not add that dependency to this skill; port only the static shape that can be embedded in a single report file, or skip it.

## Generator Contract

Use the generator first for normal reports:

```powershell
bun .agents/skills/html-work-reports/scripts/create-report.mjs --input report.json --out-dir reports --slug my-report --json
bun .agents/skills/html-work-reports/scripts/validate-html-report.mjs reports/my-report.html --json
```

Input is JSON and follows `references/report-input-schema.json`. The minimum useful shape is content-first and has no required evidence, code, diagram, verification, or action block:

```json
{
  "title": "简洁中文汇报",
  "summary": "一句话先给结论。",
  "status": "complete",
  "renderMode": "runtime-cdn",
  "sections": [
    { "type": "markdown", "title": "结论", "group": "summary", "content": "- 只保留读者需要的内容。" }
  ]
}
```

Add richer sections only when they shorten the explanation:

```json
{
  "sections": [
    { "type": "mermaid", "title": "调用链", "group": "details", "content": "graph LR\n  A --> B" },
    { "type": "code", "title": "关键改动", "group": "details", "language": "typescript", "filePath": "src/file.ts", "startLine": 42, "highlightLines": [42], "content": "export const ok = true;" },
    { "type": "diff", "title": "行为差异", "group": "verification", "filePath": "src/file.ts", "startLine": 42, "content": "- return oldValue;\n+ return newValue;" }
  ],
  "evidence": [
    { "kind": "file", "label": "实现位置", "value": "src/file.ts", "status": "info" }
  ],
  "verification": [
    { "label": "聚焦测试", "status": "pass", "detail": "bun test ./tests/example.test.ts" }
  ]
}
```

Supported section types: `summary-cards`, `markdown`, `mermaid`, `code`, `diff`, `timeline`, `evidence`, `decision-matrix`, `actions`, `tabs`, and `filterable-cards`. Optional section fields `group`, `priority`, `summary`, `status`, and `richId` drive grouped navigation and runtime state. Optional root fields `evidence`, `verification`, and `nextActions` are rendered only when non-empty.

Generator and validator scripts are internal `html-work-reports` assets. Do not expose them as a separate installable capability unless a later OpenSpec change approves that boundary.

## Artifact Selection

| Work type | HTML pattern | Useful controls |
|---|---|---|
| Planning | timeline + risk matrix + dependency sketch | filter by owner, copy checklist |
| Code review | source-linked code evidence + annotated diff + file tour + severity index | jump links, collapse low-risk notes |
| Code understanding | module boxes + arrows + entry point list | highlight hot path |
| Design system | swatches + type scale + component contact sheet | copy token, state tabs |
| Prototype | isolated interaction or animation | sliders, toggles, reset |
| Research | TL;DR + tabs + glossary + citations | search, expand all |
| Status report | summary cards + chart + timeline | filter by status |
| Incident report | minute-by-minute timeline + logs + follow-ups | severity tags, owner filters |
| Custom editor | board/form/table for a specific decision | export Markdown/JSON/diff |

## Rich Content Contract

- **Language/encoding**: generated reports are Chinese-first UTF-8 artifacts. Continuous half-width question marks or replacement characters are validation failures because they usually indicate a non-UTF-8 shell/stdin path corrupted the report input.
- **Markdown**: convert headings, lists, tables, callouts, and links into semantic HTML. Do not make the user read raw Markdown unless it is an explicit source excerpt.
- **Mermaid**: use it only when a non-trivial sequence, architecture, call-path, or data-flow diagram is faster than text. For dynamic diagrams, pin Mermaid and call `mermaid.render`; keep Mermaid source in hidden machine-verifiable fallback data, not a visible source block.
- **Code**: show code only when the report needs exact implementation evidence. Use the smallest useful snippet with source file link, line number or range, copied snippet, highlighted decisive lines, and a one-line reason.
- **Diff**: include a `diff` section only for review findings, behavioral changes, or before/after examples where prose would be ambiguous.
- **File references**: render as clickable local-path anchors when the host supports them, or as copyable path chips otherwise; do not create a separate evidence section when one sentence is enough.
- **Citations**: keep source cards short and optional: title, source, date/accessed, and why it matters.

## Runtime Rendering Support

Use `runtime-cdn` as the default Codex-visible report path. It keeps the artifact as one static HTML file, but lets the browser use pinned libraries for rich rendering. Use `pre-rendered` only when primary rich content must not depend on CDN scripts. Use `fallback-only` only for constrained environments where readable source is acceptable.

Render modes:

- `runtime-cdn` is the default. It declares pinned runtime dependencies in a hidden machine-readable manifest, keeps hidden source fallback data, and exposes ready/degraded/failed state through attributes rather than visible effect tags. Set `showRuntimeDependencies: true` only when dependency loading is part of the report.
- `pre-rendered` is explicit. Critical CSS/JS is inlined, Markdown becomes semantic HTML, Mermaid becomes inline SVG or degraded fallback, and code gets static highlight spans.
- `fallback-only` is explicit degraded output. It keeps source text readable without claiming rich rendering success.
- `runtime` is a legacy alias accepted by the generator and normalized to `runtime-cdn`.

Pinned runtime bundle pattern:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/styles/github-dark.min.css">
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.4.2/dist/purify.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/highlight.min.js"></script>
<script type="module">
  import { marked } from "https://cdn.jsdelivr.net/npm/marked@18.0.3/lib/marked.esm.js";
  window.marked = marked;
  window.dispatchEvent(new Event("rich-render-libs-ready"));
</script>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.esm.min.mjs";
  window.mermaid = mermaid;
  window.dispatchEvent(new Event("rich-render-libs-ready"));
</script>
```

Runtime rules:

- Marked parses Markdown but does not sanitize output; sanitize with DOMPurify unless the Markdown is trusted generated content.
- Mermaid should initialize with `startOnLoad: false` and a strict security level, then render each diagram into its own target with independent failure state.
- highlight.js should use explicit language classes such as `language-typescript`; line-number wrappers and highlighted lines are applied by local report JS around highlighted token markup. Do not insert text newlines between block line wrappers; that creates fake blank rows in `<pre>`.
- Every runtime-rendered block still needs hidden source fallback data for audit and degraded states, but do not show `Source fallback`, `Code source`, `Markdown rendered`, or `Code highlighted` labels during normal successful rendering.
- CDN runtime use is a conscious tradeoff: better Codex-visible rendering, but weaker offline guarantees than pre-rendered output.

## Grouped Navigation Contract

- Derive a grouped index from `section.group`; infer missing groups conservatively as `main`.
- Prefer content groups such as `summary`, `main`, `changes`, `impact`, `risks`, `decision`, `verification`, `next`, and `details`.
- Use component groups such as `diagrams`, `code`, or `evidence` only when the report intentionally contains those components and the group helps the reader.
- Desktop reports should keep navigation visually separate from the reading column.
- Narrow reports should wrap, collapse, or scroll navigation without body-level horizontal overflow.
- Long section names need wrapping, truncation with `title`, or an equivalent accessible affordance. Navigation labels are Chinese by default and should describe the argument, not the widget inventory.

## Visual Quality Contract

- Body text, metadata, card text, code, table cells, and diagram labels need explicit font size, line height, and font weight.
- Engineering reports should be dense but readable; avoid oversized gaps and ultra-light text.
- Code line height should stay near normal editor density; blank vertical gaps between consecutive code lines are a bug.
- Code panels own their overflow and must not expand the page width.
- Mermaid panels own their overflow and must not cover adjacent sections.
- Hover and focus states may change color, outline, border, and shadow, but must not shift neighboring layout.
- Muted text, code comments, line numbers, status pills, and highlighted lines must remain legible in Codex.

## Interaction And Motion Contract

- Use hover/focus to reveal affordances, not to hide essential evidence.
- Apply dim/blur to non-focused cards during filtering or hover comparison, but never make text unreadable.
- Use transitions for opacity, transform, color, and outline; keep durations around 120-220ms.
- Support keyboard state with `:focus-visible`.
- Include `@media (prefers-reduced-motion: reduce)` and remove transform/animation there.
- Keep animation purposeful: draw attention to changed state, selected findings, copied output, or active filters.

## Validation Contract

Run `scripts/validate-html-report.mjs` on generated or custom HTML before handoff. The validator checks:

- report root, non-empty content, and safe content boundaries
- UTF-8/mojibake guardrails, including continuous half-width question marks
- render mode, grouped navigation, section group metadata, source fallback, and runtime state
- runtime dependency manifest and pinned versions for runtime-cdn reports
- Markdown table/list rendering or explicit runtime fallback
- Mermaid inline SVG, runtime target, or explicit degraded state
- code highlight markup, language classes, line wrappers, and inert file path labels
- evidence, verification status, filter, tab, and copy controls only when the report contains those optional modules
- browser checks across narrow, medium, and desktop viewports for body overflow, major overlap, Mermaid containment, code tokens, and control state changes

If Playwright/Chrome is unavailable, browser-only coverage must be reported as `degraded`; with `--require-browser`, validation must fail instead of silently claiming browser checks passed.

Security rules are generator defaults, not optional polish:

- Escape user-controlled text in cards, evidence, file chips, and actions.
- Sanitize Markdown output and strip unsupported HTML/event-handler content.
- Restrict rendered links to `http`, `https`, `mailto`, or local anchors; neutralize `javascript:` links.
- Treat file paths and code snippets as inert text unless a host-specific safe file link is intentionally created.

## Layout Skeleton

Use this structure unless the task clearly needs something else:

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Report title</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: system-ui, sans-serif; line-height: 1.5; }
    main { max-width: 1120px; margin: 0 auto; padding: 24px; }
    nav a { display: block; }
    section { margin-block: 28px; }
    .summary { border-left: 4px solid #2563eb; padding-left: 16px; }
    @media (max-width: 720px) { main { padding: 16px; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Report title</h1>
      <p>Generated YYYY-MM-DD. Scope and assumptions.</p>
    </header>
    <aside class="summary">Top finding or decision.</aside>
    <div class="report-layout">
      <nav aria-label="Report sections"></nav>
      <section id="main-workspace"></section>
    </div>
    <!-- Optional evidence, verification, and next-action sections appear only when non-empty. -->
  </main>
</body>
</html>
```

## Interaction Rules

- Keep JavaScript small and local to the artifact.
- Make controls obvious: buttons for commands, checkboxes/toggles for binary state, select inputs for modes, text input for search.
- Never hide the source data so thoroughly that the artifact cannot be audited.
- For export buttons, produce plain text in a visible `<textarea>` as a fallback to clipboard APIs.
- Avoid storing secrets. If a tool genuinely needs a token, keep it in user-controlled localStorage and never embed it in source.

## Visual Rules

- Engineering reports should be dense but calm.
- Use color to encode severity, status, ownership, or grouping.
- Avoid decorative backgrounds that make evidence harder to read.
- Use responsive grids and allow tables to scroll horizontally on small screens.
- Prefer inline SVG for diagrams that need precise labels or arrows.
- Replace paragraphs longer than 3 short lines with cards, bullets, or progressive disclosure.
- Let the page do work Markdown cannot: spatial comparison, sticky context, direct code emphasis, filters, copy/export, and rendered diagrams.
