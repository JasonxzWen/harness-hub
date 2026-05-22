# Skill Evaluation Policy

Date: 2026-05-08

Every third-party skill request must be evaluated before installation. The repository should remain a curated capability set, not a dump of every useful prompt pack.

Use [Skill quality guide](skill-quality-guide.md) as the quality bar for deciding whether a candidate belongs in the index, should stay explicit-only, or should be rejected.

## Decision Types

| Decision | Meaning |
|---|---|
| Install | Add the skill because it fills a real capability gap and has clean trigger boundaries. |
| Adapt | Add a platform-neutral version because upstream assumes a specific harness. |
| Reject | Do not install because it duplicates existing guidance, lacks license clarity, or adds trigger noise. |
| Explicit-only | Keep as a documented candidate, but require a direct user request before installing or running it. |

## Required Checks

For every candidate:

1. Read upstream README, skill bodies, plugin metadata, and license.
2. Record source URL, local vendor path, upstream commit or version, and license/status.
3. Compare against `skills/`, `skills/`, `AGENTS.md`, and `docs/skill-routing.md`.
4. Decide whether it adds a distinct capability or only repeats existing behavior.
5. Check the candidate against the skill quality guide:
   - Does the `description` behave like a routing trigger?
   - Are adjacent negative and forbidden-load cases clear?
   - Is heavy or conditional content split into spokes?
   - Are gotchas concrete rather than generic advice?
6. Record positive, negative, and forbidden routing examples for installed candidates, or explain why the candidate remains explicit-only/rejected.
7. Update documentation immediately.
8. Run `scripts/validate-skills.ps1 -SkipExternal`.

## Required Files To Keep Current

- `docs/source-projects.md`
- `docs/skill-routing.md`
- `README.md`
- `docs/skill-feature-inventory.md`, when counts or capability surface change
- `.gitignore`, when vendor or runtime files are added

## Default Bias

Prefer rejection or explicit-only status for broad behavioral guideline packs. Prefer installation for concrete, bounded workflows with scripts, assets, or references that improve execution quality.

Description edits after installation are routing edits. Require eval evidence before accepting them unless the change is purely mechanical and leaves trigger meaning unchanged.
