# Project Agent Contract

This file is the shared contract for every repository-local coding agent. `CLAUDE.md` must contain only `@AGENTS.md`; Claude Code uses `.claude/`, while Codex discovers skills from `.agents/skills/` and reads hooks from `.codex/hooks.json`.

## Operating principles

1. Facts first. Inspect current code, tests, Git state, and project knowledge before deciding. Do not invent APIs, paths, commands, configuration, or user acceptance.
2. Simplicity first. Prefer the smallest complete design, reuse existing mechanisms, and do not add compatibility layers, duplicate registries, optional packs, or speculative abstractions.
3. Long-term correctness. Optimize total lifecycle cost, explicit ownership, and deterministic behavior rather than the smallest local patch.
4. Surgical scope. Preserve unrelated user changes. Expand scope only when required by an accepted behavior or deterministic failure.
5. Fail closed. Missing evidence, invalid lifecycle state, path escape, or failed deterministic validation is a failure; Agent judgment cannot override it.
6. Autonomy within boundaries. Continue local, reversible, in-scope work without asking. Ask only for a decision that changes user-visible behavior, acceptance criteria, data ownership, security, cost, remote mutation, or destructive scope.
7. No unrequested remote mutation. Do not commit, push, publish, deploy, create or merge a PR, change credentials, or modify user/global configuration without the required authorization. Never merge without explicit authorization.

## Architecture

Use exactly this execution hierarchy:

```text
skill (optional atomic capability)
  -> small loop (independently executable; may compose skills)
  -> workflow (large loop; only orchestrates small loops and branches)
```

- A skill is never a workflow owner merely because its description matches a keyword.
- A small loop owns Producer, Verifier, optional read-only Arbiter, success criteria, bounded iteration, pause/resume, authorization, side effects, and compact handoff.
- A workflow must not duplicate a small loop's implementation.
- CLI Agents and delegated agents are executor modes, not business entities.
- The main Agent owns the task contract, conflicts, final decisions, integration, and user-facing report.
- Deterministic checks outrank Producer, Verifier, Arbiter, and main-Agent opinions.

The executable runtime is the migrated `workflow-router/scripts/loop-runtime.mjs`. Use the copy under the active host skill root (`.claude/skills/` or `.agents/skills/`). It stores ignored runtime evidence under `.harness-hub/state/runs/` and reuses leases, events, integrations, and the loop ledger.

Codex repository skills are discovered only from `.agents/skills/`; its hooks remain in `.codex/hooks.json` and run only after Codex trusts this project. Never change Host trust or user/global configuration on the user's behalf.

## Default development workflow

1. Route a non-trivial request to exactly one owner workflow.
2. Run `requirements-loop`: brainstorm from repository facts, extract constraints and open questions, then use `grill-me` to batch the current dependency frontier with recommended defaults. Defer dependency-bound questions, never infer acceptance for unanswered rows, and pause the same Loop only when real blocking answers remain.
3. Run `spec-loop`: produce a minimal, complete, executable specification and independently review it against current implementation facts.
4. Run `test-loop`: define P0/P1/P2 boundaries, prove RED is caused by the missing behavior, implement GREEN, and review test value rather than implementation details.
5. Run `implementation-review-loop` once for the current implementation: review correctness, robustness, observability, errors, and over-design. A rejection returns to the main Agent for a real implementation change before another review; a failing deterministic command cannot be waived.
6. When durable project facts changed, run `knowledge-maintain-loop`; otherwise take the explicit no-maintenance branch. Migration never owns this step.
7. Run the single-pass `delivery-loop` for cleanup, validation, authorized local delivery, conflicts, and read-only PR/CI closure. Its delegated CLI Producer stays read-only; the same runtime then performs explicitly authorized cleanup, deterministic validation, and an optional local commit of reviewed bytes, in that order. A rejection returns to the main Agent, and any completed local action remains visible in the handoff. Delegated CLI execution never receives remote-write or merge authority; only the main Agent may act on explicit user authorization.
8. Run `retro-loop` over the real session and Agent traces. Improve an existing skill, loop, workflow, eval, or knowledge page when evidence justifies it; add no new entity by default.
9. Run `report-loop` for complex decisions, comparisons, and handoff; it deterministically uses `effective-interact`. Simple reports may remain plain text.

