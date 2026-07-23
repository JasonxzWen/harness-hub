---
type: distribution
title: Repository-first migration strategies
---
# Repository-first migration strategies

The repository URL and commit are the only distribution/version identity. The only public command is `node bin/harness-hub.mjs migrate ...`, with explicit Managed and Guided strategies.

Managed installs the generic target contract, all target-distributed skills, Host-local hooks, and first-time project OKF. It excludes Harness Hub source knowledge, source records, docs, tests, OpenSpec, history, and fixtures. Re-running Managed performs a complete refresh and removes stale resources still owned by the previous manifest; normal and force both preserve target-owned skills, commands, project knowledge, evals, and product files.

Guided is a read-only handoff. It reports the source commit and paths to existing capability/adoption documents without scanning or writing the target. The native Agent owns target inspection, a transient project-specific proposal, user alignment, and any later approved ordinary project edits. Harness Hub provides no Guided apply, rollback, manifest, ownership, or update lifecycle.

## Sources

- [Bootstrap](../BOOTSTRAP-TARGET.md)
- [Migration implementation](../scripts/migrate.mjs)
