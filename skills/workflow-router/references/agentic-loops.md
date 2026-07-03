# Agentic Loops

Agentic loops are workflow-stage mechanics, not a top-level workflow owner and not the Loop Control Plane.

```text
Producer -> Verifier -> Arbiter -> Main Agent Decision
```

- **Producer** prepares the work under the active workflow owner.
- **Verifier** gathers evidence. It can be a delegated-agent review, browser run, deterministic command, CI check, or explicit skip reason.
- **Arbiter** judges the original task, acceptance criteria, current diff or artifact, verifier evidence, and risk. It is read-only.
- **Main Agent Decision** integrates the verdict, fixes or delegates scoped work, interrupts for user decisions when required, and owns the final user-facing handoff.

Use `delegated-agent` as the host-neutral term. It may map to a host-native subagent, isolated session, browser run, CI check, deterministic command, or bounded worker depending on the host. Host-specific invocation details belong outside generic skill bodies.

When delegated agents run, keep their private runtime state under ignored `.harness-hub/state/runs/<runId>/agents/<agentId>/`. Write-capable delegated agents may share the current worktree only after a path lease records non-overlapping owned paths. The main agent writes the final integration record and summarizes accepted evidence in root progress and handoff state.

For mutation work, loop review is mandatory. The size of the change only changes the evidence level:

- `L0`: docs-only or mechanical changes may use main-agent self-review plus deterministic validation.
- `L1`: source, tests, behavior, or mixed docs/code changes need independent review evidence, or an explicit fallback reason plus deterministic substitute.
- `L2`: workflow, harness, security, release, credential, permission, or remote-action paths need subagent or isolated-session evidence and read-only arbiter judgment unless the user explicitly approves a downgrade.

When the Harness Hub CLI runtime is available, derive required loops from the worktree with `harness-hub loop required`, record run, agent, trace, lease, and integration evidence under `.harness-hub/state/runs/<runId>/`, and block handoff until `harness-hub loop verify --input <file>` passes or records the unresolved finding.

## Standard Loop Types

- `plan-review`
- `test-design`
- `implementation-review`
- `frontend-acceptance`
- `diagnosis-regression`
- `docs-consistency`
- `pr-closeout`
- `insight-retro`

## Required Evidence

Record loop evidence with:

- loop type and stage;
- producer, verifier, and arbiter;
- original task or target spec;
- acceptance criteria;
- producer output or current diff/artifact;
- verifier evidence or explicit skip reason;
- arbiter verdict or explicit skip reason;
- delegated-agent runtime state, path lease, and host trace evidence when a subagent runs;
- stop condition when the loop may repeat or iteration controls are recorded;
- iteration and maxIterations when the loop may repeat;
- main-agent decision and follow-up.

## Boundaries

- Arbiters must not edit files, resolve conflicts, push, publish, merge, post, mutate third-party resources, or make final user-facing decisions.
- Subagents must not write root progress or handoff state directly; the main agent integrates and summarizes accepted evidence.
- Required loop evidence must not be waived only because the change is small; downgrade the level with a reason instead.
- Hooks and deterministic checks may request or validate loop evidence, but must not auto-dispatch delegated agents.
- A failing deterministic check outranks a delegated-agent pass.
- A failing or blocked arbiter verdict must not be marked as deliver/complete.
- When `iteration` or `maxIterations` is recorded, both values must be positive integers, `iteration` must not exceed `maxIterations`, and `stopCondition` must be recorded.
