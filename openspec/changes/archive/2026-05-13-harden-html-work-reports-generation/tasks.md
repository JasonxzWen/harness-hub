## 1. Baseline And Scope Guardrails

- [x] 1.1 Capture current baseline with `bun test ./tests/htmlWorkReportsSkill.test.ts ./tests/skillRoutingCases.test.ts` and `git diff --check`.
- [x] 1.2 Confirm implementation scope is limited to `html-work-reports` assets/scripts/tests/docs plus this OpenSpec change.
- [x] 1.3 Add or update focused tests that fail for missing generation, rich-render validation, and self-contained output behavior before implementing code.

## 2. Report Input Contract And Generator

- [x] 2.1 Define a small JSON report input schema for title, summary, status, sections, evidence, verification, template, and render mode.
- [x] 2.2 Add a generator script under `skills/html-work-reports/scripts/` that accepts structured JSON input and writes `reports/<slug>.html`.
- [x] 2.3 Implement template selection for implementation handoff, review findings, research explainer, and decision matrix scenarios.
- [x] 2.4 Ensure generated output in default mode inlines critical CSS/JS and keeps primary conclusions/evidence readable without network runtime dependencies.

## 3. Rich Content Rendering

- [x] 3.1 Implement Markdown pre-rendering with sanitization and source fallback support.
- [x] 3.2 Implement Mermaid pre-rendering to inline SVG with browser-assisted rendering, source fallback, and visible render errors.
- [x] 3.3 Implement code highlighting for explicit language classes, preserving file path labels and emphasized lines.
- [x] 3.4 Keep runtime rendering mode available only when selected, with pinned dependency declarations and source fallbacks.

## 4. Security And Evidence Handling

- [x] 4.1 Escape user-controlled text by default in report sections, evidence cards, file chips, and action exports.
- [x] 4.2 Restrict rendered links to safe protocols and reject or neutralize `javascript:` style links.
- [x] 4.3 Treat file paths and code snippets as inert text unless explicitly rendered as safe local references.
- [x] 4.4 Add report evidence blocks for files, commands, assumptions, generated date, and verification status.

## 5. Validation And Browser Checks

- [x] 5.1 Add a report validation script or test helper that checks generated HTML for required structure and evidence.
- [x] 5.2 Add browser-capable validation for Markdown tables/lists, Mermaid SVG, code highlighting, filters, tabs, copy buttons, and narrow viewport sanity.
- [x] 5.3 Add a deterministic fallback path when Chrome/Playwright browser automation is unavailable, reporting the degraded checks explicitly.
- [x] 5.4 Add fixtures that prove both default pre-rendered mode and explicit runtime mode work.
- [x] 5.5 Preserve the showcase HTML as an example or fixture and verify it exercises Markdown, Mermaid, code highlight, evidence, filters, tabs, copy, and focus effects.

## 6. Skill And Documentation Updates

- [x] 6.1 Update `SKILL.md` to route generation through the generator first and reserve hand-written HTML for custom exceptions.
- [x] 6.2 Update `references/html-report-patterns.md` with the schema, template choices, render modes, and security rules.
- [x] 6.3 Update template/component assets to use the generator contract and remove duplicated runtime snippets where possible.
- [x] 6.4 Keep the generator and validator documented as internal `html-work-reports` assets; do not expose them as separate installable capability metadata in this change.

## 7. Final Verification

- [x] 7.1 Run `openspec validate harden-html-work-reports-generation`.
- [x] 7.2 Run `bun run typecheck`.
- [x] 7.3 Run `bun test ./tests`.
- [x] 7.4 Run `powershell -ExecutionPolicy Bypass -File ./scripts/validate-skills.ps1 -SkipExternal`.
- [x] 7.5 Run `bun run validate`.
- [x] 7.6 Run `git diff --check` and perform a final review of generated report output.
