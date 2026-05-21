# Effective Interact Decision Quality Plan

Date: 2026-05-18

This document records the planning contract for the OpenSpec change `advance-effective-interact-decision-quality`.

## Status

Implemented in the OpenSpec change `advance-effective-interact-decision-quality`.

The active OpenSpec artifacts live under:

- `openspec/changes/advance-effective-interact-decision-quality/proposal.md`
- `openspec/changes/advance-effective-interact-decision-quality/design.md`
- `openspec/changes/advance-effective-interact-decision-quality/specs/effective-interact-generation/spec.md`
- `openspec/changes/advance-effective-interact-decision-quality/tasks.md`

## Implementation Result

The implemented contract keeps existing minimal artifact inputs compatible while adding optional decision-quality fields:

- `intent` for audience, primary question, decision, time budget, artifact kind, and success criteria.
- `claims[]` for key conclusions, risks, metrics, trends, recommendations, and assumptions.
- richer `evidence[]` records with ids, source metadata, command/file anchors, dates, known limits, and trust level.
- `chart` sections for bounded static `bar`, `line`, `sparkline`, `bullet`, `slope`, and `matrix` visuals.
- runtime dependency audit metadata with pinned versions and integrity exemptions where SRI is not maintained.
- decision-brief quality warnings for weak BLUF, more than three top-level claims, and missing next action or CTA.
- advisory rich-content opportunity warnings so flow/routing prose can move to Mermaid and central file-line evidence can move to code or diff sections only when that lowers reading cost.
- warning policy: validator warnings are prompts for judgment, not required fixes; keep and explain a noisy warning instead of adding gratuitous rich rendering.
- validator checks for intent, claim/evidence links, chart accessibility, runtime auditability, unsafe sinks, focus visibility, reduced motion, chart containment, decision-brief structure, and rich-content opportunity signals.
- case-derived HTML effectiveness patterns for option galleries, module maps, flow drilldowns, PR writeups, explorable explainers, status timelines, and disposable export editors while keeping decks routed to `frontend-slides`.
- browser interaction validation now treats target-section focus/highlight as valid navigation evidence for dense long-table artifacts and falls back to a DOM click when coordinate or keyboard copy probes miss a visible copy button.

New fixture inputs live under `skills/effective-interact/assets/fixtures/`:

- `concise-handoff-report.json`
- `decision-quality-report.json`
- `option-gallery-report.json`
- `disposable-export-editor-report.json`
- `chart-accessibility-stress-report.json`
- `trigger-scope-retro-report.json`
- `decision-brief-self-check-report.json`

Intermediate generated artifacts default to ignored `skills/effective-interact/artifacts/`. Generated HTML for local maintainer inspection can use ignored `reports/`, but the JSON fixtures are the durable source of truth and generated HTML must not be committed:

- `effective-interact-concise-handoff.html`
- `effective-interact-decision-quality.html`
- `effective-interact-option-gallery.html`
- `effective-interact-disposable-export-editor.html`
- `effective-interact-chart-accessibility-stress.html`
- `effective-interact-trigger-scope-retro.html`
- `effective-interact-decision-brief-self-check.html`

## Operational Selection

`effective-interact` should not optimize for visual richness by default. It should optimize for the reader's next decision.

Use this sequence before selecting components:

1. Set `intent.audience`, `intent.primaryQuestion`, `intent.decision`, and `intent.timeBudget`.
2. Choose one primary artifact pattern: option gallery, module map, flow drilldown, reviewer handoff, explainer, status timeline, or disposable export editor.
3. Add only evidence that makes the conclusion trustworthy.
4. Mark risk, assumption, or missing data that could change the decision.
5. Add Mermaid, code, diff, charts, filters, or export controls only when they reduce reading effort.
6. Keep the first sentence, top three supports, fact/inference/assumption boundary, and next action readable without interaction.
7. Treat validator warnings as advisory; fix only warnings whose fix lowers decision cost.

## Implemented Contract Details

### Intent-first input

Report input should support optional intent metadata:

- audience
- primary question
- decision
- time budget
- artifact kind
- success criteria

These fields guide density, template selection, section order, and whether rich components are justified.

### Traceable claims

Key conclusions, metrics, trends, risks, assumptions, and recommendations should be represented as claims with evidence links. Unsupported claims should be marked as assumptions, open questions, or low-confidence inferences.

### Advisory warnings

Validator warnings are decision aids, not a checklist to clear. A warning should lead to content changes only when the fix makes the artifact shorter, clearer, or more trustworthy for the decision at hand.

This keeps rich rendering from becoming performative:

- Mermaid is used for flow, routing, call-path, architecture, or trigger sequences that are faster to scan than prose.
- Code and diff blocks are used when file-and-line evidence is central to trust.
- Charts are used when the data shape changes the decision.
- No artifact should add Mermaid, code, diff, chart, claims, or controls just to silence an advisory warning.

### Bounded charts

The skill should add a constrained chart section before considering any broader visualization runtime. The first supported chart types should be:

- bar
- line
- sparkline
- bullet
- slope
- matrix

Every chart needs a title, textual takeaway, data, source metadata, alt text or equivalent description, and a table fallback.

### Accessibility and static understanding

The artifact must keep its main conclusion understandable without hover, click, animation, or network-only enhancement.

Validation should cover:

