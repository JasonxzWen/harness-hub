# Harness Hub

Repository-first distribution for a complete, executable Claude Code/Codex project harness.

[中文说明](README.zh-CN.md)

Harness Hub has one target capability: full migration. The Git repository and selected commit are the only distribution/version source. There is no published package, component version, partial installer, update/remove lifecycle, compatibility layer, or second Loop runtime.

```text
skill (optional atomic capability)
  -> small loop (independently executable; may compose skills)
  -> workflow (large loop; only orchestrates small loops)
```

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

Use `--force` only to replace Harness Hub-managed generic resources. Every run also removes resources still owned by the previous manifest that no longer belong to the selected Host/full distribution. Target-owned skills, commands, project knowledge, evals, product files, and unrelated local information stay outside that ownership set.

Both source and target must be clean Git worktrees with an existing `HEAD`, and distributed source bytes must match the `HEAD` tree. Migration never commits, pushes, publishes, merges, changes credentials, or modifies user/global configuration.

## What full migration installs

Shared:

- `AGENTS.md`: generic development, iteration, Loop, preference, OKF, eval, authorization, and delivery rules;
- `CLAUDE.md`: exactly `@AGENTS.md`;
- `.harness-hub/.gitignore` and a versionless managed-file manifest;
- first-time target-owned `knowledge/` generated from real target sources by the primary CLI.

Claude Code:

- `.claude/skills/<skill>/**`;
- `.claude/settings.json` with repository-local hooks.

Codex:

- `.agents/skills/<skill>/**`;
- `.codex/hooks.json` with repository-local hooks.

Codex discovers repository skills from `.agents/skills/`. Project hooks run only when Codex trusts the target repository; migration never changes trust or user/global configuration.

Canonical source-only files—Harness Hub's own `knowledge/`, source records, tests, docs, OpenSpec, and repository history—are never copied.

## Executable Loops

The single runtime is `skills/workflow-router/scripts/loop-runtime.mjs`. It directly invokes Claude Code or Codex, captures structured process evidence, enforces path leases and control-plane integrity, runs deterministic checks, and stores ignored run evidence under `.harness-hub/state/runs/`.

Built-in small loops:

- `requirements-loop`
- `spec-loop`
- `test-loop`
- `implementation-review-loop`
- `delivery-loop`
- `report-loop`
- `retro-loop`
- `knowledge-init-loop`
- `knowledge-maintain-loop`

The internal `repository-migration-loop` makes the Host execute one exact private `copy-slice` command. The runtime accepts the slice only when its process trace, receipt, source commit, target HEAD, role, and distributed bytes agree.

Workflow sequences are intentionally thin:

| Workflow | Small loops |
| --- | --- |
| question | report |
| SDD change | requirements -> spec -> test -> implementation review -> conditional knowledge maintenance -> delivery -> retro -> report |
| diagnosis | requirements -> test -> implementation review -> conditional knowledge maintenance -> delivery -> retro -> report |
| review | implementation review -> report |
| delivery | delivery -> retro -> report |

`report-loop` invokes `effective-interact` from lifecycle context for complex decisions and handoffs even when the user did not request a visualization. Simple reports may remain plain text.

## Project knowledge

First migration asks the primary CLI to inspect the target and create the smallest useful Google OKF v0.1 LLM Wiki:

```text
knowledge/
  index.md
  log.md
  project.md (or other source-backed concepts)
```

Concepts require UTF-8 Markdown, parseable frontmatter with non-empty `type`, index links, dated updates, and relative citations to at least one real file from the pre-migration target `HEAD` outside Harness Hub-managed paths. Generated knowledge must not be ignored by Git. Later migration—including `--force`—validates and preserves the complete path-and-byte set. Daily changes belong to `knowledge-maintain-loop`, not migration.

Harness Hub's own OKF wiki lives at root `knowledge/` and is source-only.

## Failure and evaluation boundaries

- Dirty source/target, missing `HEAD`, unmanaged collision, unsafe link, missing CLI trace, wrong role, incomplete output, deterministic failure, or path escape fails closed.
- Producer failure and Verifier rejection iterate within the Loop's bound; max iterations produce an explicit failed handoff.
- Real user questions pause and resume the same Loop. Agent output cannot fabricate user acceptance.
- Failure restores the target transaction boundary; unrelated target data is not a migration resource.
- Each target repository keeps its own real-task cards, session audits, and eval results. Harness Hub stores no project-specific cases.

Primary metric: real-task first-attempt success rate. Guardrails: human intervention count and total execution cost.

## Source development

```powershell
bun install --frozen-lockfile
bun run sync:agent-skills
bun run validate
```

Project-local `.agents/skills/` and `.claude/skills/` are ignored dogfood mirrors. Canonical skills live only under `skills/<name>/` and every canonical skill is explicitly `target-distributed` in `capabilities/index.json`.
