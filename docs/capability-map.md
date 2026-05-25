# Capability Map

Skill Hub exposes two surfaces:

- a platform-neutral skill library under `skills/`;
- a lifecycle CLI that can analyze, install, update, status-check, and remove managed skills from target repositories.

## CLI Commands

| Command | Mutates target? | Purpose |
|---|---:|---|
| `skill-hub analyze <target>` | No | Detect existing standard skills, missing capabilities, conflicts, and recommendations. |
| `skill-hub install <target> --target standard --dry-run` | No | Preview managed installation of every standard skill. |
| `skill-hub install <target> --target standard --yes` | Yes | Copy every managed standard skill and write `.skill-hub/lock.json`. |
| `skill-hub status <target>` | No | Compare lock records with current files and hub versions. |
| `skill-hub update <target> --dry-run` | No | Plan updates for managed skills. |
| `skill-hub update <target> --yes` | Yes | Update managed, unmodified files. |
| `skill-hub remove <target> --dry-run` | No | Preview removal of lock-recorded files. |
| `skill-hub remove <target> --yes` | Yes | Remove only managed files recorded in `.skill-hub/lock.json`. |

## Install Surface

Skill Hub has one personal install set. No named variants exist. The CLI installs the complete standard skill set: every `kind: "skill"` component in `capabilities/index.json` whose source lives under `skills/<name>/`. Confirmed install overwrites same-name skill directories and records the new managed files in `.skill-hub/lock.json`. No root harness files are installed.

## Atomic Capability Candidate Map

This map separates current installable capabilities from source-backed atom candidates. It is intentionally not an install graph; promote candidates into `capabilities/index.json` only after source review, trigger normalization, tests, and lifecycle-risk placement.

| Capability area | Current installable coverage | Source-backed atom candidates | Gap and decision |
|---|---|---|---|
| Planning, specs, and product clarification | `workflow-router`, `sdd-workflow`, `product-capability`, `grill-me`, OpenSpec formal skills | User-selected: Matt Pocock `design-an-interface`, `request-refactor-plan`, `ubiquitous-language`, `grill-with-docs`, `to-prd`, `zoom-out`; Superpowers `brainstorming`, `writing-plans` | Strong coverage. Candidate work should dedupe against SDD and OpenSpec rather than add broad triggers. Ralph PRD/story-loop skills were retired because native Codex and Claude Code goal/story workflows now cover that lane. |
| Implementation workflow and engineering governance | `sdd-workflow`, `tdd-workflow`, `prototype`, `verification-loop`, lifecycle CLI | User-selected: Matt Pocock `prototype`, `tdd`, `scaffold-exercises`; Superpowers `executing-plans`, `finishing-a-development-branch`, `using-git-worktrees`, `subagent-driven-development`, `writing-skills`; `vercel-labs/skills` `find-skills` | Strong coverage. Treat Superpowers as source patterns for orchestration policy, not default always-on skills. |
| Debugging, verification, and review | `diagnosis-workflow`, `diagnose`, `review-workflow`, `compound-code-review`, `security-review`, `verification-loop`, `webapp-testing`, `e2e-testing` | User-selected: Superpowers `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`; Vercel `web-design-guidelines` | Strong coverage. `web-design-guidelines` remains a good UI audit atom candidate. |
| Frontend and visual artifacts | `frontend-design`, `web-artifacts-builder`, `frontend-slides`, `frontend-patterns`, `effective-interact`, `web-design-guidelines`, `theme-factory`, `slack-gif-creator` | User-selected: `frontend-slides`, Michal Vavra `agent-browser`, `frontend-design`, `html-tools`; Anthropic `algorithmic-art`, `canvas-design`, `frontend-design`, `slack-gif-creator`, `theme-factory`, `web-artifacts-builder`, `webapp-testing` | Added bounded `theme-factory` and `slack-gif-creator`. Keep `algorithmic-art` and `canvas-design` reference-only until creative demand justifies more distribution weight. |
| Writing, handoff, knowledge, and learning | `doc-coauthoring`, `internal-comms`, `handoff`, `feynman-learning-coach`, `answer-workflow`, `documentation-lookup`, `effective-interact` | User-selected: Matt Pocock `writing-beats`, `writing-fragments`, `writing-shape`, `edit-article`, `handoff`; Anthropic `doc-coauthoring`, `internal-comms`, `brand-guidelines` | Filled collaborative doc and internal comms gaps. Keep Anthropic `brand-guidelines` reference-only because it is Anthropic-brand-specific. |
| Documents, spreadsheets, slides, and PDFs | No installable Skill Hub atoms. External app skills exist in this Codex environment, but they are not repo-distributed Skill Hub components. | Anthropic `docx`, `pdf`, `pptx`, `xlsx` | Clear capability gap. Treat as high-value source candidates, but source-available licensing requires review before copying or redistributing. |
| Agent platform, API, and skill authoring | `hub-maintenance-workflow`, `skill-quality-inventory`, `documentation-lookup`, `claude-api`, `mcp-builder`, `skill-creator` | Anthropic `claude-api`, `mcp-builder`, `skill-creator`; Matt Pocock `write-a-skill`; Superpowers `writing-skills` | Filled MCP, provider-specific Claude API, and skill-authoring gaps with explicit atoms. `claude-api` remains live-doc-first because API details change. |
| External tools and enterprise integrations | Limited; current installable graph avoids credentialed external writes by default. | User-selected: archived Michal Vavra `asncli`, `gogcli`, `snowcli`; CE Slack/release/session candidates from the broader source pool | Keep explicit-only until connector, credential, and side-effect boundaries are specified. |

