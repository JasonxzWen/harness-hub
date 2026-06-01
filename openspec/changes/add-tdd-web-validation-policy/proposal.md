## Why

The minimal harness already asks agents to record validation tiers, but it does not make the test priority model explicit enough for repeatable TDD work. It also mentions end-to-end validation generically, which lets Web changes finish without an agent-run browser acceptance record.

Harness Hub needs a small, enforceable contract that makes P0/P1/P2 validation priorities visible in every initialized target and makes Web user-flow changes prove themselves through local browser acceptance evidence.

## What Changes

- Extend the minimal harness with a P0/P1/P2 validation priority policy.
- Require Web browser acceptance fields in the active task template, progress, handoff, and done criteria.
- Validate the new contract through `harness-validate.mjs` and `validate-harness`.
- Keep durable Playwright suites separate from one-off agent browser acceptance.
- Keep the single `minimal` harness path; do not add a new harness level, install selector, plugin, CI workflow, or external runner.

## Non-Goals

- Do not change the `tdd-workflow` red-green-refactor core.
- Do not require all targets to install Playwright or add durable E2E suites.
- Do not add blocking hooks, remote writes, production-account testing, CI changes, or publish actions.
- Do not make non-Web projects invent browser acceptance evidence.

## Validation

- `bun test ./tests/harnessBootstrap.test.ts`
- `bun test ./tests/harnessHub.test.ts ./tests/skillRoutingCases.test.ts`
- `bun run validate`
- `git diff --check`
