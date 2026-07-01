# Changelog

## Unreleased

## 0.4.0 - 2026-07-01

- Connect dense private `insight` audits to `effective-interact` by adding optional visual-report input generation with evidence coverage, bottlenecks, recommendations, task clusters, trace audit, and evidence boundaries.
- Expand installed `effective-interact` activation for the source-derived HTML effectiveness families, including Exploration & Planning, Code Review & Understanding, Design, Reports, and Custom Editors.
- Rework `effective-interact` HTML generation around component-first `DESIGN.md` contracts, refreshed warm neutral report styling, stricter visible-content validation, real static code highlighting checks, and complete-status consistency checks.
- Add `presentation.show*` controls so root claims, evidence, verification, next actions, hero counters, and visible success criteria stay machine-readable but hidden from human reports unless explicitly opted in.
- Add an explicit workflow handoff waiver gate through `--html-handoff-waiver <reason>` / `--handoff-waiver <reason>` for material delivery where an `effective-interact` handoff is intentionally skipped.
- Compatibility: root `template` inputs for `effective-interact` reports are no longer supported; callers must use `intent.artifactKind` and explicit component sections.

## 0.3.0 - 2026-06-29

- Make `standard` the only user-facing target path, replace stale harness-pack/minimal wording with a standard target boundary, and verify external target bootstrap/install output does not copy Harness Hub source-repo material.
- Add Loop Control Plane assets to the standard harness, including interrupt policy/evals, local runtime ledgers, and `harness-hub loop evaluate` / `harness-hub loop schedule` commands for auditable continue-or-interrupt decisions.
- Add the standard LLM Wiki/context pack with managed schema, update rules, Markdown wiki templates, validation, local-state content pages, and a portable Obsidian profile under `.harness-hub/context`.
- Rename public source-backed publishing from `insight` to `source-post`, including the CLI command group, installable skill, docs, workflow, OpenSpec change, tests, and GitHub Pages output path; old `harness-hub insight ...` public publishing commands now fail with migration guidance, and `insight` is reserved for private repository interaction audits.
- Fix localized Chinese README publishing guidance so public source-backed posts use `source-post` while `insight` remains private repository interaction audit terminology.

## 0.2.0 - 2026-06-25

- Add the standard `insight` skill for private repository interaction audits across Codex and Claude Code traces.
- Add `insight` collection and report scripts with evidence classes, repo affinity, confidence scoring, task clusters, parsed tool-branch review, JSONL tail sampling, and ignored local Markdown reports.
- Register `insight` in the standard capability and routing surfaces with regression coverage for evidence weighting, Chinese JSONL excerpts, successful handoff handling, and parsed tool-call review.

## 0.1.14 - 2026-06-08

- Add a PR release-impact policy, pull request template, and regression coverage so release decisions are explicit without publishing npm `latest` from PRs.
- Route wide repo or skill capability/structure/function/implementation explainers through `effective-interact` as read-only HTML-first communication artifacts instead of ordinary prose or change requests.
- Add visual-structure advisory validation for Effective Interact HTML artifacts and non-HTML mode structure checks so loaded skill outputs do not collapse into linear prose.
- Bump shipped managed component versions for `skill:workflow-router` and `skill:effective-interact` so managed installs can detect the updated behavior.

## 0.1.13 - 2026-06-04

- Add Codex worktree preflight checks so write tasks hard-fail when repo-local skill wrappers or harness state are missing, while read-only tasks receive a soft warning.
- Add safe Codex worktree setup that syncs ignored `.codex/skills/` copies, fills missing `.harness-hub/state/` templates, preserves existing task state by default, and requires `--reset-state` or `--fresh` for intentional local state resets.
- Document the Codex worktree startup gate and keep the local dogfooding scripts in the npm package manifest and artifact policy.

## 0.1.12 - 2026-06-03

- Add read-only `harness-hub check <target> --json` startup checks with separate `cli` and `target` sections.
- Report npm registry CLI freshness and target lock-managed component freshness without applying updates or blocking startup.
- Add the check command to the minimal root harness standard startup path and bump `harness:minimal` to `0.5.2`.

## 0.1.11 - 2026-05-29

