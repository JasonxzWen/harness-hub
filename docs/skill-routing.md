# Skill Routing And De-Duplication

Date: 2026-05-11

This project intentionally avoids installing every famous skill pack wholesale. Prefer the narrowest skill that matches the user request.

## Current Skill Roots

| Root | Purpose |
|---|---|
| `.codex/skills/` | Anthropic/Claude built-in skills adapted for Codex plus OpenSpec helpers. |
| `.agents/skills/` | Cross-agent skills from Everything Claude Code, Vercel, and other agent-skill ecosystems. |
| `.codex/agents/` | Codex multi-agent role configs from ECC. |

## Priority Rules

| Task | Preferred skill | Secondary skill |
|---|---|---|
| Pressure-test a plan or design before implementation | `grill-me` | `brainstorming` for idea exploration; `product-capability` for implementation-ready planning |
| Diagnose runtime bug, failing command, flaky behavior, or performance regression | `diagnose` | `webapp-testing` for one-off browser reproduction; `verification-loop` after the fix |
| Diagnose agent/tool harness failure, repeated agent loop, or context drift | `agent-introspection-debugging` | `verification-loop` only after code changes |
| Build throwaway prototype to answer one design question | `prototype` | `frontend-design` for production UI; `web-artifacts-builder` for standalone artifacts |
| Explore or refine a feature idea | `brainstorming` | `openspec-explore` when the work should become an OpenSpec change |
| Create a Ralph-ready PRD | `ralph-prd` | `product-capability` when implementation interfaces need deeper analysis |
| Convert or run Ralph stories | `ralph-loop` | `verification-loop` before marking a story complete |
| Create an OpenSpec change | `openspec-propose` | `brainstorming` first when intent is unclear |
| Implement an OpenSpec change | `openspec-apply-change` | `verification-loop` before completion |
| React/Next performance | `vercel-react-best-practices` | `frontend-patterns` |
| React component API design | `vercel-composition-patterns` | `frontend-patterns` |
| React view/page transitions | `vercel-react-view-transitions` | `frontend-patterns` |
| Visual frontend creation | `frontend-design` | `frontend-patterns` for implementation details |
| UI/accessibility/UX audit | `web-design-guidelines` | `security-review` only for security-sensitive findings |
| One-off local UI debugging | `webapp-testing` | Browser plugin/Playwright as available |
| Durable E2E test suite | `e2e-testing` | `verification-loop` |
| Deep pre-PR or CE-style code review | `compound-code-review` | `coding-standards` for a broad quality baseline; `security-review` for security-only review; `verification-loop` for command gates |
| Self-contained HTML work report, plan, review, status update, research explainer, or lightweight editor | `html-work-reports` | `web-artifacts-builder` when a bundled React/Tailwind app is needed |
| General code quality | `coding-standards` | language/framework-specific skill when present |
| Security review | `security-review` | `verification-loop` |
| Find more skills | `find-skills` | system `skill-installer` for actual installs |
| Evaluate third-party skills | `skill-evaluator` | `find-skills` only when searching for alternatives |

## Removed Duplicate

The project-local `.codex/skills/skill-creator` copy was removed. Codex already provides a current system `skill-creator` skill, and keeping a second project-local copy risks stale instructions and duplicate triggering.

## HTML Work Reports

Use `html-work-reports` when the output should be browsable, visual, interactive, or exportable. It is intentionally narrower than `web-artifacts-builder`: it covers one-file reports, reviews, plans, explainers, dashboards, and lightweight editors, while `web-artifacts-builder` remains the choice for complex bundled React/Tailwind artifacts.

