---
type: vocabulary
title: Harness vocabulary
---
# Harness vocabulary

- **Atomic Skill**: optional prompt-level domain capability in the standard `skills/<name>/SKILL.md` layout.
- **Native Host main Agent**: Claude Code or Codex process that owns planning, delegation, integration, validation, and user reporting.
- **Deterministic validator**: local program whose failure no Agent verdict may waive.
- **Managed strategy**: the existing deterministic full-migration transaction with Host selection, manifest ownership, stale cleanup, validation, and rollback.
- **Guided strategy**: a read-only capability-map handoff; Harness Hub neither applies nor owns the native Agent's later user-approved project edits.
- **Local Guided change**: project content that remains untracked and is excluded through the repository-private `info/exclude`; tracked paths never qualify.
- **Shared Guided change**: any tracked modification or new content intended for version control, requiring separate approval of its exact patch.
- **Target-owned knowledge**: project OKF files protected byte-for-byte from later migration.
- **Managed generic resource**: file declared in the target manifest and replaceable by Managed migration or force.
- **Target-owned resource**: product, Eval, Skill, knowledge, credential, or other file outside Harness Hub ownership.
- **Primary CLI**: in `both` mode, the single Host CLI used only for first-time OKF initialization.

## Sources

- [Target contract](../harness/target/AGENTS.md)
- [Migration implementation](../scripts/migrate.mjs)
