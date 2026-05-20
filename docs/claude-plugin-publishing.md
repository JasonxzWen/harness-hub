# Claude Plugin Publishing

Skill Hub supports Claude plugin distribution without making the skill bodies Claude-specific.

## Layout

```text
.claude-plugin/
  plugin.json
  marketplace.json
skills/
  <skill-name>/
    SKILL.md
```

Only plugin and marketplace manifests live in `.claude-plugin/`. Skills remain at the plugin root under `skills/`.

## Local Validation

```powershell
claude --plugin-dir .
claude plugin validate . --strict
```

## Marketplace Flow

```powershell
claude plugin validate .
claude plugin marketplace add JasonxzWen/skill-hub
claude plugin install skill-hub@skill-hub
```

The manifests omit explicit `version` so Git installations can use commit SHA versioning during active development. Add a semver `version` only when every plugin release will bump it.
