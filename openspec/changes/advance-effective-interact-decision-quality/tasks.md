## 1. Baseline and Scope

- [x] 1.1 Re-check branch state, active OpenSpec changes, and current `effective-interact` files before editing.
- [x] 1.2 Run baseline focused checks for the current skill: `bun test ./tests/effectiveInteractSkill.test.ts` and `openspec validate advance-effective-interact-decision-quality`.
- [x] 1.3 Confirm implementation scope is limited to `skills/effective-interact/`, `tests/effectiveInteractSkill.test.ts`, docs, reports/fixtures, and this OpenSpec change unless a task explicitly expands scope.

## 2. Schema and Fixtures

- [x] 2.1 Extend `skills/effective-interact/references/interaction-input-schema.json` with optional artifact intent fields: audience, primary question, decision, time budget, artifact kind, and success criteria.
- [x] 2.2 Extend the schema with `claims[]` and richer `evidence[]` fields for evidence ids, confidence, date range, known limits, source metadata, command/file anchors, and trust level.
- [x] 2.3 Add a constrained `chart` section schema supporting bar, line, sparkline, bullet, slope, and matrix charts with title, takeaway, data, encoding, source, alt text, and table fallback.
- [x] 2.4 Add or update fixtures for concise handoff, decision report with claims/evidence, and chart/accessibility stress coverage under `skills/effective-interact/assets/fixtures/`.
- [x] 2.5 Add schema/fixture tests that prove old minimal inputs still generate without requiring the new optional fields.

## 3. Generator Behavior

- [x] 3.1 Update `skills/effective-interact/scripts/create-interaction.mjs` to infer conservative artifact intent when explicit intent is missing.
- [x] 3.2 Render artifact intent in the conclusion-first area without pushing evidence, runtime dependencies, or component plumbing ahead of the answer.
- [x] 3.3 Render claims with traceable evidence links and clear confidence/assumption/known-limit states.
- [x] 3.4 Implement constrained static chart rendering with table fallback and source metadata; reject or degrade unsupported chart specs.
- [x] 3.5 Preserve old section rendering behavior for markdown, Mermaid, code, diff, data table, tabs, filters, evidence, verification, and actions.

## 4. Accessibility, Security, and Runtime Audit

- [x] 4.1 Add accessibility-oriented markup for chart descriptions, table fallback, control labels, headings, landmarks, and focusable controls.
- [x] 4.2 Add or strengthen reduced-motion, focus-visible, non-color-only status, and contrast-oriented CSS rules in report components.
- [x] 4.3 Add runtime dependency integrity metadata where practical and expose documented exemptions for dependencies that cannot be SRI-checked.
- [x] 4.4 Add trust-level handling so mixed-trust and untrusted content are escaped, sanitized, or rejected in the correct output context.
- [x] 4.5 Keep diagnostic sanitization for local paths, `file:///` URLs, token-shaped secrets, raw HTML, event handlers, and unsupported protocols.

## 5. Validator and AI Acceptance

- [x] 5.1 Extend `validate-interaction.mjs` static checks for intent metadata, claim/evidence relationships, chart accessibility fields, runtime integrity metadata, and unsafe sinks.
- [x] 5.2 Extend browser validation for keyboard-operable representative controls, visible focus, reduced-motion behavior, chart containment, and interaction-independent conclusions.
- [x] 5.3 Add validator output that identifies the affected claim, chart, viewport, selector, or dependency when checks fail.
- [x] 5.4 Add tests proving unsupported important claims warn/fail, unsupported chart specs degrade/reject, and mixed-trust content remains inert.
- [x] 5.5 Generate fixture reports and validate them through the normal generator/validator path, including `--require-browser` for runtime-cdn fixtures where available.

## 6. Skill and Project Documentation

- [x] 6.1 Update `skills/effective-interact/SKILL.md` with the shortened intent-first workflow and keep heavy rules out of the root skill body.
- [x] 6.2 Update `skills/effective-interact/references/interaction-patterns.md` with intent, claims, charts, accessibility, trust model, runtime SRI, and AI acceptance guidance.
- [x] 6.3 Update `docs/effective-interact-decision-quality.md` after implementation with the final contract, examples, and validation commands.
- [x] 6.4 Update `docs/skill-routing.md`, `docs/skill-feature-inventory.md`, or README only if implementation changes user-facing routing or capability summary.

## 7. Final Validation and Review

- [x] 7.1 Run `openspec validate advance-effective-interact-decision-quality`.
- [x] 7.2 Run `bun test ./tests/effectiveInteractSkill.test.ts`.
- [x] 7.3 Run `scripts/validate-skills.ps1 -SkipExternal`.
- [x] 7.4 Run `bun run validate`.
- [x] 7.5 Run `git diff --check`.
- [x] 7.6 Perform a focused diff review confirming the change did not broaden into product UI, bundled apps, slide decks, or unrelated skill routing.

## 8. Rich Rendering Follow-up

- [x] 8.1 Add a validator warning for missed Mermaid/code/diff opportunities when flow prose or file-line evidence is flattened into generic sections.
- [x] 8.2 Update the trigger-scope retro fixture and generated artifact to use runtime Markdown, Mermaid, and code highlighting where they reduce reading effort.
- [x] 8.3 Document the rich-content opportunity rule without requiring every concise report to include diagrams or snippets.
- [x] 8.4 Add decision-brief self-check rules for BLUF, Top 3 support, fact/inference/assumption boundaries, and CTA or next action.
- [x] 8.5 Label decision-brief and rich-content warnings as advisory so reports do not add Mermaid/code/diff/chart/claims just to clear warnings.
