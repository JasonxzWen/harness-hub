# Skill Hub

Skill Hub is a curated workspace for collecting and adapting famous agent skills into Codex-friendly versions.

The current target is a small, high-signal set rather than "install everything": plan pressure-testing, runtime diagnosis, throwaway prototyping, structured code review, HTML work reports, OpenSpec workflows, Everything Claude Code, selected Anthropic built-in skills, selected Vercel web skills, and a Codex-adapted Ralph loop.

The CLI is written in TypeScript and built with Bun for development speed. Published npm packages keep a Node-compatible `bin/skill-hub.mjs` entrypoint that loads the generated `dist/skillHub.js`, so target users can still run `npx skill-hub ...` without installing Bun.

## Current Status

- Repository initialization is in progress.
- OpenSpec scaffolding exists under `openspec/`.
- Project-local OpenSpec helper skills exist under `.codex/skills/`.
- Everything Claude Code is downloaded locally under `vendor/everything-claude-code/`.
- ECC's Codex skill surface has been imported under `.agents/skills/`.
- Vercel Labs `skills` is downloaded locally under `vendor/vercel-labs-skills/`.
- Vercel's `find-skills` skill is installed under `.agents/skills/find-skills/`.
- Vercel Labs `agent-skills` is downloaded locally under `vendor/vercel-labs-agent-skills/`.
- Selected Vercel web skills are installed under `.agents/skills/`.
- Ralph is downloaded locally under `vendor/snarktank-ralph/`.
- Ralph PRD and loop skills are installed under `.agents/skills/`, with a Codex-native runner under `scripts/ralph/`.
- `html-work-reports` is installed under `.agents/skills/` to encourage self-contained HTML work artifacts when Markdown is too flat.
- Matt Pocock's `skills` repository is downloaded locally under `vendor/mattpocock-skills/`.
- Matt Pocock `grill-me`, `diagnose`, and `prototype` are installed under `.agents/skills/` for pressure testing, runtime debugging, and throwaway design prototypes.
- EveryInc's `compound-engineering-plugin` repository is downloaded locally under `vendor/EveryInc-compound-engineering-plugin/`; only its `ce-code-review` workflow has been adapted as `.agents/skills/compound-code-review/`.
- A machine-readable capability graph exists at `capabilities/index.json`, with a human-readable map in `docs/capability-map.md`.
- A Node CLI skeleton exists as `skill-hub`, supporting profile-based `init` and `status` reports.
- ECC's Codex config and multi-agent roles are configured under `.codex/`.
- Claude Code built-in skills copied into `.codex/skills/` have been adapted for Codex; the duplicate local `skill-creator` copy was removed in favor of Codex's system skill.
- Initial Codex feature inventory is documented in `docs/`.

## Repository Layout

```text
.codex/skills/        Project-local Codex skills for OpenSpec workflows
.codex/agents/        ECC Codex multi-agent role configs
.agents/skills/       ECC Codex-ready skills
capabilities/         Machine-readable capability graph and install profiles
openspec/             Spec-driven planning workspace
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
| [The unreasonable effectiveness of HTML](https://thariqs.github.io/html-effectiveness/) | Source inspiration for `html-work-reports` | Referenced, not copied |

Superpowers is tracked as an optional upstream source but is not installed by default because its core workflow overlaps heavily with ECC and the adapted built-in skills.
The Karpathy-inspired skill is not installed as a separate trigger because its core guidance is already project-level instruction in `AGENTS.md`.
Compound Engineering is tracked as an optional upstream source, but only the code-review lane is installed. The rest of the plugin remains explicit-only because it overlaps this hub or requires external actions and credentials.

## Initial Scope

This hub will track Codex-ready adaptations for:

- Superpowers-style disciplined software development workflows.
- Everything Claude Code-style broad agent, rule, hook, and skill coverage.
- One-question-at-a-time pressure testing before implementation.
- Runtime diagnosis and disposable prototyping before production implementation.
- Structured multi-perspective code review before PR readiness.
- Focused specialist skills for testing, security, frontend, docs, Git, browser QA, and language ecosystems.
- Cross-harness compatibility notes for Codex App, Codex CLI, Claude Code, Cursor, OpenCode, Gemini, and similar agent hosts.

## Core Design Principles

- Prefer source attribution over unattributed prompt copying.
- Adapt tool names and workflows to Codex instead of blindly preserving Claude Code assumptions.
- Keep skills focused, composable, and testable.
- Start with a minimal reliable profile, then add larger batteries-included packs.
- Review licenses and security posture before importing third-party content.

## Docs

- [Capability map](docs/capability-map.md)
- [Codex skill feature inventory](docs/codex-skill-feature-inventory.md)
- [Claude built-in skills Codex adaptation](docs/codex-builtins-adaptation.md)
- [Everything Claude Code local setup](docs/ecc-local-setup.md)
- [Vercel Skills local setup](docs/vercel-skills-local-setup.md)
- [Ralph Loop Codex setup](docs/ralph-loop.md)
- [Skill evaluation policy](docs/skill-evaluation-policy.md)
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

In the current sandbox, `openspec` may warn as not visible even though it is installed on the host. Use `-SkipExternal` to validate only repository files:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal
```

## Next Milestones

1. Exercise `skill-hub init --dry-run` against disposable target repos for Codex, Claude Code, and OpenCode.
2. Expand `capabilities/index.json` from skills-only components to rules, hooks, MCP config, and harness-specific config.
3. Verify MCP startup from a non-sandboxed Codex shell with credentials available.
4. Test the Ralph runner on a small disposable repo before using it on high-value branches.
5. Keep source/license notes current whenever a third-party skill is added or refreshed.

## CLI Preview

```powershell
npx skill-hub init D:\path\to\target --profile minimal --agent codex --dry-run
npx skill-hub init D:\path\to\target --profile web --agent codex --agent claude-code
npx skill-hub status D:\path\to\target --html
```

`init` writes selected skills, `.skill-hub/lock.json`, and a self-contained HTML install report.