## Local Alignment Notes

Current strengths:

- Workflow ownership is clear: `workflow-router` selects one owner, then owner workflows call atoms.
- Engineering lifecycle coverage is strong: SDD, TDD, diagnosis, review, verification, handoff, and Skill Hub maintenance are all installable.
- Web/artifact coverage is strong after adding `theme-factory`; production UI, standalone artifacts, slides, one-off browser checks, and durable E2E have separate lanes.
- Writing coverage is now viable for docs and internal comms after adding `doc-coauthoring` and `internal-comms`.
- Platform-extension coverage now has explicit atoms for Claude API, MCP servers, and skill authoring.

Known gaps:

- Native document/spreadsheet/PDF/PPT editing remains a distribution gap because Anthropic `docx`, `pdf`, `pptx`, and `xlsx` are source-available, not open source.
- Cloud/provider coverage is Vercel-heavy; AWS/GCP/Azure, data/ML operations, security operations, and enterprise SaaS integrations still need additional reviewed sources.
- Brand workflow remains generic-only; Anthropic `brand-guidelines` was not imported because it is Anthropic-specific.

Known redundancies:

- Anthropic `frontend-design`, `web-artifacts-builder`, and `webapp-testing` overlap existing Skill Hub atoms and should not be duplicated.
- Superpowers remains useful as orchestration source material, but direct broad-trigger imports would duplicate workflow-owner behavior.
- ECC is excluded from the candidate pool; existing local ECC-derived lineage should be replaced gradually only when a better reviewed atom exists.

## Candidate Intake Rules

- A selected atom is not installable until its source license, trigger contract, side effects, overlaps, and lifecycle risk are recorded.
- Prefer adapting one bounded skill at a time over importing a repo or plugin bundle.
- Keep host-specific paths, hooks, UI metadata, and credential assumptions outside standard `skills/<name>/SKILL.md`.
- Document skills from `anthropics/skills` fill a real map gap, but `docx`, `pdf`, `pptx`, and `xlsx` require license review before redistribution.

## Routing Anchors

- `workflow-router` owns intent recognition for non-trivial work and must hand off to exactly one owner.
- `sdd-workflow` owns SDD-first change work: align user need, gather source material, write spec/acceptance, write an executable plan, clean only approved files, implement, test, and deliver.
- `answer-workflow`, `diagnosis-workflow`, `review-workflow`, `delivery-workflow`, and `hub-maintenance-workflow` own their matching lifecycle states.
- `doc-coauthoring`, `internal-comms`, `theme-factory`, `claude-api`, `mcp-builder`, `skill-creator`, and `slack-gif-creator` are helper atoms, not top-level workflow owners.
- `diagnose` owns unknown runtime bugs and performance regressions.
- `tdd-workflow` owns known behavior changes that should be implemented through tests.
- `prototype` owns disposable learning artifacts only.
- `verification-loop` owns final command gates.
- `compound-code-review` owns deep review reports.
- `effective-interact` owns Chinese-first complex communication structure: plain briefs, structured Markdown, visual Markdown, ignored long-task fact ledgers, and HTML artifacts for option approvals, implementation plans, PR writeups, architecture/dependency/milestone maps, structure trees, status/incident dashboards, research explainers, review artifacts, and lightweight export editors. `grill-me` owns pressure testing, `frontend-design` owns production UI, and `frontend-slides` owns decks.

## Metadata Rules

`capabilities/index.json` is the install graph. Skill components use:

- `path`: source path under `skills/<name>`;
- `detects`: standard target evidence such as `skills/<name>/SKILL.md`;
- `agents`: currently `["standard"]` for lock compatibility with older schema field names;
- `risk`: lifecycle risk for install/update/remove decisions.

Do not add host-specific install directories to the capability graph. Packaging for a host belongs in that host's manifest layer, such as `.claude-plugin/`. Local Codex dogfooding uses `scripts/sync-codex-skills.mjs` to generate ignored `.codex/skills/` copies from the standard source tree; `.codex/` stays local and is not installable capability metadata. Subagents and hooks are workflow-owned optimizations: subagents need independent scopes, and hooks stay advisory until reviewed and approved.
