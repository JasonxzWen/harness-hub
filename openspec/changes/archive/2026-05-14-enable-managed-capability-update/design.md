## Context

The archived CLI lifecycle work made Skill Hub usable by target repositories through `analyze`, `install`, `status`, `update --dry-run`, and `remove`. The lock already records schema version 2 ownership data, including component id, component version, destination, managed files, and hashes. `status` can report `update-available`, and `update --dry-run` can show version differences and modified-file blockers.

The missing capability is the confirmed mutation: target repositories need a way to pull newer Skill Hub-managed files after this repository updates. That operation is riskier than install because it replaces files in an existing target repo, so it must preserve the lock boundary and avoid implicit merging or implicit overwriting of user edits.

## Goals / Non-Goals

**Goals:**

- Support `skill-hub update <target> --yes` for schema version 2 managed components.
- Keep `update --dry-run` as the required preview path for automation and review.
- Support `--component <id>` so operators can preview or update a bounded subset of managed components.
- Support `update --force --yes` only for schema version 2 records where modified or missing lock-recorded managed files should be overwritten/restored intentionally.
- Support an explicit schema version 1 migration command for records that can be verified against current Skill Hub component assets.
- Replace only files that Skill Hub owns; normal update requires current hashes to match the lock, while force update requires explicit `--force --yes`.
- Preserve unmanaged files that live beside managed files in the same destination directory.
- Refresh lock metadata after successful updates so later `status`, `remove`, and `update` remain deterministic.
- Keep JSON and HTML reports script-friendly and human-readable.
- Add a reusable smoke script or acceptance flow that Codex can run against disposable target repositories.

**Non-Goals:**

- No update merging for user-modified files.
- No implicit update of schema version 1 locks.
- No force behavior for unsafe paths, schema version 1 records, unknown components, or skipped records.
- No partial update when a selected candidate has a non-force-overridable blocker.
- No remote package publishing or third-party service mutation.
- No V2 detection work such as globs, content matching, or frontmatter parsing.

## Decisions

### 1. Compute updates from the lock, not from detection rules

Update eligibility is based on `.skill-hub/lock.json`, the current capability index, and current file hashes. The target repo might contain similar skills outside managed destinations, but those are not update candidates.

Rationale: the lock is the ownership boundary. Detection rules are useful for recommendation and conflict reporting, but they cannot prove file ownership.

Alternative considered: re-run `analyze` and update detected compatible skills. Rejected because it would blur managed and user-owned assets.

### 2. Mutating update is all-or-nothing for the selected set

`update --yes` should first compute the same plan as `update --dry-run`. If the user passes one or more `--component <id>` selectors, the plan is scoped to that selected set. If any selected update candidate has a non-force-overridable blocker, the command exits `3` and mutates no files. The user can resolve blockers or narrow the selected set and rerun the command.

Rationale: this matches the conservative remove behavior and avoids a target repo where some Skill Hub components were refreshed while other version-drifted components were left stale because of blockers.

Alternative considered: update safe components while reporting blocked ones. Rejected for the first mutating update because partial success complicates reports, rollback, and user expectations.

### 3. Replace managed files, not whole destinations

For each safe update candidate, the implementation should delete only files listed in the existing lock record, prune empty directories under the managed destination, copy the current component source into the destination, and collect the new managed file list.

Rationale: install destinations can contain unmanaged local files. Removing or replacing the whole directory would violate the same-name preservation rule already used by `remove`.

Alternative considered: `rm -rf <dest>` followed by copy. Rejected because it can delete unmanaged files that the lock never recorded.

### 4. Keep lock schema version 2 and add only additive audit metadata

Successful update rewrites `.skill-hub/lock.json` as schema version 2. Updated component records should refresh `version`, `source`, `kind`, `files`, `status`, and an additive `updatedAt` timestamp while preserving the original `installedAt` when present. The top-level `hubVersion` and `generatedAt` should also reflect the current command.

Rationale: schema version 2 already has the ownership data update needs. An additive timestamp improves auditability without forcing a lock schema bump.

Alternative considered: introduce schema version 3. Rejected because the required behavior does not need a breaking lock shape.

### 5. Force update is explicit and narrow

`update --force --yes` should overwrite modified lock-recorded managed files and restore missing lock-recorded managed files for schema version 2 components. It must still preserve unmanaged files in the destination and must not override unsafe paths, schema version 1 records, skipped records, or unknown components.

