# Source Skill Inventory

Date: 2026-05-21

This inventory records the local refresh of Skill Hub's referenced source repositories after removing `affaan-m/everything-claude-code` from the atomic skill candidate pool. Existing local skill lineage is not rewritten here; this file is only the candidate-source inventory for future atom selection.

The refresh cache is outside the repo at `C:\Users\Admin\.codex\source-cache\skill-hub` so source inspection does not mutate installable skills.

Scan scope:

- Count canonical skill surfaces only: `skills/*/SKILL.md`, nested category skill folders such as `skills/*/*/SKILL.md`, plugin skill folders such as `plugins/*/skills/*/SKILL.md`, and OpenSpec generated workflow skill names.
- Exclude duplicated docs translations, package copies, and test fixtures.
- Treat archived skill folders as archived, not active install candidates.
- Exclude ECC from candidate selection.

## Refreshed Candidate Sources

| Source | Refreshed checkout | Commit | Candidate skills |
|---|---|---:|---:|
| `mattpocock/skills` | `mattpocock-skills` | `b8be62ffacb0118fa3eaa29a0923c87c8c11985c` | 28 |
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

Total non-ECC canonical/reference skill surfaces scanned: 139.

## Excluded Sources

| Source | Prior refreshed commit | Exclusion |
|---|---|---|
| `affaan-m/everything-claude-code` | `1e8c7e7994223e0ff337d1626cd08e04a1ae67ed` | Removed from candidate selection by product direction. |

## Selection Artifact

Use `reports/atomic-skill-selection.html` as the review surface for choosing candidate atom skills. It groups the non-ECC candidates by purpose, then source repo, then individual skill with a short Chinese purpose summary.

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
| `claude-api` | Installed as slim adaptation | Upstream is useful but volatile and provider-specific. Skill Hub keeps a routing/source-lookup wrapper rather than copying all current API tables. |
| `skill-creator` | Installed as slim adaptation | Upstream includes host-specific eval scripts and UI metadata. Skill Hub keeps the platform-neutral authoring and evaluation contract. |
| `doc-coauthoring` | Local rewrite, not copied | The refreshed upstream directory had no per-skill license file. Skill Hub fills the gap with a local-original standard skill. |
| `frontend-design`, `web-artifacts-builder`, `webapp-testing` | Not imported | Existing local Skill Hub skills already cover these. |
| `brand-guidelines` | Not imported | It encodes Anthropic's brand rather than a reusable brand workflow. |
| `algorithmic-art`, `canvas-design` | Reference-only | Creative and potentially useful, but niche/heavy and not needed for the first atom import. |
| `docx`, `pdf`, `pptx`, `xlsx` | Reference-only | High-value gap area, but source-available licensing blocks redistribution by default. |

## Coverage Notes

- After excluding ECC and adding `anthropics/skills`, the candidate pool has 139 scanned surfaces across workflow, SDD, review, debugging, frontend, Vercel, architecture diagrams, document processing, Claude API, MCP building, skill creation, brand/communications, and creative artifacts. Ralph remains source-recorded but is retired from installable distribution.
- The first Anthropic atom pass promoted seven installable skills or local rewrites into `capabilities/index.json`: `claude-api`, `mcp-builder`, `skill-creator`, `doc-coauthoring`, `internal-comms`, `theme-factory`, and `slack-gif-creator`.
- It is not yet broad enough for a general marketplace. Future source expansion should target cloud providers beyond Vercel, data and ML operations, security operations, enterprise SaaS, and more language/framework niches.
- The sustainable direction is to keep Skill Hub's local layer as orchestration, routing, lifecycle, provenance, dedupe, and validation; pull atomic skills from upstream only when license, source quality, trigger contract, and platform neutrality pass.
