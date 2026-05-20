# Skill Routing

Skill Hub skills are platform-neutral. Route by user intent and workflow boundary, not by agent host.

## Source Roots

| Path | Meaning |
|---|---|
| `skills/` | Standard skill source tree. Each skill has `SKILL.md` and optional `references/`, `scripts/`, and `assets/`. |
| `.claude-plugin/` | Claude plugin and marketplace manifests only. Do not put skill bodies here. |

## Stable Routing Rules

| User intent | Preferred skill | Notes |
|---|---|---|
| Plan/design pressure testing before implementation | `grill-me` | Ask one hard question at a time and surface assumptions. |
| Diagnose runtime bug, failing command, flaky behavior, or performance regression | `diagnose` | `diagnose` owns unknown runtime bugs and performance regressions; use `tdd-workflow` after the behavior is understood. |
| Implement production feature, confirmed bug fix, or refactor through tests | `tdd-workflow` | One public behavior at a time through red-green-refactor. |
| Build throwaway prototype to answer one design question | `prototype` | `prototype` owns disposable learning artifacts only; delete or fold findings into production. |
| Deep pre-PR or structured code review | `compound-code-review` | Use `security-review` only for focused security concerns. |
| Final build, typecheck, lint, and tests before completion | `verification-loop` | Verification gate, not a diagnosis workflow. |
| Security-sensitive code, auth, secrets, injection, unsafe IO, or payments | `security-review` | Focused checklist and threat review. |
| Current library/framework/API behavior | `documentation-lookup` | Use current primary docs before implementing. |
| Agent/tool harness loop, repeated tool failure, drift, or recoverable self-debugging | `agent-introspection-debugging` | Use after ordinary product debugging is ruled out. |
| option comparison, material repo or skill change reports, architecture walkthroughs, review artifacts, research explainers, or lightweight export editor | `effective-interact` | A default-considered skill for non-trivial sessions when HTML makes the work easier to inspect. `frontend-slides` remains the deck lane. |

## Overlap Rules

- Use `frontend-design` for production UI; use `web-artifacts-builder` for complex standalone React/Tailwind artifacts; use `effective-interact` for communication/report artifacts.
- Use `webapp-testing` for one-off local browser inspection; use `e2e-testing` for durable Playwright suites.
- Use OpenSpec skills only when the user explicitly wants the formal OpenSpec lifecycle.
- Use Ralph skills only for explicit Ralph-style PRD/story loops.
- Use `feynman-learning-coach` only when the user explicitly wants to learn, study, master, review, or be coached through a topic.

## Boundary Sentences

- `diagnose` loads for runtime bugs, failing commands, flaky behavior, and performance regressions.
- `agent-introspection-debugging` loads only for agent runs, tool loops, context drift, or harness failures.
- `prototype` loads for explicitly throwaway experiments that answer one design question.
- `tdd-workflow` loads for production features, confirmed bug fixes, and refactors with tests; unknown root-cause diagnosis and throwaway exploration route elsewhere.
- `frontend-design` loads for production-grade visual UI creation, not routine reports or debugging.
- `effective-interact` loads broadly for non-trivial sessions when a self-contained HTML artifact can make planning, implementation progress, review, research, architecture, validation, status, or handoff clearer than chat; default-consider it every session and require an HTML report after material repo or skill changes; permission pauses, trivial chat, production UI, bundled apps, and decks route elsewhere.
- `handoff` loads for restart notes or compact agent/session handoff documents; visual HTML reports and context-limit advice route elsewhere.
- `compound-code-review` loads for deep structured review; focused security and final command gates route elsewhere.
- `security-review` loads for focused security-sensitive code, auth, secrets, injection, unsafe IO, or payments.
- `verification-loop` loads for completion gates after work is done, not for root-cause diagnosis or review analysis.
- `feynman-learning-coach` loads only for explicit learning, tutoring, study, mastery, exam/interview prep, syllabus building, or coached topic sessions.

## Third-Party Candidates

Record every meaningful install, refresh, rejection, or explicit-only decision in `docs/source-projects.md`. Install only when the candidate fills a bounded behavior gap and can stay platform-neutral.
