---
type: distribution
title: Repository-first distribution
---
# Repository-first distribution

The accepted distribution direction uses the Git repository URL and commit as the single source identity. A full migration installs target-distributed policy and Host resources while excluding Harness Hub's own project knowledge.

## Sources

- [Repository migration implementation](../scripts/migrate.mjs)
- [Public migration command](../bin/harness-hub.mjs)
- [Target project contract](../harness/target/AGENTS.md)
