# Standard Target Boundary

Harness Hub has one user-facing target path: `standard`.

Use it through explicit lifecycle commands:

```powershell
harness-hub init-harness <target> --target standard --dry-run --json
harness-hub init-harness <target> --target standard --yes
harness-hub install <target> --target standard --dry-run
harness-hub install <target> --target standard --yes
```

`standard` is the complete target migration path for prompt engineering, context engineering, harness engineering, loop engineering, and target-distributed reusable skills. `init-harness --target standard --yes` installs that standard skill and routing surface, writes the root harness contract, creates local task state, initializes the LLM Wiki context pack under `.harness-hub/context/`, validates the target, and records ownership in `.harness-hub/lock.json`.

Harness Hub source-maintenance resources are not part of the target migration surface. Workflows for this repository's source records, capability metadata, npm lifecycle, release process, and managed update/remove implementation stay local to the Harness Hub source checkout. `agent-interaction-audit` remains part of `standard` because it is a portable private repository interaction audit skill.

`harness:minimal` and `harness/minimal/` are internal component/template identifiers. They are not a second user-facing target, pack, level, or reduced install mode.

`website-cloner` is a local explicit-only smoke scaffold used with the `clone-website` skill for authorized clone/report artifacts. It is not a harness level, not part of default install, and not a target bootstrap alternative.

## Source Review Boundary

Third-party harness projects remain useful as source material. `walkinglabs/learn-harness-engineering`, `revfactory/harness`, ECC, and similar sources can contribute ideas such as structural assessment, durable validation records, checkpoint commits, runtime signal capture, evaluator rubrics, quality snapshots, team-architecture patterns, QA boundary checks, stocktake workflows, or trigger-noise audits.

Those ideas must be evaluated by ROI and folded into the existing `standard` target path. They must not create pack levels, optional install tiers, host-specific harness trees, hidden hooks, external writes, credential dependencies, or remote runners.

The local `validate-harness` command already adapts source ideas: five-subsystem assessment, HTML report surface, structural benchmark framing, generic verification-command detection, durable validation records, checkpoint-commit policy, feature-state evidence, runtime signal capture, evaluator rubric, quality snapshot, QA boundary checks, agent architecture boundary checks, trigger-hygiene checks, Loop Control Plane policy/eval validation, and LLM Wiki context-pack validation. It does not copy or activate upstream writers, host metadata, or generated advanced packs.

## Non-Goals

- No wholesale upstream import.
- No hidden hooks, schedules, remote runner setup, commits, pushes, or external automations.
- No automatic website cloning, external scraping, or third-party brand copying.
- No advanced, lite, team, language, experimental, or optional harness levels.
- No pack promotion checklist. A source idea either improves `standard`, stays as source evidence, or is rejected.
- No package or repository rename as a prerequisite for source evaluation.
- No Harness Hub source-maintenance workflow migration into target repositories.

## Intake Checklist

Before folding a source idea into `standard`:

1. Record the source in `docs/source-projects.md`.
2. State the concrete standard-target problem the idea solves.
3. Confirm it is platform-neutral or isolated from host-specific packaging.
4. Confirm it does not add an install selector, new pack level, blocking hook, external write, credential dependency, or remote runner.
5. Validate the changed standard path with the nearest docs, routing, skill, or lifecycle tests.
