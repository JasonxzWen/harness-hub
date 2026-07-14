---
type: governance
title: Skill quality
---
# Skill quality

1. Add a skill only for a bounded capability gap; prefer an existing skill/Loop/Workflow/OKF change.
2. Treat frontmatter `description` as routing logic and test positive and negative boundaries.
3. Preserve imported upstream bodies by default; local source and routing policy belongs in project governance.
4. Keep heavy conditional material in `references/`, executable helpers in `scripts/`, and reusable files in `assets/`.
5. Keep canonical source under `skills/<name>/SKILL.md`; Host mirrors are generated local state.
6. Every canonical skill must be explicitly classified and distribution-safe; no source-repository knowledge or project cases may appear in target-distributed bytes.
7. Run skill validation, focused behavior tests, and independent review before handoff.

## Sources

- [Capability index](../capabilities/index.json)
- [Skill validation script](../scripts/validate-skills.ps1)
