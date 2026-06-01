# Source Projects

This file records upstream projects reviewed for Harness Hub. The install rule is personal distribution with a routing overlay: source ideas may come from any host ecosystem, imported skill bodies should keep upstream style by default, and committed distributed skills must stay in the standard `skills/<name>/SKILL.md` shape.

## Active Sources

| Source | Local status | Decision |
|---|---|---|
| `mattpocock/skills` | Refreshed at `b8be62ffacb0118fa3eaa29a0923c87c8c11985c`; MIT | Installed `grill-me`, `diagnose`, `prototype`, `tdd-workflow`, and `handoff` after normalizing triggers and removing host-specific assumptions. |
| `Fission-AI/OpenSpec` | Refreshed at `79303b521068c5f525ee61db06b915fc44b098f4`; replaces stale `open-spec/openspec` reference | Kept formal change lifecycle helpers; SDD remains the default change lane unless the user explicitly asks for OpenSpec or existing artifacts require it. |
| `obra/superpowers` | Refreshed at `f2cbfbefebbfef77321e4c9abc9e949826bea9d7`; reference-only source for broad-trigger workflow activation and brainstorming-style idea-shaping patterns | Used as routing and activation inspiration only; no wholesale workflow import. |
| `EveryInc/compound-engineering-plugin` | Refreshed at `f61d1b33eaba7be6e75902e31e49e022abdca3a0`; MIT | Installed only the `ce-code-review` workflow as `compound-code-review`; rejected wholesale import because it would duplicate many existing workflows. |
| `vercel-labs/skills` and `vercel-labs/agent-skills` | Refreshed at `c5ad3a85b4d16666974b161131413d08bfef3f7e` and `c39c4eb8a2981b0455e033882812c9df49bb72c5` | Selected web and React skills are kept when they remain standard skill folders with no host metadata. |
| `hluaguo/learn-faster-kit` | Refreshed at `209db9f6c873e3600a4b387748d82ffd24ddaf6e`; MIT | Adapted the learning lifecycle into `feynman-learning-coach`; did not import the larger runtime. |
| `zarazhangrui/frontend-slides` | Refreshed at `8dca834fc61abc9dd633cbe6a74ed7be3d82a608`; MIT | Reference source for `frontend-slides`; not merged into `effective-interact`. |
| `anthropics/skills` | Refreshed at `690f15cac7f7b4c055c5ab109c79ed9259934081`; plugin marketplace has `document-skills`, `example-skills`, and `claude-api` sets | Installed selective atoms: `mcp-builder`, `internal-comms`, `theme-factory`, `slack-gif-creator`; adapted slim atoms: `claude-api`, `skill-creator`; rewrote `doc-coauthoring` locally because the refreshed upstream directory had no per-skill license file. Do not import wholesale; document skills are source-available, not open source. |
| `walkinglabs/learn-harness-engineering` | Refreshed at `f31db7cd54ba222a1e62035ac0fd27dbbc6f8fd7`; public learning site and repository include harness-engineering lessons, example projects, resources, and a `harness-creator` skill/script | Evaluated as source material for Harness Hub. Local `validate-harness` adapts its five-subsystem assessment, HTML report, structural benchmark framing, and generic verification-command detection. Do not import wholesale yet: root repository license evidence and host-specific metadata such as `agents/openai.yaml` must be resolved before redistribution. Use a local minimal harness template plus source records first. |
| `revfactory/harness` | Reviewed at `3fe5ad086e4c3e57afbe05a4f138225cad88e552`; Apache-2.0 | Source material only. Its team-architecture factory patterns, orchestrator templates, skill testing guidance, and QA boundary checks inform the single minimal path through local `validate-harness` boundary checks, but do not add a separate harness level, optional pack, or Claude TeamCreate-dependent install surface. |
| `hardikpandya/stop-slop` | Refreshed at `8da1f030185bdfe8471220585162991eaeb970e9`; MIT | Installed as `stop-slop` with upstream `SKILL.md` and `references/` preserved except for local routing/source frontmatter. Trigger is narrow: English prose AI-tell cleanup, draft editing, or prose review only. Its bans on adverbs, passive voice, Wh- openers, and em dashes are strong style-editing rules, not default documentation policy. |
| `Leonxlnx/taste-skill` | Refreshed at `3c7017d636c3a4aad378433ea6d0cfa6c921da4a`; MIT | Installed a narrow `design-taste-frontend` standard skill for landing pages, portfolios, marketing pages, and redesigns. It is not a default frontend design skill and does not own dashboards, data tables, multi-step product UI, reports, or decks. Report-safe preflight ideas remain selectively absorbed into `effective-interact`. |
| `JCodesMore/ai-website-cloner-template` | Refreshed at `c9b4fea5b257370af339abedad727c8903490dac`; MIT | Installed an explicit-only `clone-website` skill plus a lightweight `harness/website-cloner` smoke scaffold. Do not import the multi-platform host metadata or make website cloning a default frontend route; permission, browser evidence, replacement content, and validation are required. |

