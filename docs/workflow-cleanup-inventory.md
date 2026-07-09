# Workflow Cleanup Inventory

Date: 2026-05-28

This inventory is a cleanup planning artifact for the personal workflow routing overlay and lifecycle installer. It classifies what remains in the standard install, what stays as source evidence, and what requires explicit approval before deletion or demotion.

Physical deletion was approved by the user on 2026-05-21 after source records were confirmed in `docs/source-projects.md` and `docs/workflow-source-dossier.md`; source records were retained. Profile-based installation was removed on 2026-05-22.

## Snapshot

| Area | Current count | Notes |
|---|---:|---|
| Install bundles | 0 | The CLI no longer supports selectable install bundles. |
| Installable skill components | 48 | Target-distributed skill components are under `skills/<name>/`; the source-repo-only `hub-maintenance-workflow` is excluded from standard target install. Harness templates are lifecycle components, not skill-install payloads. |
| Local `skills` directories | 49 | Includes 48 installable skill component directories plus the source-repo-only `hub-maintenance-workflow` owner. |
| Packaged source `skills` directories | 49 | npm publishes the source skill tree through `package.json` `files`; standard target install still filters `hub-internal` skills such as `hub-maintenance-workflow`. |
| First-class target path | 1 | `standard` is the only user-facing target path. `install` writes skills only; `init-harness --target standard` writes the root harness contract. Host packaging stays outside skill bodies. |

## Keep In Standard Install

| Surface | Decision | Reason |
|---|---|---|
| Target workflow owners | Install | `workflow-router`, SDD, diagnosis, review, delivery, and answer are the target-distributed public lifecycle lanes. |
| Harness Hub maintenance owner | Source repo only | `hub-maintenance-workflow` is packaged with the source tree for this repository but excluded from standard target install as `hub-internal`. |
| `effective-interact` | Install | High-priority interaction layer that reduces user interpretation cost for material alignment and handoff. |
| Matt Pocock adapted skills | Install | `grill-me`, `grill-with-docs`, `diagnose`, `prototype`, `handoff`, and `tdd-workflow` are narrow, adapted helpers with stable routing. |
| Everything Claude Code core helpers | Install | Keep bounded helpers such as `verification-loop`, `security-review`, `coding-standards`, and `agent-introspection-debugging`. |
| Web, communication, platform, learning, and creative atoms | Install | The installer now ships the complete standard skill set rather than asking users to choose bundles. |

## Keep As Source References

| Surface | Status | Cleanup posture |
|---|---|---|
| OpenSpec source | Installed helpers plus source records | Formal OpenSpec skills remain installable; source notes justify the bounded adaptation. |
| Everything Claude Code broad surface | Source/reference | Broad local skill directories removed; source checkout, docs, agents, config, and selected installed helpers remain. |
| Superpowers | Reference-only | Not installed. Keep as source evidence for intent routing, subagent discipline, and finish hygiene. |
| Matt Pocock non-installed skills | Reference-only or rejected | Keep decisions in docs; do not import wholesale. |
| Compound Engineering non-review lanes | Rejected or reference-only | Keep code review adaptation; leave commit, PR, Slack, Proof, Gemini, and autonomous work lanes out of Harness Hub. |
| Harness templates | Explicit lifecycle distribution | Root repo scaffolding is not a skill install payload. The internal `harness:minimal` template is installed only by `init-harness --target standard` and remains lock-backed. |

## Keep As Library Skills

| Surface | Status | Cleanup posture |
|---|---|---|
| Documents, spreadsheets, slides, and PDFs | External app/plugin skills only | Do not redistribute until source licensing and target lifecycle are clear. |
| Host-specific browser or cloud skills | External app/plugin skills only | Keep out of the default personal distribution unless explicitly useful and reviewed. |
| Future imported skill directories | Source docs until registered | npm package contents must exclude non-component skill directories until they are represented in `capabilities/index.json`. |

## Physical Cleanup Completed

The following non-component `skills` directories were removed from the active project skill root. Their source repos, upstream versions, and adoption/rejection decisions remain in `docs/source-projects.md`, `docs/workflow-source-dossier.md`, and related setup docs.

Post-cleanup disposable target smoke passed on 2026-05-21 for `harness-hub install --target standard`, `status`, `update --dry-run`, `remove --dry-run`, and `remove --yes`. The smoke installed the managed standard skill set, reported current records, had no update blockers, removed all lock-recorded standard skill files, and left only the generated `.harness-hub/reports` audit directory.

| Removed group | Directories |
|---|---|
| ECC broad/local library | `agent-sort`, `api-design`, `backend-patterns`, `brainstorming`, `bun-runtime`, `deep-research`, `dmux-workflows`, `eval-harness`, `everything-claude-code`, `exa-search`, `mcp-builder`, `mcp-server-patterns`, `nextjs-turbopack`, `strategic-compact`, `update-harness-hub` |
| Skill discovery/evaluation helpers folded into `hub-maintenance-workflow` | `find-skills`, `skill-evaluator` |
| Content, media, docs, and format library lanes | `algorithmic-art`, `article-writing`, `brand-guidelines`, `brand-voice`, `canvas-design`, `content-engine`, `crosspost`, `doc-coauthoring`, `docx`, `fal-ai-media`, `internal-comms`, `investor-materials`, `investor-outreach`, `market-research`, `pdf`, `pptx`, `slack-gif-creator`, `theme-factory`, `video-editing`, `x-api`, `xlsx` |
| Vercel React reference skills | `vercel-composition-patterns`, `vercel-react-best-practices`, `vercel-react-view-transitions` |
| Retired Ralph goal-loop skills | `ralph-prd`, `ralph-loop` |
| Retired legacy repo harness templates | Former broad or profile-based harness directories, excluding the active internal `harness/minimal/` standard template and explicit-only smoke scaffolds. |

## Future Cleanup Requiring Approval

These are candidates for later cleanup or demotion. Each needs explicit user approval, updated tests, and lock-backed target behavior when it affects managed installs.

| Candidate | Possible action | Required gate |
|---|---|---|
| Duplicate broad workflow triggers | Demote from routing language, not delete files immediately | Routing fixture coverage must prove no useful task loses an owner. |
| New imported skill directories not represented in `capabilities/index.json` | Keep as source docs or propose deletion later | npm package contents must exclude non-component skill directories. |
| Host-specific first-class metadata | Freeze or move to explicit compatibility work | Do not add host-local paths or runner assumptions to standard skill bodies. |
| Generated or local report artifacts | Keep ignored or clean only if owned by this run | Preserve checked-in examples and validation fixtures. |
| Public workflow owner names | Rename only through migration metadata | Existing managed target files must be update/remove safe. |

## Forbidden Cleanup

- unmanaged files must not be deleted by name alone;
- no deletion without explicit user approval;
- no broad cleanup hidden inside implementation work;
- no removal of source evidence needed to justify adoption, adaptation, rejection, or reference-only decisions;
- no managed install-surface removal without disposable install/status/update/remove smoke coverage;
- no lock-backed managed file removal outside the existing `.harness-hub/lock.json` ownership model.

## Next Cleanup Plan

1. Run `npm pack --dry-run` during release validation to verify the package boundary.
2. Keep future unregistered `skills` directories out of npm until `capabilities/index.json` includes them.
3. Create a user-facing cleanup proposal with exact file paths before deleting any newly imported directory.
4. If deletion affects managed public assets, add update/remove migration tests before touching those assets.
