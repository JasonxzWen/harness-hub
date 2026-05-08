# Skill Routing And De-Duplication

Date: 2026-05-08

This project intentionally avoids installing every famous skill pack wholesale. Prefer the narrowest skill that matches the user request.

## Current Skill Roots

| Root | Purpose |
|---|---|
| `.codex/skills/` | Anthropic/Claude built-in skills adapted for Codex plus OpenSpec helpers. |
| `.agents/skills/` | Cross-agent skills from Everything Claude Code, Vercel, and other agent-skill ecosystems. |
| `.codex/agents/` | Codex multi-agent role configs from ECC. |

## Priority Rules

| Task | Preferred skill | Secondary skill |
|---|---|---|
| Explore or refine a feature idea | `brainstorming` | `openspec-explore` when the work should become an OpenSpec change |
| Create a Ralph-ready PRD | `ralph-prd` | `product-capability` when implementation interfaces need deeper analysis |
| Convert or run Ralph stories | `ralph-loop` | `verification-loop` before marking a story complete |
| Create an OpenSpec change | `openspec-propose` | `brainstorming` first when intent is unclear |
| Implement an OpenSpec change | `openspec-apply-change` | `verification-loop` before completion |
| React/Next performance | `vercel-react-best-practices` | `frontend-patterns` |
| React component API design | `vercel-composition-patterns` | `frontend-patterns` |
| React view/page transitions | `vercel-react-view-transitions` | `frontend-patterns` |
| Visual frontend creation | `frontend-design` | `frontend-patterns` for implementation details |
| UI/accessibility/UX audit | `web-design-guidelines` | `security-review` only for security-sensitive findings |
| One-off local UI debugging | `webapp-testing` | Browser plugin/Playwright as available |
| Durable E2E test suite | `e2e-testing` | `verification-loop` |
| General code quality | `coding-standards` | language/framework-specific skill when present |
| Security review | `security-review` | `verification-loop` |
| Find more skills | `find-skills` | system `skill-installer` for actual installs |

## Removed Duplicate

The project-local `.codex/skills/skill-creator` copy was removed. Codex already provides a current system `skill-creator` skill, and keeping a second project-local copy risks stale instructions and duplicate triggering.

## Superpowers Decision

Superpowers is not installed right now.

Rationale:

- ECC plus the adapted built-in skills already cover brainstorming, TDD, code review, verification, frontend work, docs, and file formats.
- Installing Superpowers wholesale would add substantial overlap and increase trigger noise.
- The remaining useful Superpowers-style gaps are narrow workflows: git worktree/branch finishing, systematic debugging, and plan execution discipline. Those should be added as small local skills only if they become recurring needs.

Keep Superpowers listed as an optional upstream source in `docs/source-projects.md`, but do not install it by default.

## Explicit-Only Candidates

Do not auto-install these until a user actually needs them:

- Vercel deployment skills: external deployment and token handling.
- React Native skills: mobile-specific context that is not part of the current repository focus.
- Full Superpowers pack: useful but overlapping with ECC and existing workflow skills.
