# Source-To-Insight Blog Workflow

## 1. Source Capture

Collect the canonical source before drafting:

- canonical URL, title, author, publish date, access date;
- section headings and order;
- tables, footnotes, glossary entries, captions, and callouts;
- media URLs, alt text, media type, dimensions if available, and licensing/caption notes;
- source links and named references;
- access limitations such as paywall, challenge page, missing assets, or indexed-only access.

Save enough metadata in the public source ledger for a reader to verify provenance without archiving the whole source article.

## 2. Fidelity Boundary

For third-party copyrighted material, do not publish a full article repost or full line-by-line translation unless rights are clear. Use a high-fidelity Chinese reconstruction instead:

- preserve every material claim, number, named entity, table row, term, footnote, and media reference;
- use new wording and structure when possible;
- link readers to the original for exact phrasing;
- explicitly label source facts, project judgments, assumptions, and open questions.

## 3. Blog Shape

The public post should be reader-first:

1. direct conclusion and source boundary;
2. source metadata and media ledger;
3. detailed Chinese reconstruction in the source order;
4. original tables or lists reconstructed in Chinese with attribution;
5. glossary and footnotes;
6. effective-interact summary/visualization layer;
7. project-iteration review;
8. verification and source ledger links.

Do not put generated raw Markdown/code fallback blocks in the main reading path.

## 4. Effective-Interact Layer

Use effective-interact for summary, comparison, map, decision matrix, or handoff. It must be secondary to the source-fidelity layer.

Recommended sections:

- summary cards for core thesis, integration fit, and risk;
- a data table for source-to-project mapping;
- a Mermaid or chart section for the evaluation/reporting flow;
- claims/evidence only when it lowers reader cost;
- next actions and validation evidence.

Validate the artifact and link it from the blog.

## 5. Project Iteration Review

Answer these explicitly:

- Which ideas should change the repo now?
- Which ideas should become later SDD/spec work?
- Which ideas are rejected or out of scope?
- Which materials should be kept only as source references?
- Which validation would prove the iteration is complete?

## 6. Acceptance Checklist

- Source metadata, links, media, footnotes, glossary, and access limitations are present.
- Chinese reconstruction follows the original structure and preserves material information.
- Copyright boundary is explicit.
- Effective-interact summary exists and is not the main blog body.
- Project-iteration decision is present.
- Public page screenshot shows readable article layout.
- `validate-source-blog.mjs`, insight validation, diff check, and relevant repo gates pass.
