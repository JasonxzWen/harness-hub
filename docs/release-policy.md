# Release Policy

Harness Hub requires every pull request to make an explicit release-impact decision. A pull request does not automatically publish a formal npm `latest` release.

## Policy

- Every PR must classify release impact as `none`, `patch`, `minor`, `major`, or `prerelease`.
- Formal npm publishing remains controlled by a maintainer-created GitHub Release.
- The GitHub Release tag must match `package.json` version.
- `latest` should represent reviewed, merged, release-validated work.
- PR artifacts, `npm pack`, or prerelease dist-tags may be used for testing without moving `latest`.

## Release Impact Categories

| Category | Use when | Release action |
| --- | --- | --- |
| `none` | The change is internal-only, test-only, CI-only, local-state-only, or editorial with no install/runtime effect. | No version bump required. Changelog optional. |
| `patch` | The change fixes a bug, tightens validation, updates docs shipped in the package, or improves behavior without changing public contract. | Add a changelog item if user-visible. Publish after merge when the maintainer wants the fix available. |
| `minor` | The change adds a command, skill, capability, supported workflow, template, or behavior that users can adopt without breaking existing use. | Add a changelog item. Publish after merge when release validation passes. |
| `major` | The change removes support, changes command semantics, alters managed file ownership, or breaks existing target-repo expectations. | Add migration notes and changelog coverage. Do not publish until rollback and compatibility impact are reviewed. |
| `prerelease` | The change needs external testing before `latest`, or the branch is useful but not ready for a stable release. | Use artifacts, `npm pack`, or an explicit prerelease/dist-tag path. Do not move `latest`. |

## PR Requirements

Each PR must include:

- release impact category and rationale;
- user-visible changelog decision;
- validation commands run, or a concrete skip/risk note;
- whether version/tag/GitHub Release work is included now or deferred;
- confirmation that the PR itself does not publish `latest`.

For most feature and fix PRs, update `CHANGELOG.md` under `Unreleased` when the change affects installed package behavior, public docs, templates, skills, or lifecycle commands. Bump `package.json` only in a release PR or in a small PR whose explicit purpose is to prepare and publish one version.

## Normal Release Flow

Use this flow after trusted publishing is configured:

```powershell
npm version patch
git push
git push --tags
```

Then publish a GitHub Release for the pushed tag. The npm workflow publishes only after that Release is published, and it fails if the tag does not match `package.json` version.

Before publishing, run:

```powershell
bun run validate:release
```

`validate:release` includes validation, build, CLI smoke checks, startup check, and `npm pack --dry-run`.

## Prerelease And PR Testing

Prefer these in order:

1. Run `bun run validate:release` locally or in CI without publishing.
2. Use `npm pack --dry-run` or a CI artifact to inspect package contents.
3. Use a prerelease version and explicit non-`latest` dist-tag only when external installation testing is needed.

Do not publish a prerelease from automation unless the maintainer explicitly requested that remote mutation.

## When To Add More Automation

Add a lightweight PR-body check only if authors repeatedly omit the release-impact section. The check should validate that one category is selected and must not publish, tag, merge, or mutate credentials.

Consider Changesets, release-please, or semantic-release only when at least one of these becomes true:

- multiple packages need coordinated versions;
- parallel PRs regularly create version/changelog conflicts;
- maintainers need batched release notes from many PRs;
- manual GitHub Release preparation becomes the primary source of release mistakes.

Until then, the lowest-risk model is PR intake plus explicit maintainer release action.
