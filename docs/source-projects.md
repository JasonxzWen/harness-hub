---
type: records
title: Source project records
okf_version: "0.1"
---
# Source project records

This file records only upstream material that remains part of the current distributed skill set or an active source, prerequisite, or safety boundary. It is a Harness Hub source-repository record: full migration does not copy this file, inactive candidate history, refresh caches, or repository-internal decisions into target projects.

| Source | Revision | License evidence | Current bounded use |
| --- | --- | --- | --- |
| `mattpocock/skills` | `e9fcdf95b402d360f90f1db8d776d5dd450f9234` | MIT | Adapted `grill-me`, `grill-with-docs`, `diagnose`, `prototype`, `tdd`, `handoff`, `product-capability`, `to-tickets`, `codebase-design`, and `code-review`, plus selected completion/pruning guidance in `skill-creator`. Claude Code or Codex invokes them directly; upstream `ask-matt`, fixed main flow, Plugin packaging, Host metadata, issue-tracker state machine, and generic workflow entities are excluded. |
| `mattpocock/skills` `teach` | `aa024cb1954fedbc8221967c080fa40b9867f994` | MIT | Informed only delayed-retrieval queue semantics in `quick-learn`; its workspace, HTML lesson, asset, and learning-record entities remain source-only. |
| `EveryInc/compound-engineering-plugin` | `d090bde0ff1bbc33ec3c3b2049cb4687e9d76532` | MIT | Selective `code-review` adaptation; no plugin bundle or Host packaging is distributed. |
| `anthropics/skills` | `690f15cac7f7b4c055c5ab109c79ed9259934081` | Per-skill `LICENSE.txt`; some upstream document skills are source-available only | Only skills with an explicit local redistribution decision are present; source-available document skills are not copied. Frontend design, browser testing, and artifact delivery carry explicit local safety or correctness adaptations. |
| `multica-ai/andrej-karpathy-skills` | `2c606141936f1eeef17fa3043a72095b4765b9c2` | MIT stated by upstream README/plugin metadata | Installed `karpathy-guidelines` as a standard helper skill; upstream Host packaging and rule files are excluded. |
| `DietrichGebert/ponytail` | `1b2760d384c44e573a9d8c7a729fac616e5c3a76` | MIT | Installed the core `ponytail` standard skill; hooks, modes, statusline, slash commands, state, MCP proxy, and multi-Host packages are excluded. |
| `Panniantong/Agent-Reach` | `e825f6740d24c6c315c3b0dc41907e6c87ff39a5` | MIT; upstream license retained in the Skill | Adapted a target-distributed read-only routing Skill. It diagnoses an already installed user-level CLI but never installs dependencies, writes `~/.agent-reach`, configures accounts, or copies cookies, credentials, and browser state. |
| `prozacLaputa/codex-decision-ui` | `6b8cad06a898400b0552ff268adfe7b1ea7dec92` | MIT | Adapted the upstream `SKILL.md` as the Codex-only `decision-ui` atom while preserving its decision gate, native choice, and honest fallback semantics. The global-config setup section, plugin metadata, and eval fixtures are excluded. |
| `hardikpandya/stop-slop` | `8da1f030185bdfe8471220585162991eaeb970e9` | MIT | Preserved as the narrow English-prose editor, not a general documentation policy. |
| `Leonxlnx/taste-skill` | `3c7017d636c3a4aad378433ea6d0cfa6c921da4a` | MIT | Installed a narrow `design-taste-frontend` standard skill; it does not own dashboards, data-heavy product UI, reports, or decks. |
| `JCodesMore/ai-website-cloner-template` | `c9b4fea5b257370af339abedad727c8903490dac` | MIT | Installed an explicit-only `clone-website` skill with its skill-owned smoke asset; upstream Host metadata is excluded and authorized use is required. |
| `zarazhangrui/frontend-slides` | `9906a34d640d2111f724544cbc50f7f130569ae1` | MIT; upstream license retained in the Skill | Refreshed the existing `frontend-slides` atom around the current fixed 1920×1080 stage, visual discovery, preset, viewport, and motion guidance. Plugin packaging, the optional template pack, installers, deployment/export scripts, authentication, and publishing are excluded. |
| `zarazhangrui/codebase-to-course` | `ff8837ecf8e9f6ce9874ffa42e42633394a52a00` | No repository license found at the evaluated revision | Concept-only provenance boundary for a local-original `codebase-to-course` atom. No upstream Skill body, reference implementation, CSS, JavaScript, shell script, or asset is distributed. |
| `zarazhangrui/beautiful-feishu-whiteboard` | `6989843b355ac92ebbd4f66166189a001e61e9b5` | MIT; upstream license retained in the Skill | Adapted the verified Feishu SVG medium rules, catalogue, and 35 palette documents. Gallery screenshots, installer/authentication guidance, automatic downloads, preflight script, and fixed CLI write commands are excluded; live writes require an already available authenticated capability and normal target authorization. |
| `ThariqS/html-effectiveness` | `0e8d447494c81c661f2458b329e076a7ff7d75ec` | Apache-2.0 | Source pattern family and authorized visual-language reference for `effective-interact`, not an imported template. Do not copy sample pages, fictional data, or page-specific labels. |
| `emilkowalski/skills` | `7bb7061b5cf7de15ea1aeaf00fbd9e6592a20fce` | MIT; notice retained in every distributed Skill | Installed narrow `apple-design`, `animation-vocabulary`, and report-only `review-animations` atoms with progressive references and documented safety adaptations. The overlapping `emil-design-eng` umbrella and workflow-owning `improve-animations` remain excluded. |
| `Trystan-SA/claude-design-system-prompt` | `3c3ddb07d7aa3fef051d83608596470c95cfd8fe` | Repository MIT; the reverse-engineered prompt's original provenance is not independently established | An active provenance safety boundary and pinned read-only runtime source for design-system extraction. No source body is distributed, and its prompt, Host text, fixed process, and private-tool assumptions are not copied or executed. |
| `yetone/kill-ai-slop` and `killaislop.com` | `e2456514416e40f133432baf364a2353900267a7` | No repository license found at the evaluated revision | Official external Skill and pinned read-only review source for explicit AI-slop audits. No source body is distributed; installation or scanner execution requires separate authorization, and matches remain contextual clues rather than automatic findings or fixes. |
| `NameThatUI` | Live resource checked 2026-07-15 | No redistribution license found | Official runtime terminology source through `llms.txt`, `llms-full.txt`, and a de-identified search fallback. Existing frontend owners read it on demand; Harness Hub mirrors no corpus and sends no source code, product identity, customer data, screenshots, or private copy. |
| ByteDance public registry `grill-with-tree` | `1.0.0`, archive SHA-256 `c149b1729f39fea6005bda11823a0d52d9dc8203c4d47e10fae8a849e45a7eec` | No redistributable license or auditable source repository | Rejected for import. `grill-me` independently implements only the dependency-frontier batching pattern; the candidate body and its direct context/ADR writes are not distributed. |

## Record rules

- A distributed adaptation keeps its source, revision, and license evidence in the closest canonical `SKILL.md` when that metadata exists; this page provides the source-level decision and isolation boundary.
- Source refresh snapshots, candidate counts, rejected alternatives, and generated evaluation reports are transient evidence, not a second inventory.
- Add or change a record only when the active distributed surface, provenance, license decision, or safety boundary changes.
- Target-project knowledge, task cards, sessions, eval cases, and product facts never belong in this source-repository record.

## Sources

- [Canonical skill tree](../skills)
- [Skill routing](skill-routing.md)
- [Source governance](../knowledge/source-governance.md)
