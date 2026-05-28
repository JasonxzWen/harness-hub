# Skill Routing

Skill Hub is a personal workflow distribution set with a routing overlay. Route by user intent and workflow boundary, not by agent host. Imported skill bodies may keep upstream style; fix conflicts in this routing layer first.

## Source Roots

| Path | Meaning |
|---|---|
| `skills/` | Standard skill source tree. Each skill has `SKILL.md` and optional `references/`, `scripts/`, and `assets/`. |
| `.claude-plugin/` | Claude plugin and marketplace manifests only. Do not put skill bodies here. |

## Stable Routing Rules

| User intent | Preferred skill | Notes |
|---|---|---|
| Non-trivial request that needs intent recognition | `workflow-router` | Classify into exactly one state: question, SDD change, diagnosis, review, delivery, or Skill Hub maintenance. |
| Read-only question, explanation, feasibility check, evidence lookup, or comparison | `answer-workflow` | Answer from evidence; do not mutate files. |
| Feature, bug fix, refactor, product/spec change, or implementation request | `sdd-workflow` | Align need, source material, spec, acceptance, executable plan, cleanup, implementation, tests, and delivery before coding. |
| Failing command, runtime bug, flaky behavior, performance regression, or agent/tool failure report | `diagnosis-workflow` | Reproduce or bound the failure before choosing helper skills. |
| Code, plan, release, UI, or security review | `review-workflow` | Findings first; do not implement fixes unless redirected. |
| Validation closeout, cleanup, release notes, or handoff | `delivery-workflow` | Run accepted checks and report residual risk. |
| Skill Hub source, routing, capability metadata, npm lifecycle, or managed cleanup work | `hub-maintenance-workflow` | Use source records and CLI dry-runs instead of removed broad helper skills. |
| Plan/design pressure testing before implementation | `grill-me` | Ask one hard question at a time and surface assumptions. |
| Diagnose runtime bug, failing command, flaky behavior, or performance regression | `diagnose` | `diagnose` owns unknown runtime bugs and performance regressions; use `tdd-workflow` after the behavior is understood. |
| Implement production feature, confirmed bug fix, or refactor through tests | `tdd-workflow` | One public behavior at a time through red-green-refactor. |
| Build throwaway prototype to answer one design question | `prototype` | `prototype` owns disposable learning artifacts only; delete or fold findings into production. |
| Deep pre-PR or structured code review | `compound-code-review` | Use `security-review` only for focused security concerns. |
| Final build, typecheck, lint, and tests before completion | `verification-loop` | Verification gate, not a diagnosis workflow. |
| Security-sensitive code, auth, secrets, injection, unsafe IO, or payments | `security-review` | Focused checklist and threat review. |
| Current library/framework/API behavior | `documentation-lookup` | Use current primary docs before implementing. |
| Claude API or Anthropic SDK implementation, tuning, debugging, or migration | `claude-api` | Provider-specific atom; verify current official docs before code changes and do not use for provider-neutral work. |
| MCP server design, implementation, review, or evaluation | `mcp-builder` | Use for MCP tool/resource/prompt contracts and external-service server design; ordinary REST clients route elsewhere. |
| Creating, adapting, or evaluating standard skills | `skill-creator` | Use under `hub-maintenance-workflow` or `sdd-workflow` after the owner is selected. |
| Collaborative drafting of PRDs, RFCs, proposals, specs, or decision records | `doc-coauthoring` | Use for durable docs; use `product-capability` for implementation-ready capability contracts. |
| Internal status reports, leadership updates, 3P updates, newsletters, FAQs, incident reports, or project updates | `internal-comms` | Use for internal communications; public marketing copy routes elsewhere. |
| Applying a coherent visual theme to slides, reports, docs, HTML artifacts, or landing pages | `theme-factory` | Use for theming existing artifacts; production UI creation remains `frontend-design`. |
| Creating, optimizing, or validating Slack animated GIFs | `slack-gif-creator` | Use for Slack emoji/message GIF targets only. |
| Agent/tool harness loop, repeated tool failure, drift, or recoverable self-debugging | `agent-introspection-debugging` | Use after ordinary product debugging is ruled out. |
| Clear complex communication and alignment, long-task fact ledgers, option comparison, multi-option approval, implementation plan, PR writeup, architecture/dependency/milestone map, structure tree, status/incident update, research explainer, visual/design/component approval board, or lightweight export editor | `effective-interact` | Select plain text, Markdown, visual Markdown, or self-contained HTML by decision cost. Do not load merely because an answer is long. `grill-me` remains the pressure-test owner; `frontend-design` owns production UI; `frontend-slides` owns decks. |

## Overlap Rules

- Use `frontend-design` for production UI; use `web-artifacts-builder` for complex standalone React/Tailwind artifacts; use `effective-interact` for communication/report artifacts.
- Use `theme-factory` after an artifact exists or when the request is specifically about theme selection; use `frontend-design` when layout, UX, and implementation are the primary task.
- Use `slack-gif-creator` only for Slack GIFs; use image/video generation or frontend/artifact skills for other visual media.
- Use `webapp-testing` for one-off local browser inspection; use `e2e-testing` for durable Playwright suites.
- Use `doc-coauthoring` for durable docs and `internal-comms` for organizational updates; use `answer-workflow` for ordinary explanatory answers.
- Use `claude-api` only for Anthropic provider work; use `documentation-lookup` for general library/API facts and other providers.
- Use `mcp-builder` for MCP servers; use `claude-api` for Anthropic API clients and `security-review` when secret/tool-execution risk is central.
- Use `skill-creator` for standard skill content; `hub-maintenance-workflow` still owns source records, capability metadata, and Skill Hub lifecycle decisions.
- Use OpenSpec skills only when the user explicitly wants the formal OpenSpec lifecycle.
- Native goal/story loops are handled by current Codex and Claude Code capabilities; Skill Hub no longer distributes Ralph PRD or loop skills.
- Use `feynman-learning-coach` only when the user explicitly wants to learn, study, master, review, or be coached through a topic.
- `sdd-workflow` is the default change lane and `tdd-workflow` is an embedded implementation discipline, not a competing owner.
- Do not treat `effective-interact` as a default-considered skill for non-trivial sessions merely because a reply may be long; the trigger is a real communication, alignment, verification, approval, handoff, or continuation need.
- Use `effective-interact` as the default reporting layer when the agent is about to pause on relatively complex information, especially for material repo or skill change reports that need preserved facts, evidence navigation, validation state, risks, or a continuation handoff.
- `frontend-slides` remains the deck lane; `effective-interact` may summarize or hand off deck-related findings, but it should not become the slide-generation workflow.

