# Skill Routing

Harness Hub is a personal workflow distribution set with a routing overlay. Route by user intent and workflow boundary, not by agent host. Imported skill bodies may keep upstream style; fix conflicts in this routing layer first.

## Source Roots

| Path | Meaning |
|---|---|
| `skills/` | Standard skill source tree. Each skill has `SKILL.md` and optional `references/`, `scripts/`, and `assets/`. |
| `.claude-plugin/` | Claude plugin and marketplace manifests only. Do not put skill bodies here. |

## Stable Routing Rules

| User intent | Preferred skill | Notes |
|---|---|---|
| Non-trivial request that needs intent recognition | `workflow-router` | Classify into exactly one state: question, SDD change, diagnosis, review, delivery, or Harness Hub maintenance. |
| Read-only question, explanation, feasibility check, evidence lookup, or comparison | `answer-workflow` | Answer from evidence; do not mutate files. |
| Feature, bug fix, refactor, product/spec change, or implementation request | `sdd-workflow` | Align need, source material, spec, acceptance, executable plan, cleanup, implementation, tests, and delivery before coding. |
| Requirement intake, lightweight brainstorming, direction selection, or implementation planning inside change work | `sdd-workflow` | Treat brainstorming as a phase action, not a separate top-level owner; inspect repo evidence, compare 2-3 directions, and record the selected direction, rejected alternatives, tests, and open questions in harness state. |
| Failing command, runtime bug, flaky behavior, performance regression, or agent/tool failure report | `diagnosis-workflow` | Reproduce or bound the failure before choosing helper skills. |
| Code, plan, release, UI, or security review | `review-workflow` | Findings first; do not implement fixes unless redirected. |
| Validation closeout, cleanup, release notes, handoff, or post-PR status triage | `delivery-workflow` | Run accepted checks, inspect PR mergeability/CI/conflicts after PR creation or update, resolve actionable blockers, and report residual risk. |
| Harness Hub source, routing, capability metadata, npm lifecycle, or managed cleanup work | `hub-maintenance-workflow` | Use source records and CLI dry-runs instead of removed broad helper skills. |
| Plan/design pressure testing before implementation | `grill-me` | Ask one hard question at a time and surface assumptions. |
| Diagnose runtime bug, failing command, flaky behavior, or performance regression | `diagnose` | `diagnose` owns unknown runtime bugs and performance regressions; use `tdd-workflow` after the behavior is understood. |
| Implement production feature, confirmed bug fix, or refactor through tests | `tdd-workflow` | One public behavior at a time through red-green-refactor. |
| Build throwaway prototype to answer one design question | `prototype` | `prototype` owns disposable learning artifacts only; delete or fold findings into production. |
| Deep pre-PR or structured code review | `compound-code-review` | Use `security-review` only for focused security concerns. |
| Final build, typecheck, lint, and tests before completion | `verification-loop` | Verification gate, not a diagnosis workflow. |
| Security-sensitive code, auth, secrets, injection, unsafe IO, or payments | `security-review` | Focused checklist and threat review. |
| Coding behavior baseline for implementation, review, or refactor work after an owner is selected | `karpathy-guidelines` | Helper guardrails for assumptions, simplicity, surgical diffs, and verifiable success; use owner workflows for lifecycle decisions. |
| Current library/framework/API behavior | `documentation-lookup` | Use current primary docs before implementing. |
| Newly published package or model-package releases | `package-release-sniffer` | Use for AI/developer-tool package release discovery from primary registry and release sources; use `documentation-lookup` for docs on a chosen package and implementation workflows for building monitors or clients. |
| Advisory Harness Hub or target repo quality/readiness audit with HTML output | `harness-quality-check` | Compose existing self-check, readiness, harness validation, and skill-quality evidence into an advisory HTML report; use `verification-loop` for final gates and `hub-maintenance-workflow` for actual source changes. |
| Claude API or Anthropic SDK implementation, tuning, debugging, or migration | `claude-api` | Provider-specific atom; verify current official docs before code changes and do not use for provider-neutral work. |
| MCP server design, implementation, review, or evaluation | `mcp-builder` | Use for MCP tool/resource/prompt contracts and external-service server design; ordinary REST clients route elsewhere. |
| Creating, adapting, or evaluating standard skills | `skill-creator` | Use under `hub-maintenance-workflow` or `sdd-workflow` after the owner is selected. |
| Turning external source material into a public insight blog | `source-to-insight-blog` | Use for source-backed blog posts with Chinese fidelity, media references, effective-interact summary, and project-iteration review; ordinary summaries route to `answer-workflow`, and full copyrighted reposts are not a valid target. |
| Cross-session repository interaction audit from local agent traces | `insight` | Use for private Codex / Claude Code project interaction audits, agent task profiles, tool-call decision reviews, collaboration bottlenecks, and local ignored reports; use `source-to-insight-blog` for public external-source posts and `agent-introspection-debugging` for single-run failures. |
| Collaborative drafting of PRDs, RFCs, proposals, specs, or decision records | `doc-coauthoring` | Use for durable docs; use `product-capability` for implementation-ready capability contracts. |
| Internal status reports, leadership updates, 3P updates, newsletters, FAQs, incident reports, or project updates | `internal-comms` | Use for internal communications; public marketing copy routes elsewhere. |
| English prose AI-tell cleanup, draft editing, or prose review | `stop-slop` | Use only for English prose strong style editing; do not use for code explanation, Chinese output, technical specs, or routine status reports. |
| Anti-template visual direction for landing pages, portfolios, marketing pages, or redesigns | `design-taste-frontend` | Use as a frontend taste layer; production UI implementation remains `frontend-design`, and dashboards/data tables/multi-step product UI route elsewhere. |
| Applying a coherent visual theme to slides, reports, docs, HTML artifacts, or landing pages | `theme-factory` | Use for theming existing artifacts; production UI creation remains `frontend-design`. |
| Creating, optimizing, or validating Slack animated GIFs | `slack-gif-creator` | Use for Slack emoji/message GIF targets only. |
| Explicitly cloning, reverse-engineering, or rebuilding an authorized website | `clone-website` | Requires permission, browser inspection, replacement-content handling, and validation; ordinary visual inspiration or production UI creation remains `frontend-design` or `design-taste-frontend`. |
| Agent/tool harness loop, repeated tool failure, drift, or recoverable self-debugging | `agent-introspection-debugging` | Use after ordinary product debugging is ruled out. |
| Clear complex communication and alignment, long-task fact ledgers, option comparison, multi-option approval, implementation plan, PR writeup, architecture/dependency/milestone map, repo capability/structure/function/implementation map, structure tree, status/incident update, research explainer, visual/design/component approval board, or lightweight export editor | `effective-interact` | Select plain text, Markdown, visual Markdown, or self-contained HTML by decision cost. Do not load merely because an answer is long. `grill-me` remains the pressure-test owner; `frontend-design` owns production UI; `frontend-slides` owns decks. |

