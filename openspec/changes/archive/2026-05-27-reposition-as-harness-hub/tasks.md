## 1. Phase 0 OpenSpec Alignment

- [x] 1.1 Create `openspec/changes/reposition-as-harness-hub/` proposal, design, specs, and tasks.
- [x] 1.2 Validate the OpenSpec change with `openspec validate reposition-as-harness-hub`.

## 2. Phase 1 Product Positioning

- [x] 2.1 Update `README.md` so Harness Hub is the primary product framing and Skill Hub is documented as the compatibility skill-distribution subsystem.
- [x] 2.2 Update `AGENTS.md`, `docs/capability-map.md`, and `docs/cli-lifecycle-design.md` with the Harness Hub lifecycle and explicit `init-harness` boundary.
- [x] 2.3 Update `docs/source-projects.md` with the evaluated harness-engineering source and current redistribution decision.

## 3. Phase 2 Harness Analysis And Initialization

- [x] 3.1 Add minimal harness template assets under `harness/minimal/` without host-specific runner metadata.
- [x] 3.2 Add `--harness` analysis support in `src/skillHub.ts` with stable JSON and no target side effects.
- [x] 3.3 Add `init-harness` dry-run and confirmed initialization in `src/skillHub.ts`.
- [x] 3.4 Add `validate-harness` in `src/skillHub.ts`.
- [x] 3.5 Add focused tests for harness analysis, dry-run, confirmed initialization, validation, and default install separation.

## 4. Phase 3 Lock Ownership

- [x] 4.1 Register `harness:minimal` in `capabilities/index.json` without making it part of default standard skill install.
- [x] 4.2 Extend status, update, and remove paths so lock-managed harness files stay hash-aware and ownership-safe.
- [x] 4.3 Add tests for harness lock records, modified-file protection, missing-file status, and selected update planning.

## 5. Phase 4 Naming And Package Compatibility

- [x] 5.1 Add `bin/harness-hub.mjs` as a compatible CLI entrypoint.
- [x] 5.2 Update `package.json` and `config/artifact-policy.json` to publish both binaries and describe Harness Hub migration.
- [x] 5.3 Update package manifest tests and release validation expectations for both help commands.

## 6. Phase 5 Advanced Pack Source Lane

- [x] 6.1 Add documentation for advanced harness packs as source-reviewed, explicit-only candidates.
- [x] 6.2 Update capability and install-surface tests so advanced packs remain excluded from default standard install.

## 7. Verification

- [x] 7.1 Run `openspec validate reposition-as-harness-hub`.
- [x] 7.2 Run `bun test ./tests/skillHub.test.ts ./tests/standardInstall.test.ts ./tests/packageManifest.test.ts`.
- [x] 7.3 Run `bun run typecheck`.
- [x] 7.4 Run `powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal`.
- [x] 7.5 Run `bun run validate`.
