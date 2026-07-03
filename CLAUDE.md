always respond in 中文

# Harness Hub Instructions

永远不要在提交信息或推送代码时携带 `Co-Authored-By` 行。

Harness Hub initializes and governs repo-local agent harnesses across multiple projects. Most inner skills may come from upstream sources and should keep their upstream style by default; this repo mainly owns routing, source records, harness templates, lifecycle tooling, and a small number of custom workflow skills.

Keep every distributed skill in the standard layout under `skills/<skill-name>/SKILL.md` with optional `references/`, `scripts/`, and `assets/` spokes.

## Core Rules

1. Facts first.
   - Facts are grounded in the current repository. If docs, comments, and code disagree, inspect the implementation before deciding.
   - Do not fabricate API names, protocols, enums, config keys, script names, or paths. Verify that they exist before referencing them.
   - Prefer numeric, concrete evidence over vague descriptions. Give a clear judgment when the evidence supports one.

2. Think before coding.
   - State assumptions when the request is ambiguous.
   - Surface tradeoffs instead of silently choosing a risky interpretation.
   - Ask only when a reasonable implementation assumption would be unsafe.
   - Identify hidden assumptions in the user's request. If a premise is wrong, correct the premise before acting.

3. Clarify before coding.
   - If the goal, context, ownership, compatibility, cost, release behavior, or acceptance criteria are ambiguous, stop and align before coding.
   - If the goal is clear but the requested path is materially more costly than another path, recommend the shorter lower-cost path directly.

4. Long-term correctness.
   - Optimize for the lowest total cost over the expected lifetime of the goal, not the smallest local patch at the current moment.
   - Take necessary one-time structure cost only when it reduces future path dependence or keeps later decision space open.

5. Simplicity first.
   - Add the minimum code or documentation needed for the requested behavior.
   - Avoid speculative abstractions, options, and host-specific branches.
   - Prefer simple, practical, low-entropy implementations over clever designs.
   - Reuse existing logic, scripts, and generated paths before adding new abstractions.

6. Surgical changes.
   - Touch only files tied to the request.
   - Preserve unrelated worktree changes.
   - Match the existing style of the file you edit.
   - Reference implementations, neighboring modules, older commits, and similar business flows are read-only by default. Use them for structure and naming unless the request explicitly includes them.
   - Stop and explain before expanding into files or modules outside the direct requested scope.

7. Goal-driven execution.
   - Define success criteria before broad changes.
   - Verify with the nearest tests and validation gates before handoff.
   - If success cannot be verified, clarify the missing context before coding.

8. Fail fast with evidence.
   - Missing critical objects, impossible states, index/routing errors, and invalid lifecycle states should record `error` and fail immediately.
   - Degraded fallbacks should at least record `warn` or `error`; do not silently swallow important failures.

9. PR closeout is part of delivery.
   - After creating or updating a pull request, check the remote PR state before declaring the task complete.
   - Verify mergeability and review the CI/check-run status after the pushed head settles.
   - If the PR is not clean because of conflicts, failed CI, or another actionable issue, diagnose and resolve it, rerun relevant validation, and push the fix.
   - Stop and ask the user only when the blocker requires a user decision, credential, permission, reviewer action, protected-branch override, or external service recovery.
   - Do not merge the PR unless the user explicitly asks for that remote mutation.
10. Finish closeout is a development stage.
   - After validation and before final handoff for any mutation, run the required closeout loop. Materiality scales the evidence level, not whether review exists: small source/test edits still need `implementation-review` or `test-review`; workflow, harness, security, or release paths require stronger independent evidence.
   - Use a subagent or isolated delegated-agent when the scope is independent and read-only; when that is unavailable, record the explicit fallback reason and deterministic substitute. Focus on technical debt, first-principles implementation fit, project-rule drift, and refactor or warning recommendations.
   - For PR work, expose conflict, merge, behavior, compatibility, and release-risk decisions to the user instead of handling them silently.
   - Run or explicitly skip `insight` to review tool-calling quality, repeated low-value lookup loops, misleading evidence, docs/code conflicts, AI infrastructure lessons, and whether the work should become a skill, source record, eval case, or existing workflow change.

