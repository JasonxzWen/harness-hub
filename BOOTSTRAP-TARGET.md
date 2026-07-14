# Bootstrap a target repository

Harness Hub has one target capability: a complete repository migration. The Git checkout is the only distribution and version source; no npm package, partial installer, update command, or compatibility path exists.

Clone Harness Hub outside the target repository, then run its single CLI entry:

```powershell
git clone https://github.com/JasonxzWen/harness-hub.git C:\temp\harness-hub
cd C:\temp\harness-hub
node bin/harness-hub.mjs migrate C:\path\to\target --host codex --yes
```

Select exactly one mode:

```text
--host claude
--host codex
--host both --primary claude
--host both --primary codex
```

`--force` may replace only Harness Hub-managed generic resources. Normal and force migration both remove resources owned by the previous Harness Hub manifest that no longer belong to the selected Host/full distribution, while preserving target-owned skills, commands, `knowledge/**`, product files, project eval cases, and remote state.

The target and Harness Hub source must both be clean Git worktrees with an existing `HEAD`, and every distributed source file must match its `HEAD` blob byte-for-byte. Migration invokes the selected Claude Code or Codex CLI directly and validates the complete result. A failed slice restores the Git control plane plus managed and explicitly protected paths; if unrelated ignored content changed and exact restoration is impossible, migration reports `rolledBack: false` instead of claiming rollback. It never commits, pushes, publishes, merges, changes credentials, or changes user/global configuration.

Each Host slice keeps durable receipt, trace, integration, and metric evidence for every closed Loop in the transaction. Its path-bearing copy plan and runner are execution-only and are removed when the slice closes; a rollback failure reports both `E_ROLLBACK` and the original failure.

For Codex, repository skills are installed only under `.agents/skills/`, while hooks remain in `.codex/hooks.json`. Codex runs project hooks only after the target repository is trusted; migration reports this prerequisite and never changes trust automatically.

First migration asks the primary CLI to inspect the target and create a source-traceable Google OKF v0.1 wiki under `knowledge/`. Later migrations validate and preserve that tree byte-for-byte; daily maintenance belongs to the target project's `knowledge-maintain-loop`.