Rationale: users sometimes intentionally patch installed skills locally and later decide to discard those edits in favor of the hub version. This should be possible, but only with an explicit flag and only when the lock proves which files Skill Hub owns.

Alternative considered: require manual remove/reinstall for every modified file. Rejected because it makes a common "discard my local managed edits" workflow unnecessarily indirect once ownership is proven.

### 6. Schema version 1 migration is a separate command

Add a dedicated migration command, tentatively `skill-hub migrate-lock <target> --dry-run|--yes`, instead of silently migrating during `update`. The command can convert a schema version 1 component only when the current target destination exactly matches the current Skill Hub component assets. Successful migration writes schema version 2 records with file hashes; failed migration reports blockers and leaves the lock unchanged.

Rationale: schema version 1 lacks file hashes, so migration can only be safe when current files can be verified against the assets shipped by this package. Keeping it separate from update makes the ownership decision explicit.

Alternative considered: automatically migrate v1 locks inside `update --yes`. Rejected because it hides a trust-boundary change inside an operation whose primary purpose is replacement.

### 7. Block unsafe or unverifiable states

The update apply path must block and mutate nothing when a selected candidate is schema version 1, unknown in the current index, status `skipped`, or contains unsafe paths. Missing and modified schema version 2 files block normal update but are force-overridable with `update --force --yes`.

Rationale: all these states weaken ownership proof or indicate user intervention. The safe response is a clear blocker report.

Alternative considered: restore missing files during update. Rejected because missing managed files are a drift signal; users can reinstall or remove/reinstall once they choose the intended state.

## Risks / Trade-offs

- Blockers prevent all updates in the selected set. -> Use `--component` to narrow the command when the operator wants to update an independent safe component first.
- Force can overwrite real user edits. -> Require `--force --yes`, report forced rows distinctly, and limit force to lock-recorded schema version 2 files.
- Schema version 1 migration succeeds only when files match current packaged assets. -> Report blocked rows and document reinstall/manual resolution for legacy divergent files.
- Updating by component source can remove managed files that no longer exist upstream. -> Only previously lock-recorded files are removed, and unmanaged files remain untouched.
- The lock gains `updatedAt` without a schema bump. -> Treat it as optional metadata; readers must ignore unknown fields.
- Reports may become more complex. -> Keep the model explicit: updated, blocked, unchanged, and skipped rows.

## Migration Plan

1. Add tests for update planning and apply behavior before implementation changes.
2. Introduce an `UpdateResult` model that includes updated files/components, selected component ids, forced rows, migrated rows, blockers, skipped/non-updatable rows, unchanged rows, and exit code.
3. Implement `applyUpdate` or equivalent helper that performs selected-set preflight, safe file replacement, optional force behavior, lock rewrite, and report generation.
4. Implement the explicit schema version 1 migration helper and CLI command.
5. Update CLI parsing and help so `update --dry-run` previews, `update --yes` applies, `update --force --yes` intentionally overwrites/restores schema version 2 managed files, `--component` scopes the selected set, and `migrate-lock` performs explicit migration.
6. Add `scripts/smoke-managed-update.ps1` or an equivalent local acceptance script that creates disposable target repos and validates the update lifecycle end to end.
7. Update README and lifecycle docs after behavior is covered by tests.
8. Run `bun run validate`, `bun run build`, and `bun run validate:release` if release-facing files changed.

Rollback is a normal git revert before release. For target repositories, the command itself should avoid partial mutation when blockers exist; after a successful update, rollback is the target repo's normal VCS revert.

## Acceptance Plan

Implementation is not complete until Codex can run a local disposable-target acceptance flow covering:

1. build the CLI;
2. install the minimal profile into a temporary target;
3. simulate a stale component version in `.skill-hub/lock.json`;
4. prove `status --json` and `update --dry-run --json` report the update;
5. apply `update --yes` and verify file hashes plus lock metadata refresh;
6. repeat with `--component <id>` and prove unselected stale components remain unchanged;
7. modify a managed file, prove normal update blocks, then prove `update --force --yes` overwrites only lock-recorded files;
8. create a schema version 1 exact-match lock, run `migrate-lock --yes`, and verify schema version 2 hashes;
9. create a divergent schema version 1 lock and prove migration blocks without mutation;
10. run `remove --yes` afterward to confirm updated/migrated locks still drive safe removal.

## Resolved Decisions

- `--component <id>` is in scope for this change.
- Schema version 1 migration is in scope as an explicit `migrate-lock` command, not as implicit update behavior.
- `update --force --yes` is in scope for schema version 2 modified/missing managed files only.
