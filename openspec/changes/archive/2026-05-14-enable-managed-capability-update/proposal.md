## Why

Skill Hub can already record installed component versions in `.skill-hub/lock.json`, report `update-available`, and show `update --dry-run` plans, but target repositories still cannot safely apply those updates. This leaves users with a version-aware lifecycle that stops at advice instead of letting managed Skill Hub files be refreshed under the same lock-backed safety model used by install, status, and remove.

## What Changes

- Enable `skill-hub update <target> --yes` for schema version 2 managed components whose locked version differs from the current `capabilities/index.json` version.
- Preserve `skill-hub update <target> --dry-run` as the preview path and make mutating update require explicit confirmation.
- Add `--component <id>` selection for narrow update previews and mutations when operators want to update one or more managed components instead of every update-available component.
- Add `update --force --yes` for schema version 2 managed components when the operator explicitly chooses to overwrite modified or restore missing lock-recorded managed files.
- Add a dedicated schema version 1 migration path that can convert only verifiably matching legacy records into schema version 2 records before later update/remove operations.
- Apply normal updates only when every managed file for the component still matches the lock; require `--force --yes` before overwriting modified schema version 2 managed files or restoring missing schema version 2 managed files.
- Recopy the current component assets from Skill Hub, recompute file hashes, and rewrite the lock so updated component versions, source metadata, file records, hub version, and update timestamp are auditable.
- Extend JSON/HTML/text reports so operators can see updated components, forced updates, migrated records, blockers, unchanged rows, selected rows, and the reason for each decision.
- Add a reusable acceptance script or equivalent documented smoke flow that exercises install, stale-version detection, update preview, confirmed update, component-scoped update, force update, schema v1 migration, and safe removal in a disposable target repository.

Non-goals:

- No automatic merge of user edits in target repositories.
- No force behavior for unsafe paths, schema version 1 hashless records, unknown components, or skipped components.
- No automatic schema version 1 migration during `update`; legacy locks require the explicit migration command or documented reinstall flow.
- No npm publishing, GitHub release, remote registry sync, or third-party resource mutation.
- No new component detection model such as globs, content matching, or frontmatter parsing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `managed-capability-lifecycle`: Add mutating update behavior for schema version 2 managed component refreshes, selected component updates, force updates for modified/missing managed files, and explicit schema version 1 migration.
- `cli-distribution`: Change the CLI contract so `update <target> --yes`, `update <target> --force --yes`, `update <target> --component <id> ...`, and `migrate-lock <target> --yes` are supported while mutating commands without `--dry-run` or `--yes` remain invalid.

## Impact

- `src/skillHub.ts`: update planning, selected update apply path, force update behavior, lock migration, lock rewrite behavior, CLI option handling, report rendering, and exit-code behavior.
- `tests/skillHub.test.ts`: fixtures for successful updates, component selection, force updates, schema v1 migration, modified/missing/schema v1 blockers, skipped records, lock hash refresh, CLI output, and exit codes.
- `scripts/smoke-managed-update.ps1` or equivalent: disposable target acceptance flow for local verification outside unit tests.
- `openspec/specs/managed-capability-lifecycle/spec.md`: lifecycle requirements for safe mutating update.
- `openspec/specs/cli-distribution/spec.md`: command contract for `update --yes`, `update --dry-run`, and missing confirmation.
- `README.md`, `docs/capability-map.md`, and `docs/cli-lifecycle-design.md`: user-facing lifecycle documentation and release-readiness checks.
