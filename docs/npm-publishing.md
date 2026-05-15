# npm Publishing

This repo is prepared to publish the `skill-hub` CLI to the public npm registry as the scoped package `@jasonwen/skill-hub`.

## What Is Automated

The GitHub Actions workflow at `.github/workflows/publish-npm.yml` runs when a GitHub Release is published.

It will:

1. Check out the repository.
2. Set up Node.js 24 for npm trusted publishing.
3. Set up Bun 1.3.13 for the local build and test toolchain.
4. Install dependencies with `bun install --frozen-lockfile`.
5. Verify that the GitHub Release tag matches `package.json` version, for example `v0.1.0`.
6. Run `bun run validate:release`.
7. Run `npm publish --access public`.

The workflow uses npm trusted publishing, so it should not need an `NPM_TOKEN` secret once npm is configured for this package.

## Artifact Policy

Git tracking, Git ignore rules, and npm package contents are coordinated through `config/artifact-policy.json`.

- `publishAndGit`: source assets that must be committed and shipped, such as `.agents/skills/html-work-reports/`, capability profiles, docs, harness templates, stable OpenSpec specs, and archived OpenSpec changes.
- `publishOnlyGenerated`: generated files that ship to npm but stay ignored in Git. Today this is `dist/`, rebuilt by `prepack`.
- `gitOnly`: maintainer work files that are committed to GitHub but not shipped to npm, such as `.github/`, `src/`, `tests/`, `reports/`, and active `openspec/changes/<name>/` directories.
- `ignoredLocal`: local runtime or vendor state that should be neither committed nor published.

Run this check before publishing:

```powershell
bun run validate:artifact-policy
```

The check fails if `package.json.files` drifts from the policy, `.gitignore` misses required runtime/vendor ignores, or an active OpenSpec change is included in the npm package.

## What You Must Do

The npm package name is scoped because npm blocks the unscoped `skill-hub` name as too similar to the existing `skillhub` package:

```text
@jasonwen/skill-hub
```

Before the first automated publish:

1. Make the GitHub repository public: `https://github.com/JasonxzWen/skill-hub`.
2. Create or sign in to an npm account.
3. Publish the first version manually if npm will not let you configure trusted publishing before the package exists.
4. On npmjs.com, open the package settings for `@jasonwen/skill-hub`.
5. Configure Trusted Publisher:
   - Provider: GitHub Actions
   - Organization or user: `JasonxzWen`
   - Repository: `skill-hub`
   - Workflow file: `publish-npm.yml`
6. For later releases, bump `package.json` version and publish a GitHub Release whose tag matches that version, such as `v0.1.1`.

## First Manual Publish

Run this only after the final release candidate is ready and validated:

```powershell
npm adduser
npm whoami
bun run validate:artifact-policy
bun run validate:release
npm publish --dry-run --access public
npm publish --access public
```

`npm whoami` only checks that the local machine is logged in. It does not publish anything.

## Later GitHub Actions Publish

After trusted publishing is configured, use this flow:

```powershell
npm version patch
git push
git push --tags
```

Then create a GitHub Release for the pushed tag. The workflow publishes only when the release is published, and it fails if the tag does not match `package.json` version.

Users install or run the package with the scoped package name, while the installed command remains `skill-hub`:

```powershell
npx @jasonwen/skill-hub@latest --help
npm install -g @jasonwen/skill-hub@latest
skill-hub --help
```

## Important Boundaries

- Do not publish from a dirty worktree.
- Do not reuse a published version number; npm rejects duplicate `name@version` publishes.
- Do not add `NPM_TOKEN` unless trusted publishing is not available.
- Do not publish from a private repository if you expect npm provenance to be generated.
