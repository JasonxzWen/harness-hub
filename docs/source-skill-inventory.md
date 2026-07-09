# Source Skill Inventory

Date: 2026-07-09

This inventory records the local refresh of Harness Hub's referenced source repositories after removing `affaan-m/everything-claude-code` from the atomic skill candidate pool. Existing local skill lineage is not rewritten here; this file is only the candidate-source inventory for future atom selection and routing placement. `mattpocock/skills` was refreshed again on 2026-07-09 to update existing adapted skills, install a Harness Hub-compatible `grill-with-docs`, and re-evaluate newer engineering, productivity, in-progress, personal, and misc candidates.

The 2026-07-09 Matt Pocock refresh cache was kept under ignored task state at `.harness-hub/state/runs/mattpocock-skills-upstream`; prior broader refresh caches may still live outside the repo at `C:\Users\Admin\.codex\source-cache\harness-hub`.

Scan scope:

- Count canonical skill surfaces only: `skills/*/SKILL.md`, nested category skill folders such as `skills/*/*/SKILL.md`, plugin skill folders such as `plugins/*/skills/*/SKILL.md`, and OpenSpec generated workflow skill names.
- Exclude duplicated docs translations, package copies, and test fixtures.
- Treat archived skill folders as archived, not active install candidates.
- Exclude ECC from candidate selection.

## Refreshed Candidate Sources

| Source | Refreshed checkout | Commit | Candidate skills |
|---|---|---:|---:|
| `mattpocock/skills` | `.harness-hub/state/runs/mattpocock-skills-upstream` | `d574778f94cf620fcc8ce741584093bc650a61d3` | 38 total `SKILL.md`; 21 plugin-registered active |
| `Fission-AI/OpenSpec` | `openspec` | `79303b521068c5f525ee61db06b915fc44b098f4` | 11 generated |
| `obra/superpowers` | `superpowers` | `f2cbfbefebbfef77321e4c9abc9e949826bea9d7` | 14 |
| `EveryInc/compound-engineering-plugin` | `compound-engineering-plugin` | `f61d1b33eaba7be6e75902e31e49e022abdca3a0` | 38 |
| `vercel-labs/agent-skills` | `vercel-labs-agent-skills` | `c39c4eb8a2981b0455e033882812c9df49bb72c5` | 8 |
| `vercel-labs/skills` | `vercel-labs-skills` | `c5ad3a85b4d16666974b161131413d08bfef3f7e` | 1 |
| `snarktank/ralph` | `snarktank-ralph` | `6c53cb0b831ebe8739c6a003e22af14902d8b0b5` | 2 (retired) |
| `hluaguo/learn-faster-kit` | `learn-faster-kit` | `209db9f6c873e3600a4b387748d82ffd24ddaf6e` | 0 |
| `zarazhangrui/frontend-slides` | `frontend-slides` | `8dca834fc61abc9dd633cbe6a74ed7be3d82a608` | 1 |
| `michalvavra/agents` | `michalvavra-agents` | `77473489d5c7b248af51ee7acf072c84a59ba6d4` | 2 active, 16 archived |
| `Cocoon-AI/architecture-diagram-generator` | `architecture-diagram-generator` | `4b9087d55268c79a935105439dbcd37b630fc3f3` | 1 |
| `anthropics/skills` | `anthropics-skills` | `690f15cac7f7b4c055c5ab109c79ed9259934081` | 17 |
| `Leonxlnx/taste-skill` | `taste-skill` | `3c7017d636c3a4aad378433ea6d0cfa6c921da4a` | 12 |
| `hardikpandya/stop-slop` | `stop-slop` | `8da1f030185bdfe8471220585162991eaeb970e9` | 1 |
| `JCodesMore/ai-website-cloner-template` | `ai-website-cloner-template` | `c9b4fea5b257370af339abedad727c8903490dac` | 1 |
| `multica-ai/andrej-karpathy-skills` | `andrej-karpathy-skills` | `2c606141936f1eeef17fa3043a72095b4765b9c2` | 1 |

Total non-ECC canonical/reference skill surfaces scanned: 164.

## Excluded Sources

| Source | Prior refreshed commit | Exclusion |
|---|---|---|
| `affaan-m/everything-claude-code` | `1e8c7e7994223e0ff337d1626cd08e04a1ae67ed` | Removed from candidate selection by product direction. |

## Selection Artifact

Candidate selection reports are local generated artifacts and must stay under ignored output such as `reports/`. Do not commit generated HTML reports; keep durable source decisions in this inventory instead.

## `anthropics/skills` Candidate Skills

`algorithmic-art`, `brand-guidelines`, `canvas-design`, `claude-api`, `doc-coauthoring`, `docx`, `frontend-design`, `internal-comms`, `mcp-builder`, `pdf`, `pptx`, `skill-creator`, `slack-gif-creator`, `theme-factory`, `web-artifacts-builder`, `webapp-testing`, `xlsx`

