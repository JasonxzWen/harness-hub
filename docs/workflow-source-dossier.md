# Workflow Source Dossier

Date: 2026-06-01

This dossier reorganizes the source projects already referenced by this repository around the canonical work lifecycle. It records what to study, what to keep as imported style, what to adapt, what to reject, and what must remain reference-only before maintaining the workflow-router overlay.

This is based on repo-local source records in [Source projects and candidates](source-projects.md), [Skill routing and de-duplication](skill-routing.md), [Capability map](capability-map.md), and installed skill docs. Refresh exact upstream commits and licenses before copying, updating, or locally adapting any upstream content.

## Lifecycle Lens

The workflow system must serve this order:

1. Align user need.
2. Gather required material.
3. Write spec and acceptance.
4. Write executable plan and align.
5. Clean unneeded files.
6. Implement.
7. Test and accept.
8. Finish closeout.
9. Deliver report.

## Source Index

| Source | Repo-local status | Primary value | Default decision |
|---|---|---|---|
| Matt Pocock skills | `grill-me`, `grill-with-docs`, `diagnose`, `prototype`, `tdd-workflow`, and `handoff` adapted; 2026-07-09 refresh at `d574778f94cf620fcc8ce741584093bc650a61d3` evaluated newer codebase design, domain modeling, issue-flow, research, teaching, writing, personal, and setup material. | Narrow phase skills, feedback-loop framing, deep-module vocabulary, domain-language discipline, and skill-quality vocabulary. | Adapt selected phase patterns and fold source ideas into existing rubrics; do not import issue-tracker-heavy, personal, in-progress, host-hook, or broad orchestration flows by default. |
| Matt Pocock README process model | Rechecked on 2026-07-09 at `d574778f94cf620fcc8ce741584093bc650a61d3`. | Small, adaptable, composable skills; user-invoked orchestration vs model-invoked discipline; grilling for alignment; shared language to reduce verbosity; feedback loops as speed limit; daily design care. | Encode as Harness Hub workflow policy: one owner workflow remains in control, helpers compose inside phases, `grill-with-docs` owns durable language capture, TDD/diagnosis own feedback loops, and review/closeout must surface architecture drift and deep-module opportunities. |
| Superpowers | Referenced, not installed. | Broad disciplined workflow, brainstorming-style idea shaping, `using-superpowers`, subagent-driven development, worktree/finish discipline. | Reference for lifecycle and orchestration boundaries; borrow lightweight brainstorming as an SDD phase action, but do not install wholesale. |
| Everything Claude Code | Source checkout and compatibility docs retained; only selected helper skills remain active through `capabilities/index.json`. | Rules, agents, hooks, MCP patterns, verification, broad Claude Code conventions. | Reference surface plus bounded helpers; do not restore the broad local skill library. |
| OpenSpec | Installed as formal lifecycle helpers. | Proposal/spec/task/archive artifacts and formal change tracking. | Use only when the user explicitly asks for OpenSpec or existing artifacts require it. |
| Compound Engineering Plugin | `compound-code-review` adapted; rest explicit-only or reference. | Structured review, reviewer lenses, doc-review candidates, side-effect-heavy work loops. | Keep review lane; postpone broader workflows. |
| Effective Interact | Original local skill. | Chinese-first interaction-cost reduction, answer-first visual handoffs, evidence, option comparison, validation dashboards. | High-priority interaction layer across all non-trivial lifecycle phases. |
| Harness Hub CLI lifecycle | Implemented and documented locally. | Lock-backed install/status/update/remove and safe cleanup ownership. | Preserve as mandatory distribution and cleanup boundary. |
| Hermes Agent / Self-Evolution | Reviewed as source evidence on 2026-06-30; not installed. | Session traces, eval datasets, guardrails, and PR-reviewed skill evolution. | Reference for `agent-interaction-audit` closeout audits and skill-evaluation candidates only; do not import runtime, optimizer, cron, or automatic mutation. |
| Vercel/Web/React skills | `web-design-guidelines` remains active; other Vercel Web/React skills are source-retained only. | Frontend implementation and UI quality for target repos that need it. | Helper/reference sources only; not top-level lifecycle owners. |
| Anthropic skills | Selective atoms installed or locally wrapped: `claude-api`, `mcp-builder`, `skill-creator`, `doc-coauthoring`, `internal-comms`, `theme-factory`, `slack-gif-creator`. | Provider API, MCP server, skill authoring, doc/comms, visual theme, and Slack GIF atoms. | Helper atoms under owner workflows; document four-pack remains reference-only due licensing. |
| Karpathy Guidelines | `karpathy-guidelines` installed as a helper baseline. | Coding behavior discipline: state assumptions, keep implementation simple, preserve surgical diffs, and define verifiable success criteria. | Use only under a selected owner workflow; do not let it replace SDD, TDD, review, or pressure-test owners. |
| Ralph | `ralph-prd`, `ralph-loop`, and `scripts/ralph/prd.json.example` retired on 2026-05-22. | Historical autonomous story-loop reference. | Source evidence only; native Codex and Claude Code goal/story workflows now cover this lane. |
| Learn Harness / Learn FASTER | Narrow local adaptations. | Historical harness templates and learning lifecycle ideas. | Fold learning lifecycle ideas into `quick-learn`; repo harness templates are removed from distribution. |

