# Changelog

## 0.1.6 - 2026-05-20

- Migrate schema version 2 managed `skill:html-work-reports` lock records to `skill:effective-interact` during `skill-hub update`, after hash checks and while replacing an existing same-name `effective-interact` skill destination.

## 0.1.5 - 2026-05-18

- Rename `html-work-reports` to `effective-interact` and broaden it into a visual HTML interaction skill for alignment, option comparison, reviews, architecture walkthroughs, explainers, status artifacts, and lightweight export editors.
- Add an HTML usefulness gate and default generated intermediate artifacts to the ignored skill-local `artifacts/` directory while keeping durable examples under `reports/`.

## 0.1.4 - 2026-05-15

- Move project-local skills from `.agents/skills` to Codex-native `.codex/skills`.
- Route managed skill installs to each selected agent host directory: `.codex/skills`, `.opencode/skills`, or `.claude/skills`.

## 0.1.3 - 2026-05-15

- Skip system `skill-creator` quick validation in CI when the host-only validator is unavailable.

## 0.1.2 - 2026-05-15

- Make release validation run the skill validator through Windows PowerShell or PowerShell Core.

## 0.1.0 - Initial npm release

- Package `skill-hub` as a Node-compatible CLI.
- Support target-repo `analyze`, `install`, `status`, `update`, `migrate-lock`, and `remove` lifecycle commands.
- Include curated Codex/OpenCode/Claude Code skill profiles, harness templates, and release validation.
