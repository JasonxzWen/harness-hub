# Codex Agentic Loops

This adapter maps the host-neutral agentic loop catalog to Codex.

## Mapping

- `delegated-agent`: Codex subagent when the user explicitly asks for subagents or the accepted executable plan names a delegated-agent verification or arbitration pass.
- `verifier`: read-only `explorer` subagent, deterministic command, browser verification, or CI evidence.
- `arbiter`: read-only subagent with the original task, acceptance criteria, current diff or artifact summary, and verifier evidence.
- `main-agent decision`: the parent Codex agent. It owns synthesis, edits, user-facing conclusions, and whether to continue.

## Recommended Patterns

- Use read-only subagents for independent source review, frontend acceptance evidence, PR risk review, and final closeout arbitration.
- Use `worker` only when a plan names a disjoint write scope and the subagent is told it is not alone in the codebase.
- Keep critical-path blockers local when the next action cannot proceed without the result.
- Close completed subagents after their result is integrated.

## Prohibited Patterns

- Do not make hooks auto-spawn subagents.
- Do not let a subagent make final product, safety, release, or merge decisions.
- Do not ask overlapping workers to write the same files.
- Do not treat a subagent verdict as stronger than deterministic failing tests.

## Evidence

Record Codex loop evidence in `.harness-hub/state/progress.md` and `.harness-hub/state/session-handoff.md` under `Agentic Loop Records`: subagent id or explicit skip reason, verifier evidence, arbiter verdict, main-agent decision, and follow-up.
