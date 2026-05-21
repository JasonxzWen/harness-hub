# Workflow Cleanup Inventory

Date: 2026-05-21

This inventory is a cleanup planning artifact for the workflow-router redesign. It classifies what to keep, what to keep explicit, what becomes library-only, and what requires a separate approval gate before any deletion or demotion.

Physical deletion was approved by the user on 2026-05-21 after source records were confirmed in `docs/source-projects.md` and `docs/workflow-source-dossier.md`; source records were retained.

## Snapshot

| Area | Current count | Notes |
|---|---:|---|
| Install profiles | 7 | `minimal`, `sdd`, `web`, `openspec-formal`, `ralph`, `learning`, `harness`. |
| Capability components | 43 | Includes skills and harness templates. |
| Local `skills` directories | 34 | Matches installable skill component directories after physical cleanup. |
| Packaged `skills` directories | 34 | npm publishes the platform-neutral skill source tree. |
| First-class workflow target | 1 | `standard` installs into `skills/<name>/`; host packaging stays outside skill bodies. |

## Keep In Default Or Dogfood Profiles

| Surface | Keep where | Reason |
|---|---|---|
| `minimal` | Default profile | Stable existing low-noise engineering baseline. Do not mix the new workflow router into it until real-task dogfood proves routing quality. |
| `sdd` | Explicit dogfood profile | Owns the new SDD-first workflow router, public owner skills, embedded TDD helpers, explicit Ralph goal-loop bridge, review, validation, and delivery handoff. |
| `effective-interact` | `minimal` and `sdd` | High-priority interaction layer that reduces user interpretation cost for material alignment and handoff. |
| Matt Pocock `grill-me`, `diagnose`, `prototype` | `minimal` | Narrow, adapted skills with stable routing; they remain helpers or library lanes under the new workflow. |
| Everything Claude Code core helpers | `minimal` and `sdd` subset | Keep bounded helpers such as `tdd-workflow`, `verification-loop`, `security-review`, and `agent-introspection-debugging`. |

## Keep As Explicit Profiles

| Surface | Profile | Decision |
|---|---|---|
| OpenSpec | `openspec-formal` | Keep explicit. It remains useful for formal change artifacts but must not become the default SDD lane. |
| Ralph | `ralph` | Keep explicit. Autonomous repeated execution is not the default workflow. |
| Web/UI bundle | `web` | Keep explicit for repos that actually ship frontend UI. |
| Learning coach | `learning` | Keep explicit because it changes the assistant posture from engineering execution to tutoring. |
| Harness templates | `harness` | Keep explicit for target repos that need agent operating scaffolding. |

## Keep As Library Skills

| Surface | Status | Cleanup posture |
|---|---|---|
| Everything Claude Code broad surface | Source/reference | Broad local skill directories removed; source checkout, docs, agents, config, and selected installed helpers remain. |
| Superpowers | Reference-only | Not installed. Keep as source evidence for intent routing, subagent discipline, and finish hygiene. |
| Matt Pocock non-installed skills | Reference-only or rejected | Keep decisions in docs; do not import wholesale. |
| Compound Engineering non-review lanes | Explicit-only or rejected | Keep code review adaptation; leave commit, PR, Slack, Proof, Gemini, and autonomous work lanes out of default profiles. |
| Format and media skills | Source/reference unless promoted | Removed from the active project skill root unless represented as installable components. |

## Physical Cleanup Completed

The following non-component `skills` directories were removed from the active project skill root. Their source repos, upstream versions, and adoption/rejection decisions remain in `docs/source-projects.md`, `docs/workflow-source-dossier.md`, and related setup docs.

Post-cleanup disposable target smoke passed on 2026-05-21 for `skill-hub install --profile sdd --target standard`, `status`, `update --dry-run`, `remove --dry-run`, and `remove --yes`. The smoke installed the `sdd` managed set, reported current records, had no update blockers, removed all lock-recorded standard skill files, and left only the generated `.skill-hub/reports` audit directory.

| Removed group | Directories |
|---|---|
| ECC broad/local library | `agent-sort`, `api-design`, `backend-patterns`, `brainstorming`, `bun-runtime`, `deep-research`, `dmux-workflows`, `eval-harness`, `everything-claude-code`, `exa-search`, `mcp-builder`, `mcp-server-patterns`, `nextjs-turbopack`, `strategic-compact`, `update-skill-hub` |
| Skill discovery/evaluation helpers folded into `hub-maintenance-workflow` | `find-skills`, `skill-evaluator` |
| Content, media, docs, and format library lanes | `algorithmic-art`, `article-writing`, `brand-guidelines`, `brand-voice`, `canvas-design`, `content-engine`, `crosspost`, `doc-coauthoring`, `docx`, `fal-ai-media`, `internal-comms`, `investor-materials`, `investor-outreach`, `market-research`, `pdf`, `pptx`, `slack-gif-creator`, `theme-factory`, `video-editing`, `x-api`, `xlsx` |
| Vercel React reference skills | `vercel-composition-patterns`, `vercel-react-best-practices`, `vercel-react-view-transitions` |

## Future Cleanup Requiring Approval

These are candidates for later cleanup or demotion. Each needs explicit user approval, updated tests, and lock-backed target behavior when it affects managed installs.

| Candidate | Possible action | Required gate |
|---|---|---|
| Duplicate broad workflow triggers | Demote from default routing language, not delete files immediately | Routing fixture coverage must prove no useful task loses an owner. |
| New imported skill directories not referenced by any profile | Keep as source docs or propose deletion later | npm package contents must exclude non-component skill directories until promoted into `capabilities/index.json`. |
| Host-specific first-class metadata in future workflow profiles | Freeze or move to explicit compatibility work | Do not break existing profile behavior without a migration note. |
| Generated or local report artifacts | Keep ignored or clean only if owned by this run | Preserve checked-in examples and validation fixtures. |
| Public workflow owner names | Rename only through migration metadata | Existing managed target files must be update/remove safe. |

## Forbidden Cleanup

- unmanaged files must not be deleted by name alone;
- no deletion without explicit user approval;
- no broad cleanup hidden inside implementation work;
- no removal of source evidence needed to justify adoption, adaptation, rejection, or reference-only decisions;
- no profile removal without disposable install/status/update/remove smoke coverage;
- no lock-backed managed file removal outside the existing `.skill-hub/lock.json` ownership model.

## Next Cleanup Plan

1. Run `npm pack --dry-run` during release validation to verify the package boundary.
2. Keep future unprofiled `skills` directories out of npm until a profile promotes them.
3. Create a user-facing cleanup proposal with exact file paths before deleting any newly imported directory.
4. If deletion affects managed public assets, add update/remove migration tests before touching those assets.
