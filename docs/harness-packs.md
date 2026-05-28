# Harness Packs

Harness packs are explicit repo-harness extensions for projects that need more than the minimal root contract. They are not part of default standard skill installation.

## Current Packs

| Pack | Status | Activation |
|---|---|---|
| `minimal` | Local, source-owned, explicit | `skill-hub init-harness <target> --dry-run` then `--yes` |
| `website-cloner` | Local smoke scaffold, explicit-only | Use with the `clone-website` skill for authorized clone/report artifacts; not part of default install |
| `advanced-openai` | Evaluated source reference only | Not installable until license and host metadata review is complete |

## Source Review Boundary

`walkinglabs/learn-harness-engineering` is useful source material for advanced harness engineering. The current reviewed revision is `ea746b29b40a2629a59f85aeced9389477abfb7c`.

Keep its advanced content reference-only until all of the following are true:

- repository-level license evidence is clear enough for redistribution;
- host-specific metadata such as `agents/openai.yaml` is removed, adapted, or kept outside distributed source;
- side effects are documented and gated behind explicit commands;
- overlap with local `init-harness`, `validate-harness`, and lock ownership is resolved;
- tests prove default `install` still excludes advanced pack files.

## Non-Goals

- No wholesale upstream import.
- No hidden hooks, schedules, remote runner setup, commits, pushes, or external automations.
- No default advanced pack activation through `install`.
- No automatic website cloning, external scraping, or third-party brand copying.
- No package or repository rename as a prerequisite for advanced pack evaluation.

## Promotion Checklist

1. Record the source in `docs/source-projects.md`.
2. Add an OpenSpec change for any installable advanced pack.
3. Add a component with `kind: "harness-pack"` only after source review.
4. Add dry-run, confirmed install, status, update, remove, and package-boundary tests.
5. Run `bun run validate` and a disposable target smoke flow.
