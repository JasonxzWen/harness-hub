---
type: distribution
title: Repository-first full migration
---
# Repository-first full migration

The repository URL and commit are the only distribution/version identity. The only public command is `node bin/harness-hub.mjs migrate ...` with Claude Code, Codex, or both mode.

Migration installs the generic target contract, all target-distributed skills, Host-local hooks, and first-time project OKF. It excludes Harness Hub source knowledge, source records, docs, tests, OpenSpec, history, and fixtures. Re-running the same command performs a complete refresh and removes stale resources still owned by the previous manifest; normal and force migration both preserve target-owned skills, commands, project knowledge, evals, and product files.

## Sources

- [Bootstrap](../BOOTSTRAP-TARGET.md)
- [Migration implementation](../scripts/migrate.mjs)