- document title and `lang`
- semantic headings and landmarks
- keyboard-operable controls
- visible focus
- reduced-motion CSS
- chart text alternatives and table fallback
- non-color-only status encoding
- no body-level overflow or major overlap across representative viewports

### Runtime and trust boundaries

Runtime CDN remains allowed for browser-visible artifacts, but dependencies should be pinned and auditable. Where practical, generated tags should include SRI metadata.

Report content should distinguish:

- trusted generated content
- mixed-trust content
- untrusted content

The generator should escape, sanitize, or reject values according to their output context.

## Implementation Phases

1. Baseline and scope check.
2. Schema and fixtures.
3. Generator behavior.
4. Accessibility, security, and runtime audit.
5. Validator and AI acceptance.
6. Skill and project docs.
7. Final validation and focused review.

The implementation checklist is the source of truth in `openspec/changes/advance-effective-interact-decision-quality/tasks.md`.

## Acceptance Summary

This implementation should be accepted only when:

- existing minimal artifact inputs still work;
- new intent, claim, evidence, and chart inputs generate valid artifacts;
- generated charts include textual takeaways and table fallbacks;
- mixed-trust content stays inert;
- runtime dependencies are pinned and auditable;
- validator output identifies actionable failures;
- validator warnings catch weak BLUF, too many top-level claims, and missing next action or CTA;
- validator warnings identify missed Mermaid/code/diff opportunities without forcing noise into concise artifacts;
- option comparison uses an `option-gallery` style fixture rather than a Markdown wall;
- lightweight editor guidance requires visible Markdown, JSON, diff, or checklist export and forbids hidden writes;
- validator warnings are labeled advisory and may be kept when a richer rendering would not lower decision cost;
- browser-required validation passes for runtime-cdn fixture artifacts when browser support is available;
- `bun run validate` passes;
- the diff remains scoped to `effective-interact` and related tests/docs.

## Validation Commands

Focused local fixture generation:

```powershell
bun skills/effective-interact/scripts/create-interaction.mjs --input skills/effective-interact/assets/fixtures/concise-handoff-report.json --out-dir reports --slug effective-interact-concise-handoff --json
bun skills/effective-interact/scripts/create-interaction.mjs --input skills/effective-interact/assets/fixtures/decision-quality-report.json --out-dir reports --slug effective-interact-decision-quality --json
bun skills/effective-interact/scripts/create-interaction.mjs --input skills/effective-interact/assets/fixtures/option-gallery-report.json --out-dir reports --slug effective-interact-option-gallery --json
bun skills/effective-interact/scripts/create-interaction.mjs --input skills/effective-interact/assets/fixtures/disposable-export-editor-report.json --out-dir reports --slug effective-interact-disposable-export-editor --json
bun skills/effective-interact/scripts/create-interaction.mjs --input skills/effective-interact/assets/fixtures/chart-accessibility-stress-report.json --out-dir reports --slug effective-interact-chart-accessibility-stress --json
bun skills/effective-interact/scripts/create-interaction.mjs --input skills/effective-interact/assets/fixtures/trigger-scope-retro-report.json --out-dir reports --slug effective-interact-trigger-scope-retro --json
bun skills/effective-interact/scripts/create-interaction.mjs --input skills/effective-interact/assets/fixtures/decision-brief-self-check-report.json --out-dir reports --slug effective-interact-decision-brief-self-check --json
```

Focused local fixture validation:

```powershell
bun skills/effective-interact/scripts/validate-interaction.mjs reports/effective-interact-concise-handoff.html --json --skip-browser
bun skills/effective-interact/scripts/validate-interaction.mjs reports/effective-interact-decision-quality.html --json --skip-browser
bun skills/effective-interact/scripts/validate-interaction.mjs reports/effective-interact-option-gallery.html --json --skip-browser
bun skills/effective-interact/scripts/validate-interaction.mjs reports/effective-interact-disposable-export-editor.html --json --require-browser
bun skills/effective-interact/scripts/validate-interaction.mjs reports/effective-interact-chart-accessibility-stress.html --json --require-browser
bun skills/effective-interact/scripts/validate-interaction.mjs reports/effective-interact-trigger-scope-retro.html --json --require-browser
bun skills/effective-interact/scripts/validate-interaction.mjs reports/effective-interact-decision-brief-self-check.html --json --require-browser
```

Final gates:

```powershell
openspec validate advance-effective-interact-decision-quality
bun test ./tests/effectiveInteractSkill.test.ts
scripts/validate-skills.ps1 -SkipExternal
bun run validate
git diff --check
```

## Source Notes

This plan is informed by:

- Thariq Shihipar's HTML effectiveness examples: `https://thariqs.github.io/html-effectiveness/`
- W3C WAI accessibility principles: `https://www.w3.org/WAI/fundamentals/accessibility-principles/`
- USWDS data visualization guidance: `https://designsystem.digital.gov/components/data-visualizations/`
- Nielsen Norman Group dashboard cognition guidance: `https://www.nngroup.com/articles/dashboards-preattentive/`
- MDN Subresource Integrity guidance: `https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity`
- OWASP XSS Prevention Cheat Sheet: `https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html`
- JSON Schema overview: `https://json-schema.org/overview/what-is-jsonschema`
- Bret Victor's explorable explanations essay: `https://worrydream.com/ExplorableExplanations/`
