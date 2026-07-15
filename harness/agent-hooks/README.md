---
type: reference
title: Agent hook templates
---
# Agent Hook Templates

These templates configure Codex and Claude Code to invoke one migrated,
repository-local deterministic safety hook before mutating tool calls.

Full migration installs the selected host configuration into `.codex/` or
`.claude/`, copies the shared hook to `.harness-hub/safety-hook.mjs`, and
installs the matching local skill tree. No package or global binary is required.

For Codex, that split is exact: skills live under `.agents/skills/`, while the
hook configuration remains `.codex/hooks.json`.

The hook contains no Router, Agent dispatch, lifecycle state, trace, or remote
action. It deterministically flags remote writes, destructive operations,
credential mutations, and Host configuration mutations for the native main
Agent; it stays advisory because only the main Agent can interpret explicit
user authorization. Codex loads
`.codex/hooks.json` only for a trusted project; migration never changes trust.
