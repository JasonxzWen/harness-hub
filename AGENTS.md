1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

LLMs often pick an interpretation silently and run with it. This principle forces explicit reasoning:

State assumptions explicitly — If uncertain, ask rather than guess
Present multiple interpretations — Don't pick silently when ambiguity exists
Push back when warranted — If a simpler approach exists, say so
Stop when confused — Name what's unclear and ask for clarification
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

Combat the tendency toward overengineering:

No features beyond what was asked
No abstractions for single-use code
No "flexibility" or "configurability" that wasn't requested
No error handling for impossible scenarios
If 200 lines could be 50, rewrite it
The test: Would a senior engineer say this is overcomplicated? If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting
Don't refactor things that aren't broken
Match existing style, even if you'd do it differently
If you notice unrelated dead code, mention it — don't delete it
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused
Don't remove pre-existing dead code unless asked
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform imperative tasks into verifiable goals:

Instead of...	Transform to...
"Add validation"	"Write tests for invalid inputs, then make them pass"
"Fix the bug"	"Write a test that reproduces it, then make it pass"
"Refactor X"	"Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
Strong success criteria let the LLM loop independently. Weak criteria ("make it work") require constant clarification.

## Everything Claude Code (ECC) Integration

This project has a local ECC checkout at `vendor/everything-claude-code` and a Codex-ready skill surface at `.agents/skills`.

Use ECC skills when they match the task, especially:

- `everything-claude-code` for repository-wide ECC conventions.
- `coding-standards` for general implementation standards.
- `tdd-workflow` for feature work and bug fixes.
- `security-review` for secrets, auth, injection, and unsafe IO.
- `verification-loop` before declaring work complete.
- `e2e-testing` for browser or user-flow validation.
- `documentation-lookup` and `deep-research` when current upstream behavior matters.

Codex-specific configuration lives in `.codex/config.toml` and `.codex/AGENTS.md`.
Codex agent roles live in `.codex/agents`.

External action boundary: networked tools are read-only by default. Ask before publishing, pushing, merging, posting, spending money, modifying credentials, or changing third-party resources.

## Skill Routing

Use `docs/skill-routing.md` to resolve overlapping skills. Prefer the narrowest matching skill:

- React/Next performance: `vercel-react-best-practices`.
- Component API design: `vercel-composition-patterns`.
- Visual frontend creation: `frontend-design`.
- UI/accessibility audits: `web-design-guidelines`.
- One-off browser debugging: `webapp-testing`.
- Durable Playwright suites: `e2e-testing`.
- Skill creation/update: use Codex's system `skill-creator`, not a project-local copy.
- Ralph autonomous story loops: use `ralph-prd` to prepare PRDs and `ralph-loop` only when the user explicitly wants Ralph-style repeated execution.
