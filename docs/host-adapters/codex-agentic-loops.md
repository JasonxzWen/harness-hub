---
type: architecture
title: Codex Loop adapter
---
# Codex Loop adapter

The runtime launches Codex non-interactively with `--ask-for-approval never`, `exec`, `--ephemeral --ignore-user-config --ignore-rules --disable hooks --json`, and structured output. This removes interactive approval waits and user/project exec-policy variation without bypassing the sandbox: a write Producer uses `workspace-write`, while Verifier and Arbiter use `read-only`. On Windows, a write Producer also sets the session-local `windows.sandbox=unelevated` backend because `--ignore-user-config` intentionally removes the user's backend setting. The repository-migration Loop must execute one exact internal `copy-slice` command, and the runtime rejects a missing command, an altered command, or any extra tool activity. The runtime still checks the narrower declared paths after execution and blocks any path or Git control-plane violation. Direct process trace, output schema, exit status, usage, and boundary evidence are recorded under the Loop run.

Migration copy plans and runners are execution-only. The closed run retains the receipt and directly captured evidence, without persisting source-checkout paths in those temporary inputs.

The adapter never uses Codex's approval-and-sandbox bypass. Remote actions remain unavailable unless a separately authorized main-Agent delivery path performs them.

Codex is an executor mode. It does not own Workflow decisions, user acceptance, or final reporting.

## Sources

- [Runtime adapter](../../skills/workflow-router/scripts/loop-runtime.mjs)
