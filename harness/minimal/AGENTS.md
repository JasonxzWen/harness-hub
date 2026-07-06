always respond in Chinese unless the user explicitly asks for another language.

# Agent Harness

This repository is prepared for Codex and Claude Code development. Treat tracked harness files as the stable rules, and use ignored local state under `.harness-hub/state/` for the active task, progress, decisions, and handoff.

## Initialization Gate

Do not start implementation until the harness is fully landed and the active task is goal-ready.

- Required files must exist: `AGENTS.md`, `CLAUDE.md`, `feature_list.json`, `clean-state-checklist.md`, `definition-of-done.md`, `evaluator-rubric.md`, `quality-document.md`, `scripts/harness-validate.mjs`, `.harness-hub/state/{current-task.md,decisions.md,progress.md,session-handoff.md}`, and `.harness-hub/context/{AGENTS.md,README.md,llm-wiki-schema.md,wiki/index.md}`.
- If any required file is missing, stop and run the approved harness init path before coding.
- Run `harness-hub check . --json` as a read-only startup check when the command is available. If it is unavailable, do not automatically treat `npx @jasonwen/harness-hub@latest check . --json` as read-only; it executes registry-supplied code and requires explicit task or user authorization, or a pinned approved version. Treat CLI updates, target updates, missing locks, missing project-local agent activation, and registry failures as advisory unless the current task explicitly requires updating.
- If startup check recommends `harness-hub activate-agents`, run the dry-run first and then confirm only when local Codex and Claude Code skill activation is needed: `harness-hub activate-agents . --dry-run --json`, then `harness-hub activate-agents . --yes`.
- Run a freshness gate before mutation: inspect `git status --short`, branch/upstream state, and remote freshness. `git fetch --prune` is allowed. Clean fast-forward is allowed; dirty, diverged, conflicted, or missing-upstream states must be recorded and resolved before edits. Detached `HEAD` should become a named branch before edits.
- Run `node scripts/harness-validate.mjs`; fix harness failures before changing product files.
- Fill `.harness-hub/state/current-task.md` with goal, assumptions, non-goals, allowed paths, forbidden paths, target spec, acceptance criteria, validation tiers, autonomy envelope, runtime signals, standard startup path, and checkpoint policy before editing.
- For feature, bug-fix, refactor, or product/spec change work, fill requirement intake, discovery/brainstorming, target spec, P0/P1/P2 test matrix, open questions, and alignment status before editing.
- Review recent progress, decisions, handoff, feature state, quality snapshot, branch/worktree, and `git status --short`.

## Operating Rules