License/source note: the upstream README states many examples are Apache 2.0, while `docx`, `pdf`, `pptx`, and `xlsx` are source-available rather than open source. Treat those four as reference-first until a license and redistribution decision is made.

## `anthropics/skills` Import Decision

| Skill | Decision | Reason |
|---|---|---|
| `mcp-builder` | Installed, normalized | Apache 2.0 and fills a real MCP server design/build/eval gap. `reference/` was normalized to `references/`, and host-specific fetch-tool wording was removed. |
| `internal-comms` | Installed, normalized | Apache 2.0 and fills the internal update/FAQ/incident communication gap. `examples/` was normalized to `references/`, and trigger text was made organization-neutral. |
| `theme-factory` | Installed, normalized | Apache 2.0 and adds a bounded visual theming atom for artifacts. Theme assets moved under `assets/`. |
| `slack-gif-creator` | Installed, normalized | Apache 2.0 and adds a narrow Slack GIF atom with reusable Python utilities under `scripts/`. |
| `claude-api` | Installed as slim adaptation | Upstream is useful but volatile and provider-specific. Harness Hub keeps a routing/source-lookup wrapper rather than copying all current API tables. |
| `skill-creator` | Installed as slim adaptation | Upstream includes host-specific eval scripts and UI metadata. Harness Hub keeps the platform-neutral authoring and evaluation contract. |
| `doc-coauthoring` | Local rewrite, not copied | The refreshed upstream directory had no per-skill license file. Harness Hub fills the gap with a local-original standard skill. |
| `frontend-design`, `web-artifacts-builder`, `webapp-testing` | Not imported | Existing local Harness Hub skills already cover these. |
| `brand-guidelines` | Not imported | It encodes Anthropic's brand rather than a reusable brand workflow. |
| `algorithmic-art`, `canvas-design` | Reference-only | Creative and potentially useful, but niche/heavy and not needed for the first atom import. |
| `docx`, `pdf`, `pptx`, `xlsx` | Reference-only | High-value gap area, but source-available licensing blocks redistribution by default. |

## `taste-skill` And `stop-slop` Import Decision

| Source | Decision | Reason |
|---|---|---|
| `Leonxlnx/taste-skill` | Installed as `design-taste-frontend` plus selective `effective-interact` absorption | MIT and fills a bounded anti-template frontend taste gap for landing pages, portfolios, marketing pages, and redesigns. The standard skill keeps narrow routing and reference-spoke guidance instead of copying the whole repo. It is not the default frontend design skill and does not own dashboards, data tables, multi-step product UI, reports, or decks. |
| `hardikpandya/stop-slop` | Installed as `stop-slop` | MIT, standard skill shape, and fills a bounded English prose AI-tell cleanup gap. Local routing marks it as a strong style editor so its hard bans do not become default rules for code explanations, Chinese output, technical specs, status reports, or ordinary docs. |

## Website Cloner Import Decision

| Source | Decision | Reason |
|---|---|---|
| `JCodesMore/ai-website-cloner-template` | Installed as explicit-only `clone-website` plus lightweight `harness/website-cloner` scaffold | MIT and provides a strong browser-inspection, component-spec, and validation workflow for authorized site reconstruction. Skill Hub keeps the trigger narrow, excludes host-specific multi-platform metadata, and requires safety, replacement-content, browser evidence, and local validation gates. |

## Karpathy Guidelines Import Decision

| Source | Decision | Reason |
|---|---|---|
| `multica-ai/andrej-karpathy-skills` | Installed as `karpathy-guidelines` | The single upstream skill is small, platform-neutral in its body, and matches Harness Hub's engineering discipline: state assumptions, avoid speculative abstractions, keep diffs surgical, and define verifiable success criteria. The local integration narrows frontmatter routing so it acts as a helper baseline under owner workflows rather than a broad top-level lifecycle owner. Host packaging files such as `CLAUDE.md`, `.cursor/rules/`, and `.claude-plugin/` stay out of the distributed skill tree. License evidence comes from README and plugin metadata because no standalone `LICENSE` file was present in the checked snapshot. |

## 2026-07-08 Output And Coding Minimalism Spot Evaluation

These spot checks are not part of the 2026-06-30 counted candidate pool.

| Source | Decision | Reason |
|---|---|---|
| `JuliusBrussee/caveman` | Reject by default; reference-only | Good source evidence for output-token measurement and opt-in terse-mode design, but the broad persistent communication-style override conflicts with this repo's Chinese, clarity-first communication policy and ships host/runtime surfaces outside standard skills. |
| `DietrichGebert/ponytail` | Installed as `ponytail` core standard skill | Better fit for coding minimalism than `caveman` because it targets over-building rather than prose alone: reuse existing code, stdlib, native features, and already-installed dependencies before adding code. Import only the core standard skill and make it the coding-minimalism helper; keep `effective-interact` focused on communication/report density. Do not import upstream persistent modes, hooks, subagent injection, statusline, slash commands, state files, MCP proxy, or multi-host plugin packaging into `skills/`. |