This skill is inspired by [The unreasonable effectiveness of HTML](https://thariqs.github.io/html-effectiveness/) and local evaluation of `html-tools`-style single-file artifacts. Third-party HTML artifact skills were not installed because the repository needed a governance/reporting trigger, not another broad tool-building trigger.

## OpenSpec Routing Decision

OpenSpec remains installed, but should be treated as an explicit formal lifecycle, not the default planning lane. For normal feature work, prefer ECC/local workflow skills:

- `brainstorming` for early exploration.
- `product-capability` for PRD-to-implementation constraints.
- `tdd-workflow` for implementation.
- `verification-loop` before completion.

Use OpenSpec when the user explicitly asks for OpenSpec, a formal change proposal, or an existing `openspec/changes/<name>` workflow. The capability graph exposes this as the `openspec-formal` profile so target repos can opt in deliberately.

## Matt Pocock Routing Decision

The installed Matt Pocock skills are narrow lanes, not replacements for the existing ECC workflow:

- `grill-me`: pre-implementation pressure testing. It stops at decisions and does not implement unless the user asks.
- `diagnose`: product/code/runtime debugging. It starts by building a reproducible feedback loop, then uses hypotheses, probes, a fix, and regression coverage. It does not replace `agent-introspection-debugging`, which is only for agent/tool harness failures.
- `prototype`: throwaway design learning. It answers one question with disposable logic or UI code. It does not replace `frontend-design`, `web-artifacts-builder`, or `tdd-workflow`; once a decision is made, production work returns to the normal implementation lane.

These overlaps are resolved here and in root `AGENTS.md`, so no existing skill needs to be removed.

## Evaluated Sources And Install Decisions

`mattpocock/skills` was evaluated on 2026-05-11. `grill-me`, `diagnose`, and `prototype` are installed because each fills a bounded workflow gap with stable routing. The local versions add Codex/source metadata, narrow trigger boundaries, and avoid default external issue-tracker side effects.

Other Matt Pocock skills remain explicit-only or rejected for now: `grill-with-docs` is promising but needs a local decision on `CONTEXT.md` and ADR conventions before enabling inline doc writes; `improve-codebase-architecture` and `zoom-out` overlap existing architecture/product planning enough to wait for a dedicated architecture profile; `tdd`, `to-prd`, `to-issues`, `triage`, and `setup-matt-pocock-skills` overlap installed TDD, Ralph, OpenSpec, and issue-routing surfaces or introduce external issue-tracker side effects.

`forrestchang/andrej-karpathy-skills` was evaluated on 2026-05-08. Its `karpathy-guidelines` skill repeats the four project-level principles already present in root `AGENTS.md`: think before coding, simplicity first, surgical changes, and goal-driven execution. Do not install it as a separate skill unless the root guidance is removed or the upstream project adds a materially different workflow.

`michalvavra/agents` `html-tools` was evaluated on 2026-05-09. It is useful as a reference for single-file HTML utilities, but not installed because it overlaps existing HTML artifact skills and does not target work reports. The local `html-work-reports` skill covers the narrower routing gap.

`Cocoon-AI/architecture-diagram-generator` was evaluated on 2026-05-09. Keep it explicit-only as an architecture diagram reference; do not install by default because it is narrow and CDN-dependent.

`EveryInc/compound-engineering-plugin` was evaluated on 2026-05-11 at `d090bde0ff1bbc33ec3c3b2049cb4687e9d76532`. Do not install the full plugin by default. It overlaps existing ECC, Vercel, Ralph, OpenSpec, and local governance skills, and its best Codex behavior depends on a companion Bun agent install because native Codex plugin install does not yet register custom agents.

The installed exception is code review: `ce-code-review` was adapted as `compound-code-review`. Preserve the boundary: structured reviewer lenses, anchored confidence, safe-auto/gated/manual routing, report-only/autofix modes, artifact handoff, and stable finding numbering are in scope; CE's commit, PR, tracker, Slack, Proof, Gemini, product-pulse, and autonomous-work flows are not.

Other CE areas stay explicit-only or library-only: `ce-doc-review` and plan confidence checks can inform a future plan-review lane; `ce-compound`/`ce-sessions` should wait until this hub decides durable memory ownership; `ce-work`, `lfg`, `ce-commit-push-pr`, and `ce-resolve-pr-feedback` are too side-effect-heavy for default routing; `ce-product-pulse`, `ce-slack-research`, `ce-proof`, and `ce-gemini-imagegen` require credentials or external services; `coding-tutor` is a separate learning profile candidate, not a default engineering workflow.

## Superpowers Decision

Superpowers is not installed right now.

Rationale:

- ECC plus the adapted built-in skills already cover brainstorming, TDD, code review, verification, frontend work, docs, and file formats.
- Installing Superpowers wholesale would add substantial overlap and increase trigger noise.
- The remaining useful Superpowers-style gaps are narrow workflows: git worktree/branch finishing, systematic debugging, and plan execution discipline. Those should be added as small local skills only if they become recurring needs.

Keep Superpowers listed as an optional upstream source in `docs/source-projects.md`, but do not install it by default.

## Explicit-Only Candidates

Do not auto-install these until a user actually needs them:

- Vercel deployment skills: external deployment and token handling.
- React Native skills: mobile-specific context that is not part of the current repository focus.
- Full Superpowers pack: useful but overlapping with ECC and existing workflow skills.
- Matt Pocock `grill-with-docs`, `improve-codebase-architecture`, and `zoom-out`: useful references, but require a domain-doc or architecture profile before default installation.
- Compound Engineering `ce-work`, `lfg`, PR/commit/push helpers, product pulse, Slack/Proof/Gemini integrations, and `coding-tutor`: useful only for explicit profile work because they add external actions, credentials, persistent local stores, or heavy workflow overlap.