- Keep this file short. Move detailed or historical context to task files, docs, or archives.
- Use `feature_list.json` as the stable feature and parallel-write policy inventory.
- Use the LLM Wiki under `.harness-hub/context/wiki/` as the stable knowledge middle layer. Raw sources remain authoritative; do not duplicate code facts or native agent memory. Follow `.harness-hub/context/AGENTS.md` and `.harness-hub/context/llm-wiki-schema.md`; write wiki knowledge only after human confirmation and record updates in `wiki/update-log.md`.
- Treat Loop Control Plane rules as the top-level automation boundary. Prompt, context, harness, and tool capabilities may be `standalone`, `composable`, or `loop-participant`; do not force standalone capabilities into fixed workflows.
- Keep workflow and Loop separate: workflow stages define how development moves from requirement intake to handoff; Loop only decides whether concrete capability actions continue or interrupt and records auditable decisions.
- Follow the Interrupt Policy in `.harness-hub/loop/policies/interrupt-policy.md`: continue low-risk local work when scope and validation are clear, but interrupt when risk signals require human review.
- Record auditable loop decisions in `.harness-hub/state/interrupt-decisions.jsonl`, loop runs in `.harness-hub/state/loop-runs.jsonl`, and capability events in `.harness-hub/state/capability-events.jsonl`.
- Use a separate git worktree or branch for each write task.
- Start from `.harness-hub/state/current-task.md` before changing files.
- Respect the task's allowed paths and forbidden paths.
- Treat Harness Hub source-repo packaging as non-target material: do not copy `.claude-plugin/`, root `openspec/`, `docs/`, `config/`, `package.json`, `README*`, source `AGENTS.md`, source `CLAUDE.md`, or this repo's source tree into target projects. Use the managed outputs from `harness-hub init-harness`, `install`, and `activate-agents` instead.
- Do not run parallel writes against the same file, module, or feature state.
- Use read-only parallel work only for research, review, log analysis, or validation.
- Default to a main-agent orchestration stance for non-trivial work. The main agent owns the task contract, synthesis, integration, validation, and final user-facing conclusion.
- Use subagents aggressively but controllably for source exploration, docs or web research, log analysis, code review, verification, stale-read checks, finish closeout review, and leased disjoint write scopes. Skip subagents when the task is tiny, the next step depends on main-agent judgment, no suitable tool is available, or risk is too high.
- Use agentic loops for material planning, implementation, acceptance, PR closeout, and workflow-learning work when they reduce risk: Producer -> Verifier -> Arbiter -> Main Agent Decision.
- Keep loop roles host-neutral in repo state: `delegated-agent` may be a host-native subagent, isolated session, browser run, CI check, deterministic command, or bounded worker. Subagents maintain private ignored runtime state under `.harness-hub/state/runs/<runId>/`; only the main agent summarizes accepted loop evidence into `progress.md` and `session-handoff.md`.
- Write-capable delegated agents may use the current worktree only after `harness-hub loop lease-check ... --yes` records non-overlapping owned paths. Arbiters are read-only and must not edit files, resolve conflicts, push, publish, merge, or make final user-facing decisions.
- Subagent interruption questions go first to the main agent. The main agent may auto-continue when the action is inside allowed paths and outside forbidden paths, write actions are covered by a lease, side effects are local and reversible, validation is known, and evidence is recorded. Escalate to the user for behavior, acceptance, scope, cost, data ownership, credentials, permissions, remote writes, publishing, PR/merge state, destructive non-managed content, or long-lived governance.
- Do not let hooks auto-dispatch delegated agents. Hooks and deterministic checks may only remind, validate evidence, or interrupt for human review.
- Use P0/P1/P2 validation priorities for implementation tasks: P0 must pass before handoff, P1 is run or risk-assessed for affected boundaries, and P2 is hardening that may be deferred with a reason.
- Treat lightweight brainstorming as part of SDD: inspect repo evidence, compare 2-3 viable directions, recommend one, record rejected alternatives, and ask only blocking open questions before implementation.
- For Web user-visible changes, record and run agent-run browser acceptance against the local app before handoff, including URL, scenario, viewport, console or network findings, and screenshot or trace evidence when useful.
- After creating or updating a PR, treat PR status as a delivery gate: check mergeability, CI/check-run status, conflicts, and branch-protection blockers before declaring done; resolve in-scope blockers and rerun validation. Push updates only when the active task explicitly authorizes updating that PR branch; otherwise record the fix and ask before remote mutation.
- Do not merge a PR unless the user explicitly asks for that remote mutation.
- Before final handoff for any mutation, run the required closeout loop based on dirty paths or a base/head diff: use a subagent or independent review pass when the required evidence level calls for isolation and the scope is safe; otherwise record a fallback reason and deterministic substitute. Small source/test changes still need implementation or test review evidence. Expose findings instead of burying them.
- During finish closeout, run or explicitly skip `insight` to review tool-calling quality, repeated low-value lookup loops, misleading evidence, code/docs conflicts, AI infrastructure lessons, and whether the lesson should become a project rule, validation case, documentation, automation check, or follow-up task.
- Use verified checkpoint commits for completed atomic work units when the task permits commits. Do not commit failing, unrelated, or half-done work. Record each checkpoint commit hash, or the reason commits were skipped, in progress and handoff state.
- Promote repeated review feedback into a harness rule, validation command, or documented follow-up instead of relying on memory.
- After creating or updating a PR, record the PR URL or number, branch, base, commit, validation status, skipped checks, residual risk, and next action in progress and handoff state.
- Record progress in `.harness-hub/state/progress.md` and leave restart notes in `.harness-hub/state/session-handoff.md`.
- Record decision-level changes in `.harness-hub/state/decisions.md`.
- Before final handoff, run a stale-read gate: recheck status and reread or diff important files that informed the plan if they may have changed. Record the result in progress and handoff state.
- Run `node scripts/harness-validate.mjs` before handoff.

## Required Handoff

Before ending a session, update `.harness-hub/state/session-handoff.md` with the current status, changed files, validation evidence, stale-read gate result, agentic loop records, finish closeout findings, insight recommendations, PR status and PR handoff details when a PR was created or updated, blockers, and the next concrete action. Update `.harness-hub/state/decisions.md` when assumptions, acceptance criteria, allowed paths, validation, user-visible behavior, or risk changed.
