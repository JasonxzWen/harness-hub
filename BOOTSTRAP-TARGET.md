# Bootstrap a target repository

Harness Hub has one target capability: complete repository migration. The Git checkout and commit are the only distribution/version source; no npm package, partial installer, update command, compatibility path, or generic Agent runtime exists. Installation and updates both use `migrate`.

## Update an installed repository from one request

When Claude Code or Codex receives a Harness Hub update request together with this repository URL:

```text
https://github.com/JasonxzWen/harness-hub
```

the Agent must clone the URL into a temporary standalone checkout outside the current repository, use the source repository's default branch current HEAD, treat the current repository as the target, and read its existing `.harness-hub/manifest.json`. From the temporary Harness Hub checkout, run:

```powershell
node bin/harness-hub.mjs migrate <current-repository> --yes
```

With a valid schemaVersion 1 manifest, omitted `--host` and `--primary` inherit `hosts` and `primaryHost`; do not ask the user to repeat the Host mode. Explicit parameters still win and may intentionally switch Host surfaces under the existing ownership, stale-cleanup, and protection rules. The new manifest records the actual source commit used for the update.

Recognized HTTPS and SSH spellings of the official remote record the canonical source URL `https://github.com/JasonxzWen/harness-hub` in the manifest. This identity normalization performs no remote call or remote mutation.

The migration command never commits, pushes, publishes, merges, or otherwise modifies remote state. Delete the temporary source checkout only after the local result and validation evidence have been reported.

## First migration

Clone Harness Hub outside the target repository, then run its single CLI entry:

```powershell
git clone https://github.com/JasonxzWen/harness-hub.git C:\temp\harness-hub
cd C:\temp\harness-hub
node bin/harness-hub.mjs migrate C:\path\to\target --host codex --yes
```

With no manifest, select exactly one mode explicitly:

```text
--host claude
--host codex
--host both --primary claude
--host both --primary codex
```

On a first migration, `both` requires `--primary`. In `both` mode, primary only selects the CLI used for first-time OKF initialization. Node directly and deterministically copies shared and Host-specific files.

`--force` may replace only Harness Hub-managed generic resources. Normal and force migrations remove stale resources owned by the previous manifest while preserving target-owned Skills, commands, `knowledge/**`, product files, project Evals, credentials, browser state, and remote state.

The target and Harness Hub source must both be clean standalone Git worktrees with an existing `HEAD`; use the current repository as the target only when its `.git` is a real directory. If `.git` is a file because the repository is a linked worktree or submodule worktree, stop with `E_LINKED_WORKTREE` and rerun from a clean standalone clone. Do not migrate a replacement target and copy its result or Git metadata back. Every distributed source file must match its source-`HEAD` blob byte-for-byte. Migration validates ownership, links, path boundaries, Git control state, rollback, and final output. If exact restoration is impossible, it preserves unowned changes and reports `rolledBack: false`. It never commits, pushes, publishes, merges, changes credentials, changes Host trust, or modifies user/global configuration.

For Codex, repository Skills are installed under `.agents/skills/`, while hooks remain in `.codex/hooks.json`. Codex project hooks run only when the user already trusts the target; migration records no trust changes.

On the first migration, only when neither a prior manifest nor `knowledge/` exists, the primary CLI is called once to inspect the target and create a source-traceable Google OKF v0.1 wiki. Later migrations invoke no Host CLI for knowledge maintenance: they validate and preserve the complete wiki byte-for-byte.

Before that first migration, expose the selected Host API key to the process (`OPENAI_API_KEY` for Codex or `ANTHROPIC_API_KEY` for Claude Code). The CLI runs with an isolated temporary user/config directory and cannot consume normal Host profiles, keychains, browser state, unrelated credentials, or user configuration. The temporary directory is deleted after the call.

The migrated `.harness-hub/safety-hook.mjs` is a deterministic local PreTool guard with no Agent dispatch or lifecycle state. The migrated `.harness-hub/okf-validate.mjs` validates project knowledge independently of Claude Code or Codex.