## Phase Dossier

### 1. Align User Need

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| Matt `grill-me` | One-question-at-a-time pressure testing and recommended answers before implementation. | Do not turn every request into an interview. | Keep as the pressure-test owner; `effective-interact` may present the resulting decisions and handoff, but should not own the questioning logic. |
| Matt `grill-with-docs` | One-question-at-a-time pressure testing plus glossary/domain/ADR capture. | Upstream assumes inline `CONTEXT.md` and `docs/adr/` writes. | Install an adapted wrapper that uses Harness Hub context rules: raw sources first, proposed file-level wiki updates, human confirmation, update log, and `.harness-hub/state` for active task decisions. |
| `product-capability` | Capability restatement, constraints, invariants, interfaces, and open decisions. | Do not invent product truth. | Make it a helper under `sdd-workflow` for implementation-ready contracts. |
| OpenSpec explore | Read-only exploration and artifact capture without implementation. | Do not make OpenSpec the default planning lane. | Use only when formal OpenSpec lifecycle is requested or already active. |
| Effective Interact | Visual option comparison and alignment artifacts. | Do not replace simple chat for trivial questions or replace `grill-me` as pressure-test owner. | Default-consider as an expression/handoff layer for complex planning, design, research, review, learning, and material change handoffs; require HTML only when it lowers review cost or material changes need a report. |

### 2. Gather Required Material

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| `hub-maintenance-workflow` | Inventory source projects, compare upstream versions, preserve upstream bodies by default, and maintain package/capability boundaries. | Do not install off-stack or wholesale sources. | Use as the single maintenance owner for this repository. |
| Former `skill-evaluator` policy | Read upstream README, skill bodies, metadata, license, and compare against local routing before install. | Do not use presence/absence comparison only. | Fold the policy into mandatory source-gathering criteria before workflow adoption. |
| `docs/source-projects.md` | Existing source URLs, versions, decisions, and imported paths. | It may be stale for live upstream content. | Treat as the repo-local starting point; refresh only when copying/updating upstream content. |
| Superpowers tool mapping | Host compatibility checklist for porting broad-trigger workflows. | Do not wrap native host tools just to mirror names. | Use as reference for routing and activation boundaries. |
| ECC local setup | Existing agents/hooks/config and imported skill surface. | Do not let ECC become the default workflow authority. | Use as source evidence and compatibility layer, not final paradigm. |