## Overlap Rules

- Use `frontend-design` for production UI; use `design-taste-frontend` for anti-template visual direction on landing pages, portfolios, marketing pages, and redesigns; use `web-artifacts-builder` for complex standalone React/Tailwind artifacts; use `effective-interact` for communication/report artifacts.
- Use `theme-factory` after an artifact exists or when the request is specifically about theme selection; use `frontend-design` when layout, UX, and implementation are the primary task.
- Use `slack-gif-creator` only for Slack GIFs; use image/video generation or frontend/artifact skills for other visual media.
- Use `clone-website` only for explicit authorized site cloning or reverse engineering; use `frontend-design` for new production pages, `design-taste-frontend` for visual direction, and `web-artifacts-builder` for standalone artifacts that do not require live-site reconstruction.
- Use `webapp-testing` for one-off local browser inspection and Web browser acceptance against a dev server; use `e2e-testing` for durable Playwright suites.
- Use `doc-coauthoring` for durable docs, `internal-comms` for organizational updates, and `stop-slop` only for strong English prose anti-AI-tell editing; use `answer-workflow` for ordinary explanatory answers.
- Use `source-to-insight-blog` when a source must become a public blog with source fidelity, media references, effective-interact summary, and project iteration review; use `answer-workflow` for ordinary summaries, `doc-coauthoring` for internal durable docs, and `frontend-design` for production site design.
- Use `claude-api` only for Anthropic provider work; use `documentation-lookup` for general library/API facts and other providers.
- Use `package-release-sniffer` for newly published package or model-package discovery across registries and release feeds; use `documentation-lookup` for current docs on a known package, `source-to-insight-blog` for public article production, and implementation workflows for registry clients, scrapers, monitors, or scheduled jobs.
- Use `insight` for private repository interaction audits from local Codex / Claude Code traces, user-agent task profiles, tool-call decision review, and collaboration bottleneck analysis. Use `source-to-insight-blog` when external source material becomes a public post, `agent-introspection-debugging` for one failing agent run or tool loop, `harness-quality-check` for advisory harness readiness HTML, and `answer-workflow` for ordinary explanations.
- Use `harness-quality-check` for explicit Harness Hub or target-repo harness quality/readiness audits that should produce advisory HTML findings. Use `verification-loop` for final implementation gates, `coding-standards` for ordinary code quality conventions, `skill-creator` for creating or changing skills, `hub-maintenance-workflow` for actual Harness Hub source/capability changes, and direct lifecycle commands when the user only asks to run one command.
- Use `mcp-builder` for MCP servers; use `claude-api` for Anthropic API clients and `security-review` when secret/tool-execution risk is central.
- Treat CodeGraph and Headroom as external tool configuration suggestions surfaced by `harness-hub check` and readiness analysis, not as skill owners or managed install components. Any MCP config, proxy, hook, provider routing, or memory setup remains explicit and reviewed.
- Use `skill-creator` for standard skill content; `hub-maintenance-workflow` still owns source records, capability metadata, and Harness Hub lifecycle decisions.
- Use `delivery-workflow` after a requested PR is created or updated to inspect remote PR state, mergeability, CI/check runs, conflicts, and branch-protection blockers; do not treat local validation alone as PR-ready evidence.
- Use OpenSpec skills only when the user explicitly wants the formal OpenSpec lifecycle.
- Native goal/story loops are handled by current Codex and Claude Code capabilities; Harness Hub no longer distributes Ralph PRD or loop skills.
- Use `feynman-learning-coach` only when the user explicitly wants to learn, study, master, review, or be coached through a topic.
- `sdd-workflow` is the default change lane and `tdd-workflow` is an embedded implementation discipline, not a competing owner.
- Lightweight brainstorming belongs inside `sdd-workflow`: use repo/source inspection, 2-3 direction comparison, `grill-me` for pressure questions, `prototype` for disposable proof, and `product-capability` for implementation constraints. Do not add or trigger a standalone brainstorming skill unless a future routing gap is explicitly accepted.
- Use `karpathy-guidelines` as an engineering behavior baseline under `sdd-workflow`, `tdd-workflow`, or `review-workflow`; use `coding-standards` for cross-project code quality conventions and `grill-me` when the user wants an interview-style pressure test.
- Do not treat `effective-interact` as a default-considered skill for non-trivial sessions merely because a reply may be long; the trigger is a real communication, alignment, verification, approval, handoff, or continuation need.
- Use `effective-interact` as the default reporting layer when the agent is about to pause on relatively complex information. For material repo or skill behavior changes, default to a validated HTML handoff unless the user explicitly waives HTML or the work is tiny and has no durable evidence trail.
- When `effective-interact` loads, organize the report from visual language first: choose matrices, timelines, maps, flows, evidence layouts, or source-linked tours that reduce interaction time and information loss before deciding the output mode. Avoid both decorative visuals and Markdown-in-HTML handoffs.
- When `effective-interact` loads, any output other than `plain-brief` should expose at least one visible visual structure instead of ending as linear prose.
- `frontend-slides` remains the deck lane; `effective-interact` may summarize or hand off deck-related findings, but it should not become the slide-generation workflow.