## `mattpocock/skills` 2026-07-09 Refresh Decision

| Area | Decision | Reason |
|---|---|---|
| Already adapted skills | Refreshed current local adaptations | `grill-me`, `diagnose`, `prototype`, `tdd-workflow`, and `handoff` remain the right default subset. Local bodies stay adapted to Harness Hub owner workflows; source metadata now points to `d574778f94cf620fcc8ce741584093bc650a61d3`, and high-value upstream details were folded into `diagnose`, `prototype`, and `tdd-workflow` references. |
| `grill-with-docs` | Installed as adapted standard skill | The user explicitly asked to revisit it, and the upstream skill is now a thin orchestrator over `grilling` plus `domain-modeling`. Harness Hub installs a local wrapper that preserves one-question-at-a-time grilling while mapping glossary, contradiction, and ADR-style updates to `.harness-hub/context` and `.harness-hub/state` with human confirmation. |
| `codebase-design` and `improve-codebase-architecture` | Source ideas, not installed yet | Strong material for deep modules, interface/test-surface discipline, dependency categories, deletion tests, and Design It Twice comparisons. Fold into review/refactor rubrics before considering a new helper skill. |
| `domain-modeling` | Source idea absorbed through `grill-with-docs` | Useful terminology, scenario, code/doc contradiction, and ADR-trigger discipline. Direct import would write `CONTEXT.md` and `docs/adr/`, which overlaps the standard harness LLM Wiki and worktree state model. |
| `writing-great-skills` | Source idea for skill quality | Useful vocabulary for invocation modes, description quality, progressive disclosure, completion criteria, no-op, sediment, and sprawl. Fold into skill-quality guidance and evals instead of installing another authoring skill. |
| Issue-tracker and orchestration flows | Reject by default | `ask-matt`, `to-spec`, `to-tickets`, `triage`, `setup-matt-pocock-skills`, `implement`, and `wayfinder` overlap `workflow-router`, SDD/OpenSpec/local issue-routing surfaces, or assume external issue trackers, labels, spec/ticket publication, or root host-file edits. Keep vertical-slice and durable agent-brief patterns as source evidence only. |
| Host/project setup helpers | Explicit-only reference | `git-guardrails-claude-code`, `setup-pre-commit`, `migrate-to-shoehorn`, and similar helpers are too host- or project-mutating for default distribution. |
| Research, teaching, writing, personal, and in-progress skills | Not installed | `research` overlaps `documentation-lookup` / `answer-workflow` and assumes background-agent file capture; `teach` overlaps `quick-learn`; `edit-article`, `obsidian-vault`, writing fragments/beats/shape, `wizard`, `loop-me`, and `claude-handoff` are personal, in-progress, host-specific, or too narrow for the standard distribution. |

## Coverage Notes

- After excluding ECC and refreshing `mattpocock/skills`, `anthropics/skills`, `taste-skill`, `stop-slop`, `ai-website-cloner-template`, and `andrej-karpathy-skills`, the candidate pool has 164 scanned surfaces across workflow, SDD, review, debugging, frontend, website reconstruction, engineering behavior baselines, Vercel, architecture diagrams, document processing, Claude API, MCP building, skill creation, brand/communications, creative artifacts, and prose cleanup. Ralph remains source-recorded but is retired from installable distribution.
- The first Anthropic atom pass promoted seven installable skills or local rewrites into `capabilities/index.json`: `claude-api`, `mcp-builder`, `skill-creator`, `doc-coauthoring`, `internal-comms`, `theme-factory`, and `slack-gif-creator`. The prose pass promoted `stop-slop`; the taste pass promoted `design-taste-frontend` and also changed `effective-interact` references and validator behavior. The 2026-06-05 local pass added `package-release-sniffer` for primary-source AI/developer-tool package release discovery without introducing registry clients or scheduled monitoring. The 2026-06-12 local pass added `harness-quality-check` for advisory HTML quality/readiness audits that compose existing Hub and target-repo checks without enforcement or remote side effects. The 2026-06-25 local pass added `insight` for private, read-only repository interaction audits from Codex and Claude Code traces with ignored local report output.
- The Karpathy pass promoted `karpathy-guidelines` as a helper baseline for coding behavior and intentionally avoided importing host-specific rule files or plugin metadata into `skills/`.
- The Ponytail pass promoted `ponytail` as the standard coding-minimalism helper and intentionally avoided importing host-specific hooks, plugin packaging, mode state, statusline setup, slash commands, or runtime adapters into `skills/`.
- It does not need to become a general marketplace. Future source expansion should follow recurring personal project needs first.
- The sustainable direction is to keep Harness Hub's local layer as personal orchestration, routing, lifecycle, provenance, dedupe, and validation; pull atomic skills from upstream only when license, source quality, trigger contract, and personal usefulness pass.
