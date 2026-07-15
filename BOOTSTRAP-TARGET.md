# Bootstrap a target repository

Harness Hub has one target capability: complete repository migration. The Git checkout and commit are the only distribution/version source; no npm package, partial installer, update command, compatibility path, or generic Agent runtime exists.

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

In `both` mode, primary only selects the CLI used for first-time OKF initialization. Node directly and deterministically copies shared and Host-specific files.

`--force` may replace only Harness Hub-managed generic resources. Normal and force migrations remove stale resources owned by the previous manifest while preserving target-owned Skills, commands, `knowledge/**`, product files, project Evals, credentials, browser state, and remote state.

The target and Harness Hub source must both be clean standalone Git worktrees with an existing `HEAD`. Every distributed source file must match its source-`HEAD` blob byte-for-byte. Migration validates ownership, links, path boundaries, Git control state, rollback, and final output. If exact restoration is impossible, it preserves unowned changes and reports `rolledBack: false`. It never commits, pushes, publishes, merges, changes credentials, changes Host trust, or modifies user/global configuration.

For Codex, repository Skills are installed under `.agents/skills/`, while hooks remain in `.codex/hooks.json`. Codex project hooks run only when the user already trusts the target; migration records no trust changes.

On the first migration, only when neither a prior manifest nor `knowledge/` exists, the primary CLI is called once to inspect the target and create a source-traceable Google OKF v0.1 wiki. Later migrations invoke no Host CLI for knowledge maintenance: they validate and preserve the complete wiki byte-for-byte.

Before that first migration, expose the selected Host API key to the process (`OPENAI_API_KEY` for Codex or `ANTHROPIC_API_KEY` for Claude Code). The CLI runs with an isolated temporary user/config directory and cannot consume normal Host profiles, keychains, browser state, unrelated credentials, or user configuration. The temporary directory is deleted after the call.

The migrated `.harness-hub/safety-hook.mjs` is a deterministic local PreTool guard with no Agent dispatch or lifecycle state. The migrated `.harness-hub/okf-validate.mjs` validates project knowledge independently of Claude Code or Codex.
