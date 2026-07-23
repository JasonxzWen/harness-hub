# Bootstrap a target repository

Harness Hub has one public target command, `migrate`, with two explicit strategies. Managed is the existing deterministic full migration. Guided is a read-only handoff that lets the native Agent inspect the project, propose selective adoption, and edit only after the required user approval. Neither strategy adds an npm package, compatibility path, generic Agent runtime, or second registry.

The Git checkout and commit are the only distribution/version source. Guided never activates automatically because a target already has configuration or a Managed collision; the user must select it explicitly.

## Guided selective adoption

From a clean Harness Hub checkout with an existing `HEAD`, run:

```text
node bin/harness-hub.mjs migrate <target> --guided
```

`--guided` is mutually exclusive with `--yes`, `--host`, `--primary`, and `--force`. The target need only resolve to a Git working tree; it may be dirty, diverged, detached, linked, or have no `HEAD`.

The Guided CLI resolves the repository root, verifies that its canonical guide bytes match the reported source commit, and returns `mutated: false` with these source paths:

- `BOOTSTRAP-TARGET.md`
- `capabilities/index.json`
- `docs/skill-routing.md`
- `docs/capability-map.md`

It does not inspect target status, configuration, manifest, knowledge, diff, or file tree. It does not call a Host CLI, copy or merge files, create ownership, write a manifest, clean stale resources, apply a patch, or enter rollback. `mutated: false` covers only this CLI call; later Agent edits are ordinary project mutations.

After the handoff, the native main Agent:

1. reads the returned map and the target's own rules;
2. inspects the target's real needs, Git state, Host configuration, existing instructions, Skills, and current owners;
3. preserves existing configuration and prepares a transient proposal rather than overwriting whole files;
4. presents one row per suggestion and waits for the user's selection.

Use this proposal shape:

| Capability / source | Target evidence / current owner | Action | Affected paths | Visibility | Risk | User choice |
|---|---|---|---|---|---|---|
| `<id or path>` | `<observed evidence>` | reuse / adapt / add / skip | `<exact paths>` | local / shared | `<risk>` | pending |

Authorization has three independent boundaries:

1. **Proposal selection:** no write occurs before selection. Selecting a local row authorizes only its listed local edits; selecting a shared row does not yet authorize a tracked patch.
2. **Shared patch approval:** any tracked-file change, deletion, or new content intended for version control requires the Agent to show the exact patch and obtain separate confirmation.
3. **Delivery approval:** staging, committing, pushing, opening a PR, publishing, or merging always needs separate authorization. Proposal or patch approval implies none of them.

A Guided change is **local** only when every new path remains untracked and ignored in the repository-private exclude file resolved by:

```text
git rev-parse --git-path info/exclude
```

Append only exact rules, preserve existing exclude content, and do not modify the project's `.gitignore` automatically. A path matched by `git ls-files --error-unmatch -- <path>` is tracked: tracked files cannot become local through ignore rules. Do not use `assume-unchanged` or `skip-worktree` to disguise tracked edits. If the Host has no suitable untracked local surface, set Visibility to `shared` and stop for shared patch approval.

Harness Hub creates no Guided manifest, selection file, pack, ownership record, or update lifecycle. The Agent must selectively patch existing files for either visibility; it must never replace an existing project configuration wholesale.

## Managed update of an installed repository from one request

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

## First Managed migration

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
