# Executable small loops

The canonical implementation is `../scripts/loop-runtime.mjs`. Documentation or evidence records do not constitute execution.

Every Loop contract declares:

- id, objective, input schema, and structured output;
- optional skills;
- Producer, independent Verifier, and optional read-only Arbiter;
- deterministic checks and success criteria;
- maximum iterations and stop conditions;
- user-question pause/resume state;
- local and remote side-effect boundaries;
- a compact handoff to the main Agent.

Runtime sequence:

```text
Producer -> deterministic checks -> Verifier
  -> pass: compact integration handoff
  -> revise: next bounded iteration
  -> conflicting Agent verdicts: read-only Arbiter
  -> real user decision: pause, then resume the same run
  -> max iterations or deterministic failure: explicit failed handoff
```

`implementation-review-loop` is a single pass over one implementation state. A rejection returns a compact correction handoff to the main Agent; it may run again only after the implementation changes. `delivery-loop` is also single-pass because it can have local side effects: its Producer stays read-only, then the same runtime performs explicitly authorized cleanup, deterministic validation, and an optional local commit of the reviewed bytes, in that order. Rejection returns to the main Agent; any completed cleanup or commit remains explicit in run evidence and the compact handoff.

The runtime directly invokes the selected Claude Code or Codex CLI, captures process trace and structured output, enforces path leases, validates control-plane integrity, and writes run evidence under `.harness-hub/state/runs/<runId>/`. Missing evidence never passes.

`validationCommands` are trusted, repository-owned commands selected by the main Agent and executed with the caller's local authority. They are not a sandbox for untrusted code and cannot be supplied or replaced by delegated-Agent output. The runtime rejects known direct shell, remote, and inline-code forms and captures deterministic results, but a trusted project script remains responsible for its own nested side effects.

Built-in Loops:

- `requirements-loop`
- `spec-loop`
- `test-loop`
- `implementation-review-loop`
- `delivery-loop`
- `report-loop`
- `retro-loop`
- `knowledge-init-loop`
- `knowledge-maintain-loop`

`repository-migration-loop` is an internal full-migration slice used by the repository migration Workflow. It is not a second public target command.
