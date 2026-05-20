# Harness Templates

This directory contains Skill Hub's installable harness environment templates.
They are adapted from Learn Harness Engineering's five-subsystem model:
instructions, state, verification, scope, and lifecycle.

Install them into a target repository with:

```powershell
npx skill-hub install D:\path\to\target --profile harness --target standard --dry-run
npx skill-hub install D:\path\to\target --profile harness --target standard --yes
```

The installed target layout is intentionally small:

```text
AGENTS.md
harness/
  README.md
  init.sh
  feature_list.json
  progress.md
  session-handoff.md
  clean-state-checklist.md
  evaluator-rubric.md
  quality-document.md
```

`AGENTS.md` stays at the target repository root because agent hosts discover it
there. All other state, verification, and handoff files stay under `harness/`
to avoid root-directory sprawl.