### 3. Write Spec And Acceptance

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| OpenSpec proposal/spec/tasks | Formal proposal, design, spec, task artifact structure. | Too heavy as the default for every change. | Borrow artifact clarity, keep explicit OpenSpec mode. |
| `product-capability` | SRS-style capability contract and implementation-facing constraints. | Do not scatter ad hoc notes. | Use under `sdd-workflow` before coding. |
| Matt `domain-modeling` | Context and ADR-oriented design pressure, terminology sharpening, concrete scenarios, and code/doc contradiction checks. | It assumes inline `CONTEXT.md` and `docs/adr/` writes; Harness Hub standardizes stable knowledge under `.harness-hub/context` and task state under `.harness-hub/state`. | Keep the upstream body reference-only; expose the safe subset through adapted `grill-with-docs` and human-confirmed LLM Wiki updates. |
| CE doc-review / plan confidence | Persona-based plan review and confidence checks. | Unclear persistence model and overlaps existing planning lanes. | Medium-priority future review helper after plan artifact ownership is defined. |
| Anthropic `doc-coauthoring` pattern | Structured context gathering, drafting, and reader testing. | Upstream directory lacked a per-skill license file in the refreshed snapshot, so do not copy it. | Local-original `doc-coauthoring` fills the durable document lane. |
| Effective Interact | Spec/acceptance dashboards and decision-first summaries. | Do not hide unsupported claims in polished HTML. | Use for user alignment when the spec has options, risks, or evidence. |

### 4. Write Executable Plan And Align

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| Superpowers | Planning discipline and finish/worktree habits. | Full pack would duplicate existing skills. | Adapt only plan discipline and explicit completion gates. |
| ECC rules | Conservative execution, hooks, agents, and verification practices. | Avoid turning broad conventions into another prompt pack. | Keep broad rules in `AGENTS.md`; conditional details in workflow skills. |
| Superpowers subagent-driven development | Split implementation evidence from independent review and acceptance. | Do not auto-dispatch agents or add host-specific commands to generic skills. | Adapt as host-neutral `delegated-agent` verifier/arbiter loops under workflow owners. |
| Ralph PRD/story loop | Historical story sizing and autonomous execution boundaries. | Native Codex and Claude Code goal/story workflows now cover this lane. | Retire the distributed Ralph helpers; keep repeated execution behind explicit user approval. |
| OpenSpec tasks | Implementation task checklist tied to spec artifacts. | Do not require OpenSpec for every change. | Borrow task/acceptance traceability in `sdd-workflow`. |
| Matt `codebase-design` | Deep-module vocabulary, interface-as-test-surface, seam placement, dependency categories, and Design It Twice comparison. | Do not add another default planning owner or host-specific parallel-agent mandate. | Reference for review/refactor rubrics and optional agentic design loops after SDD scope is aligned. |

### 5. Clean Unneeded Files

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| Harness Hub CLI lifecycle | Lock-backed `status`, `update`, `remove`, schema migration, safe ownership checks. | Do not delete by path/name alone. | Make cleanup a pre-implementation gate and preserve lock-backed ownership. |
| `hub-maintenance-workflow` | Preserve local adaptations and reject trigger-noise sources. | Do not remove unrelated local edits or source evidence. | Cleanup must distinguish delete, demote, archive, and retain. |
| Superpowers finish/worktree discipline | Finish cleanly and avoid lingering branch/runtime state. | Do not import full worktree workflow by default. | Reference for delivery cleanup and local state hygiene. |
| Effective Interact | Handoff can show cleanup list and residual risks. | HTML report is not the cleanup mechanism. | Use report to make cleanup visible and reviewable. |