## Boundary Sentences

- `diagnose` loads for runtime bugs, failing commands, flaky behavior, and performance regressions.
- `agent-introspection-debugging` loads only for agent runs, tool loops, context drift, or harness failures.
- `prototype` loads for explicitly throwaway experiments that answer one design question.
- `tdd-workflow` loads for production features, confirmed bug fixes, and refactors with tests; unknown root-cause diagnosis and throwaway exploration route elsewhere.
- `frontend-design` loads for production-grade visual UI creation, not routine reports or debugging.
- `effective-interact` loads when an agent pauses to report relatively complex information needing Chinese-first clear complex communication, alignment, multi-option choice, status/incident, long-task fact ledgers, implementation plans, reviews, maps, explainers, evidence, risks, validation, or handoff; choose plain text, Markdown, visual Markdown, or HTML by decision cost; do not load merely because answer is long; trivial chat, production UI, bundled apps, and decks route elsewhere.
- `handoff` loads for restart notes or compact agent/session handoff documents; visual HTML reports and context-limit advice route elsewhere.
- `compound-code-review` loads for deep structured review; focused security and final command gates route elsewhere.
- `security-review` loads for focused security-sensitive code, auth, secrets, injection, unsafe IO, or payments.
- `verification-loop` loads for completion gates after work is done, not for root-cause diagnosis or review analysis.
- `feynman-learning-coach` loads only for explicit learning, tutoring, study, mastery, exam/interview prep, syllabus building, or coached topic sessions.
- `coding-standards` loads for cross-project code quality conventions after an owner workflow has selected scope.
- `documentation-lookup` loads when current library, framework, SDK, API, CLI, or cloud-service documentation is needed.
- `web-artifacts-builder` loads for complex standalone React/Tailwind/shadcn browser artifacts.
- `frontend-slides` loads for HTML presentations, slide decks, talk or pitch slides, and PPT/PPTX-to-web conversion.
- `frontend-patterns` loads for React or Next.js frontend logic, state, forms, routing, accessibility, or responsive behavior.
- `webapp-testing` loads for one-off local web app inspection, screenshots, console logs, or UI reproduction.
- `web-design-guidelines` loads for UI, UX, accessibility, or web interface guideline compliance review.
- `e2e-testing` loads for durable Playwright E2E suites, Page Object Models, fixtures, CI browser tests, or flaky-test strategy.
- `grill-me` loads when the user says "grill me", asks to be challenged, or wants assumptions surfaced one question at a time.
- `product-capability` loads for implementation-ready capability plans with constraints, invariants, interfaces, and unresolved decisions.
- `claude-api` loads for Claude API or Anthropic SDK build, debug, migration, or tuning work.
- `mcp-builder` loads for MCP server design, build, review, testing, tool schema, resource, or prompt work.
- `skill-creator` loads for creating, updating, adapting, or evaluating standard agent skills.
- `doc-coauthoring` loads for collaboratively drafting, restructuring, or reader-testing docs, PRDs, RFCs, proposals, specs, or decision records.
- `internal-comms` loads for internal status reports, leadership updates, 3P updates, newsletters, FAQs, incident reports, and project updates.
- `theme-factory` loads for applying or choosing coherent visual themes for slides, docs, reports, HTML artifacts, or landing pages.
- `slack-gif-creator` loads for creating, optimizing, or validating animated GIFs for Slack emoji or messages.
- `openspec-explore` loads only for explicit OpenSpec exploration, discovery, or requirement clarification.
- `openspec-propose` loads only for explicit new OpenSpec proposals with design, spec deltas, and tasks.
- `openspec-apply-change` loads only for implementing or continuing an existing OpenSpec change.
- `openspec-archive-change` loads only for finalizing and archiving completed OpenSpec changes.
- `hub-maintenance-workflow` loads for maintaining this Skill Hub's source records, installed skill components, routing, npm package boundary, and candidate-source decisions.
- `claude-api`, `mcp-builder`, `skill-creator`, `doc-coauthoring`, `internal-comms`, `theme-factory`, and `slack-gif-creator` load as helper atoms under the selected owner workflow, not as top-level workflow owners.

## Subagents And Hooks

Subagents are parent-workflow controlled. Use native subagents only for independent source gathering, docs lookup, review, verification, or disjoint write scopes named in the executable plan. The main workflow owner keeps synthesis, integration, validation, and final user-facing conclusions.

Advisory hooks only until a security review, deterministic tests, and explicit rollout approval exist. No automatic subagent dispatch is allowed. No remote writes from hooks are allowed. Hooks must not bypass SDD alignment or mutate credentials, third-party resources, publishing state, or git remotes.

## Third-Party Candidates

Record every meaningful install, refresh, rejection, or explicit-only decision in `docs/source-projects.md`. Install only when the candidate fills a bounded behavior gap and can stay platform-neutral.