## Durable task state

For non-trivial mutation work, maintain ignored project-local state under `.harness-hub/state/`:

- `current-task.md`: goal, assumptions, non-goals, allowed/forbidden paths, specification, acceptance criteria, test matrix, validation, autonomy, and open questions.
- `decisions.md`: accepted and rejected choices with reasons.
- `progress.md`: completed work, current phase, validation evidence, runtime signals, blockers, and delivery state.
- `session-handoff.md`: restart-ready status, changed files, evidence, residual risk, blockers, and next action.

Runtime Agent state belongs under `.harness-hub/state/runs/<runId>/`. Only the main Agent integrates accepted evidence into the root task files. Never use ignored state as proof of a tracked product change.

## Git and filesystem safety

- Start by inspecting branch, upstream, `git status --short`, and relevant recent state. Fetching is read-only; remote writes are not implied.
- A dirty or diverged worktree is evidence to preserve, not permission to reset, clean, overwrite, or discard.
- Use path leases for write-capable delegated work. Leases must name non-overlapping repository-relative paths.
- Reject symlinks, junctions, path traversal, and writes outside declared ownership when managing repository content.
- Before handoff, re-read task-critical files and inspect the final diff/status to prevent stale-read conclusions.
- Do not claim rollback, cleanup, validation, or CI success without direct evidence.

## Engineering and test standards

- Match the repository's language, style, architecture, and nearest tests.
- Prefer explicit data flow, narrow interfaces, meaningful names, early validation, and observable errors.
- Do not silently swallow failures or add fallback behavior that hides invalid state.
- Tests should cover public behavior, failure boundaries, authorization, rollback, and evidence integrity. Avoid tests that merely mirror implementation details.
- Treat `validationCommands` as trusted repository commands selected by the main Agent and executed with the caller's local authority, not as a sandbox for untrusted code or delegated-Agent output.
- P0 deterministic gates must pass before handoff. Run or risk-assess P1; defer P2 only with an explicit reason.
- For every mutation, obtain an independent implementation/test/workflow review proportional to risk and run or explicitly skip the Agent interaction audit with a reason.

## Project knowledge (Google OKF v0.1)

`knowledge/` is this project's source-traceable LLM Wiki and belongs to this project.

- Every concept is UTF-8 Markdown with parseable YAML frontmatter and a non-empty `type`.
- `knowledge/index.md` declares OKF `0.1` and links every project concept.
- `knowledge/log.md` records dated knowledge changes.
- Concepts link to real repository sources using relative paths and distinguish facts from inference.
- `knowledge-init-loop` creates the smallest useful wiki from actual target files on first migration.
- `knowledge-maintain-loop` updates knowledge only when real development changes durable project facts, then runs the deterministic OKF validator.
- Repository migration may validate this tree but normal and force migration must preserve its complete path-and-byte set.
- Project tasks, sessions, eval cases, product facts, and private preferences remain in this repository. Never copy another project's knowledge or examples here.

## Real-task evaluation

Keep eval task cards and results in this project, derived from this project's own sessions, audits, and failures. Measure:

1. primary: real-task first-attempt success rate;
2. guardrail: number of human interventions;
3. guardrail: total execution cost.

Do not optimize the primary metric by hiding retries, weakening deterministic gates, moving work to the user, or excluding failed tasks. Feed supported findings into existing loops, skills, workflows, evals, or OKF pages; create nothing when no durable change is justified.

## Communication

- Lead with the result, decision, blocker, or current status.
- Use concise Chinese by default unless the project or user requests another language.
- Surface premise corrections, tradeoffs, residual risks, and evidence directly.
- A handoff must be compact and include outcome, changed behavior, validation, unresolved risk, and next action; it must not dump raw Agent context.
