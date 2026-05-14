## 1. Baseline And Test Fixtures

- [x] 1.1 Add a runtime-cdn stress fixture at `.agents/skills/html-work-reports/assets/fixtures/runtime-cdn-stress-report.json` covering long Chinese/English headings, 20+ sections, long paths, Markdown tables, nested JSON, wide TypeScript, shell snippets, diff content, filters, tabs, evidence, verification, and next actions.
- [x] 1.2 Include at least three Mermaid diagram types in the stress fixture: `flowchart`, `sequenceDiagram`, and `classDiagram`, each with long labels that would expose overflow or text clipping.
- [x] 1.3 Extend `tests/htmlWorkReportsSkill.test.ts` to assert that the stress fixture exists, uses the normal generator path, declares `runtime-cdn`, and includes grouped sections plus rich content coverage.
- [x] 1.4 Add focused failing expectations for current known gaps before implementation: flat navigation, insufficient runtime state, missing visual quality checks, and weak code highlight evidence.

## 2. Schema And Render Mode Contract

- [x] 2.1 Update `.agents/skills/html-work-reports/references/report-input-schema.json` to include `renderMode: ["runtime-cdn", "pre-rendered", "fallback-only"]` or an explicitly documented compatibility alias for the old `runtime` value.
- [x] 2.2 Add optional section fields to the schema: `group`, `priority`, `summary`, `status`, and any machine-readable rich-render id needed by the runtime.
- [x] 2.3 Update generator input validation in `.agents/skills/html-work-reports/scripts/create-report.mjs` so omitted `renderMode` defaults to `runtime-cdn`.
- [x] 2.4 Define and test the migration behavior for legacy `renderMode: "runtime"`: either map to `runtime-cdn` with a compatibility marker or reject with a clear error.
- [x] 2.5 Update existing fixtures so `pre-rendered-report.json` remains explicitly pre-rendered and runtime-oriented fixtures use `runtime-cdn`.

## 3. Runtime Library Integration

- [x] 3.1 Replace ad hoc runtime dependency injection in `create-report.mjs` with a structured dependency manifest containing library name, pinned version, CDN URL, purpose, and required/optional status.
- [x] 3.2 Generate a visible runtime dependency panel in runtime-cdn reports, with page-level render state and per-library load state.
- [x] 3.3 Update `.agents/skills/html-work-reports/assets/components/rich-render-runtime.js` so Markdown rendering uses Marked output only after DOMPurify sanitization.
- [x] 3.4 Update Mermaid rendering so each diagram has an independent id, render target, state attribute, visible status, source fallback, and error message.
- [x] 3.5 Ensure Mermaid runtime initialization uses `startOnLoad: false` and strict security settings where supported.
- [x] 3.6 Update code highlighting so runtime-cdn reports rely on highlight.js tokenization through `language-*` classes and `highlightElement`, while local wrappers preserve line numbers, hot lines, file links, and copy controls.
- [x] 3.7 Preserve source fallback blocks for Markdown, Mermaid, code, and diff sections in both runtime-cdn and pre-rendered modes.

## 4. Report Information Architecture And Layout

- [x] 4.1 Replace flat sticky navigation generation in `create-report.mjs` with grouped navigation derived from section `group` and default group inference.
- [x] 4.2 Add a desktop navigation layout that stays visually separate from the main reading column and does not cover report content.
- [x] 4.3 Add a narrow viewport navigation layout that collapses, wraps, or scrolls without body-level horizontal overflow.
- [x] 4.4 Keep the report conclusion first: title, status, summary, generated time, render mode, and top-level runtime state must appear before detailed sections.
- [x] 4.5 Ensure evidence, verification, and next actions are reachable from navigation and remain in the normal page flow.

## 5. Visual Quality System

- [x] 5.1 Rewrite the key tokens in `.agents/skills/html-work-reports/assets/components/report-ui.css`: typography, line height, font weight, spacing, borders, radius, status colors, muted colors, code colors, and focus outlines.
- [x] 5.2 Tighten body, card, table, metadata, and code line-height rules so reports are dense but readable.
- [x] 5.3 Increase fragile text weights and low-contrast token colors so body text, metadata, code comments, line numbers, and status chips remain legible in Codex.
- [x] 5.4 Add code panel rules that contain long lines inside the panel, keep line numbers aligned, and prevent highlighted lines from covering code.
- [x] 5.5 Add Mermaid panel rules that constrain SVG size, allow contained scrolling, and prevent diagrams from covering adjacent sections.
- [x] 5.6 Remove or neutralize hover/focus transforms that can shift layout; keep visible focus, border, background, and shadow state changes.
- [x] 5.7 Add `min-width: 0`, overflow, wrapping, and responsive constraints to cards, toolbar rows, nav groups, source links, chips, and rich content containers.

