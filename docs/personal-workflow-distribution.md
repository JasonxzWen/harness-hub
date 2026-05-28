# Personal Workflow Distribution

This repository is now the Harness Hub source: a personal workflow distribution and repo-harness layer for reusing the same agent tools and root harness contracts across multiple projects. Skill Hub remains the compatible skill-distribution subsystem. It is not a public skill marketplace and does not need broad platform governance unless that directly helps personal maintenance.

## Rules

1. Preserve upstream skills by default.
   - Do not rewrite imported `SKILL.md` bodies for house style, description shape, progressive-loading style, or platform-neutral wording alone.
   - Edit imported skill content only when the upstream text is unsafe, unusable in this repository, legally unclear, or directly conflicts with the routing overlay.
   - Prefer recording local decisions in `docs/source-projects.md`, `docs/skill-routing.md`, `capabilities/index.json`, or this document instead of modifying upstream text.

2. Put personal behavior in the overlay.
   - Top-level workflow behavior belongs in `AGENTS.md`, `skills/workflow-router/`, owner workflow skills, and `docs/skill-routing.md`.
   - Imported skills can keep different voices and workflows. Routing decides when they are used.
   - If two skills overlap, fix the routing rule or capability metadata before editing either skill body.

3. Keep distribution simple.
   - Keep the complete standard install as the default unless a recurring project-specific need proves bundles are worth the extra maintenance.
   - Keep root harness files behind explicit `init-harness`; do not hide them inside default skill installation.
   - Keep install, update, status, and remove lock-backed so target projects can be cleaned up safely.
   - Do not add public-marketplace polish, extra release ceremony, or host-specific wrappers unless they solve an active personal workflow problem.

4. Keep source records thin but useful.
   - Record source repo, version or commit when known, license status, local status, and the reason the skill is included.
   - A source record is enough for provenance; imported skills do not need local frontmatter churn solely for consistency.
   - Source review can be lightweight for personal use, but unclear license or unsafe side effects should block default distribution.

5. Keep formal process optional.
   - Use OpenSpec only for larger behavior, CLI lifecycle, or routing changes that need durable acceptance criteria.
   - For ordinary curation, routing, or documentation changes, use a short plan, a small diff, and the nearest validation command.

## TODO

1. Reframe docs around personal workflow distribution.
   - Update README and project instructions to say the repo distributes a personal workflow toolkit.
   - Make clear that upstream skill style is preserved by default.
   - Link this document from the project map.

2. Simplify curation guidance.
   - Keep source records in `docs/source-projects.md` current enough to update or remove imported skills later.
   - Stop treating description-style warnings as required cleanup for imported skills.
   - Keep quality inventory report-only unless a warning maps to a real routing or distribution bug.

3. Maintain the routing overlay.
   - Keep `workflow-router` and owner workflow skills focused on top-level intent.
   - Add routing cases only when a recurring conflict or wrong trigger appears.
   - Prefer small routing fixes over upstream skill rewrites.

4. Preserve lifecycle safety.
   - Keep target installs lock-backed.
   - Keep `status`, `update`, and `remove` able to distinguish managed files from user-owned target files.
   - Run disposable target smoke checks when CLI lifecycle behavior changes.

5. Defer public-platform work.
   - Do not add bundles, marketplace-oriented docs, broad quality gates, or host-specific packaging unless they become necessary for personal use.
   - Keep external writes, publish actions, credential changes, and automatic hooks behind explicit approval.

## Acceptance Criteria

- README and AGENTS describe Harness Hub as a personal repo harness and workflow distribution repo, not a general skill marketplace.
- Imported skills can be added without rewriting their body text for local style.
- Every default-distributed imported skill has enough source information to identify where it came from and whether it is safe to redistribute personally.
- Top-level routing explains when overlapping skills should be used without forcing the skill bodies to match each other.
- A routing conflict is handled by updating `docs/skill-routing.md`, `capabilities/index.json`, owner workflow guidance, or routing tests before changing upstream content.
- Install/update/remove behavior remains lock-backed and does not delete unmanaged target-project files by name alone.
- Validation stays proportional: docs-only changes at least pass `git diff --check`; routing or capability changes run routing tests; CLI lifecycle changes run the full validation and a disposable target smoke flow.
- No new formal process, bundle selector, marketplace surface, or host-specific wrapper is added unless it solves a recurring personal workflow maintenance problem.
