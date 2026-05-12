## 1. Capability Metadata Contract

- [x] 1.1 Add TypeScript types for `PathDetectRule`, lifecycle risk, and extended `CapabilityComponent` metadata in `src/skillHub.ts`.
- [x] 1.2 Extend `capabilities/index.json` components with V1 `detects` path rules for existing installable skills.
- [x] 1.3 Add `agents`, `risk`, and `recommendation` fields for every installable component in `capabilities/index.json`.
- [x] 1.4 Add a metadata validation test that fails when an installable component is missing `provides`, `detects`, `agents`, `risk`, or `recommendation`.
- [x] 1.5 Add a detection-rule validation test that rejects absolute paths, `..` traversal, globs, and empty path values.
- [x] 1.6 Verify `bun test ./tests` passes after metadata-only changes.

## 2. Analysis Data Model

- [x] 2.1 Add `CapabilityFinding` and `AnalysisResult` interfaces matching `docs/cli-lifecycle-design.md`.
- [x] 2.2 Implement a pure `analyzeTarget()` function that accepts target dir, profile, agents, and capability index without writing files.
- [x] 2.3 Sort findings deterministically by capability, component id, agent, and destination path.
- [x] 2.4 Include repo signals, hub version, target dir, profile, agents, evidence, reason, and default action in the analysis result.
- [x] 2.5 Add fixture tests for an empty target repo.
- [x] 2.6 Add fixture tests for a target repo with an existing detected skill path.
- [x] 2.7 Add fixture tests for a target repo with an existing destination conflict.

## 3. Analyze Command And Reports

- [x] 3.1 Add `skill-hub analyze <target> --json` and print JSON to stdout.
- [x] 3.2 Add `skill-hub analyze <target> --html` and print HTML to stdout.
- [x] 3.3 Add `--output <file>` for analyze reports and create only the explicit parent directory.
- [x] 3.4 Add a test proving `analyze <target>` without `--output` does not create `.skill-hub/`.
- [x] 3.5 Add a test proving repeated `analyze --json` output is stable after normalizing timestamps.
- [x] 3.6 Add invalid option and unknown profile tests for analyze exit behavior.

## 4. Install Command Migration

- [x] 4.1 Add `skill-hub install` as the canonical mutating install command.
- [x] 4.2 Preserve `skill-hub init` as an alias that calls the same install planning and apply path.
- [x] 4.3 Reuse analysis conflict data in install planning while preserving existing skip-by-default behavior.
- [x] 4.4 Keep `install --dry-run` side-effect free.
- [x] 4.5 Add tests proving `install --dry-run` does not copy files or write `.skill-hub/lock.json`.
- [x] 4.6 Require `--yes` for non-dry-run `install` and `init` mutations in first-release non-interactive mode.
- [x] 4.7 Add tests proving `init` and `install` produce equivalent plans for the same target, profile, and agents.

## 5. Lock Schema Version 2

- [x] 5.1 Add `ManagedFileRecord`, `ManagedComponentRecord`, and `SkillHubLockV2` interfaces.
- [x] 5.2 Record schema version 2 locks for new installs.
- [x] 5.3 Record all managed files under each installed destination with repository-relative forward-slash paths.
- [x] 5.4 Compute SHA-256 hashes over raw file bytes and record lowercase hexadecimal values.
- [x] 5.5 Reject or skip any lock path that would resolve outside the target repository.
- [x] 5.6 Add tests for lock file path ordering, hash shape, and relative path serialization.
- [x] 5.7 Add schema version 1 read compatibility for existing locks.

## 6. Status Drift Detection

- [x] 6.1 Extend status rows with `current`, `missing`, `modified`, `update-available`, `skipped`, and `unknown-component` states.
- [x] 6.2 Report `modified` when a schema version 2 managed file hash differs from the lock.
- [x] 6.3 Report `missing` when a managed file or destination no longer exists.
- [x] 6.4 Report `update-available` when the current capability index component version differs from the lock.
- [x] 6.5 Report schema version 1 locks without crashing and mark hash-dependent details as unknown.
- [x] 6.6 Add `status --json`, `status --html`, and `status --output <file>` behavior using the same output rules as analyze.
- [x] 6.7 Add tests for current, missing, modified, update-available, skipped, and unknown-component states.

## 7. Remove Command

- [x] 7.1 Implement `remove --dry-run --json` from lock records only.
- [x] 7.2 Require `--yes` for non-dry-run `remove` mutations in first-release non-interactive mode.
- [x] 7.3 Implement `remove --yes` for unmodified schema version 2 managed files.
- [x] 7.4 Prune only empty directories under managed destinations and never delete the target repo root.
- [x] 7.5 Skip modified managed files by default and exit with code 3 when full requested removal is blocked.
- [x] 7.6 Implement `remove --force --yes` for modified files that are still recorded in the lock.
- [x] 7.7 Leave unmanaged same-name files intact in both default and force modes.
- [x] 7.8 Treat a missing lock as an idempotent no-op with exit code 0 when confirmation is supplied or the command is dry-run.
- [x] 7.9 Block schema version 1 removal because hashless records cannot prove file ownership.
- [x] 7.10 Add tests for safe remove, modified-file blocker, force remove, unmanaged file preservation, missing confirmation, missing lock behavior, and schema version 1 blockers.

## 8. Update Plan-Only Command

- [x] 8.1 Add `update --dry-run --json` that reports replacement plans for update-available components.
- [x] 8.2 Report modified-file blockers in `update --dry-run`.
- [x] 8.3 Reject mutating `update <target>` without `--dry-run` with exit code 2.
- [x] 8.4 Add tests for update dry-run output and mutating update rejection.
- [x] 8.5 Keep mutating update out of scope until a later OpenSpec change.

## 9. CLI Distribution

- [x] 9.1 Update `printHelp()` with lifecycle commands and first-release `update --dry-run` wording.
- [x] 9.2 Verify `bin/skill-hub.mjs` loads built `dist/skillHub.js` under Node without Bun.
- [x] 9.3 Ensure `package.json` `files` includes every installable asset referenced by `capabilities/index.json`.
- [x] 9.4 Ensure ignored vendor checkouts are not included in the packed artifact.
- [x] 9.5 Add a local package smoke test using `npm pack` and a disposable target repo.
- [x] 9.6 Update README examples after the CLI behavior is implemented.

## 10. Final Verification

- [x] 10.1 Run `bun run typecheck`.
- [x] 10.2 Run `bun test ./tests`.
- [x] 10.3 Run `powershell -ExecutionPolicy Bypass -File scripts/validate-skills.ps1 -SkipExternal`.
- [x] 10.4 Run `bun run build`.
- [x] 10.5 Run `npm pack` and inspect the package file list.
- [x] 10.6 Run a disposable target smoke flow: `analyze --json`, `install --dry-run`, `install --yes`, `status --json`, `remove --dry-run`, `remove --yes`.
- [x] 10.7 Run the final combined gate with `bun run validate`.
