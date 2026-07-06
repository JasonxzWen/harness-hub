# Action Audit Schema

## Runtime Ledgers

Loop runtime state is target-local and append-only by default:

- `.harness-hub/state/loop-runs.jsonl`
- `.harness-hub/state/interrupt-decisions.jsonl`
- `.harness-hub/state/capability-events.jsonl`
- `.harness-hub/state/runs/<runId>/`

Harness Hub may initialize missing ledgers, but updates must preserve existing ledger content.

## Interrupt Decision Record

Each JSONL line in `interrupt-decisions.jsonl` should follow this shape:

```json
{
  "schemaVersion": 1,
  "runId": "loop-run-id",
  "capabilityId": "capability-id",
  "askedByAgentId": "delegated-agent-id-or-null",
  "action": "short action name",
  "targetPaths": ["relative/path"],
  "sideEffects": ["local-files"],
  "riskSignals": ["scope-clear", "validation-known"],
  "autonomyEnvelope": {
    "allowedPaths": ["relative/path"],
    "forbiddenPaths": ["relative/path"],
    "leaseId": "lease-id-or-null",
    "localReversible": true,
    "validationKnown": true,
    "maxIterations": 2
  },
  "validation": {
    "planned": ["command or check"],
    "result": "passed|failed|skipped|pending"
  },
  "decision": "continue|interrupt",
  "mainAgentDecision": "auto-continue|auto-reject|pull-back-to-main|escalate-to-user",
  "escalationReason": "why user input is required, or null when auto-arbitrated",
  "reason": "why this decision is safe or why it needs review",
  "evidence": ["file, command, or source anchor"],
  "delegatedNextAction": "what the subagent should do next, or null",
  "nextSafeAction": "what happens next"
}
```

## Capability Event Record

Each JSONL line in `capability-events.jsonl` should capture:

```json
{
  "schemaVersion": 1,
  "runId": "loop-run-id",
  "capabilityId": "capability-id",
  "invocation": "standalone|composable|loop-participant",
  "event": "planned|started|completed|failed|skipped",
  "inputs": ["stable input summary"],
  "outputs": ["stable output summary"],
  "validation": ["evidence"],
  "timestamp": "ISO-8601 timestamp when available"
}
```

## Loop Run Record

Each JSONL line in `loop-runs.jsonl` should capture:

```json
{
  "schemaVersion": 1,
  "runId": "loop-run-id",
  "loopId": "loop-id",
  "trigger": "manual|scheduled|event|continuation",
  "status": "running|completed|interrupted|failed",
  "summary": "short durable summary",
  "validation": ["evidence"],
  "nextAction": "next concrete action"
}
```

## Orchestration Run State

Delegated-agent runtime state is ignored worktree-local state under `.harness-hub/state/runs/<runId>/`:

```text
.harness-hub/state/runs/<runId>/run.json
.harness-hub/state/runs/<runId>/agents/<agentId>/state.json
.harness-hub/state/runs/<runId>/agents/<agentId>/events.jsonl
.harness-hub/state/runs/<runId>/agents/<agentId>/result.json
.harness-hub/state/runs/<runId>/leases/<leaseId>.json
.harness-hub/state/runs/<runId>/integration.json
```

Subagents write only their own agent directory and scoped product files covered by a path lease. The main agent writes `integration.json` and summarizes accepted evidence into root progress and handoff state.
