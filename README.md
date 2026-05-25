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
- Documentation, communication, learning, and handoff: `doc-coauthoring`, `internal-comms`, `documentation-lookup`, `feynman-learning-coach`, `handoff`.
- Web and artifact workflows: `effective-interact` for complex communication, option approval, status/incident reports, architecture/milestone maps, ignored long-task ledgers, and HTML handoffs; `frontend-design`, `web-artifacts-builder`, `frontend-slides`, `theme-factory`, and browser testing skills cover adjacent UI/artifact lanes.
- Platform and extension atoms: `claude-api`, `mcp-builder`, `skill-creator`.
- Skill maintenance: `hub-maintenance-workflow`, source-project records, capability metadata, and `skill-quality-inventory`.

## CLI

```powershell
bun install
bun run validate
bun run bootstrap:codex-skills

npx @jasonwen/skill-hub analyze D:\path\to\target --json
npx @jasonwen/skill-hub install D:\path\to\target --target standard --dry-run
npx @jasonwen/skill-hub install D:\path\to\target --target standard --yes
npx @jasonwen/skill-hub status D:\path\to\target --json
npx @jasonwen/skill-hub update D:\path\to\target --dry-run --json
npx @jasonwen/skill-hub remove D:\path\to\target --dry-run --json
```

There are no named install variants. `install` installs every standard Skill Hub skill into `skills/<name>/` in the target repository and overwrites an existing same-name skill directory on confirmed install. Legacy host-specific directories are not the distribution shape.

## Codex Self-Bootstrap

For local Codex dogfooding, generate a host-local copy of the standard skills:

```powershell
bun run bootstrap:codex-skills
```

This mirrors `skills/<name>/` into `.codex/skills/<name>/` and writes a `.skill-hub-managed` marker in each generated copy. `.codex/` is ignored by Git and is not published; edit the source skill under `skills/` and rerun the bootstrap command. For host activation smoke, use `workflow-router` with executable `workflow-check.mjs` before owner workflows.

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
| `capabilities/index.json` | Skill install graph and source-retained component metadata |
| `src/skillHub.ts` | CLI implementation |
| `scripts/validate-skills.ps1` | Standard skill validation gate |
| `scripts/skill-quality-inventory.ts` | Report-only skill quality inventory |
| `docs/skill-routing.md` | Overlap and routing rules |
| `docs/source-projects.md` | Upstream source and decision log |
| `docs/workflow-source-dossier.md` | Reference dossier for SDD, routing, Effective Interact, OpenSpec, Superpowers, ECC, Matt Pocock skills, Vercel, and retired Ralph source notes |
| `config/artifact-policy.json` | Git/npm artifact inclusion policy |

Generated reports, intermediate interaction artifacts, and Codex dogfood copies stay local: `reports/`, `.skill-hub/reports/`, `skills/effective-interact/artifacts/`, and `.codex/` are ignored and must not be committed or published.

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
