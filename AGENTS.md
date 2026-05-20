always respond in 中文

# Skill Hub Instructions

Skill Hub maintains platform-neutral agent skills. Keep every skill in the standard layout under `skills/<skill-name>/SKILL.md` with optional `references/`, `scripts/`, and `assets/` spokes.

## Core Rules

1. Think before coding.
   - State assumptions when the request is ambiguous.
   - Surface tradeoffs instead of silently choosing a risky interpretation.
   - Ask only when a reasonable implementation assumption would be unsafe.

2. Simplicity first.
   - Add the minimum code or documentation needed for the requested behavior.
   - Avoid speculative abstractions, options, and host-specific branches.

3. Surgical changes.
   - Touch only files tied to the request.
   - Preserve unrelated worktree changes.
   - Match the existing style of the file you edit.

4. Goal-driven execution.
   - Define success criteria before broad changes.
   - Verify with the nearest tests and validation gates before handoff.

## Platform-Neutral Skill Policy

- Do not add host-specific tool names, config paths, UI metadata, or runner assumptions to skill bodies.
- Do not add `agents/openai.yaml`, `.codex/`, `.claude/skills/`, `.opencode/skills/`, or similar host-local metadata to the source skill tree.
- Put host packaging outside skills. Claude plugin support belongs in `.claude-plugin/`; the skill content remains standard.
- If an upstream skill assumes a specific harness, normalize it into host-neutral language before installing.
- If a capability cannot be normalized without losing its value, keep it as an evaluated source or explicit-only reference.

## Skill Routing

Use `docs/skill-routing.md` to resolve overlapping skills. Prefer the narrowest matching skill:

- Plan/design pressure testing: use `grill-me`.
- Runtime bugs/performance regressions: use `diagnose`.
- Agent/tool harness failures: use `agent-introspection-debugging`.
- Production feature work or confirmed bug fixes with tests: use `tdd-workflow`.
- Throwaway design exploration: use `prototype`; use `frontend-design` for production UI.
- Deep pre-PR review: use `compound-code-review`; use `security-review` only for focused security checks.
- Final command gates and build/test validation: use `verification-loop`.
- Third-party skill evaluation: use `skill-evaluator`.
- Skill Hub maintenance: use `update-skill-hub`.

## Skill Quality Governance

Use `docs/skill-quality-guide.md` as the quality bar for authoring, importing, reviewing, and maintaining skills.

- Treat `SKILL.md` `description` as routing logic.
- Prefer "Load when..." phrasing, target 50 words or fewer, and describe user intent rather than workflow internals.
- Keep heavy or conditional content out of `SKILL.md`; use `scripts/`, `references/`, and `assets/`.
- Do not change a skill description without updating routing/eval coverage unless the edit is purely mechanical.
- Before adding a default-profile skill, verify it fills a bounded gap and does not duplicate global instructions.

## CLI Lifecycle

Use these verbs for target-repo lifecycle work:

- `skill-hub analyze <target> --json`
- `skill-hub install <target> --profile minimal --target standard --dry-run`
- `skill-hub install <target> --profile minimal --target standard --yes`
- `skill-hub status <target> --json`
- `skill-hub update <target> --dry-run --json`
- `skill-hub remove <target> --dry-run --json`

Before release-oriented CLI changes, run `bun run validate`, `git diff --check`, and the relevant smoke flow.

## Third-Party Skill Evaluation

Use `skill-evaluator` whenever the user asks to evaluate, install, compare, or import a third-party skill repository.

For every third-party skill evaluation:

- Read upstream README, skill bodies, plugin metadata, and license before deciding.
- Compare against `skills/`, root `AGENTS.md`, and `docs/skill-routing.md`.
- Install only when the candidate fills a real gap or provides a materially better bounded workflow.
- Prefer reject or explicit-only status when the candidate repeats existing behavior or would create trigger noise.
- Update `docs/source-projects.md`, `docs/skill-routing.md`, `README.md`, and inventory docs when installation, counts, sources, vendor paths, or runtime state change.
- Run `powershell -ExecutionPolicy Bypass -File scripts\validate-skills.ps1 -SkipExternal` before finishing skill maintenance.