- Keep Harness Hub minimal-only: document the single `init-harness --target standard` migration path, including npm and source-clone bootstrap instructions.
- Record ECC and `revfactory/harness` as source material only, with useful ideas folded into the existing minimal path instead of creating packs or levels.
- Strengthen `validate-harness` with QA boundary checks, agent architecture boundary checks, and skill trigger-hygiene auditing.

## 0.1.10 - 2026-05-28

- Rename the project, package, CLI, source entrypoint, docs, specs, and release workflows to Harness Hub.
- Publish the scoped `@jasonwen/harness-hub` package with only the `harness-hub` binary and `.harness-hub` managed state.
- Remove selectable install profiles entirely: `analyze`, `install`, and `init` now operate on the complete standard skill set.
- Remove harness template components and package contents so the lifecycle CLI manages only platform-neutral `skills/<name>/` directories.
- Remove retired Ralph PRD/story-loop skills and distribution entries now that native Codex and Claude Code goal/story workflows cover that lane.
- Drop the Ralph PRD example script from package contents and keep remaining SDD routing focused on platform-neutral workflow owners and helper atoms.
- Add `validate-harness` assessment reporting with five subsystem scores, HTML output, generic verification-command detection, and benchmark summary guidance.

## 0.1.9 - 2026-05-21

- Broaden `effective-interact` into a low-noise complex communication skill that selects plain text, Markdown, visual Markdown, or HTML by decision cost instead of answer length alone.
- Absorb the HTML effectiveness reference cases into trigger evals, pattern references, warm neutral visual tokens, and new implementation-plan, visual-exploration, and editor-workbench templates.
- Add optional ignored long-task fact ledgers and route generated HTML/intermediate artifacts into ignored local directories instead of tracked `reports/`.
- Bump `skill:effective-interact` to `0.2.0` so managed installs can detect and apply the strengthened communication contract through `harness-hub update`.

## 0.1.8 - 2026-05-21

- Add selective Anthropic-derived atomic skills for Claude API, MCP building, skill authoring, internal communications, theme selection, and Slack GIF creation, plus a local-original `doc-coauthoring` atom.
- Add `platform`, `communications`, and `creative` capability profiles and wire helper atoms into SDD/web routing without making them top-level workflow owners.
- Refresh the non-ECC source inventory, capability map, workflow source dossier, routing docs, and the HTML atomic skill selection report with installed/reference/license-blocked decisions.

## 0.1.7 - 2026-05-21

- Add the explicit `sdd` profile with `workflow-router`, public workflow owner skills, embedded TDD helpers, Effective Interact handoff expectations, and the Ralph goal-loop bridge.
- Remove non-component skill directories from the active `skills/` source tree after preserving source decisions, and keep npm packaging aligned to installable platform-neutral skills.
- Document SDD-first workflow routing, subagent boundaries, advisory hook policy, physical cleanup decisions, and source-project lineage.

## 0.1.6 - 2026-05-20

- Move the source skill tree to standard `skills/`, remove host-specific skill metadata, and add Claude plugin manifests.
- Migrate schema version 2 managed `skill:html-work-reports` lock records to `skill:effective-interact` during `harness-hub update`, after hash checks and while replacing an existing same-name `effective-interact` skill destination.

## 0.1.5 - 2026-05-18

- Rename `html-work-reports` to `effective-interact` and broaden it into a visual HTML interaction skill for alignment, option comparison, reviews, architecture walkthroughs, explainers, status artifacts, and lightweight export editors.
- Add an HTML usefulness gate and default generated intermediate artifacts to the ignored skill-local `artifacts/` directory while keeping durable examples under `reports/`.

## 0.1.4 - 2026-05-15

- Move project-local skills from `.agents/skills` to `skills`.
- Route managed skill installs to selected agent host directories.

## 0.1.3 - 2026-05-15

- Skip system `skill-creator` quick validation in CI when the host-only validator is unavailable.

## 0.1.2 - 2026-05-15

- Make release validation run the skill validator through Windows PowerShell or PowerShell Core.

## 0.1.0 - Initial npm release

- Package `harness-hub` as a Node-compatible CLI.
- Support target-repo `analyze`, `install`, `status`, `update`, `migrate-lock`, and `remove` lifecycle commands.
- Include curated skill profiles, harness templates, and release validation.