## Boundary Sentences

- `diagnose` loads for runtime bugs, failing commands, flaky behavior, and performance regressions.
- `agent-introspection-debugging` loads only for agent runs, tool loops, context drift, or harness failures.
- `prototype` loads for explicitly throwaway experiments that answer one design question.
- `tdd-workflow` loads for production features, confirmed bug fixes, and refactors with tests; unknown root-cause diagnosis and throwaway exploration route elsewhere.
- `frontend-design` loads for production-grade visual UI creation, not routine reports or debugging.
- `effective-interact` loads when an agent pauses to report relatively complex information needing Chinese-first clear complex communication, alignment, multi-option choice, status/incident, long-task fact ledgers, implementation plans, reviews, maps, explainers, evidence, risks, validation, or handoff; broad repo capability/structure/function/implementation maps are HTML candidates when navigation or source evidence lowers interpretation cost; choose plain text, Markdown, visual Markdown, or HTML by decision cost; do not load merely because answer is long; trivial chat, production UI, bundled apps, and decks route elsewhere.
- Compatibility summary: `effective-interact` loads when an agent pauses to report relatively complex information needing Chinese-first clear complex communication, alignment, multi-option choice, status/incident, long-task fact ledgers, implementation plans, reviews, maps, explainers, evidence, risks, validation, or handoff; choose plain text, Markdown, visual Markdown, or HTML by decision cost; do not load merely because answer is long; trivial chat, production UI, bundled apps, and decks route elsewhere.
- Material repo/skill behavior changes default to a validated HTML handoff unless explicitly waived or tiny with no durable evidence trail.
- `handoff` loads for restart notes or compact agent/session handoff documents; visual HTML reports and context-limit advice route elsewhere.
- `compound-code-review` loads for deep structured review; focused security and final command gates route elsewhere.
- `security-review` loads for focused security-sensitive code, auth, secrets, injection, unsafe IO, or payments.
- `verification-loop` loads for completion gates after work is done, not for root-cause diagnosis or review analysis.
- `delivery-workflow` loads for accepted closeout and post-PR status triage, including mergeability, CI/check-run, conflict, branch-protection, and environment cleanup checks; it does not merge or publish unless explicitly requested.
- `feynman-learning-coach` loads only for explicit learning, tutoring, study, mastery, exam/interview prep, syllabus building, or coached topic sessions.
- `coding-standards` loads for cross-project code quality conventions after an owner workflow has selected scope.
- `karpathy-guidelines` loads after a workflow owner has selected implementation, review, or refactor scope and the agent needs behavior guardrails for assumptions, simplicity, surgical diffs, or verifiable success; it is not a top-level workflow, requirements workflow, TDD workflow, or review workflow.
- `documentation-lookup` loads when current library, framework, SDK, API, CLI, or cloud-service documentation is needed.
- `package-release-sniffer` loads for newly published package or model-package release discovery across primary package registries and release feeds; it does not build registry clients, scheduled monitors, or implementation code.
- `harness-quality-check` loads for explicit Harness Hub or target repo harness quality/readiness audits with advisory HTML output; it does not perform final implementation validation, ordinary code review, skill authoring, source changes, schedules, hooks, remote writes, or blocking enforcement.
- `web-artifacts-builder` loads for complex standalone React/Tailwind/shadcn browser artifacts.
- `frontend-slides` loads for HTML presentations, slide decks, talk or pitch slides, and PPT/PPTX-to-web conversion.
- `frontend-patterns` loads for React or Next.js frontend logic, state, forms, routing, accessibility, or responsive behavior.
- `webapp-testing` loads for one-off local web app inspection, screenshots, console logs, UI reproduction, or agent-run Web browser acceptance.
- `web-design-guidelines` loads for UI, UX, accessibility, or web interface guideline compliance review.
- `e2e-testing` loads for durable Playwright E2E suites, Page Object Models, fixtures, CI browser tests, or flaky-test strategy.
- `grill-me` loads when the user says "grill me", asks to be challenged, or wants assumptions surfaced one question at a time.
- `product-capability` loads for implementation-ready capability plans with constraints, invariants, interfaces, and unresolved decisions.
- `claude-api` loads for Claude API or Anthropic SDK build, debug, migration, or tuning work.
- `mcp-builder` loads for MCP server design, build, review, testing, tool schema, resource, or prompt work.
- `skill-creator` loads for creating, updating, adapting, or evaluating standard agent skills.
- `source-to-insight-blog` loads when turning external articles, blogs, release notes, interviews, or reports into source-backed insight blog posts with Chinese fidelity, media references, effective-interact summary, and project-iteration review; it does not load for ordinary summaries, full copyrighted reposts, or production site design.
- `insight` loads for private repository interaction insight audits, Codex or Claude Code trace review, agent task profiles, tool-call decision audits, and collaboration bottleneck analysis; it does not load for public external-source blog posts, one failing agent run, advisory harness quality reports, or ordinary summaries.
- `doc-coauthoring` loads for collaboratively drafting, restructuring, or reader-testing docs, PRDs, RFCs, proposals, specs, or decision records.
- `internal-comms` loads for internal status reports, leadership updates, 3P updates, newsletters, FAQs, incident reports, and project updates.
- `stop-slop` loads only for English prose AI-tell cleanup, draft editing, or prose review; it is a strong style editor, not a default rule for code explanations, Chinese output, technical specs, status reports, or ordinary documentation.
- `design-taste-frontend` loads for anti-template visual direction and pre-flight critique for landing pages, portfolios, marketing pages, and redesigns; it does not load for dashboards, data tables, multi-step product UI, routine frontend logic, HTML reports, or slide decks.
- `theme-factory` loads for applying or choosing coherent visual themes for slides, docs, reports, HTML artifacts, or landing pages.
- `slack-gif-creator` loads for creating, optimizing, or validating animated GIFs for Slack emoji or messages.
- `clone-website` loads only when the user explicitly asks to clone, reverse-engineer, or rebuild an authorized website; it does not load for generic redesign, visual inspiration, scraping, phishing, impersonation, or third-party brand copying.
- `openspec-explore` loads only for explicit OpenSpec exploration, discovery, or requirement clarification.
- `openspec-propose` loads only for explicit new OpenSpec proposals with design, spec deltas, and tasks.
- `openspec-apply-change` loads only for implementing or continuing an existing OpenSpec change.
- `openspec-archive-change` loads only for finalizing and archiving completed OpenSpec changes.
- `hub-maintenance-workflow` loads for maintaining this Harness Hub's source records, installed skill components, routing, npm package boundary, and candidate-source decisions.
- `karpathy-guidelines`, `package-release-sniffer`, `harness-quality-check`, `claude-api`, `mcp-builder`, `skill-creator`, `source-to-insight-blog`, `insight`, `doc-coauthoring`, `internal-comms`, `stop-slop`, `design-taste-frontend`, `theme-factory`, `slack-gif-creator`, and `clone-website` load as helper atoms under the selected owner workflow, not as top-level workflow owners.

