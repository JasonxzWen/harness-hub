## 1. Contract Tests

- [x] 1.1 Add failing coverage in `tests/skillHub.test.ts` for `skill-hub update <target> --yes` refreshing an unmodified schema version 2 managed component and exiting `0`.
- [x] 1.2 Add assertions that a successful update rewrites `.skill-hub/lock.json` with the current component version, refreshed file hashes, current hub version, preserved `installedAt`, and additive `updatedAt`.
- [x] 1.3 Add coverage proving unmanaged files beside a managed component destination survive update.
- [x] 1.4 Add coverage for `--component <id>` selecting one or more managed components while leaving unselected update-available components unchanged.
- [x] 1.5 Add normal-update blocker tests for modified files, missing files, unsafe lock paths, schema version 1 hashless records, skipped records, and unknown component ids.
- [x] 1.6 Add `update --force --yes` tests proving modified and missing schema version 2 managed files are overwritten/restored while unmanaged sibling files remain intact.
- [x] 1.7 Add schema version 1 migration tests for exact-match conversion to schema version 2 and divergent/missing/unknown blocker cases.
- [x] 1.8 Add CLI tests for `update <target>` without `--dry-run` or `--yes`, `update --dry-run`, `update --yes`, `update --force --yes`, `update --component <id> --yes`, `migrate-lock --dry-run`, `migrate-lock --yes`, and blocker exit behavior.

## 2. Update Planning Model

- [x] 2.1 Extend `src/skillHub.ts` update result types to report updated components/files, blockers, skipped or non-updatable records, unchanged rows, target directory, reason, and exit code.
- [x] 2.2 Add selected component id support to update planning and reject explicit selectors that do not match a managed lock record.
- [x] 2.3 Keep `getUpdatePlan()` read-only while classifying update-available rows and blocker reasons from the current lock and capability index.
- [x] 2.4 Reuse existing safe path and managed-file hash inspection helpers so update planning rejects absolute paths, `..` traversal, modified files, and missing files before mutation.
- [x] 2.5 Distinguish normal blockers from force-overridable schema version 2 modified/missing states.
- [x] 2.6 Preserve deterministic row ordering for JSON and HTML reports.

## 3. Safe Update Apply Path

- [x] 3.1 Implement `updateManaged()` or an equivalent helper that requires `--yes` for mutation and returns code `2` when confirmation is missing.
- [x] 3.2 Make mutating update all-or-nothing for the selected set: if the selected plan has any non-force-overridable blocker, exit `3` and mutate no managed files or lock records.
- [x] 3.3 For safe candidates, delete only lock-recorded managed files, prune only empty directories under managed destinations, copy current component assets, and preserve unmanaged files.
- [x] 3.4 Implement `update --force --yes` so modified and missing schema version 2 lock-recorded managed files can be intentionally overwritten/restored, without overriding unsafe, schema version 1, skipped, or unknown records.
- [x] 3.5 Recompute managed file records after copying and rewrite the schema version 2 lock with refreshed component metadata.
- [x] 3.6 Treat no-update targets as a no-op that exits `0` and leaves the lock unchanged.

## 4. Schema V1 Migration

- [x] 4.1 Add a `migrate-lock` planning path that reads schema version 1 locks and reports which records can be safely converted by exact-match comparison against current Skill Hub component assets.
- [x] 4.2 Implement `migrate-lock <target> --dry-run --json` as side-effect free.
- [x] 4.3 Implement `migrate-lock <target> --yes` to write schema version 2 records only for exact-match legacy records and to block divergent, missing, unsafe, skipped, or unknown records without mutation.
- [x] 4.4 Ensure migrated locks can subsequently drive `status`, `update --yes`, and `remove --yes`.

## 5. CLI And Documentation

- [x] 5.1 Update CLI command handling and help text so `skill-hub update [target] --dry-run` previews and `skill-hub update [target] --yes` applies safe managed updates.
- [x] 5.2 Add CLI parsing and validation for repeated `--component <id>`, `update --force --yes`, and `migrate-lock [target] --dry-run|--yes`.
- [x] 5.3 Update lifecycle report rendering so text, JSON, and HTML outputs show updated rows, forced rows, migrated rows, selected rows, blockers, skipped or non-updatable rows, unchanged rows, and summary counts.
- [x] 5.4 Update `README.md`, `docs/capability-map.md`, and `docs/cli-lifecycle-design.md` to replace first-release "mutating update is deferred" wording with the new safe update, force update, selected update, and schema v1 migration contracts.
- [x] 5.5 Keep V2 detection out of the user-facing contract for this change.

## 6. Acceptance Script And Verification

- [x] 6.1 Add `scripts/smoke-managed-update.ps1` or an equivalent checked-in smoke script that creates disposable target repos and validates install, stale version detection, dry-run update, confirmed update, component-scoped update, force update, schema v1 migration, divergent migration blocker, and remove.
- [x] 6.2 Run `openspec validate enable-managed-capability-update`.
- [x] 6.3 Run `bun run typecheck`.
- [x] 6.4 Run `bun test ./tests`.
- [x] 6.5 Run `bun run validate`.
- [x] 6.6 Run `bun run build`.
- [x] 6.7 Run `node bin\skill-hub.mjs --help`.
- [x] 6.8 Run `powershell -ExecutionPolicy Bypass -File scripts\smoke-managed-update.ps1`.
- [x] 6.9 Run `npm pack --dry-run` or `bun run validate:release` before opening a release-facing PR.
