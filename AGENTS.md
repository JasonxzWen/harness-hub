always respond in 中文

# Harness Hub Instructions

Harness Hub initializes and governs repo-local agent harnesses across multiple projects. Most inner skills may come from upstream sources and should keep their upstream style by default; this repo mainly owns routing, source records, harness templates, lifecycle tooling, and a small number of custom workflow skills.

Keep every distributed skill in the standard layout under `skills/<skill-name>/SKILL.md` with optional `references/`, `scripts/`, and `assets/` spokes.

## Core Rules

1. Think before coding.
   - State assumptions when the request is ambiguous.
   - Surface tradeoffs instead of silently choosing a risky interpretation.
   - Ask only when a reasonable implementation assumption would be unsafe.

2. Simplicity first.
   - Add the minimum code or documentation needed for the requested behavior.
   - Avoid speculative abstractions, options, and host-specific branches.

3. Surgical changes.
   - Touch only files tied to the request.
   - Preserve unrelated worktree changes.
   - Match the existing style of the file you edit.

4. Goal-driven execution.
   - Define success criteria before broad changes.
   - Verify with the nearest tests and validation gates before handoff.

5. PR closeout is part of delivery.
   - After creating or updating a pull request, check the remote PR state before declaring the task complete.
   - Verify mergeability and review the CI/check-run status after the pushed head settles.
   - If the PR is not clean because of conflicts, failed CI, or another actionable issue, diagnose and resolve it, rerun relevant validation, and push the fix.
   - Stop and ask the user only when the blocker requires a user decision, credential, permission, reviewer action, protected-branch override, or external service recovery.
   - Do not merge the PR unless the user explicitly asks for that remote mutation.

## Personal Distribution Policy

- Do not rewrite imported skill bodies solely for house style, description format, progressive-loading style, or platform-neutral wording.
- Prefer preserving upstream `SKILL.md` content and placing local behavior in `AGENTS.md`, `docs/skill-routing.md`, `skills/workflow-router/`, owner workflow skills, and `capabilities/index.json`.
- Edit imported skill content only when the upstream text is unsafe, unusable in this repo, legally unclear, or directly conflicts with the routing overlay.
- Do not add host-specific tool names, config paths, UI metadata, or runner assumptions to distributed skill bodies.
- Do not add `agents/openai.yaml`, `.claude/skills/`, `.opencode/skills/`, or similar host-local metadata to the source skill tree.
- Keep project-local Codex bootstrap wrappers under ignored `.codex/skills/<skill-name>/`; each wrapper points back to the canonical `skills/<skill-name>/SKILL.md`.
- Put host packaging outside skills. Claude plugin support belongs in `.claude-plugin/`; the skill content remains standard.
- If an upstream skill assumes a specific runner, prefer routing notes, source records, or explicit-only status before rewriting its body.
- If a capability cannot be used safely without rewriting away its core value, keep it as an evaluated source or explicit-only reference.
- Keep repo harness templates under `harness/<template-name>/`; root harness files in target projects are installed only through explicit harness lifecycle commands, never through default skill installation.

## Skill Routing

Use `docs/skill-routing.md` to resolve overlapping skills. Prefer the narrowest matching skill:

- Non-trivial requests: use `workflow-router` first to classify the request into exactly one owner state; when a terminal is available, run or mirror `node skills/workflow-router/scripts/workflow-check.mjs --prompt "<request>" --json` before substantive work.
- Questions and evidence lookup: use `answer-workflow`.
- English prose AI-tell cleanup or draft review: use `stop-slop` only for English prose; do not use it for Chinese output, code explanations, specs, or status reports.
- SDD change work: use `sdd-workflow`; align core details, target spec, and acceptance criteria before implementation.
- Runtime bug reports that start from failure evidence: use `diagnosis-workflow`.
- Code, plan, release, UI, or security review: use `review-workflow`.
- Delivery, validation closeout, cleanup, or handoff: use `delivery-workflow`.
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

Subagents are an optimization owned by the active workflow, not a default behavior of every skill. Use them only for independent read-only research, review, docs work, verification, or clearly disjoint write scopes; the main agent keeps final decisions, integration, and user-facing conclusions.

Hooks should start as advisory or deterministic local checks only. Do not introduce blocking hooks, remote actions, credential changes, posting, pushing, publishing, or agent dispatch without explicit user approval and security review.

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

- `harness-hub analyze <target> --json`
- `harness-hub analyze <target> --agent-readiness --harness --json`
- `harness-hub init-harness <target> --dry-run --json`
- `harness-hub init-harness <target> --yes`
- `harness-hub validate-harness <target> --json`
- `harness-hub install <target> --target standard --dry-run`
- `harness-hub install <target> --target standard --yes`
- `harness-hub status <target> --json`
- `harness-hub update <target> --dry-run --json`
- `harness-hub migrate-lock <target> --dry-run --json`
- `harness-hub remove <target> --dry-run --json`

`install` remains the standard skill install command and must not create root harness files. `init-harness` owns root harness initialization and must stay dry-run/confirmation guarded.

Harness initialization is a hard gate for target repositories:
- Use `init-harness`, not `install`, when root harness files are needed.
- Do not start implementation in a target repo until `AGENTS.md`, `feature_list.json`, `clean-state-checklist.md`, `definition-of-done.md`, `evaluator-rubric.md`, `quality-document.md`, `scripts/harness-validate.mjs`, and `.harness-hub/state/{current-task.md,decisions.md,progress.md,session-handoff.md}` exist.
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
