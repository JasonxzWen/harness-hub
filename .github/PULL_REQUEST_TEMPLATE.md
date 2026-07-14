## Summary

- Describe the change and why it matters.

## Behavior and boundaries

- User-visible behavior:
- Managed paths:
- Protected project-owned paths:
- Remote actions requested or performed: none

## Risk and rollback

- Failure mode:
- Rollback evidence:
- Residual risk:

## Migration boundary

- [ ] The repository remains the only distribution and version source.
- [ ] Only the full `migrate` entry point is public.
- [ ] Project-owned knowledge, evals, product files, and task state remain byte-for-byte protected.
- [ ] Claude Code, Codex, or `both` behavior was validated when affected.

## Validation

Commands run:

```powershell

```

Skipped checks or residual risk:

-

## Reviewer decision

- [ ] Behavior matches the executable Loop and migration contracts.
- [ ] Deterministic failures cannot be overruled by Agent judgment.
- [ ] No unauthorized commit, push, PR, merge, credential, or publishing action is introduced.
