## Summary

- Describe the change and why it matters.

## Release impact

Select exactly one category and explain the choice.

- [ ] `none` - no install/runtime/package-visible release impact
- [ ] `patch` - bug fix, shipped-doc update, validation tightening, or non-breaking behavior improvement
- [ ] `minor` - new non-breaking command, skill, capability, template, or supported workflow
- [ ] `major` - breaking behavior, removed support, migration requirement, or managed-file ownership change
- [ ] `prerelease` - needs install testing before `latest`

Rationale:

-

## Release readiness

- [ ] `CHANGELOG.md` updated under `Unreleased`, or not required because:
- [ ] `package.json` version bump is included only because this PR is a release PR, or deferred until release preparation.
- [ ] This PR does not publish npm `latest`.
- [ ] If `prerelease` is selected, the intended artifact/dist-tag path is documented.

## Validation

Commands run:

```powershell

```

Skipped checks or residual risk:

-

## Reviewer release decision

- [ ] Release impact category is correct.
- [ ] Required changelog/version work is present or intentionally deferred.
- [ ] No PR-time publish, tag, merge, or credential mutation is introduced.
