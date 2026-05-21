---
name: hub-maintenance-workflow
description: "Load when maintaining Skill Hub itself: evaluating skill sources, routing, profiles, capabilities, npm lifecycle, or managed update/remove behavior; preserve local adaptations."
---

# Hub Maintenance Workflow

Use this owner for Skill Hub repository work.

## Workflow

1. Align the maintenance goal and whether it is docs, skill, profile, CLI lifecycle, or source evaluation work.
2. Gather required material: `docs/source-projects.md`, `docs/workflow-source-dossier.md`, `docs/skill-routing.md`, `capabilities/index.json`, relevant skills, and tests.
3. Write or update spec and acceptance before mutating installable behavior.
4. Write an executable plan with cleanup decisions and validation commands.
5. Clean unneeded files only when ownership is clear; preserve source evidence and unrelated user edits.
6. Apply narrow changes.
7. Validate with routing tests, `scripts/validate-skills.ps1 -SkipExternal`, and `bun run validate` when TypeScript, tests, capabilities, or CLI behavior changed.
8. Use `effective-interact` for material handoff reports.

## Source And Evaluation Inputs

Use repo-local source records and deterministic project files instead of delegating to removed library skills:

- `docs/source-projects.md` for upstream URLs, versions, license notes, import decisions, and reference-only candidates.
- `docs/workflow-source-dossier.md` for lifecycle-stage comparisons across Matt Pocock skills, Superpowers, ECC, OpenSpec, Effective Interact, Vercel, Ralph, and local docs.
- `docs/skill-routing.md` for overlap and trigger decisions.
- `capabilities/index.json` for the installable component surface.
- `skill-hub` CLI dry-runs for target-repo analyze/install/status/update/remove behavior.
- `skill-creator` for standard skill authoring, adaptation, and routing-evaluation details.
- `doc-coauthoring` for durable proposals or decision records when the maintenance change needs a reviewed document.

For any parallel source review, hook proposal, or lifecycle smoke split, follow `workflow-router/references/orchestration-policy.md`: subagents must have independent scopes, hooks stay advisory by default, and lock-backed lifecycle checks remain deterministic.

Do not wholesale replace local skills with upstream text. Do not bypass lock-backed install, update, status, or remove behavior.