### 6. Implement

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| `tdd-workflow` | Write failing tests or deterministic gates before implementation. | TDD must not compete with SDD as top-level workflow. | Embed TDD inside accepted SDD spec. |
| Matt `tdd` | Reinforces test-first habit, vertical tracer bullets, behavior tests, independent expected values, and tautological-test avoidance. | Do not let TDD compete with SDD as top-level owner. | Already adapted as `tdd-workflow`; refreshed testing guidance stays source material for future test-quality hardening. |
| Matt `codebase-design` | Interface depth and locality explain when an awkward test seam means the module shape is wrong. | Do not add speculative abstractions solely for testability. | Fold into `tdd-workflow` refactor guidance and review closeout, especially when missing test seams are reported. |
| ECC coding standards | General code quality and conservative edits. | Avoid duplicating root project instructions inside every skill. | Keep as helper/library behavior. |
| Karpathy Guidelines | Assumption surfacing, anti-overengineering, surgical-change discipline, and explicit verification criteria. | Do not turn a behavioral baseline into another lifecycle owner, and do not import host-specific rule packaging into standard skills. | Install `karpathy-guidelines` as a narrow helper under SDD/TDD/review work. |
| Anthropic `claude-api`, `mcp-builder`, `skill-creator` | Provider-specific API guidance, MCP server design/eval, and skill authoring patterns. | Avoid copying volatile API tables or host-specific skill-eval runners. | Use explicit helper atoms under SDD or Harness Hub maintenance. |
| OpenSpec apply | Task-by-task implementation from formal change artifacts. | Explicit formal lifecycle only. | Use when an OpenSpec change already exists. |

### 7. Test And Accept

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| `verification-loop` | Completion gates before declaring done. | Not root-cause diagnosis or review analysis. | Use as helper under delivery and implementation workflows. |
| `e2e-testing` and `webapp-testing` | Durable Playwright suites and one-off browser validation. | Only for repos/surfaces that actually need browser validation. | Helper skills based on target-repo evidence. |
| Compound code review | Findings-first structured review with confidence and fix routing. | Do not import CE's commit/PR/tracker side effects by default. | Use under `review-workflow`. |
| Effective Interact validator | Browser-validated HTML artifacts and evidence checks. | Validator warnings are advisory unless they reduce decision quality. | Required for material HTML handoffs. |
| Agentic acceptance loops | Independent verifiers can test the current version from a fresh context, and arbiters can judge evidence against the original task. | A delegated-agent pass must not override failing deterministic validation. | Record Producer, Verifier, read-only Arbiter, verdict, and Main Agent Decision in task state. |

### 8. Finish Closeout

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| Superpowers finish/worktree discipline | Make the end of a branch an explicit phase rather than an afterthought. | Do not import full worktree workflow or automatic subagent dispatch. | Closeout becomes a required workflow stage after tests and before final handoff. |
| Compound code review | Independent review lenses catch technical debt and implementation drift. | Do not import side-effect-heavy issue/PR automation. | Use subagents or an independent review pass when scope-safe; main agent owns synthesis. |
| Matt `improve-codebase-architecture` / `codebase-design` | Architecture upkeep, deepening opportunities, deletion tests, and before/after visual explanation. | Upstream command writes temp HTML and then drives a grilling/domain-modeling loop; direct import overlaps `effective-interact`, review, and LLM Wiki rules. | Treat as high-priority source material for final technical-debt review and future architecture-review rubrics. |
| Delivery PR closeout feedback | Local tests are insufficient when remote PR state is dirty. | Do not silently resolve high-risk conflicts or auto-merge. | Expose conflict decisions and risks, drive to merge-ready, and merge only with explicit authorization. |
| Matt `resolving-merge-conflicts` | Inspect primary sources, preserve both intents, explain incompatible trade-offs, and rerun checks. | Reject the hard rule to always resolve and never abort; Harness Hub must expose risky conflict decisions to the user. | Fold the safe parts into delivery PR closeout guidance. |
| `agent-interaction-audit` | Repository interaction traces can reveal poor tool-calling loops, repeated manual corrections, doc/code conflicts, and candidate AI-infrastructure improvements. | Do not write tracked docs, memory, schedules, remotes, or public artifacts by default. | Run or explicitly skip an agent interaction audit during closeout for material work. |
| Hermes Agent / Self-Evolution | Uses traces, eval datasets, constraint gates, and PR review to improve skills and prompts. | Do not import optimizer/runtime or let automated evolution mutate the standard skill tree. | Treat as a source pattern for agent interaction audit recommendations: create eval cases, guardrails, candidate skill records, or workflow changes after human review. |
| Agentic loop catalog | Standardizes `plan-review`, `test-design`, `implementation-review`, `test-review`, `workflow-review`, `security-review`, `frontend-acceptance`, `diagnosis-regression`, `docs-consistency`, `pr-closeout`, and `agent-interaction-retro`. | Do not make loop types router states or new skill owners. | Install the canonical reference under `skills/workflow-router/references/agentic-loops.md` so target repos do not depend on source `docs/`. |

