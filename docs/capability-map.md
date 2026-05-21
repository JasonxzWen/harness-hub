# Capability Map

Skill Hub exposes two surfaces:

- a platform-neutral skill library under `skills/`;
- a lifecycle CLI that can analyze, install, update, status-check, and remove managed skills from target repositories.

## CLI Commands

| Command | Mutates target? | Purpose |
|---|---:|---|
| `skill-hub analyze <target>` | No | Detect existing standard skills, missing capabilities, conflicts, and recommendations. |
| `skill-hub install <target> --profile <name> --target standard --dry-run` | No | Preview managed standard-skill installation. |
| `skill-hub install <target> --profile <name> --target standard --yes` | Yes | Copy managed skills and write `.skill-hub/lock.json`. |
| `skill-hub status <target>` | No | Compare lock records with current files and hub versions. |
| `skill-hub update <target> --dry-run` | No | Plan updates for managed skills. |
| `skill-hub update <target> --yes` | Yes | Update managed, unmodified files. |
| `skill-hub remove <target> --dry-run` | No | Preview removal of lock-recorded files. |
| `skill-hub remove <target> --yes` | Yes | Remove only managed files recorded in `.skill-hub/lock.json`. |

## Profiles

| Profile | Purpose |
|---|---|
| `minimal` | Daily engineering skills for planning, diagnosis, TDD, review, verification, security, docs lookup, handoff, and self-debugging. |
| `sdd` | Dogfood profile for workflow routing, SDD-first change work, embedded TDD, evidence gathering, review, delivery, and Skill Hub maintenance. |
| `web` | Frontend design, artifacts, slides, web patterns, and browser validation. |
| `openspec-formal` | Explicit OpenSpec proposal, apply, and archive workflows. |
| `ralph` | Ralph PRD and story-loop preparation. |
| `learning` | Feynman-style learning coach. |
| `harness` | Repo-level harness templates. |

## Routing Anchors

- `workflow-router` owns intent recognition for non-trivial work and must hand off to exactly one owner.
- `sdd-workflow` owns SDD-first change work: align user need, gather source material, write spec/acceptance, write an executable plan, clean only approved files, implement, test, and deliver.
- `answer-workflow`, `diagnosis-workflow`, `review-workflow`, `delivery-workflow`, and `hub-maintenance-workflow` own their matching lifecycle states.
- `diagnose` owns unknown runtime bugs and performance regressions.
- `tdd-workflow` owns known behavior changes that should be implemented through tests.
- `prototype` owns disposable learning artifacts only.
- `verification-loop` owns final command gates.
- `compound-code-review` owns deep review reports.
- `effective-interact` owns communication artifacts such as option comparisons, material change reports, and lightweight export editors. Treat it as high-priority interaction infrastructure after material repo or skill changes.

## Metadata Rules

`capabilities/index.json` is the install graph. Skill components use:

- `path`: source path under `skills/<name>`;
- `detects`: standard target evidence such as `skills/<name>/SKILL.md`;
- `agents`: currently `["standard"]` for lock compatibility with older schema field names;
- `risk`: lifecycle risk for install/update/remove decisions.

Do not add host-specific install directories to the capability graph. Packaging for a host belongs in that host's manifest layer, such as `.claude-plugin/`. Subagents and hooks are workflow-owned optimizations: subagents need independent scopes, and hooks stay advisory until reviewed and approved.
