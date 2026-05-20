---
name: skill-evaluator
description: "Evaluate third-party agent skills before installing them. Use when the user asks whether a skill pack should be installed, whether it fills gaps in the current Skill Hub, or asks to evaluate a GitHub skill repository. Requires reading upstream content and license, comparing against local skills, deciding install vs reject, and updating repository docs."
license: MIT
metadata:
  source: skill-hub local policy
---

# Skill Evaluator

Evaluate a third-party skill repository against this Skill Hub before installing anything.

The goal is not to maximize skill count. The goal is to add only capabilities that improve coverage without creating trigger noise, stale duplicate instructions, or license ambiguity.

## Required Workflow

1. Fetch or inspect the upstream source.
2. Read the upstream README, skill files, plugin metadata, and license.
3. Record the upstream commit or version.
4. Compare the upstream capabilities against local skills in `skills/`, `skills/`, root `AGENTS.md`, and `docs/skill-routing.md`.
5. Decide one of:
   - **Install**: adds a materially new capability or a substantially better workflow.
   - **Adapt**: useful capability exists, but upstream assumes a different harness and needs host-neutral normalization.
   - **Do not install**: overlaps existing guidance or would increase trigger noise.
6. If installing or adapting, add skill metadata only when required by a target host, update `.gitignore` for vendor/runtime state, and run validation.
7. Always update docs with the decision, even when not installing.

## Evaluation Criteria

Install only when at least one condition is true:

- The skill covers a capability not already covered.
- It provides a more concrete workflow than an existing broad skill.
- It includes scripts/assets/references that materially improve reliability.
- It has a clear trigger boundary that will not compete with existing skills.

Reject or keep as explicit-only when:

- It repeats root `AGENTS.md` behavior.
- It overlaps `coding-standards`, `tdd-workflow`, `verification-loop`, or other broad skills without adding specificity.
- It is deployment, credential, publishing, or paid-resource oriented and the user has not explicitly requested that workflow.
- The license is missing or incompatible.
- It depends on a specific harness and cannot be safely normalized.

## Required Documentation Updates

Update these files during every third-party skill evaluation:

- `docs/source-projects.md`: source URL, local vendor path when downloaded, upstream commit/version, license/status, and decision.
- `docs/skill-routing.md`: priority rule if installed, or evaluated-but-not-installed note if rejected.
- `README.md`: installed source table when installed; evaluated source note when it affects project policy.
- `docs/skill-feature-inventory.md`: counts and capability surface when installed.
- `.gitignore`: vendor checkout and runtime artifacts.

## Validation

Before finishing:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal
```

If external tooling changed, also run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1
```

Confirm that ignored vendor source is not staged:

```powershell
git diff --cached --name-only | Select-String -Pattern '^vendor/'
```

## Output Summary

Report:

- Decision: install, adapt, reject, or explicit-only.
- Capability delta.
- Overlap risks.
- License/status.
- Files changed.
- Validation result.