### 9. Deliver Report

| Source | Useful idea | Reject or constrain | Local decision |
|---|---|---|---|
| Effective Interact | Chinese-first static HTML reports with evidence, validation, risks, and next actions. | Do not use for trivial chat, production UI, decks, bundled apps, credentials, or repo-writing editors. | Mandatory communication layer for material work. |
| Matt `writing-great-skills` | Skill predictability vocabulary: invocation mode, description-as-router, progressive disclosure, completion criteria, no-op, sediment, and sprawl. | Do not create another skill-authoring owner or rewrite imported skills for style. | Fold into `docs/skill-quality-guide.md`, routing evals, and review checklists as source material. |
| Harness Hub CLI lifecycle docs | Release/checklist handoff with concrete commands. | Do not conflate CLI package self-update with target-repo managed `update`. | Preserve package-vs-target update distinction. |
| PR closeout feedback | Recent local PR conflict handling showed that local validation can pass while the remote PR is not mergeable. | Do not add automatic merging, branch-protection bypass, or credential-bearing CI automation. | Delivery must inspect PR mergeability, CI/check-run status, conflicts, and branch-protection blockers after a requested PR is created or updated; fix actionable issues and stop only when user/external action is required. |
| CE code review artifact handoff | Stable finding numbering and artifact-style review output. | Keep only the review lane. | Use for review handoffs when findings matter. |
| Anthropic `internal-comms`, `theme-factory`, `slack-gif-creator` | Internal updates, artifact theming, and Slack GIF delivery formats. | They are deliverable-specific helpers, not workflow owners. | Use only when the selected owner reaches that output shape. |
| OpenSpec archive | Formal closeout and spec archive. | Use only for explicit OpenSpec changes. | Reference for lifecycle closure, not default delivery. |

## Adopt / Adapt / Reference / Reject Summary

| Decision | Sources | Local behavior |
|---|---|---|
| Adopt | Effective Interact, Harness Hub CLI lifecycle, local AGENTS constraints. | Make them high-priority local infrastructure. |
| Adapt | Matt `grill-me`/`grill-with-docs`/`diagnose`/`prototype`/`tdd`/`handoff`, Compound `ce-code-review`, selected Vercel/Web guidance, selected Anthropic atoms, Karpathy Guidelines. | Keep bounded helper lanes with local routing. |
| Reference-only | Superpowers full pack, ECC broad system, OpenSpec formal lifecycle, Matt `domain-modeling`, `codebase-design`, `improve-codebase-architecture`, `writing-great-skills`, `resolving-merge-conflicts`, CE doc review, frontend-slides upstream, Anthropic document four-pack and creative-heavy examples. | Study specific ideas without default installation; fold them into existing rubrics and state/context rules first. |
| Reject for default | Full Superpowers, full CE plugin, Matt issue/triage/setup/implement flows, side-effect-heavy PR/publish/credential workflows. | Prevent trigger noise and unsafe external actions. |

## Required Before Implementation

Before implementing workflow-router or workflow owners:

1. Convert this dossier into routing/spec test fixtures.
2. Keep source refresh separate from local workflow design.
3. Ask the user before any install-surface expansion, blocking hook, or future broad cleanup.

Subagent and hook source decision: Superpowers and ECC are useful references for orchestration, but local policy keeps Subagents are parent-workflow controlled, Agentic loop arbiters are read-only, Advisory hooks only, No automatic subagent dispatch, and No remote writes from hooks.
4. Preserve source notes even when a referenced skill is demoted or rejected.
