# Harness Hub

Harness Hub is a personal repo harness toolkit for making agent work repeatable across projects. It analyzes a target repository, installs the reusable skill set, initializes explicit root-level harness files when requested, validates the resulting harness, and keeps managed files safe through lock-backed lifecycle commands.


Most skills can come from upstream sources and keep their upstream style. This repository adds the personal routing overlay, source records, harness templates, and lifecycle tooling needed to analyze, initialize, validate, install, update, status-check, and remove managed agent workflow assets in target projects.

The repository source of truth is the standard skill layout:

```text
skills/
  <skill-name>/
    SKILL.md
    references/   # optional
    scripts/      # optional
    assets/       # optional
harness/
  minimal/      # explicit repo harness template source
.claude-plugin/
  plugin.json
  marketplace.json
```

Skills should stay usable across agent hosts when practical, but imported skill bodies are not rewritten just for local style. Host-specific packaging, such as Claude plugin distribution, lives outside the skill bodies.

See [Personal Workflow Distribution](docs/personal-workflow-distribution.md) for the lightweight maintenance rules, TODOs, and acceptance criteria.

## What Is Included

- Workflow routing and SDD: `workflow-router`, owner workflow skills, `product-capability`, embedded `tdd-workflow`, and `effective-interact` handoffs.
- Planning and pressure testing: `grill-me`, OpenSpec helpers.
- Runtime diagnosis and implementation quality: `diagnose`, `tdd-workflow`, `verification-loop`, `compound-code-review`, `security-review`.
- Documentation, communication, learning, and handoff: `doc-coauthoring`, `internal-comms`, `stop-slop` for narrow English prose AI-tell cleanup, `documentation-lookup`, `feynman-learning-coach`, `handoff`.
- Web and artifact workflows: `effective-interact` for complex communication, option approval, status/incident reports, architecture/milestone maps, ignored long-task ledgers, HTML handoffs, and report-only aesthetic preflight; `frontend-design`, `design-taste-frontend`, `web-artifacts-builder`, `frontend-slides`, `theme-factory`, and browser testing skills cover adjacent UI/artifact lanes.
- Platform and extension atoms: `claude-api`, `mcp-builder`, `skill-creator`.
- Repo harness lifecycle: `analyze --harness`, `init-harness`, `validate-harness`, lock-backed status/update/remove, and minimal root harness templates.
- Harness assessment: `validate-harness` reports required-file checks, five-subsystem structural scoring, HTML assessment output, generic verification-command detection, and a lightweight benchmark summary.
- Skill maintenance: `hub-maintenance-workflow`, source-project records, capability metadata, and `skill-quality-inventory`.

## CLI

```powershell
bun install
bun run validate
bun run bootstrap:codex-skills

npx @jasonwen/harness-hub analyze D:\path\to\target --json
npx @jasonwen/harness-hub analyze D:\path\to\target --agent-readiness --harness --json
npx @jasonwen/harness-hub init-harness D:\path\to\target --dry-run --json
npx @jasonwen/harness-hub init-harness D:\path\to\target --yes
npx @jasonwen/harness-hub validate-harness D:\path\to\target --json
npx @jasonwen/harness-hub install D:\path\to\target --target standard --dry-run
npx @jasonwen/harness-hub install D:\path\to\target --target standard --yes
npx @jasonwen/harness-hub init-harness D:\path\to\target --target standard --dry-run
npx @jasonwen/harness-hub init-harness D:\path\to\target --target standard --yes
npx @jasonwen/harness-hub validate-harness D:\path\to\target --json
npx @jasonwen/harness-hub insight-generate . --input input.json --json
npx @jasonwen/harness-hub insight-build . --json
npx @jasonwen/harness-hub insight-validate . --json
npx @jasonwen/harness-hub insight-publish . --dry-run --json
npx @jasonwen/harness-hub status D:\path\to\target --json
npx @jasonwen/harness-hub update D:\path\to\target --dry-run --json
npx @jasonwen/harness-hub remove D:\path\to\target --dry-run --json
```


