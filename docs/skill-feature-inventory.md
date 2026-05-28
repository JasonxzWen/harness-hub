# Skill Feature Inventory

This inventory summarizes the active personal Skill Hub distribution surface.

## Counts

Run the current count with:

```powershell
bun ./scripts/skill-quality-inventory.ts
```

The source root is `skills/`. Host-specific metadata directories are not part of the skill count.

## Core Capability Groups

| Group | Skills |
|---|---|
| Planning and product shaping | `grill-me`, `product-capability`, OpenSpec skills |
| Debugging and implementation | `diagnose`, `tdd-workflow`, `verification-loop`, `agent-introspection-debugging` |
| Review and safety | `compound-code-review`, `security-review`, `coding-standards` |
| Documentation, communications, and learning | `doc-coauthoring`, `internal-comms`, `stop-slop`, `documentation-lookup`, `handoff`, `feynman-learning-coach` |
| Web and artifacts | `effective-interact`, `frontend-design`, `design-taste-frontend`, `web-artifacts-builder`, `frontend-slides`, `theme-factory`, `slack-gif-creator`, `webapp-testing`, `e2e-testing` |
| Platform and skill extension | `claude-api`, `mcp-builder`, `skill-creator` |
| Maintenance | `workflow-router`, `hub-maintenance-workflow`, `skill-creator`, source records, capability metadata, and `skill-quality-inventory` |

## Policy

- A skill is installable only when it can run as standard skill content in the user's projects or has explicit routing notes for its assumptions.
- Host distribution metadata lives outside `skills/`.
- Claude plugin support is provided by `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