## Evaluated But Not Installed

| Candidate | Decision | Reason |
|---|---|---|
| `snarktank/ralph` | Retired from installable distribution | `ralph-prd`, `ralph-loop`, and `scripts/ralph/prd.json.example` were removed on 2026-05-22 because current Codex and Claude Code goal/story workflows cover the lane. Keep the upstream note as historical source evidence only. |
| Matt Pocock `write-a-skill` | Reference-only | Useful reminders for description-as-router, progressive disclosure, concrete examples, and review checklists; local Harness Hub quality gates remain authoritative. |
| Matt Pocock `grill-with-docs` | Explicit-only | Useful for terminology and scenario pressure, but inline `CONTEXT.md`/ADR writes are not standardized locally; keep `grill-me`/review workflows as the pressure-test owner and use `effective-interact` only for expression or handoff. |
| `mattpocock/dictionary-of-ai-coding` | Reference-only | Reviewed at `2afee4819aaea83108bd662258ba5d35343dc7bb`; no license file or `package.json` license field was present in the checked snapshot. Use as terminology-system and explainer-structure inspiration for `docs/harness-vocabulary.md` and `effective-interact`; do not copy dictionary entry text, redistribute its contents, or install it as a skill. |
| `affaan-m/ECC` / `affaan-m/everything-claude-code` | Excluded from the atomic skill candidate pool | Removed by product direction on 2026-05-21 and reviewed at `64cd1ba248e77e377e76f70fc4e6434bfdddd511` under MIT. Do not use ECC as a source for new atom selection. Its stocktake, trigger-noise audit, and agent-architecture audit ideas inform local `validate-harness` checks when folded into the single minimal path rather than shipped as another layer. |
| Matt Pocock `improve-codebase-architecture` and `zoom-out` | Wait | Overlap current architecture and product-planning skills. |
| Matt Pocock `caveman` | Reject by default | Conflicts with this repo's communication policy unless explicitly requested. |
| Matt Pocock `to-prd`, `to-issues`, `triage`, `setup-matt-pocock-skills` | Reject by default | Overlap OpenSpec/local issue-routing surfaces or introduce external issue-tracker side effects. |
| Compound Engineering wholesale bundle | Reject by default | Too broad and overlap-heavy; custom agent files and external workflows should not enter the default skill tree. |
| `michalvavra/agents` `html-tools` | Explicit-only reference | Refreshed at `77473489d5c7b248af51ee7acf072c84a59ba6d4`; useful single-file HTML utility ideas, but overlaps `effective-interact` and `web-artifacts-builder`. |
| `Cocoon-AI/architecture-diagram-generator` | Explicit-only reference | Refreshed at `4b9087d55268c79a935105439dbcd37b630fc3f3`; useful architecture diagram pattern, but too narrow and CDN-oriented for default install. |
| Anthropic `docx`, `pdf`, `pptx`, `xlsx` | Reference-only | High-value document/spreadsheet/presentation/PDF source material, but source-available rather than open source in the refreshed snapshot, so not redistributed through Harness Hub. |
| Anthropic `brand-guidelines` | Reference-only | Apache 2.0, but it encodes Anthropic's own brand rather than a reusable customer brand workflow. |
| Anthropic `algorithmic-art` and `canvas-design` | Reference-only | Creative and useful as inspiration, but niche, heavier, and partially oriented around host artifact behavior. Keep out of distribution until a user need justifies a bounded standard skill. |
| Anthropic `frontend-design`, `web-artifacts-builder`, `webapp-testing` | Already covered | Existing local Harness Hub versions already cover these surfaces; do not add duplicates. |

## Current Policy

- Read upstream README, skill files, plugin metadata, and license before deciding.
- Prefer preserving upstream skill bodies over local style rewrites.
- Use selective adaptation only when an upstream skill is unsafe, unusable, legally unclear, or directly conflicts with the routing overlay.
- Keep source attribution in skill metadata or this file.
- Keep host-specific tool names, config paths, runner scripts, and UI metadata out of local routing/workflow layers; do not rewrite imported bodies solely for this unless it blocks safe personal distribution.
- Keep third-party harness projects as source evidence until a concrete idea is ready to improve the single minimal path. Do not create advanced harness packs, install levels, or bundle selectors.
- Update `docs/skill-routing.md`, `capabilities/index.json`, README, and tests when a candidate changes routing or the installable skill surface.
- See `docs/source-skill-inventory.md` for the latest local refresh, scanned skill names, and coverage notes.