## 6. Browser Validation Upgrade

- [x] 6.1 Extend `.agents/skills/html-work-reports/scripts/validate-html-report.mjs` static checks for `runtime-cdn`, dependency manifests, source fallbacks, section render states, grouped navigation, and unsupported protocols.
- [x] 6.2 In browser validation, wait for runtime rendering to reach ready, degraded, failed, or timeout state before checking rich content.
- [x] 6.3 Validate 390px, 768px, and 1440px viewport widths for nonblank content, no body-level horizontal overflow, and no major overlap among hero, nav, sections, diagrams, code panels, evidence, verification, and next actions.
- [x] 6.4 Validate Mermaid sections for non-empty rendered targets or explicit degraded/failed state, and check obvious SVG/container overflow or adjacent-section coverage.
- [x] 6.5 Validate code sections for expected language classes, `.hljs-*` token output when highlighting succeeds, readable line numbers, and non-overlapping highlighted lines.
- [x] 6.6 Validate interactions for grouped nav, filters, tabs, and copy controls without hiding primary conclusion, evidence, or verification state.
- [x] 6.7 Make `--require-browser` fail when browser automation is unavailable or runtime-cdn visual quality cannot be checked.
- [x] 6.8 Keep non-required browser validation explicitly degraded rather than silently passing browser-only checks.

## 7. Documentation And Skill Guidance

- [x] 7.1 Update `.agents/skills/html-work-reports/SKILL.md` to state that runtime-cdn is the default Codex-visible report path and that pre-rendered/offline output is explicit.
- [x] 7.2 Update `.agents/skills/html-work-reports/references/html-report-patterns.md` with the new render mode contract, visual quality contract, grouped navigation model, runtime dependency policy, and validator expectations.
- [x] 7.3 Update runtime examples in `html-report-patterns.md` to use pinned Mermaid, Marked, DOMPurify, and highlight.js, with sanitizer and failure-state rules.
- [x] 7.4 Update template references and examples so generated reports no longer imply flat navigation or weak fallback-only Mermaid as a success state.
- [x] 7.5 Update `docs/skill-routing.md` only if wording is required to preserve the existing routing boundary; do not broaden the skill trigger just to describe implementation details.

## 8. Showcase And Generated Report Verification

- [x] 8.1 Regenerate or replace `reports/html-work-reports-feature-showcase.html` from fixture-backed input so it demonstrates runtime-cdn rendering, grouped navigation, Mermaid, Markdown, code highlighting, evidence, verification, and controls.
- [x] 8.2 Generate a stress report from `runtime-cdn-stress-report.json` under `reports/` for local visual inspection.
- [x] 8.3 Run `validate-html-report.mjs` with `--require-browser` against the stress report and capture any failures before final polish.
- [x] 8.4 Use Codex/browser or Playwright inspection to visually verify that Mermaid text does not overflow its panel, code panels are readable, and directory sections do not overlap content.

## 9. Validation Gates

- [x] 9.1 Run `bun test ./tests/htmlWorkReportsSkill.test.ts`.
- [x] 9.2 Run `bun .agents/skills/html-work-reports/scripts/create-report.mjs --input .agents/skills/html-work-reports/assets/fixtures/runtime-cdn-stress-report.json --out-dir reports --slug html-work-reports-runtime-cdn-stress --json`.
- [x] 9.3 Run `bun .agents/skills/html-work-reports/scripts/validate-html-report.mjs reports/html-work-reports-runtime-cdn-stress.html --json --require-browser`.
- [x] 9.4 Run `openspec validate polish-html-work-reports-runtime-quality`.
- [x] 9.5 Run `git diff --check`.
- [x] 9.6 Run `bun run validate`.

## 10. Content-First Correction

- [x] 10.1 Make root `evidence` optional in the schema and generator; do not force empty evidence, verification, or next-action sections into concise reports.
- [x] 10.2 Hide runtime dependency details by default while preserving a machine-readable dependency manifest for validation.
- [x] 10.3 Change grouped navigation so it follows the report's content structure; do not synthesize 图表、代码、证据、验证、下一步 groups unless matching content exists.
- [x] 10.4 Update `SKILL.md` and `references/html-report-patterns.md` with the failure lesson: diagrams, code, icons, evidence, and render-status tags are optional tools, not proof of report quality.
- [x] 10.5 Add a concise-report regression test proving minimal Chinese reports do not receive forced optional modules and still validate.
