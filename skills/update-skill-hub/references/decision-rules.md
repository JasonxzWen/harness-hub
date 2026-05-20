# Update Decision Rules

Use these rules when the main workflow needs a concrete action decision.

## Action Matrix

| Input | Action | Requirement |
|---|---|---|
| Target-repo distribution, status, managed update, migration, or uninstall maps to an existing CLI command | `call CLI` | Use `skill-hub analyze/install/status/update/migrate-lock/remove` instead of hand-written file operations. |
| Existing installed or adapted skill has no upstream delta | `no update` | Record checked source and version. |
| Existing installed or adapted skill has a compatible relevant delta | `refresh` | Preserve platform-neutral behavior and update validation evidence. |
| Upstream changed license, harness assumptions, trigger surface, credentials, or side effects | `manual review` | Stop before applying and explain the risk. |
| Skill is local-only or source cannot be verified | `skip local-only` | Do not invent a version. |
| New candidate fills an evidenced gap for the target repo | `install` or `adapt` | Use `skill-evaluator`, record source/license/version, and update docs. |
| New candidate is useful but off-stack, credential-heavy, broad, or high context | `explicit-only` | Record why it should not auto-load. |
| New candidate duplicates current behavior or lacks license/source clarity | `reject` | Record the rejection so it is not re-litigated next run. |

## Target-Repo Fit

Require concrete target evidence before installing a new skill:

- language and framework files, not guesses;
- package manifests and lockfiles;
- CI/build/test commands;
- imports, route files, or runtime configs;
- repo docs that explicitly name the workflow.

Reject off-stack installs:

- backend-only repositories do not get frontend, UI design, React, browser, mobile, or deployment skills by default;
- frontend-only repositories do not get backend, database, infra, or mobile skills by default;
- library repositories do not get app-deployment or product-analytics skills unless deployment files exist;
- docs-only repositories do not get E2E, runtime-debugging, or framework-performance skills by default.

## Source Priority

Use sources in this order:

1. `docs/source-projects.md` and recorded vendor paths.
2. Vendored source checkouts under `vendor/`.
3. Upstream repository commits, tags, releases, package metadata, plugin metadata, and license files.
4. Search results only as discovery, not final evidence.

Record exact commits, tags, package versions, dates, and license/status when a decision depends on them.

## Documentation Map

| Change | Required updates |
|---|---|
| Existing installed skill refreshed with no trigger change | Skill files, source version notes, validation evidence. |
| Trigger or overlap behavior changes | `docs/skill-routing.md`, routing eval coverage, capability overlap metadata if installable. |
| New installed or adapted skill | Skill files, `docs/source-projects.md`, `docs/skill-routing.md`, README/status or inventory counts as applicable, tests. |
| Rejected or explicit-only candidate | `docs/source-projects.md` and, when it prevents future routing confusion, `docs/skill-routing.md`. |
| Install profile changes | `capabilities/index.json`, lifecycle tests, README CLI examples if user-facing. |

## Handoff Shape

Use this order:

1. `CLI lane`: direct command used or recommended, including dry-run/yes boundary.
2. `Installed updates`: skill, previous source, checked source, decision, evidence.
3. `New candidates`: candidate, target evidence, decision, reason.
4. `Applied changes`: exact file paths and why they changed.
5. `Validation`: commands run and pass/fail result.
6. `Manual review`: unresolved risks and what would unblock them.