## Communication Style

- Respond in Chinese by default.
- Start with the useful answer, result, or current status when possible.
- Let the structure fit the task; use headings, bullets, or short prose only when they reduce reading cost.
- Surface premise corrections, hidden costs, risks, and lower-cost alternatives inline when they matter.
- Keep tiny status updates concise.

## Personal Distribution Policy

- Do not rewrite imported skill bodies solely for house style, description format, progressive-loading style, or platform-neutral wording.
- Prefer preserving upstream `SKILL.md` content and placing local behavior in `AGENTS.md`, `docs/skill-routing.md`, `skills/workflow-router/`, owner workflow skills, and `capabilities/index.json`.
- Edit imported skill content only when the upstream text is unsafe, unusable in this repo, legally unclear, or directly conflicts with the routing overlay.
- Do not add host-specific tool names, config paths, UI metadata, or runner assumptions to distributed skill bodies.
- Do not add `agents/openai.yaml`, `.opencode/skills/`, or similar host-local metadata to the source skill tree.
- Keep project-local host skill mirrors under ignored `.codex/skills/<skill-name>/` and `.claude/skills/<skill-name>/`; each mirror points back to the canonical `skills/<skill-name>/SKILL.md`.
- Put host packaging outside skills. Claude plugin support belongs in `.claude-plugin/`; the skill content remains standard.
- If an upstream skill assumes a specific runner, prefer routing notes, source records, or explicit-only status before rewriting its body.
- If a capability cannot be used safely without rewriting away its core value, keep it as an evaluated source or explicit-only reference.
- Keep repo harness templates under `harness/<template-name>/`; root harness files in target projects are installed only through explicit harness lifecycle commands, never through default skill installation.

## Local Agent Resources

Maintain root `AGENTS.md` and root `CLAUDE.md` together. They are the same project contract for Codex and Claude Code; when one changes, update the other in the same change.

Canonical skill sources live only under `skills/<skill-name>/`. For local dogfooding, mirror those skills into both host-local ignored directories:

```powershell
bun run sync:agent-skills
```

Use `bun run sync:agent-skills:dry-run` before broad skill maintenance when you need a preview. The generated `.codex/skills/` and `.claude/skills/` trees are local caches, not installable source, not capability metadata, and not checkpoint material.

## Skill Routing

Use `docs/skill-routing.md` to resolve overlapping skills. Prefer the narrowest matching skill:

- Non-trivial requests: use `workflow-router` first to classify the request into exactly one owner state; when a terminal is available, run or mirror `node skills/workflow-router/scripts/workflow-check.mjs --prompt "<request>" --json` before substantive work.
- Questions and evidence lookup: use `answer-workflow`.
- English prose AI-tell cleanup or draft review: use `stop-slop` only for English prose; do not use it for Chinese output, code explanations, specs, or status reports.
- SDD change work: use `sdd-workflow`; align core details, target spec, and acceptance criteria before implementation.
- Runtime bug reports that start from failure evidence: use `diagnosis-workflow`.
- Code, plan, release, UI, or security review: use `review-workflow`.
- Delivery, validation closeout, finish closeout, cleanup, or handoff: use `delivery-workflow`.
- Harness Hub source, routing, capability, npm lifecycle, harness templates, or cleanup work: use `hub-maintenance-workflow`.
- Plan/design pressure testing: use `grill-me`.
- Runtime bugs/performance regressions: use `diagnose`.
- Agent/tool harness failures: use `agent-introspection-debugging`.
- Production feature work or confirmed bug fixes with tests: use `tdd-workflow`.
- Native goal/story loops are now handled by Codex/Claude Code directly; Harness Hub no longer distributes Ralph PRD or loop skills.
- Throwaway design exploration: use `prototype`; use `frontend-design` for production UI.
- Deep pre-PR review: use `compound-code-review`; use `security-review` only for focused security checks.
- Final command gates and build/test validation: use `verification-loop`.

## Workflow Router Direction

