# Harness Hub

Repository-first deterministic distribution for Claude Code and Codex project harnesses.

[中文说明](README.zh-CN.md)

Harness Hub has one target capability: full migration. The Git repository and selected commit are the only distribution/version source. There is no npm package, component version, partial installer, update/remove lifecycle, compatibility layer, generic Agent runtime, or second registry.

Claude Code and Codex remain the only main-Agent runtimes. Harness Hub distributes project rules, Host resources, atomic Skills, and an OKF contract; it does not duplicate native orchestration, Subagent dispatch, retries, pause/resume, or result aggregation.

## Migrate a repository

Clone this repository outside the target, then invoke the only public command:

```powershell
git clone https://github.com/JasonxzWen/harness-hub.git C:\temp\harness-hub
cd C:\temp\harness-hub
node bin/harness-hub.mjs migrate C:\path\to\target --host codex --yes
```

Modes:

```text
--host claude
--host codex
--host both --primary claude
--host both --primary codex
```

In `both` mode, primary selects only the CLI used for first-time OKF initialization. Node performs all shared and Host-specific copying deterministically.

Use `--force` only to replace Harness Hub-managed generic resources. Every run also removes resources still owned by the previous manifest that no longer belong to the selected Host surface. Target-owned Skills, project knowledge, Evals, product files, credentials, browser state, and unrelated local information remain outside that ownership set.

Both source and target must be clean standalone Git worktrees with an existing `HEAD`. Every distributed source byte must match the source `HEAD` tree. Migration rejects collisions, path escape, symlinks, junctions, unsafe Git state, and incomplete output. It never commits, pushes, publishes, merges, changes credentials, changes Host trust, or modifies user/global configuration.

## What migration installs

Shared:

- `AGENTS.md`: native main-Agent rules, development and delivery boundaries, atomic Skill routing, OKF, Eval, authorization, and safety;
- `CLAUDE.md`: exactly `@AGENTS.md`;
- `.harness-hub/manifest.json`: versionless managed-file ownership;
- `.harness-hub/okf-validate.mjs`: standalone deterministic Google OKF v0.1 validator;
- `.harness-hub/safety-hook.mjs`: deterministic PreTool safety hook with no Agent dispatch or state machine;
- first-time target-owned `knowledge/`, generated from real target sources by the selected primary CLI.

Claude Code:

- `.claude/skills/<skill>/**`;
- `.claude/settings.json`.

Codex:

- `.agents/skills/<skill>/**`;
- Codex-only atomic Skills such as `decision-ui`;
- `.codex/hooks.json`.

Codex project hooks run only when the user already trusts the target repository. Migration never changes trust.

Harness Hub's root `knowledge/`, source records, docs, tests, task state, and repository history are source-only and never copied.

## Atomic Skills and native orchestration

The Host main Agent selects atomic Skills directly. Examples include Ponytail, effective-interact, grill-me, quick-learn, source-post, Agent Reach, Decision UI, validation, security review, and Agent interaction audit.

- Complex delivery, approach comparisons, and important handoffs use `effective-interact`; simple results remain plain text.
- Failed, long-running, high-cost, tool-abnormal, or explicitly requested retrospectives use `agent-interaction-audit`. Missing duration, token, or cost evidence is `unknown`, never estimated.
- `decision-ui` is installed only for Codex and falls back honestly to text when native structured input is unavailable.
- Agent Reach is distributed as a safe prompt capability only. It first checks an already installed user-level CLI and never installs dependencies, configures accounts, writes `~/.agent-reach`, or copies cookies and credentials.

## Project knowledge

On a first migration with no prior manifest and no `knowledge/`, the primary CLI is invoked once to inspect the target and create the smallest source-traceable Google OKF v0.1 wiki.

That one CLI process receives an isolated temporary user/config directory and only the selected Host's API-key environment (`OPENAI_API_KEY` for Codex or `ANTHROPIC_API_KEY` for Claude Code), plus network/TLS process settings. It does not reuse normal Host profiles, keychains, browser state, unrelated credentials, or user configuration; the temporary directory is removed when the process exits.

Later normal and force migrations:

- invoke no Host CLI for knowledge maintenance;
- run the standalone validator;
- preserve the complete knowledge path-and-byte set;
- fail closed if a prior manifest exists but the project knowledge tree is missing.

Daily knowledge maintenance belongs to the native Host main Agent under the target project's contract. Update an existing canonical owner page before adding another, keep sources/index/log/links synchronized, and make no change when no durable project fact changed.

## Failure and evaluation boundaries

Migration keeps deterministic ownership, stale-resource cleanup, Git-control snapshots, protected-path checks, and rollback. If exact restoration is impossible because unrelated ignored content or the source checkout changed, it preserves the unowned change and reports `rolledBack: false` instead of claiming success.

Each target repository keeps its own task cards, sessions, audits, knowledge, and real-task Eval results. Harness Hub stores no project-specific cases.

Primary metric: real-task first-attempt success rate.

Guardrails: human intervention, Agent/CLI calls, elapsed time, token usage, cost, migration safety, and project-knowledge protection.

## Source development

```powershell
bun install --frozen-lockfile
bun run sync:agent-skills
bun run validate
```

Project-local `.agents/skills/` and `.claude/skills/` are ignored dogfood mirrors. Canonical Skills live only under `skills/<name>/`; `capabilities/index.json` is the single versionless distribution inventory.
