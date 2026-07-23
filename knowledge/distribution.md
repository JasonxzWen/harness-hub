---
type: distribution
title: Repository-first distribution
---
# Repository-first distribution

The accepted distribution direction uses the Git repository URL and commit as the single source identity. The one public `migrate` command has two explicit strategies.

Managed is the existing deterministic full-migration transaction. It installs target-distributed policy and Host resources while excluding Harness Hub's own project knowledge, and it owns manifest-based update, stale cleanup, validation, and rollback.

Guided is a read-only handoff to the native main Agent. It verifies the canonical adoption documents against the source commit but does not inspect or write the target, distribute content, call a Host CLI, create ownership, or enter rollback. Later selective edits require project inspection and independent proposal, shared-patch, and delivery authorization.

## Sources

- [Repository migration implementation](../scripts/migrate.mjs)
- [Public migration command](../bin/harness-hub.mjs)
- [Target project contract](../harness/target/AGENTS.md)