The target architecture is a thin, executable `workflow-router` that classifies each non-trivial request into exactly one workflow state: question, SDD change, diagnosis, review, delivery, or Harness Hub maintenance. Default development should be SDD-first with TDD embedded. Do not start implementation before the user's core details, target spec, and acceptance criteria are aligned.

`effective-interact` is high-priority communication infrastructure. Default-consider it for every non-trivial session, especially after material repo or skill changes. Its job is to reduce human interpretation cost through answer-first structure, visual comparison, evidence, validation, and handoff artifacts; it does not replace production UI, slide, or bundled app skills.

Subagents are an executor mode owned by the active workflow, not a separate workflow owner. Required loops may call them for independent read-only research, review, docs work, verification, or clearly disjoint write scopes; the main agent keeps final decisions, integration, and user-facing conclusions. Subagents keep private runtime state under ignored `.harness-hub/state/runs/<runId>/`; the main agent is the only writer of root progress and handoff summaries.

Hooks should start as advisory or deterministic local checks only. Do not introduce blocking hooks, remote actions, credential changes, posting, pushing, publishing, or agent dispatch without explicit user approval and security review.

Agentic loops are workflow-stage mechanics, not a replacement for workflow owners. Use `skills/workflow-router/references/agentic-loops.md` for Producer -> Verifier -> Arbiter -> Main Agent Decision patterns; `docs/agentic-loop-catalog.md` is the source-repo explainer. For mutation work, first derive required loops from changed paths with `harness-hub loop required`, then verify recorded run/integration evidence with `harness-hub loop verify` before handoff when the runtime is available. Keep generic rules host-neutral with `delegated-agent`; Codex and Claude Code details belong in host adapter docs. Write-capable delegated agents may share the current worktree only after a path lease names non-overlapping owned paths. Arbiters are read-only and do not edit files, resolve conflicts, push, publish, merge, or make final user-facing decisions.

## Agent Development Workflow

README files are human-facing visual navigation. Keep agent execution rules here, in owner workflow skills, or in focused docs. Do not turn README into an agent checklist.

For feature, bug-fix, refactor, product/spec change, or implementation work:

1. Route first with `workflow-router`; use the selected owner and do not let helper skills compete for top-level ownership.
2. Inspect repo docs, code paths, existing state, tests, source records, and relevant upstream references before proposing a direction.
3. Treat lightweight brainstorming as part of SDD: compare 2-3 evidence-backed directions, recommend one, and record rejected alternatives.
4. Write the active task contract before implementation when `.harness-hub/state/` exists:
   - `current-task.md`: goal, assumptions, non-goals, allowed paths, forbidden paths, requirement intake, discovery/brainstorming, target spec, acceptance criteria, P0/P1/P2 test matrix, validation commands, open questions, alignment status, and checkpoint policy.
   - `decisions.md`: accepted direction, rationale, alternatives, and decision-level changes.
   - `progress.md`: current phase, completed work, validation records, runtime signals, blockers, PR status, and checkpoint commit state.
   - `session-handoff.md`: restart status, changed files, validation evidence, residual risk, blockers, and next action.
5. Ask only blocking open questions before implementation. A blocking question changes user-visible behavior, safety, data ownership, compatibility, cost, release or rollback behavior, external side effects, allowed paths, or acceptance criteria.
6. Implement one public behavior at a time through `tdd-workflow`: RED, GREEN, REFACTOR. If direct tests are impractical, define the deterministic substitute before production edits.
7. Verify with P0/P1/P2 validation: P0 must pass before handoff, P1 is run or risk-assessed, and P2 hardening is run or explicitly deferred.
8. Use `effective-interact` for material plans, evidence maps, reviews, and handoffs only when structure lowers human reading cost.
9. Before handoff, update progress, decisions when needed, session handoff, and validation evidence. Do not claim completion from intent or partial progress.

## Skill Quality Governance

Use `docs/skill-quality-guide.md` as the quality bar for authoring, importing, reviewing, and maintaining skills.

- Treat `SKILL.md` `description` as routing logic.
- Prefer "Load when..." phrasing for local routing and workflow-owner skills; do not rewrite imported descriptions solely to satisfy style.
- Keep heavy or conditional content out of `SKILL.md`; use `scripts/`, `references/`, and `assets/`.
- Do not change a local routing-sensitive description without updating routing/eval coverage unless the edit is purely mechanical.
- Before adding an installable skill, verify it fills a bounded gap and does not duplicate global instructions.
- Keep quality inventory findings report-only unless they map to a real routing, safety, source, or distribution problem.

