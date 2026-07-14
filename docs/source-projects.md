---
type: records
title: Source project records
okf_version: "0.1"
---
# Source project records

This file records only upstream material that remains part of the current distributed skill set or an active source-pattern boundary. It is a Harness Hub source-repository record: full migration does not copy this file, rejected-candidate history, refresh caches, or repository-internal decisions into target projects.

| Source | Revision | License evidence | Current bounded use |
| --- | --- | --- | --- |
| `mattpocock/skills` | `d574778f94cf620fcc8ce741584093bc650a61d3` | MIT | Adapted atoms including `grill-me`, `diagnose`, `prototype`, `tdd-workflow`, and `handoff`; their owner remains the executable Workflow/Loop runtime. |
| `mattpocock/skills` `teach` | `aa024cb1954fedbc8221967c080fa40b9867f994` | MIT | Informed only delayed-retrieval queue semantics in `quick-learn`; its workspace, HTML lesson, asset, and learning-record entities remain source-only. |
| `EveryInc/compound-engineering-plugin` | `d090bde0ff1bbc33ec3c3b2049cb4687e9d76532` | MIT | Selective `compound-code-review` adaptation; no plugin bundle or Host packaging is distributed. |
| `anthropics/skills` | `690f15cac7f7b4c055c5ab109c79ed9259934081` | Per-skill `LICENSE.txt`; some upstream document skills are source-available only | Only skills with an explicit local redistribution decision are present; source-available document skills are not copied. |
| `multica-ai/andrej-karpathy-skills` | `2c606141936f1eeef17fa3043a72095b4765b9c2` | MIT stated by upstream README/plugin metadata | Installed `karpathy-guidelines` as a standard helper skill; upstream Host packaging and rule files are excluded. |
| `DietrichGebert/ponytail` | `1b2760d384c44e573a9d8c7a729fac616e5c3a76` | MIT | Installed the core `ponytail` standard skill; hooks, modes, statusline, slash commands, state, MCP proxy, and multi-Host packages are excluded. |
| `hardikpandya/stop-slop` | `8da1f030185bdfe8471220585162991eaeb970e9` | MIT | Preserved as the narrow English-prose editor, not a general documentation policy. |
| `Leonxlnx/taste-skill` | `3c7017d636c3a4aad378433ea6d0cfa6c921da4a` | MIT | Installed a narrow `design-taste-frontend` standard skill; it does not own dashboards, data-heavy product UI, reports, or decks. |
| `JCodesMore/ai-website-cloner-template` | `c9b4fea5b257370af339abedad727c8903490dac` | MIT | Installed an explicit-only `clone-website` skill with its skill-owned smoke asset; upstream Host metadata is excluded and authorized use is required. |
| `ThariqS/html-effectiveness` | `0e8d447494c81c661f2458b329e076a7ff7d75ec` | Apache-2.0 | Source pattern family and authorized visual-language reference for `effective-interact`, not an imported template. Do not copy sample pages, fictional data, or page-specific labels. |
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
