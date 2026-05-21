# Skill Hub

Skill Hub is a curated, platform-neutral library of agent skills and lifecycle tooling.

The repository source of truth is the standard skill layout:

```text
skills/
  <skill-name>/
    SKILL.md
    references/   # optional
    scripts/      # optional
    assets/       # optional
.claude-plugin/
  plugin.json
  marketplace.json
```

Skills must not depend on a specific agent host. Host-specific packaging, such as Claude plugin distribution, lives outside the skill bodies.

## What Is Included

- Workflow routing and SDD: `workflow-router`, owner workflow skills, `product-capability`, embedded `tdd-workflow`, and `effective-interact` handoffs.
- Planning and pressure testing: `grill-me`, OpenSpec helpers.
- Runtime diagnosis and implementation quality: `diagnose`, `tdd-workflow`, `verification-loop`, `compound-code-review`, `security-review`.
- Documentation, learning, and handoff: `doc-coauthoring`, `documentation-lookup`, `feynman-learning-coach`, `handoff`.
- Web and artifact workflows: `effective-interact`, `frontend-design`, `web-artifacts-builder`, `frontend-slides`, browser testing skills.
- Skill maintenance: `hub-maintenance-workflow`, source-project records, capability metadata, and `skill-quality-inventory`.

## CLI

```powershell
bun install
bun run validate

npx @jasonwen/skill-hub analyze D:\path\to\target --json
npx @jasonwen/skill-hub install D:\path\to\target --profile minimal --target standard --dry-run
npx @jasonwen/skill-hub install D:\path\to\target --profile minimal --target standard --yes
npx @jasonwen/skill-hub install D:\path\to\target --profile sdd --target standard --dry-run
npx @jasonwen/skill-hub status D:\path\to\target --json
npx @jasonwen/skill-hub update D:\path\to\target --dry-run --json
npx @jasonwen/skill-hub remove D:\path\to\target --dry-run --json
```

`standard` installs skills into `skills/<name>/` in the target repository. Legacy host-specific directories are not the default distribution shape.

## Claude Plugin Publishing

This repository can be loaded directly as a Claude Code plugin because it has root-level `.claude-plugin/plugin.json` and `skills/`.

Local plugin test:

```powershell
claude --plugin-dir .
claude plugin validate . --strict
```

Marketplace test:

```powershell
claude plugin validate .
claude plugin marketplace add JasonxzWen/skill-hub
claude plugin install skill-hub@skill-hub
```

The plugin manifest intentionally omits `version`; when installed from Git, Claude Code can use the commit SHA as the plugin version. Add an explicit semver `version` only when release cadence requires manual version bumps.

## Project Map

| Path | Purpose |
|---|---|
| `skills/` | Platform-neutral skill source of truth |
| `.claude-plugin/` | Claude plugin and marketplace manifests |
| `capabilities/index.json` | Installable profiles and managed component metadata |
| `src/skillHub.ts` | CLI implementation |
| `scripts/validate-skills.ps1` | Standard skill validation gate |
| `scripts/skill-quality-inventory.ts` | Report-only skill quality inventory |
| `docs/skill-routing.md` | Overlap and routing rules |
| `docs/source-projects.md` | Upstream source and decision log |
| `docs/workflow-source-dossier.md` | Reference dossier for SDD, routing, Effective Interact, OpenSpec, Superpowers, ECC, Matt Pocock skills, Vercel, and Ralph |
| `config/artifact-policy.json` | Git/npm artifact inclusion policy |

## Validation

```powershell
bun run typecheck
bun test ./tests
bun run validate:artifact-policy
bun run validate:skills
bun run validate
git diff --check
```

Release validation:

```powershell
bun run validate:release
```