## Skill Registration Path

Use [Development Workflow](development-workflow.md) for the practical intake checklist before adding a skill. In short:

- New workflow owners require a new top-level task state, router support, owner contract coverage, routing docs, capability metadata, and tests.
- Helper atoms require a bounded trigger, clear side-effect boundary, overlap rules, capability metadata, and focused routing or contract coverage.
- Explicit-only skills stay out of default activation unless the user names them or a selected owner reaches that niche use case.
- Source-only ideas belong in `docs/source-projects.md` or `docs/workflow-source-dossier.md` until they fill a real bounded gap.

## Subagents And Hooks

Subagents are parent-workflow controlled. Use native subagents only for independent source gathering, docs lookup, review, verification, or disjoint write scopes named in the executable plan. The main workflow owner keeps synthesis, integration, validation, and final user-facing conclusions.

Advisory hooks only until a security review, deterministic tests, and explicit rollout approval exist. No automatic subagent dispatch is allowed. No remote writes from hooks are allowed. Hooks must not bypass SDD alignment or mutate credentials, third-party resources, publishing state, or git remotes.

## Third-Party Candidates

Record every meaningful install, refresh, rejection, or explicit-only decision in `docs/source-projects.md`. Install only when the candidate fills a bounded behavior gap and can stay platform-neutral.
