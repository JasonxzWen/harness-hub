---
name: update-skill-hub
description: "Load when maintaining D:/skill-hub by auditing installed skill versions, refreshing eligible local adaptations, or evaluating new skill sources for a target project; do not load for ordinary package dependency updates or single third-party skill evaluations."
---

# Update Skill Hub

Use this skill to keep Skill Hub current without turning the hub into an indiscriminate skill mirror. The output should be an evidence-backed update plan plus narrowly applied changes when the user clearly asked to update.

## Execution Model

Keep two lanes separate:

- **Deterministic CLI lane**: use `skill-hub` commands for fixed lifecycle behavior: distribute, inspect, update, migrate, and remove managed Skill Hub assets.
- **AI guidance lane**: use this skill to decide what should happen, compare upstream changes, evaluate new candidates, and choose commands or edits from evidence.

Prefer the CLI lane whenever the request maps to an existing command:

```powershell
npx skill-hub analyze D:\path\to\target --json
npx skill-hub install D:\path\to\target --profile minimal --target standard --dry-run
npx skill-hub status D:\path\to\target --json
npx skill-hub update D:\path\to\target --dry-run --json
npx skill-hub update D:\path\to\target --component skill:grill-me --yes --json
npx skill-hub remove D:\path\to\target --dry-run --json
```

Do not reimplement deterministic install, update, status, or remove behavior inside the AI workflow. Use AI judgment to select profiles, reject off-stack skills, explain blockers, and prepare safe local edits when the fixed CLI does not cover upstream source maintenance.

## Hard Boundaries

- Start with branch and worktree status. Preserve unrelated local edits.
- Treat network access as discovery unless the user explicitly asks to mutate a local checkout.
- Do not push, publish, create PRs, merge, post, modify credentials, or change third-party resources.
- Do not install a skill without target-repo evidence that the stack or workflow needs it.
- A backend-only repo does not get frontend, design, mobile, or browser-testing skills unless its files prove that surface exists.
- Preserve platform-neutral skill behavior. Do not wholesale replace a local skill body with upstream text.
- Use `skill-evaluator` for third-party repositories. Use `agent-sort` when the task is an ECC-style target-repo install plan.

## Workflow

1. Define scope.
   - Identify the Skill Hub checkout and optional target repo.
   - Separate `audit only`, `update installed skills`, and `evaluate new candidates`.
   - If the request is target-repo distribution, update, status, migration, or uninstall, plan the corresponding `skill-hub` command first.
   - State success criteria: sources checked, decisions recorded, files updated, validation run.

2. Inventory the current hub.
   - Read `skills/`, `capabilities/index.json`, `docs/source-projects.md`, `docs/skill-routing.md`, `docs/skill-feature-inventory.md`, and `README.md`.
   - Note which skills are local-only, copied, adapted, vendored, or profile-managed.
   - For target repos, inspect manifests, lockfiles, framework configs, file extensions, CI, and docs before judging fit.

3. Check installed skill updates.
   - Compare each downloaded/adapted source against the recorded upstream version, commit, tag, release, or package metadata.
   - Prefer primary upstream metadata and exact commits.
   - Classify each skill as `no update`, `refresh`, `manual review`, or `skip local-only`.
   - Refresh only when the upstream change is relevant, license-compatible, and can preserve local routing and safety boundaries.

4. Evaluate new skill candidates.
   - Search known source projects first, then current ecosystem sources if the user asked for discovery.
   - Reject off-stack candidates even when they are high quality.
   - Prefer selective adaptation over wholesale installation.
   - Record rejected or explicit-only candidates when the decision protects routing quality.

5. Apply narrow changes.
   - Update skill files, skill metadata only when required by a target host, references, tests, and docs only when they directly support the accepted update.
   - Update `docs/source-projects.md` with source, license/status, checked version, and decision for third-party candidates.
   - Update `docs/skill-routing.md` and routing evals when trigger behavior changes.
   - Update `capabilities/index.json` only when an installable profile or managed component changes.

6. Verify.
   - Run `powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal`.
   - Run `bun run validate` when TypeScript, tests, capability metadata, or CLI behavior changed.
   - Include `git diff --check` before handoff when docs or markdown tables changed.

## Decision Reference

Read `references/decision-rules.md` when applying update classifications, deciding target-repo fit, or explaining why a candidate was rejected.

## Output

Return a compact report with:

- installed skill update decisions with source evidence;
- new candidate decisions with target-repo evidence;
- files changed;
- validation commands and results;
- remaining manual review items.
