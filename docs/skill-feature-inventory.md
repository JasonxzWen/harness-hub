# Skill Feature Inventory

This inventory summarizes the active platform-neutral Skill Hub surface.

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
| Documentation and learning | `doc-coauthoring`, `documentation-lookup`, `handoff`, `feynman-learning-coach` |
| Web and artifacts | `effective-interact`, `frontend-design`, `web-artifacts-builder`, `frontend-slides`, `webapp-testing`, `e2e-testing` |
| Maintenance | `skill-evaluator`, `update-skill-hub`, `agent-sort` |

## Policy

- A skill is installable only when it can run as standard skill content without host-specific assumptions.
- Host distribution metadata lives outside `skills/`.
- Claude plugin support is provided by `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
