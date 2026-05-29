# Minimal Harness Policy

Harness Hub no longer treats harness packs as levels. The only supported repo harness is `minimal`, activated through:

```powershell
harness-hub init-harness <target> --target standard --dry-run
harness-hub init-harness <target> --target standard --yes
```

`minimal` is the complete personal migration path: it writes the root harness files, installs the full standard skill and routing surface, validates the target, and records ownership in `.harness-hub/lock.json`.

`website-cloner` is a local explicit-only smoke scaffold used with the `clone-website` skill for authorized clone/report artifacts. It is not a harness level, not part of default install, and not a target bootstrap alternative.

## Source Review Boundary

Third-party harness projects remain useful as source material. `walkinglabs/learn-harness-engineering`, `revfactory/harness`, ECC, and similar sources can contribute ideas such as structural assessment, team-architecture patterns, QA boundary checks, stocktake workflows, or trigger-noise audits.

Those ideas must be evaluated by ROI and folded into the existing minimal path. They must not create additional pack levels, optional install tiers, host-specific harness trees, or new default side effects.

The local `validate-harness` command already adapts source ideas: five-subsystem assessment, HTML report surface, structural benchmark framing, generic verification-command detection, QA boundary checks, agent architecture boundary checks, and trigger-hygiene checks. It does not copy or activate upstream writers, host metadata, or generated advanced packs.

## Non-Goals

- No wholesale upstream import.
- No hidden hooks, schedules, remote runner setup, commits, pushes, or external automations.
- No automatic website cloning, external scraping, or third-party brand copying.
- No advanced, lite, team, language, or experimental harness levels.
- No pack promotion checklist. A source idea either improves `minimal`, stays as source evidence, or is rejected.
- No package or repository rename as a prerequisite for source evaluation.

## Intake Checklist

Before folding a source idea into minimal:

1. Record the source in `docs/source-projects.md`.
2. State the concrete minimal-path problem the idea solves.
3. Confirm it is platform-neutral or isolated from host-specific packaging.
4. Confirm it does not add an install selector, new pack level, blocking hook, external write, credential dependency, or remote runner.
5. Validate the changed minimal path with the nearest docs, routing, skill, or lifecycle tests.
