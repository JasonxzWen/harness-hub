---
type: distribution
title: Capability distribution map
---
# Capability distribution map

`capabilities/index.json` is a versionless classification of canonical skill directories. Every current canonical skill is `target-distributed`; Harness Hub's source-only knowledge and governance records are not skills and are absent from the index.

Full migration copies every classified skill byte-for-byte into the selected Host roots:

- Claude Code: `.claude/skills/<name>/`
- Codex: `.agents/skills/<name>/`

The public surface has no named packs, optional levels, partial install sets, component versions, or target-side source directories.

## Sources

- [Capability index](../capabilities/index.json)
- [Migration implementation](../scripts/migrate.mjs)
