---
name: review-workflow
description: Load when workflow-router selects the review state for code, plan, release, UI, or security review; produce findings first and do not implement fixes unless the user explicitly redirects.
---

# Review Workflow

Use this owner for review-only work.

## Contract

1. Confirm the review scope and artifact under review.
2. Gather required material: diffs, specs, tests, release notes, UI screenshots, or security-sensitive paths.
3. Check whether the work preserves deep modules, clear seams, and honest feedback loops when code design is in scope.
4. Report Findings first, ordered by severity and grounded in file/line or source evidence.
5. Do not implement fixes unless the user explicitly redirects into `sdd-workflow`.
6. Default-consider `effective-interact` for material reviews, severity filters, option comparison, or evidence tours.

## Helpers

- `compound-code-review` for deep pre-PR or CE-style code review.
- `security-review` for focused security-sensitive review.
- `claude-api` for Anthropic API or SDK reviews.
- `mcp-builder` for MCP server or tool-contract reviews.
- `doc-coauthoring` for document structure and reader-risk review.
- `internal-comms` for internal update, FAQ, incident, or leadership communication review.
- `theme-factory` for theme consistency review of existing artifacts.
- `web-design-guidelines` for UI/UX audits only when that helper is relevant and available.
- `verification-loop` only for final command gates, not finding analysis.

For material or multi-scope review, follow `workflow-router/references/orchestration-policy.md`: split independent read-only lenses into subagents when the platform supports it; otherwise record the fallback reason and run the lenses locally. The main agent owns severity, synthesis, and final conclusions.

Use agentic loops from `workflow-router/references/agentic-loops.md` for material reviews: delegated-agent lenses act as verifiers, a read-only arbiter deduplicates and ranks evidence, and the main agent owns the final findings-first report.

## Output

Findings first. Then open questions, residual risk, and a short summary if useful.

Do not implement fixes inside this workflow.