## CLI Lifecycle

Use these verbs for target-repo lifecycle work:

- `harness-hub check <target> --json`
- `harness-hub analyze <target> --json`
- `harness-hub analyze <target> --agent-readiness --harness --json`
- `harness-hub init-harness <target> --dry-run --json`
- `harness-hub init-harness <target> --yes`
- `harness-hub validate-harness <target> --json`
- `harness-hub activate-agents <target> --dry-run --json`
- `harness-hub activate-agents <target> --yes`
- `harness-hub install <target> --target standard --dry-run`
- `harness-hub install <target> --target standard --yes`
- `harness-hub status <target> --json`
- `harness-hub update <target> --dry-run --json`
- `harness-hub migrate-lock <target> --dry-run --json`
- `harness-hub remove <target> --dry-run --json`

`install` remains the standard skill install command and must not create root harness files. `init-harness` owns root harness initialization and must stay dry-run/confirmation guarded.
`check` is read-only startup guidance: it reports CLI and target managed-component freshness separately and must not auto-update either layer.

When another repository's agent receives only this Harness Hub repository link, it must follow [BOOTSTRAP-TARGET.md](BOOTSTRAP-TARGET.md): treat the link as documentation and CLI source, not as a template to copy. Use `npx @jasonwen/harness-hub@latest init-harness <target> --target standard --dry-run --json` followed by `--yes`, or clone this repo outside the target only to run `node bin/harness-hub.mjs init-harness <target> --target standard ...`. Do not copy `.claude-plugin/`, root `openspec/`, `docs/`, `config/`, `capabilities/`, `harness/`, `package.json`, README files, source files, tests, or other Harness Hub source-repo material into the target. If neither npm nor the source CLI can run, report a bootstrap blocker instead of improvising a manual copy.

Harness initialization is a hard gate for target repositories:
- Use `init-harness`, not `install`, when root harness files are needed.
- Do not start implementation in a target repo until `AGENTS.md`, `CLAUDE.md`, `feature_list.json`, `clean-state-checklist.md`, `definition-of-done.md`, `evaluator-rubric.md`, `quality-document.md`, `scripts/harness-validate.mjs`, and `.harness-hub/state/{current-task.md,decisions.md,progress.md,session-handoff.md}` exist.
- Run `harness-hub check <target> --json` during startup and treat update availability, missing locks, and registry unavailability as non-blocking advisory output unless the task explicitly asks to update.
- Fill `.harness-hub/state/current-task.md` with goal, non-goals, allowed paths, forbidden paths, acceptance criteria, validation commands, and checkpoint policy before coding.
- Run `node scripts/harness-validate.mjs` or `harness-hub validate-harness <target> --json`; fix harness failures before product edits.
- Record validation command status, passed/failed counts when available, evidence, and checkpoint commit state in progress and handoff state.
- Use verified checkpoint commits for completed atomic units when the task permits commits; otherwise record the skip reason.

Before release-oriented CLI changes, run `bun run validate`, `git diff --check`, and the relevant smoke flow.

## Third-Party Skill Evaluation

Use `hub-maintenance-workflow` whenever the user asks to evaluate, install, compare, or import a third-party skill repository.

For every third-party skill evaluation:

- Read upstream README, skill bodies, plugin metadata, and license before deciding.
- Compare against `skills/`, root `AGENTS.md`, and `docs/skill-routing.md`.
- Install only when the candidate fills a real gap or provides a materially better bounded workflow.
- Preserve upstream skill content by default; add local routing/source records instead of rewriting body text for consistency.
- Prefer reject or explicit-only status when the candidate repeats existing behavior or would create trigger noise.
- Update `docs/source-projects.md`, `docs/skill-routing.md`, `README.md`, and inventory docs when installation, counts, sources, vendor paths, or runtime state change.
- Run `powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal` before finishing skill maintenance.
