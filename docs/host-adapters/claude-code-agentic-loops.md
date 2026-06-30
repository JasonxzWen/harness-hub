# Claude Code Agentic Loops

This adapter maps the host-neutral agentic loop catalog to Claude Code.

## Mapping

- `delegated-agent`: Claude Code subagent or custom project/user subagent selected by description.
- `verifier`: subagent, deterministic command, browser acceptance artifact, or CI evidence.
- `arbiter`: custom read-only review or arbitration subagent.
- `main-agent decision`: the parent Claude Code session. It owns final synthesis, edits, and user-facing handoff.

## Recommended Patterns

- Define reusable custom subagents for plan review, frontend acceptance, code review lenses, PR closeout, and workflow-learning arbitration.
- Keep host-specific subagent definitions outside the distributed generic skill body; project-local host packaging can live in the host's own configuration.
- Pass the original task, target spec, acceptance criteria, current diff or artifact summary, and verifier evidence to arbiters.
- Prefer deterministic commands for assertions that do not need model judgement.

## Prohibited Patterns

- Do not add Claude-only paths or tool names to generic `SKILL.md` bodies.
- Do not use hooks to dispatch subagents without explicit security review and rollout approval.
- Do not let the arbiter mutate code, resolve conflicts, push, publish, or merge.

## Evidence

Record Claude Code loop evidence in the same host-neutral state sections: loop type, verifier, arbiter, verdict, main-agent decision, and follow-up. Host-specific subagent names can be included as evidence, but generic policy must remain portable.
