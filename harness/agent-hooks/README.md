---
type: reference
title: Agent hook templates
---
# Agent Hook Templates

These templates configure Codex and Claude Code to invoke the migrated,
repository-local `workflow-router` hook adapter.

Full migration installs the selected host configuration into `.codex/` or
`.claude/` together with the matching local skill tree. No package or global
binary is required.

For Codex, that split is exact: skills live under `.agents/skills/`, while the
hook configuration remains `.codex/hooks.json`.

The commands are advisory because they omit `--enforce`; they never bypass the
host trust model. Codex loads `.codex/hooks.json` only for a trusted project,
and migration never changes that trust state. Enabling blocking behavior
remains a separate project-owned security decision.
