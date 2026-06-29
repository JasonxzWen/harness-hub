# Source-Post Publishing

Source-post publishing is a first-class Harness Hub product domain beside the repo harness lifecycle. It turns user-provided source material, such as blogs, X/Twitter posts, interviews, or release notes, into a source-backed project post and a small GitHub Pages site.

## Source Of Truth

Each post uses structured JSON as the source of truth, then generates public HTML:

```text
site/
  index.html
  source-posts/
    index.html
    index.json
    posts/
      <yyyy-mm-dd-slug>/
        post.json
        source-ledger.json
        effective-interact.input.json
        index.html
```

- `post.json` is the canonical editable record.
- `source-ledger.json` records source attribution, excerpt limits, source claims, and viewpoint links.
- `effective-interact.input.json` is the adapter layer used to generate the first public draft.
- `index.html` is generated output and must declare UTF-8.

The slug is `<date>-<title-slug>` unless `--slug` is supplied. The slug is URL-safe ASCII; non-ASCII-only titles fall back to a short hash.

## Commands

```powershell
harness-hub source-post generate . --input input.json --json
harness-hub source-post build . --json
harness-hub source-post validate . --json
harness-hub source-post publish . --dry-run --json
```

`source-post generate` validates the structured input before writing public files. `source-post build` writes the root and source-post indexes under `site/`. `source-post validate` checks the generated site and post metadata. `source-post publish --dry-run` verifies workflow presence, Pages output, source metadata, links, branch state, and worktree cleanliness.

## Validation Rules

Posts must keep source-backed claims separate from viewpoint extraction:

- every source needs `id`, `title`, `url`, `type`, and `accessedAt`;
- source links must use `http` or `https`;
- source excerpts are capped at 220 words;
- `sourceClaims[].kind` must be explicit: `fact`, `inference`, `assumption`, or `project-judgment`;
- viewpoints must trace to source claim IDs;
- generated HTML must be UTF-8;
- public Pages output must not reuse ignored local artifact directories such as `.harness-hub/reports/`, `reports/`, or `skills/effective-interact/artifacts/`.

## Publishing Boundary

Local CLI publishing is preflight-only. The CLI does not push, post, publish, or deploy. Actual GitHub Pages deployment is handled by `.github/workflows/publish-source-posts.yml` after reviewed changes are committed and pushed to `main`, or by a manual `workflow_dispatch` run.

Automation may prepare an initial post from user-provided materials, but public publishing remains gated by review, clean validation, and the Pages workflow.
