---
type: distribution
title: Capability distribution map
---
# Capability distribution map

`capabilities/index.json` is a versionless classification of canonical skill directories. Every current canonical skill is `target-distributed`; Harness Hub's source-only knowledge and governance records are not skills and are absent from the index.

Full migration copies every classified Skill byte-for-byte into its selected Host roots. A component may use the existing optional `host` field only for a real Host-specific boundary such as Codex-only `decision-ui`:

- Claude Code: `.claude/skills/<name>/`
- Codex: `.agents/skills/<name>/`

The public surface has no named packs, optional levels, partial install sets, component versions, or target-side source directories.

## Sources

- [Capability index](../capabilities/index.json)
- [Migration implementation](../scripts/migrate.mjs)
