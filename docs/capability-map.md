---
type: distribution
title: Capability distribution map
---
# Capability distribution map

`capabilities/index.json` is a versionless classification of canonical skill directories. Every current canonical skill is `target-distributed`; Harness Hub's source-only knowledge and governance records are not skills and are absent from the index.

Managed migration copies every classified Skill byte-for-byte into its selected Host roots. A component may use the existing optional `host` field only for a real Host-specific boundary such as Codex-only `decision-ui`:

- Claude Code: `.claude/skills/<name>/`
- Codex: `.agents/skills/<name>/`

The public surface has no named packs, optional levels, partial install sets, component versions, or target-side source directories.

Guided reports this same index together with the existing routing and bootstrap documents as a read-only capability map. It copies nothing and creates no target-side selection registry, pack, manifest, or ownership record. After inspecting the target, the native Agent derives a transient project-specific proposal and obtains the required user approvals; Guided is not a partial installer.

## Sources

- [Capability index](../capabilities/index.json)
- [Guided adoption contract](../BOOTSTRAP-TARGET.md)
- [Migration implementation](../scripts/migrate.mjs)
