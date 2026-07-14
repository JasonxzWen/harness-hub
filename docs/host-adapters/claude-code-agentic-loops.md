---
type: architecture
title: Claude Code Loop adapter
---
# Claude Code Loop adapter

The runtime launches Claude Code non-interactively with structured output. A normal write Producer uses `acceptEdits` with only repository read/edit tools enabled; Verifier and Arbiter run in plan mode. The repository-migration Loop is the only exception: it combines `--safe-mode`, empty setting/MCP sources, `dontAsk`, one platform shell tool, and an exact `--allowedTools` rule for the private `copy-slice`; a missing command, altered command, or extra tool activity is rejected. The runtime still checks the narrower declared paths after execution and blocks any path or Git control-plane violation. Direct process trace, output schema, exit status, usage, and boundary evidence are recorded under the Loop run.

The adapter never exposes general shell or network authority. Remote actions remain unavailable unless a separately authorized main-Agent delivery path performs them.

Claude Code is an executor mode. It does not own Workflow decisions, user acceptance, or final reporting.

## Sources

- [Runtime adapter](../../skills/workflow-router/scripts/loop-runtime.mjs)
