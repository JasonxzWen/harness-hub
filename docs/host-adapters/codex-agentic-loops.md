# Codex Agentic Loops

This adapter maps the host-neutral agentic loop catalog to Codex.

## Mapping

- `delegated-agent`: Codex subagent when the user explicitly asks for subagents or the accepted executable plan names a delegated-agent verification or arbitration pass.
- `verifier`: read-only `explorer` subagent, deterministic command, browser verification, or CI evidence.
- `arbiter`: read-only subagent with the original task, acceptance criteria, current diff or artifact summary, and verifier evidence.
- `main-agent decision`: the parent Codex agent. It owns synthesis, edits, user-facing conclusions, and whether to continue.

## Recommended Patterns

- Use read-only subagents for independent source review, frontend acceptance evidence, PR risk review, and final closeout arbitration.
- Use `worker` only when a plan names a disjoint write scope, a path lease has been checked, and the subagent is told it is not alone in the codebase.
- Keep critical-path blockers local when the next action cannot proceed without the result.
- Close completed subagents after their result is integrated.

## Prohibited Patterns

- Do not make hooks auto-spawn subagents.
- Do not let a subagent make final product, safety, release, or merge decisions.
- Do not ask overlapping workers to write the same files.
- Do not treat a subagent verdict as stronger than deterministic failing tests.

## Evidence

Record Codex loop runtime evidence under `.harness-hub/state/runs/<runId>/`: subagent id, role, read-only flag, owned paths, trace path, verifier evidence, arbiter verdict, and result. The main agent then summarizes accepted evidence in `.harness-hub/state/progress.md` and `.harness-hub/state/session-handoff.md` under `Agentic Loop Records`.

Codex trace collection can use `.codex/session_index.jsonl` and `.codex/sessions/**/*.jsonl`. A valid subagent trace should show `thread_source:"subagent"` or a matching subagent source, the agent id, parent thread id, role or nickname when available, and a `task_complete` event or equivalent final message.
