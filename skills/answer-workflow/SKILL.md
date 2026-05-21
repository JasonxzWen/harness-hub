---
name: answer-workflow
description: Load when the user asks a read-only question, explanation, evidence lookup, feasibility check, or comparison; answer from repo/source evidence and do not edit files unless the user redirects into a change workflow.
---

# Answer Workflow

Use this owner for read-only answers.

## Contract

1. Clarify the exact question only when needed.
2. Gather required material from the repo, docs, cited sources, or current official docs when the fact may have changed.
3. Answer directly with evidence and concrete dates/paths when relevant.
4. Do not edit files, run mutating commands, or start implementation unless the user redirects into `sdd-workflow`.
5. Default-consider `effective-interact` when a visual comparison, source map, or evidence dashboard lowers review cost.

## Output

- Put the direct conclusion first.
- Separate fact, inference, and assumption when uncertainty matters.
- Mention residual gaps and how to verify them.
- For material repo explanations, include file anchors or an `effective-interact` report.
