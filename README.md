# Skill Hub

Skill Hub is a curated workspace for collecting and adapting famous agent skills into Codex-friendly versions.

The current target is a small, high-signal set rather than "install everything": plan pressure-testing, runtime diagnosis, throwaway prototyping, structured code review, HTML work reports, optional Feynman-style learning coaching, harness environment templates, OpenSpec workflows, Everything Claude Code, selected Anthropic built-in skills, selected Vercel web skills, and a Codex-adapted Ralph loop.

The CLI is written in TypeScript and built with Bun for development speed. Published npm packages keep a Node-compatible `bin/skill-hub.mjs` entrypoint that loads the generated `dist/skillHub.js`, so target users can still run `npx skill-hub ...` without installing Bun.

## Current Status

- Core lifecycle CLI behavior is implemented and under release hardening.
- OpenSpec scaffolding exists under `openspec/`.
- Project-local Codex skills, including OpenSpec helpers and adapted built-ins, exist under `.codex/skills/`.
- Everything Claude Code is downloaded locally under `vendor/everything-claude-code/`.
- ECC's Codex skill surface has been imported under `.agents/skills/`.
- Vercel Labs `skills` is downloaded locally under `vendor/vercel-labs-skills/`.
- Vercel's `find-skills` skill is installed under `.agents/skills/find-skills/`.
- Vercel Labs `agent-skills` is downloaded locally under `vendor/vercel-labs-agent-skills/`.
- Selected Vercel web skills are installed under `.agents/skills/`.
- Ralph is downloaded locally under `vendor/snarktank-ralph/`.
- Ralph PRD and loop skills are installed under `.agents/skills/`, with a Codex-native runner under `scripts/ralph/`.
- `html-work-reports` is installed under `.agents/skills/` to generate and validate self-contained visual HTML handoffs for non-trivial completed-task conclusions and work artifacts.
- Matt Pocock's `skills` repository is downloaded locally under `vendor/mattpocock-skills/`.
- Matt Pocock `grill-me`, `diagnose`, and `prototype` are installed under `.agents/skills/` for pressure testing, runtime debugging, and throwaway design prototypes.
- EveryInc's `compound-engineering-plugin` repository is downloaded locally under `vendor/EveryInc-compound-engineering-plugin/`; only its `ce-code-review` workflow has been adapted as `.agents/skills/compound-code-review/`.
- `feynman-learning-coach` is installed under `.agents/skills/` as an explicit learning profile inspired by Learn FASTER's scoped learning lifecycle.
- A `harness` install profile can scaffold root `AGENTS.md` plus state, verification, handoff, and quality templates under `harness/` for target repos.
- A machine-readable capability graph exists at `capabilities/index.json`, with a human-readable map in `docs/capability-map.md`.
- A Node-compatible CLI exists as `skill-hub`, supporting profile-based `analyze`, `install`, `init`, `status`, `update`, `migrate-lock`, and `remove` reports.
- An opt-in agent-readiness analysis extension is documented in `docs/agent-readiness-analysis.md` and specified by `openspec/specs/agent-readiness-analysis/spec.md`.
- ECC's Codex config and multi-agent roles are configured under `.codex/`.
- Claude Code built-in skills copied into `.codex/skills/` have been adapted for Codex; the duplicate local `skill-creator` copy was removed in favor of Codex's system skill.
- Initial Codex feature inventory is documented in `docs/`.
- Skill quality inventory is available as a report-only gate; existing warnings are tracked but are not yet release blockers.

## Repository Layout

```text
.codex/skills/        Codex-local skills: OpenSpec helpers and adapted built-ins
.codex/agents/        ECC Codex multi-agent role configs
.agents/skills/       Cross-agent skill assets from ECC, Vercel, Ralph, local, and adapted sources
capabilities/         Machine-readable capability graph and install profiles
harness/              Installable harness environment templates for target repos
openspec/             Maintainer specs and archived change records for source traceability
docs/                 Research notes, feature inventory, and source map
bin/, src/, tests/    Node CLI entrypoint, implementation, and tests
scripts/              Local validation helpers
vendor/               Ignored third-party source checkout for local reference
README.md             Project overview
```

## Installed Sources

