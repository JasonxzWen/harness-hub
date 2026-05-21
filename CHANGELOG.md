# Changelog

## 0.1.9 - 2026-05-21

- Broaden `effective-interact` into a low-noise complex communication skill that selects plain text, Markdown, visual Markdown, or HTML by decision cost instead of answer length alone.
- Absorb the HTML effectiveness reference cases into trigger evals, pattern references, warm neutral visual tokens, and new implementation-plan, visual-exploration, and editor-workbench templates.
- Add optional ignored long-task fact ledgers and route generated HTML/intermediate artifacts into ignored local directories instead of tracked `reports/`.
- Bump `skill:effective-interact` to `0.2.0` so managed installs can detect and apply the strengthened communication contract through `skill-hub update`.

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
- Migrate schema version 2 managed `skill:html-work-reports` lock records to `skill:effective-interact` during `skill-hub update`, after hash checks and while replacing an existing same-name `effective-interact` skill destination.

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

- Package `skill-hub` as a Node-compatible CLI.
- Support target-repo `analyze`, `install`, `status`, `update`, `migrate-lock`, and `remove` lifecycle commands.
- Include curated skill profiles, harness templates, and release validation.
