---
type: skills
title: Skill routing
---
# Skill routing

Claude Code or Codex is the only main-Agent runtime. Select the narrowest atomic Skill that adds domain value; no Router or owner Workflow runs first.

| Need | Atomic Skill |
| --- | --- |
| YAGNI, minimum change, entity-count, subtraction review | `ponytail` |
| Pressure-test assumptions or an explicit “grill me” request | `grill-me` |
| Implementation-ready capability boundaries | `product-capability` |
| Runtime bug or performance diagnosis | `diagnose` |
| Agent/tool harness debugging | `agent-introspection-debugging` |
| Red-green-refactor guidance | `tdd-workflow` |
| Final deterministic commands and artifacts | `verification-loop` |
| Deep multi-lens review | `compound-code-review` |
| Focused security review | `security-review` |
| Complex communication and important handoff | `effective-interact` |
| Failed, long, high-cost, tool-abnormal, or explicit retrospective | `agent-interaction-audit` |
| Source-backed learning | `quick-learn` |
| Public source-derived article | `source-post` |
| Read-only internet retrieval through an existing Agent Reach install | `agent-reach` |
| Blocking/high-impact structured decision on Codex | `decision-ui` |

Important boundaries:

- `effective-interact` owns structured Report presentation. The native main Agent triggers it for complex delivery, comparisons, and important handoffs; simple results stay plain text.
- `agent-interaction-audit` owns Retro analysis. It changes nothing automatically, recommends existing destinations first, and reports missing duration/token/cost evidence as `unknown`.
- `decision-ui` is Codex-only. Use it only for genuinely blocking, high-impact, or external-authorization choices; low-risk details remain autonomous and unavailable native input falls back honestly to text.
- `agent-reach` never proves its own runtime availability. Run `agent-reach doctor --json`; do not install, configure, authenticate, write `~/.agent-reach`, or copy credentials.
- `verification-loop` and `tdd-workflow` are prompt-level atomic Skills despite their names. They are not Harness Hub runtimes or workflow owners.
- `stop-slop` applies only to English prose editing, not Chinese reports, code, or specs.

## Distribution and dependencies

| Capability | Host surface | Runtime dependency | Migration result |
| --- | --- | --- | --- |
| `ponytail`, `grill-me`, and other prompt-only atoms | Claude and Codex | Host conversation | Fully available. |
| `effective-interact` | Claude and Codex | Node; browser only for rendered-browser verification | Generation and deterministic validation are available; missing browser evidence is reported. |
| `decision-ui` | Codex only | Native structured input when available | Installed only under `.agents/skills/`; no feature or global-config mutation. |
| `agent-interaction-audit` | Claude and Codex | Node, Git, readable Host traces | Available with honest Host/usage evidence gaps. |
| `quick-learn` | Claude and Codex | Prompt guidance; Python only for optional durable logging | Core guidance is available; migration installs no Python dependency. |
| `source-post` | Claude and Codex | Node validator; browser for final HTML review | Authoring and validation are available; publishing is out of scope. |
| `agent-reach` | Claude and Codex | User-installed Agent Reach and channel backends | Canonical prompt Skill is distributed; dependencies, config, login, and credentials are not. |

## Sources

- [Capability index](../capabilities/index.json)
- [Source project records](source-projects.md)
- [Target project contract](../harness/target/AGENTS.md)