| Source | Local use | License/status |
|---|---|---|
| [OpenSpec](https://github.com/open-spec/openspec) | OpenSpec project scaffold and helper skills | Generated helper skills are marked MIT |
| [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) | 32 Codex-ready skills, Codex agents, config reference | MIT, vendored source ignored |
| [Anthropic Skills](https://github.com/anthropics/skills) / Claude built-ins | 20 adapted built-in skills in `.codex/skills/` | Per-skill license files preserved |
| [Vercel Skills](https://github.com/vercel-labs/skills) | `find-skills` discovery skill | MIT, vendored source ignored |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | 4 selected Web/React skills | MIT per upstream README, vendored source ignored |
| [Ralph](https://github.com/snarktank/ralph) | PRD-to-story workflow and autonomous iteration loop adapted for Codex | MIT, vendored source ignored |
| [Karpathy-inspired guidelines](https://github.com/forrestchang/andrej-karpathy-skills) | Behavioral coding principles already embedded in root `AGENTS.md` | MIT per upstream plugin metadata/README, vendored source ignored |
| [Matt Pocock Skills](https://github.com/mattpocock/skills) | `grill-me`, `diagnose`, and `prototype` adapted for Codex | MIT, vendored source ignored |
| [Compound Engineering Plugin](https://github.com/EveryInc/compound-engineering-plugin) | `compound-code-review` adapted from `ce-code-review` only | MIT, vendored source ignored |
| [Learn FASTER](https://github.com/hluaguo/learn-faster-kit) | Source inspiration for `feynman-learning-coach`; no CLI/runtime copied | MIT, referenced at evaluated commit |
| [Learn Harness Engineering](https://github.com/walkinglabs/learn-harness-engineering) | Source inspiration for the `harness` environment profile and templates | MIT, adapted from the course and Chinese template library |
| [The unreasonable effectiveness of HTML](https://thariqs.github.io/html-effectiveness/) | Source inspiration for `html-work-reports` | Referenced, not copied |

Superpowers is tracked as an optional upstream source but is not installed by default because its core workflow overlaps heavily with ECC and the adapted built-in skills.
The Karpathy-inspired skill is not installed as a separate trigger because its core guidance is already project-level instruction in `AGENTS.md`.
Compound Engineering is tracked as an optional upstream source, but only the code-review lane is installed. The rest of the plugin remains explicit-only because it overlaps this hub or requires external actions and credentials.
Learn FASTER is tracked as a learning-coach source. Only the lightweight Feynman teaching and logging pattern is installed; its CLI, generated root instructions, and full `.learning` runtime are not copied.
Learn Harness Engineering is tracked as a harness environment source. The local adaptation installs a root `AGENTS.md` plus compact `harness/` templates instead of copying the course repository or skill wholesale.

## Initial Scope

This hub will track Codex-ready adaptations for:

- Superpowers-style disciplined software development workflows.
- Everything Claude Code-style broad agent, rule, hook, and skill coverage.
- One-question-at-a-time pressure testing before implementation.
- Runtime diagnosis and disposable prototyping before production implementation.
- Structured multi-perspective code review before PR readiness.
- Explicit Feynman-style tutoring with teach-back checks and durable learning logs.
- Installable harness environment scaffolding for agent instructions, state, verification, scope, lifecycle, and handoff.
- Focused specialist skills for testing, security, frontend, docs, Git, browser QA, and language ecosystems.
- Cross-harness compatibility notes for Codex App, Codex CLI, Claude Code, Cursor, OpenCode, Gemini, and similar agent hosts.

## Core Design Principles

- Prefer source attribution over unattributed prompt copying.
- Adapt tool names and workflows to Codex instead of blindly preserving Claude Code assumptions.
- Keep skills focused, composable, and testable.
- Treat skill descriptions as routing triggers, not documentation summaries.
- Require eval evidence before changing routing-sensitive skill text.
- Start with a minimal reliable profile, then add larger batteries-included packs.
- Review licenses and security posture before importing third-party content.

## Docs

- [Capability map](docs/capability-map.md)
- [CLI lifecycle design](docs/cli-lifecycle-design.md)
- [Agent readiness analysis](docs/agent-readiness-analysis.md)
- [Codex skill feature inventory](docs/codex-skill-feature-inventory.md)
- [Claude built-in skills Codex adaptation](docs/codex-builtins-adaptation.md)
- [Everything Claude Code local setup](docs/ecc-local-setup.md)
- [Vercel Skills local setup](docs/vercel-skills-local-setup.md)
- [Ralph Loop Codex setup](docs/ralph-loop.md)
- [Skill evaluation policy](docs/skill-evaluation-policy.md)
- [Skill quality guide](docs/skill-quality-guide.md)
- [Skill quality rollout plan](docs/skill-quality-rollout-plan.md)
- [Skill routing and de-duplication](docs/skill-routing.md)
- [MCP validation notes](docs/mcp-validation.md)
- [Source projects and candidates](docs/source-projects.md)

## Validation

Install development dependencies with Bun:

```powershell
bun install
```

Run the TypeScript/Bun test suite:

```powershell
bun test ./tests
```

Build the Node-compatible CLI output:

```powershell
bun run build
```

Run the local validator before committing:

```powershell
bun run validate
```

Run the release validation before publishing or cutting a CLI lifecycle release:

```powershell
bun run validate:release
```

This runs the normal validation gate, rebuilds the Node-compatible `dist/` entrypoint, smoke-tests `bin/skill-hub.mjs`, and checks the npm pack file list.

In the current sandbox, `openspec` may warn as not visible even though it is installed on the host. Use `-SkipExternal` to validate only repository files:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal
```

## Next Milestones

1. Keep the archived `release-cli-capability-lifecycle` specs current as CLI behavior evolves.
2. Exercise `skill-hub analyze --agent-readiness` against disposable target repos for Codex, Claude Code, and OpenCode.
3. Keep the non-failing skill quality inventory report stable enough for review, then decide whether a checked-in baseline is worth maintaining.
4. Expand routing eval fixtures beyond the initial high-overlap set before broader description refactors.
5. Expand `capabilities/index.json` with detection metadata, recommendation text, supported agents, and lifecycle risk markers.
6. Exercise `skill-hub analyze/install/status/remove` against disposable target repos for Codex, Claude Code, and OpenCode.
7. Verify MCP startup from a non-sandboxed Codex shell with credentials available before recommending MCP-bearing profiles.
8. Test the Ralph runner on a small disposable repo before using it on high-value branches.
9. Keep source/license notes current whenever a third-party skill is added or refreshed.

## CLI Preview

```powershell
npx skill-hub analyze D:\path\to\target --json
npx skill-hub analyze D:\path\to\target --html --output D:\tmp\skill-hub-analysis.html
npx skill-hub install D:\path\to\target --profile minimal --agent codex --dry-run
npx skill-hub install D:\path\to\target --profile harness --agent codex --dry-run
npx skill-hub install D:\path\to\target --profile learning --agent codex --dry-run
npx skill-hub install D:\path\to\target --profile web --agent codex --agent claude-code --yes
npx skill-hub status D:\path\to\target --html
npx skill-hub update D:\path\to\target --dry-run --json
npx skill-hub update D:\path\to\target --component skill:grill-me --yes --json
npx skill-hub update D:\path\to\target --force --yes --json
npx skill-hub migrate-lock D:\path\to\target --dry-run --json
npx skill-hub remove D:\path\to\target --dry-run --json
```

`analyze`, `status`, `update --dry-run`, and `migrate-lock --dry-run` are read-only by default. `install`, `update --yes`, `update --force --yes`, `migrate-lock --yes`, and `remove` mutate the target repo and must be backed by `.skill-hub/lock.json`. During migration, `init` remains a compatibility alias for `install`.

Managed updates are lock-backed. Normal `update --yes` refreshes only schema version 2 managed components whose recorded hashes still match the target files. `--component <id>` scopes the selected update set. `update --force --yes` can intentionally overwrite modified or restore missing schema version 2 lock-recorded files, but it does not override unsafe paths, schema version 1 records, skipped records, or unknown components. Legacy schema version 1 locks require explicit `migrate-lock` before update or safe removal can rely on file hashes.

Agent readiness analysis:

```powershell
npx skill-hub analyze D:\path\to\target --agent-readiness --json
```

The readiness report remains read-only and evaluates context budget, outcome criteria, verification gates, routing boundaries, automation candidates, and reviewable learning capture.
