# Compact handoff

Each Loop returns only:

```text
status
summary
output
findings
openQuestions
nextAction
```

The summary is capped by the contract. It carries decisions and source anchors, not raw prompts, full traces, repeated repository context, or hidden chain-of-thought. Full process evidence remains in the run directory and is referenced by hash.

Workflows pass only this handoff plus explicit user answers. `source: user` answers are the sole basis for resuming a paused user-interaction state. The main Agent owns conflict resolution, integration, and the final user-facing report.
