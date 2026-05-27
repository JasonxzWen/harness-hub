# Skill Quality Rollout Plan

Date: 2026-05-12

This plan upgrades Skill Hub from a curated skill collection into a governed skill-quality system. The work is intentionally staged so existing imported skills remain usable while local quality gates tighten over time.

Current direction note: Skill Hub now optimizes for personal workflow distribution with a routing overlay. Quality work should preserve upstream skill bodies by default and treat inventory findings as report-only unless they reveal a real routing, safety, source, or distribution problem.

## Goals

- Make routing precision and distribution safety first-class review targets.
- Add an evaluation path before changing routing-sensitive text.
- Keep the standard install surface curated and low-noise.
- Preserve third-party attribution while avoiding local style rewrites of imported skill bodies.
- Avoid rewriting imported skills without a concrete routing, safety, source, or distribution reason.

## Non-Goals

- Do not rewrite imported skills for style consistency.
- Do not make every warning a failing gate immediately.
- Do not add a new broad "skill quality" skill just to repeat this document.
- Do not copy volatile tool docs into skills.
- Do not change CLI mutating behavior as part of the documentation rollout.

## Current Baseline

Observed after the Phase 2/3 seed on 2026-05-12:

- 66 skills validate successfully with the existing validator.
- All scanned skill names match their directory names.
- All scanned skills have descriptions.
- 10 descriptions are over the 50-word target.
- 2 scanned descriptions start with `Load when`: `effective-interact` and `feynman-learning-coach`.
- Some local/adapted skills already use progressive spokes, including `compound-code-review`, `feynman-learning-coach`, `effective-interact`, and `prototype`.
- `scripts/skill-quality-inventory.ts` emits a report-only JSON inventory for description length, `Load when` triggers, name/directory matching, body size, spokes, and imported/adapted metadata warnings.
- `tests/fixtures/skill-routing-cases.json` seeds positive, negative, and forbidden-load cases for the high-overlap skills listed in Phase 3, plus the first local description-refactor demo.

## Phase 1: Governance Documents

Deliverables:

- Add `docs/skill-quality-guide.md`.
- Link the guide from `README.md`.
- Update `AGENTS.md` so future agents know description changes are routing changes.
- Update `docs/skill-evaluation-policy.md` to require routing and quality checks.
- Update `docs/skill-routing.md` to make the guide the shared quality baseline.

Verification:

- `bun run validate`
- Manual consistency review across `README.md`, `AGENTS.md`, `docs/skill-routing.md`, `docs/skill-evaluation-policy.md`, and `docs/capability-map.md`.

## Phase 2: Quality Inventory And Non-Failing Lint

Deliverables:

- Add a script or test helper that inventories:
  - description word count
  - whether description starts with `Load when`
  - body size proxy
  - missing spokes for large bodies
  - missing source/license metadata for adapted skills
- Emit a report first; do not fail existing imported skills.
- Add a checked-in baseline artifact only if it is stable and useful for reviewers.

Verification:

- Existing `bun run validate` remains green.
- The inventory report is deterministic after normalizing timestamps.

Current status:

- `scripts/skill-quality-inventory.ts` provides the report-only inventory.
- No checked-in baseline artifact is maintained yet; current counts are summarized above.

## Phase 3: Routing Eval Fixtures

Deliverables:

- Add a fixture format such as `tests/fixtures/skill-routing-cases.json`.
- For each installed skill, include:
  - positive examples
  - negative adjacent examples
  - forbidden-load examples
- Add tests that verify every routing-sensitive installed skill has at least one case in each bucket.
- Add focused cases for high-overlap skills first: `diagnose`, `agent-introspection-debugging`, `prototype`, `frontend-design`, `effective-interact`, `compound-code-review`, `security-review`, and `verification-loop`.

Verification:

- Fixture schema test passes.
- Routing documentation mentions the same overlap boundaries as the fixtures.

Current status:

- `tests/fixtures/skill-routing-cases.json` covers the initial high-overlap set and `feynman-learning-coach`.
- `tests/skillRoutingCases.test.ts` validates schema, required case coverage, docs boundaries, and capability overlap relationships.

## Phase 4: Routing Description Cleanup

Deliverables:

- Convert local routing and workflow-owner descriptions to the preferred `Load when` form when it improves routing.
- Keep local routing descriptions under 50 words unless a documented exception is needed.
- Leave imported skill descriptions unchanged unless they are causing a real routing conflict.
- Update tests that assert old wording to assert routing intent instead of implementation wording.
- Align `capabilities/index.json` `routing` and `recommendation` text with the revised triggers.

Order:

1. Local owner and routing overlay skills.
2. Capability metadata and routing docs for recurring conflicts.
3. Imported skill descriptions only when a conflict cannot be solved in the overlay.

Verification:

- Positive/negative/forbidden evals exist before each semantic description change.
- `bun run validate`
- `git diff --check`

## Phase 5: Progressive Loading Refactor

Deliverables:

- Split heavy `SKILL.md` bodies into `references/`, `scripts/`, and `assets/` where useful.
- Prefer scripts for deterministic transformations and validators.
- Add tests for spoke existence and conditional references for high-risk skills.
- Keep source attribution in docs when detailed source history would bloat `SKILL.md`.

Priority candidates:

- Long built-in document/media skills where file-format mechanics can move to references.
- General workflow skills with repeated examples that can become gotchas or references.
- Skills with reusable templates or schemas embedded in the body.

Verification:

- Body-size inventory improves without losing source notes or routing clarity.
- Existing skill behavior remains covered by tests or explicit review notes.

## Phase 6: CLI And Report Integration

Deliverables:

- Expose quality findings through `skill-hub analyze` or a dedicated report only after the lint data is stable.
- Add quality metadata to `capabilities/index.json` only if it has a clear install or recommendation use.
- Keep mutating install/remove behavior unchanged.

Verification:

- JSON output remains deterministic.
- HTML reports remain readable and do not overstate warnings as blockers.

## Phase 7: Release Gate

Before opening a PR for the full quality rollout:

- `bun run validate`
- `openspec validate release-cli-capability-lifecycle` if the OpenSpec change is still active and relevant.
- `git diff --check`
- `npm pack`
- Disposable target smoke flow for `analyze/install/status/remove` if CLI behavior changed.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Description churn breaks routing. | Require routing evals before semantic description changes. |
| Imported skills are rewritten without evidence. | Start with inventory and local/adapted skills; leave imported skills on warnings first. |
| Quality rules duplicate existing global instructions. | Keep global behavior in `AGENTS.md`; keep conditional skill guidance in this guide. |
| Lint gates block unrelated work. | Introduce non-failing reports before required checks. |
| Capability metadata drifts from skill frontmatter. | Add consistency tests after the description refactor begins. |

## Acceptance Criteria

The rollout is complete when:

- The quality guide is the referenced standard for skill authoring and review.
- New or changed installable skills include routing eval evidence.
- Installed routing-sensitive local overlay skills have positive, negative, and forbidden routing cases.
- Description changes in local routing/workflow-owner skills are treated as routing changes in review.
- Progressive loading is used for heavy or conditional local content when it reduces context cost.
- Validation and docs agree on the same source of truth.
