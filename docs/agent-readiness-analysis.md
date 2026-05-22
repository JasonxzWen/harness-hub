# Agent Readiness Analysis

Date: 2026-05-12

This document summarizes the implemented `agent-readiness-analysis` extension for Skill Hub. The archived OpenSpec change lives in `openspec/changes/archive/2026-05-12-add-agent-readiness-analysis/`, and the active specification lives in `openspec/specs/agent-readiness-analysis/spec.md`.

## Goal

Skill Hub should help target repositories answer a second question after capability analysis:

> Is this repo ready for higher-autonomy agent work?

The first lifecycle release answers what Skill Hub can recommend, install, track, and remove. Agent readiness stays read-only and evaluates whether a target repo has the operational scaffolding agents need: bounded context, explicit outcomes, verification gates, routing boundaries, automation candidates, and reviewable learning capture.

## CLI Shape

```powershell
npx skill-hub analyze D:\path\to\target --agent-readiness --json
npx skill-hub analyze D:\path\to\target --agent-readiness --html --output D:\tmp\agent-readiness.html
```

This option remains side-effect free: no `.skill-hub/` creation, no file writes unless `--output` is explicit, no git changes, no memory writes, and no external automation setup.

## Report Categories

| Category | Purpose |
|---|---|
| `context_budget` | Detect always-loaded instructions, duplicated agent roots, and other context-hygiene risks. |
| `outcomes` | Detect explicit success criteria such as OpenSpec tasks, PR templates, release checklists, or Definition of Done docs. |
| `verification` | Detect test, lint, typecheck, build, validation, CI, and release gates. |
| `agent_routing` | Detect whether work is decomposed through skills, roles, OpenSpec changes, or routing docs. |
| `automation_candidates` | Suggest reviewable routine candidates such as CI triage, code-review prep, docs freshness, or nightly validation. |
| `learning_capture` | Suggest places to capture reviewable lessons, such as docs, skill gotchas, changelogs, retrospectives, or memory-note proposals. |

The report should expose evidence and recommendations per category rather than a single readiness score. A score would hide uncertainty and imply precision the analyzer does not have.

## Safety Boundary

V1 is deliberately conservative:

- deterministic file and script detection only;
- no LLM judge;
- no semantic content matching;
- no auto-generated schedules or webhooks;
- no memory mutation;
- no commits, pushes, PR creation, or third-party writes.

Future changes can install outcome templates or routine configs only after the read-only report proves useful.

## Source Rationale

- Code with Claude 2026 opening keynote: https://www.youtube.com/watch?v=GMIWm5y90xA
- Claude Managed Agents announcement: https://claude.com/blog/new-in-claude-managed-agents
- Anthropic Managed Agents architecture note: https://www.anthropic.com/engineering/managed-agents
- Reiner Pope / Dwarkesh Patel transcript gist: https://gist.github.com/dwarkeshsp/79100f0fdeed69d76241903bb0604dbe
- Reiner Pope video: https://www.youtube.com/watch?v=xmkSf5IS-zw
