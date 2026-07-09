# Domain Modeling

Use this reference while running `grill-with-docs`.

## Checks

- Challenge terms against the existing glossary, wiki, docs, and code. If the user says a term differently from the project, surface the conflict and ask which meaning is canonical.
- Sharpen vague or overloaded language into one canonical term. Name the alternatives and why the distinction matters.
- Stress-test relationships with concrete scenarios and edge cases.
- Cross-check claims against implementation, tests, docs, source records, and current task state. Record contradictions instead of silently choosing one source.
- Offer an ADR-style decision record only when the decision is hard to reverse, surprising without context, and the result of a real tradeoff.

## Harness Hub Mapping

- Stable vocabulary and concept relationships belong in `.harness-hub/context/wiki/concepts/` or `.harness-hub/context/wiki/topics/`.
- Source indexes belong in `.harness-hub/context/wiki/sources/`.
- Contradictions belong in `.harness-hub/context/wiki/contradictions.md`.
- Human-confirmed wiki changes must also update `.harness-hub/context/wiki/update-log.md`.
- Active-task decisions, scope, validation, blockers, and restart status belong in `.harness-hub/state/`.

If the target repository has no Harness Hub context pack, do not invent root `CONTEXT.md` or `docs/adr/` files. Capture the proposed durable knowledge in the final summary or task state and recommend initializing the standard harness when appropriate.

## Write Protocol

Before writing wiki knowledge:

1. Name raw sources consulted.
2. Name files to change.
3. State whether the change is stable knowledge, a contradiction, or a source index update.
4. Ask for human confirmation.

After writing:

1. Update the wiki update log.
2. Update the index if a page was added, renamed, or materially reframed.
3. Update contradictions when sources disagree.
4. Run the nearest harness validation entrypoint when available.
