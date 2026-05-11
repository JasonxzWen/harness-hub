# Capability Map

Date: 2026-05-11

This document is the human-readable index for `capabilities/index.json`. The JSON file is the installable source of truth for `skill-hub init`.

## Profiles

| Profile | Purpose | Default use |
|---|---|---|
| `minimal` | Low-noise daily engineering profile with plan pressure testing, runtime diagnosis, throwaway prototyping, structured code review, HTML work reports, quality, TDD, verification, security, current docs, and self-debugging. | Default for new target repos. |
| `web` | Frontend design, UI prototyping, browser validation, HTML artifacts, slides, and UI audits. | Add when a repo regularly ships web UI. |
| `openspec-formal` | Formal OpenSpec change proposal, apply, and archive lifecycle. | Explicit only; use when the user asks for OpenSpec or formal change artifacts. |
| `ralph` | Ralph PRD and loop helpers. | Explicit only; use when the user wants Ralph-style repeated execution. |

## Routing Principles

- Prefer the narrowest matching skill.
- Prefer ECC daily workflow skills for ordinary development.
- Use `grill-me` when the user asks to be challenged, grilled, or pressure-tested before implementation.
- Use `diagnose` for runtime bugs, failing commands, flaky behavior, and performance regressions; use `agent-introspection-debugging` only for agent/tool harness failures.
- Use `prototype` for explicitly throwaway logic or UI experiments that answer one design question; return to `tdd-workflow` for production implementation.
- Use `compound-code-review` for deep pre-PR or Compound Engineering-style code review with structured findings and routing.
- Use `html-work-reports` for non-trivial plans, reviews, research, status reports, and explainers where a self-contained HTML artifact is more useful than Markdown.
- Use `web-artifacts-builder` only when the HTML artifact needs a bundled React/Tailwind/shadcn app.
- Use `frontend-slides` for decks.
- Keep OpenSpec as an explicit formal lifecycle, not the default planning lane.

## OpenSpec vs ECC

| OpenSpec capability | ECC/local overlap | Decision |
|---|---|---|
| Explore mode | `brainstorming`, `product-capability` | Keep, but route only when a formal OpenSpec change may be created. |
| Proposal generation | `product-capability`, `ralph-prd` | Keep for OpenSpec artifacts; ECC remains default for normal implementation planning. |
| Apply change | `tdd-workflow`, `verification-loop` | Keep for existing OpenSpec changes; do not use as the default feature-work lane. |
| Archive change | No strong overlap | Keep as OpenSpec-specific lifecycle command. |

The main observed risk is not that OpenSpec is useless. It is that OpenSpec skills live under `.codex/skills/`, while the cross-agent install convention used by Vercel `skills` and this CLI installs skills into `.agents/skills/` for Codex/OpenCode-compatible hosts. The new capability graph lets `skill-hub init --profile openspec-formal` copy those skills into the target agent skill directory when they are actually wanted.

## Overlap Decisions

| New skill | Overlap | Resolution |
|---|---|---|
| `diagnose` | `tdd-workflow`, `verification-loop`, `agent-introspection-debugging`, `webapp-testing` | `diagnose` owns unknown runtime bugs and performance regressions. `tdd-workflow` owns planned implementation, `verification-loop` owns final gates, `agent-introspection-debugging` owns agent/tool failures, and `webapp-testing` owns browser inspection mechanics. |
| `prototype` | `frontend-design`, `web-artifacts-builder`, `product-capability`, `tdd-workflow` | `prototype` owns disposable learning artifacts only. Production UI uses `frontend-design`, standalone HTML artifacts use `web-artifacts-builder`, durable planning uses `product-capability`, and production code returns to `tdd-workflow`. |
| `grill-me` | `brainstorming`, `product-capability` | `grill-me` owns one-question-at-a-time pressure testing. `brainstorming` explores ideas broadly; `product-capability` writes implementation-ready contracts. |
| `compound-code-review` | `coding-standards`, `security-review`, `verification-loop`, `web-design-guidelines` | `compound-code-review` owns deep structured review and finding routing. `coding-standards` remains the general quality baseline, `security-review` owns focused security checklists, `verification-loop` owns command gates, and `web-design-guidelines` owns UI/UX audits. |

## Installer Contract

`skill-hub init` reads `capabilities/index.json`, resolves a profile, copies selected skill directories to the requested agent skill roots, writes `.skill-hub/lock.json`, and creates an HTML install report under `.skill-hub/reports/`.

Future component kinds can add hooks, rules, MCP config snippets, and harness-specific config files without changing the profile model.
