---
name: source-to-insight-blog
description: "Load when turning an external article, blog, release note, interview, or report into a source-backed insight blog with Chinese fidelity, media references, an effective-interact summary layer, and project-iteration review; do not load for ordinary summaries, full copyrighted reposts, or production site design."
license: MIT
metadata:
  source: "local-original"
---

# Source To Insight Blog

Use this skill when source material must become a publishable insight blog, not just a chat summary.

## Workflow

1. Capture the source before writing: title, author, date, canonical URL, access date, article structure, tables, footnotes, glossary, links, images, charts, video, downloads, and known access limits.
2. Set the fidelity boundary. Preserve claims, structure, numbers, terms, links, and media references. Do not publish a full copyrighted repost or full translation unless the user owns the rights or provides licensed source text.
3. Write the reader-facing blog with the source-fidelity layer first: original metadata, media ledger, section-by-section Chinese reconstruction, tables, footnotes, and glossary coverage.
4. Use `effective-interact` only as a secondary summary or visualization layer. Do not use a raw generated interaction report as the blog body.
5. Add a project-iteration review: what the source confirms, what should change in this repo, what should stay out of scope, and what needs a later SDD/spec.
6. Validate the generated post with `scripts/validate-source-blog.mjs`, the normal insight validation, a rendered screenshot, and repo gates proportionate to changed files.

## Output Contract

- The blog must have a readable article layout, not raw evidence/code blocks.
- Original media must remain visible or linked with alt text, caption, and source URL.
- Source claims, project judgments, assumptions, and copyright limits must be labeled.
- The effective-interact artifact must be linked or embedded as a summary layer after the fidelity layer.
- The post must include an iteration decision even when the decision is "no repo change."

## Progressive Loading

- Read `references/workflow.md` for the detailed step sequence and acceptance checklist.
- Read `references/copyright-and-fidelity.md` before publishing translated or paraphrased third-party material.
- Use `assets/source-blog-checklist.md` as the authoring checklist.
- Run `scripts/validate-source-blog.mjs <post-dir>` before handoff.

## Gotchas

- A source-backed blog is not the same thing as an effective-interact report. Effective-interact lowers summary and decision cost; it does not replace the translated or reconstructed source layer.
- Browser screenshots are part of acceptance for public HTML. A passing JSON validator does not prove the page is readable.
- If the primary site blocks automated fetches, use an indexed or browser-readable copy only after recording the access limitation and checking the canonical URL.
- Keep UTF-8 end to end. Mojibake in a public post is a failed delivery, even if tests pass.
