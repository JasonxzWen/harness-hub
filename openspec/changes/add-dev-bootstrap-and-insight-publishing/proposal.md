## Why

Harness Hub should become the user's personal agent work system, not only a skill folder distributor.

The desired product shape has two atomic capabilities:

1. Personal Dev Harness Bootstrap: one command prepares a target repository for agent-based development by installing the standard skills and initializing a harness structure inspired by Learn Harness Engineering.
2. Insight Publishing Loop: given webpages, blogs, X/Twitter threads, interviews, release notes, or similar materials, the system extracts and integrates viewpoints, maps them to this project, records small iteration decisions, generates a UTF-8 blog with `effective-interact`, and publishes it to this repository's GitHub Pages.

This change captures the product contract before implementation. It keeps the existing lock-backed lifecycle safety model while allowing a higher-level bootstrap workflow and a separate publishing workflow.

This change is Codex-only for the initial implementation target. It should use Codex-native project guidance such as `AGENTS.md` and `AGENTS.override.md`; it should not introduce platform-specific files for other coding agents.

## What Changes

- Add a specification for `personal-dev-harness-bootstrap`.
- Add a specification for `insight-publishing-loop`.
- Define `effective-interact` as the initial blog generation layer for published insight posts.
- Define explicit publish preflight and approval boundaries for GitHub Pages publishing.
- Keep low-level `install` semantics separate from the higher-level dev bootstrap command.
- Define worktree, task, dirty-write, parallel-work, file-size, and handoff expectations as bootstrap-stage harness requirements.
- Define goal-readiness acceptance so a Codex goal can start from a clear feature/task scope, validation contract, and handoff boundary.

## Non-Goals

- Do not implement code in this change.
- Do not add non-Codex platform instruction files or host-specific metadata to initialized targets.
- Do not silently change `harness-hub install` to write root harness files.
- Do not automatically publish, push, post, or mutate remote systems without an explicit publish command and passing preflight.
- Do not copy Learn Harness Engineering templates wholesale without source, license, and local adaptation review.
- Do not turn generated posts into summaries or rewritten source articles. Posts must include viewpoint extraction, integration, project-state mapping, and iteration records.
- Do not make OpenSpec the mandatory path for every future feature. OpenSpec remains the escalation path for high-risk, public-contract, cross-module, or long-lived decisions.

## Sources Considered

- Learn Harness Engineering: `https://walkinglabs.github.io/learn-harness-engineering/zh/`
- Learn Harness Engineering template guide: `https://walkinglabs.github.io/learn-harness-engineering/zh/resources/templates/`
- Existing Harness Hub lifecycle docs and lock-backed install/update/remove behavior.
- Existing `effective-interact` generation and validation surface.

## Impact

Expected future implementation areas:

- CLI command surface and help text.
- Capability metadata for managed harness templates if root harness files become lock-backed.
- Site content directory and GitHub Pages workflow.
- `effective-interact` blog-generation fixtures and validators.
- Docs for source attribution, blog content quality, and publish preflight.

Validation expectation for this planning change:

- `openspec validate add-dev-bootstrap-and-insight-publishing`
- `git diff --check`
