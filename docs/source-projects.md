# Source Projects

This file records upstream projects reviewed for Skill Hub. The install rule is platform-neutral normalization: source ideas may come from any host ecosystem, but committed skills must stay in the standard `skills/<name>/SKILL.md` shape.

## Active Sources

| Source | Local status | Decision |
|---|---|---|
| `mattpocock/skills` | `vendor/mattpocock-skills/` ignored; checked at `d54c497aa94400a496d3f2c38be10fa5f284c5a9`; MIT | Installed `grill-me`, `diagnose`, `prototype`, `tdd-workflow`, and `handoff` after normalizing triggers and removing host-specific assumptions. |
| `EveryInc/compound-engineering-plugin` | `vendor/EveryInc-compound-engineering-plugin/` ignored; checked at `d090bde0ff1bbc33ec3c3b2049cb4687e9d76532`; MIT | Installed only the `ce-code-review` workflow as `compound-code-review`; rejected wholesale import because it would duplicate many existing workflows. |
| `vercel-labs/skills` and `vercel-labs/agent-skills` | vendor checkouts ignored | Selected web and React skills are kept when they remain standard skill folders with no host metadata. |
| `snarktank/ralph` | `scripts/ralph/prd.json.example` plus `ralph-prd` and `ralph-loop` skills | Kept the PRD/story-loop contract; removed bundled platform-specific runner files. |
| `hluaguo/learn-faster-kit` | reviewed at `cce560b51d765f08407d37afd3f4dad19d32b268`; MIT | Adapted the learning lifecycle into `feynman-learning-coach`; did not import the larger runtime. |
| `zarazhangrui/frontend-slides` | reviewed at `8dca834fc61abc9dd633cbe6a74ed7be3d82a608`; MIT | Reference source for `frontend-slides`; not merged into `effective-interact`. |

## Evaluated But Not Installed

| Candidate | Decision | Reason |
|---|---|---|
| Matt Pocock `grill-with-docs` | Explicit-only | Promising, but needs a local decision on project documentation conventions before enabling inline doc writes. |
| Matt Pocock `improve-codebase-architecture` and `zoom-out` | Wait | Overlap current architecture and product-planning skills. |
| Matt Pocock `caveman` | Reject by default | Conflicts with this repo's communication policy unless explicitly requested. |
| Matt Pocock `to-prd`, `to-issues`, `triage`, `setup-matt-pocock-skills` | Reject by default | Overlap OpenSpec/Ralph/local issue-routing surfaces or introduce external issue-tracker side effects. |
| Compound Engineering wholesale bundle | Reject by default | Too broad and overlap-heavy; custom agent files and external workflows should not enter the default skill tree. |
| `michalvavra/agents` `html-tools` | Explicit-only reference | Useful single-file HTML utility ideas, but overlaps `effective-interact` and `web-artifacts-builder`. |
| `Cocoon-AI/architecture-diagram-generator` | Explicit-only reference | Useful architecture diagram pattern, but too narrow and CDN-oriented for default install. |

## Current Policy

- Read upstream README, skill files, plugin metadata, and license before deciding.
- Prefer selective adaptation over wholesale import.
- Keep source attribution in skill metadata or this file.
- Remove host-specific tool names, config paths, runner scripts, and UI metadata before committing a skill.
- Update `docs/skill-routing.md`, `capabilities/index.json`, README, and tests when a candidate changes routing or installable profiles.