There are no named skill install variants. `install` installs every standard Harness Hub skill into `skills/<name>/` in the target repository and overwrites an existing same-name skill directory on confirmed install. `install` does not create root harness files; use explicit `init-harness` for `AGENTS.md`, `feature_list.json`, `progress.md`, and `session-handoff.md`. Legacy host-specific directories are not the distribution shape.

`init-harness` is the explicit Codex-only dev bootstrap path. It composes the standard skill install with root harness files such as `AGENTS.md`, `feature_list.json`, `tasks/current-task.md`, `progress.md`, `session-handoff.md`, `clean-state-checklist.md`, `definition-of-done.md`, and `scripts/harness-validate.mjs`. It records managed ownership in `.harness-hub/lock.json`, blocks dirty git worktrees and existing harness files by default, and leaves low-level `install` skills-only.

`validate-harness` is side-effect-free. Its JSON and HTML reports include five-subsystem assessment scores for instructions, state, verification, scope, and lifecycle, plus a structural benchmark recommendation.

`insight-*` is the explicit source-to-blog path. It treats `post.json` plus source metadata as the editable source of truth, adapts the first public draft through `effective-interact`, writes GitHub Pages output under `site/`, validates UTF-8/source attribution/fact-inference separation/link safety/excerpt size, and keeps local CLI publishing to a dry-run preflight. Actual Pages deployment is owned by `.github/workflows/publish-insights.yml`.

## Codex Self-Bootstrap

For local Codex dogfooding, generate a host-local copy of the standard skills:

```powershell
bun run bootstrap:codex-skills
```

This mirrors `skills/<name>/` into `.codex/skills/<name>/` and writes a `.harness-hub-managed` marker in each generated copy. `.codex/` is ignored by Git and is not published; edit the source skill under `skills/` and rerun the bootstrap command. For host activation smoke, use `workflow-router` with executable `workflow-check.mjs` before owner workflows.

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
claude plugin marketplace add JasonxzWen/harness-hub
claude plugin install harness-hub@harness-hub
```

The plugin manifest intentionally omits `version`; when installed from Git, Claude Code can use the commit SHA as the plugin version. Add an explicit semver `version` only when release cadence requires manual version bumps.

## Project Map

| Path | Purpose |
|---|---|
| `skills/` | Platform-neutral skill source of truth |
| `harness/` | Source-owned repo harness templates and advanced pack metadata |
| `.claude-plugin/` | Claude plugin and marketplace manifests |
| `capabilities/index.json` | Skill and harness component metadata, including source-retained components |
| `site/` | Git-only GitHub Pages output for insight posts |
| `src/harnessHub.ts` | CLI implementation |
| `scripts/validate-skills.ps1` | Standard skill validation gate |
| `scripts/skill-quality-inventory.ts` | Report-only skill quality inventory |
| `docs/skill-routing.md` | Overlap and routing rules |
| `docs/personal-workflow-distribution.md` | Personal distribution rules, TODOs, and acceptance criteria |
| `docs/harness-packs.md` | Harness pack source-review boundary and promotion checklist |
| `docs/insight-publishing.md` | Source-to-insight blog workflow, validation, and publish boundary |
| `docs/source-projects.md` | Upstream source and decision log |
| `docs/workflow-source-dossier.md` | Reference dossier for SDD, routing, Effective Interact, OpenSpec, Superpowers, ECC, Matt Pocock skills, Vercel, and retired Ralph source notes |
| `config/artifact-policy.json` | Git/npm artifact inclusion policy |

Generated reports, intermediate interaction artifacts, and Codex dogfood copies stay local: `reports/`, `.harness-hub/reports/`, `skills/effective-interact/artifacts/`, and `.codex/` are ignored and must not be committed or published. `site/` is Git-only Pages output and is intentionally excluded from the npm package.

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
