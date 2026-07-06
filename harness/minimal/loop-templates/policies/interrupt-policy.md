# Interrupt Policy

## Purpose

Loop runs should reduce avoidable human interruption while keeping risky action decisions auditable. The main agent may continue low-risk local actions when the target, scope, validation path, and autonomy envelope are clear. It must interrupt when the next action changes durable rules, has unclear ownership, exceeds the active task boundary, cannot be verified, or creates remote or destructive side effects.

## Capability Invocation

Capabilities are not required to belong to a fixed workflow.

- `standalone`: can be triggered directly by the user or agent.
- `composable`: can be used by a higher-level workflow when useful.
- `loop-participant`: participates in a recurring or autonomous loop with explicit run state.

Each capability should describe its inputs, outputs, possible side effects, validation signals, interruption hints, and suggested loops. The loop runtime decides whether to continue or interrupt for the concrete action.

## Continue By Default

Continue without human interruption when all conditions are true:

- The action is inside the active task scope and allowed paths.
- Write actions are covered by a non-overlapping path lease, or the main agent will perform the integration edit.
- The action is local and reversible.
- The action does not change long-lived project rules, external state, or non-managed content.
- The agent can name the validation signal before acting.
- The action and result will be recorded in `.harness-hub/state/loop-runs.jsonl`, `.harness-hub/state/interrupt-decisions.jsonl`, or `.harness-hub/state/capability-events.jsonl`.

## Main-Agent Auto-Arbiter

Subagent interruption questions go first to the main agent. The main agent should auto-arbitrate low-risk subagent questions instead of asking the user when the autonomy envelope permits it.

Default main-agent decisions:

- Continue read-only source, log, docs, or web research when it is in scope and likely to reduce uncertainty.
- Continue a bounded local fix or test retry when it targets the same acceptance criteria and remains below `maxIterations`.
- Reject scope creep, opportunistic cleanup, and unrelated findings as follow-up items.
- Pull work back to the main agent when the subagent lacks context, crosses a lease, or conflicts with deterministic evidence.
- Escalate to the user only for true human decisions: behavior, acceptance, scope, cost, data ownership, credentials, permissions, remote writes, publishing, PR/merge state, destructive non-managed content, or long-lived governance.

Deterministic checks outrank subagent judgment. A failing test, validator, build, browser check, mergeability result, or policy check must be fixed, explicitly risk-assessed, or surfaced.

## Interrupt

Interrupt before acting when any condition is true:

- Requirements, ownership, or expected behavior are ambiguous.
- The action changes `AGENTS.md`, `CLAUDE.md`, routing, project rules, long-lived wiki decisions, or other canonical governance content.
- The action writes remote services, publishes content, opens or updates PRs/issues/comments, or calls external APIs with side effects.
- The action deletes, overwrites, migrates, or rewrites non-managed content.
- The action exceeds the active task boundary or touches forbidden paths.
- A delegated agent asks to write outside its path lease or continue after `maxIterations`.
- The action cannot be verified with a concrete local signal.
- Verification fails and the next step would expand scope.
- The agent is relying on unverified API names, paths, scripts, config keys, protocol fields, or package capabilities.

## Audit Requirement

Every continue or interrupt decision must be explainable after the fact. At minimum, record:

- `runId`
- `capabilityId`
- `action`
- `targetPaths`
- `sideEffects`
- `riskSignals`
- `validation`
- `decision`
- `askedByAgentId`
- `autonomyEnvelope`
- `mainAgentDecision`
- `escalationReason`
- `reason`
- `evidence`
- `nextSafeAction`

Good and bad cases are executable eval assets under `.harness-hub/loop/evals/interrupt-policy/`. Update them when a repeated judgment mistake should become a durable rule.
