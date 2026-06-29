## Context

The user clarified that the target shape has two atomic capabilities:

- Personal Dev Harness Bootstrap: one-command development environment setup, including skill distribution and harness setup based on Learn Harness Engineering.
- Source-Post Publishing Loop: webpage research, viewpoint extraction, project-aware analysis, `effective-interact` generated UTF-8 blog output, and GitHub Pages publishing.
- Codex-only initial target: generated project guidance should use Codex-native files and avoid other-agent platform metadata.

These capabilities share source attribution, UTF-8 output discipline, validation, and explicit side-effect gates, but they should not collapse into one implicit command.

## Product Model

### Capability A: Personal Dev Harness Bootstrap

This is a high-level orchestration command. It can compose lower-level operations:

1. analyze the target repository,
2. install the standard skill set,
3. initialize a root harness structure,
4. validate the resulting harness,
5. write lock/status evidence.

The existing `install` command should remain a low-level skills-only operation unless a later accepted spec explicitly changes it. The one-command user experience should live in a named bootstrap workflow such as `bootstrap-dev`, `init-harness`, or a similar command selected during implementation.

The harness structure should be adapted from Learn Harness Engineering concepts rather than copied wholesale:

- root instructions such as `AGENTS.md`,
- optional Codex override instructions such as `AGENTS.override.md` when a local override is explicitly needed,
- feature state such as `feature_list.json`,
- progress or session state,
- session handoff,
- clean-state checklist,
- validation scripts,
- lightweight evaluator or definition-of-done guidance.

These files are bootstrap infrastructure, not business functionality. They should exist in the initial harness template with minimal content, because later feature work depends on being able to discover current work, boundaries, validation commands, and handoff state from the repository.

The dev server is not a separate product feature. It is the local runtime entry point, when the target project has one, that lets a human or Codex validate behavior through a browser or API surface. Non-web targets should expose an equivalent run, smoke, or test action.

### Isolation and State Model

The bootstrap harness should separate four concerns:

- Repository: the durable system of record for instructions, state, acceptance criteria, validation commands, and handoff.
- Worktree: the isolation boundary for write tasks.
- Feature: the product or behavior area tracked in `feature_list.json` or an equivalent feature state file.
- Task: the current executable unit with allowed paths, forbidden paths, validation commands, and completion evidence.

Code should not be physically reorganized by feature or task solely for agent isolation. The project architecture remains authoritative; isolation is enforced through worktrees, branches, task scope, and managed-file ownership.

### Dirty-Write and Parallel-Work Policy

Bootstrap validation should make dirty-write protection explicit:

- record or block when the target worktree is already dirty,
- require planned writes before confirmed writes,
- compare actual changed paths with task scope after execution,
- avoid overwriting existing files unless a chosen policy explicitly permits it,
- keep temporary outputs in ignored locations while keeping durable state in tracked files.

Read-heavy work such as research, review, log analysis, and validation may run in parallel. Write-heavy work may run in parallel only when tasks use independent worktrees or branches, non-overlapping path scopes, independent validation, and a single integration/review point. The harness should treat same-file or same-feature-state writes as non-parallel by default.

### File Size and Context Policy

The root instruction file should stay small and route detail to conditional docs. Long progress, source, or run logs should be summarized and archived instead of accumulating in always-loaded files. The bootstrap harness should define where to store:

- current state,
- completed task summaries,
- long logs,
- source metadata,
- generated local artifacts,
- public site content.

This prevents instruction truncation, context pollution, and oversized handoff files.

### Capability B: Source-Post Publishing Loop

This is a research-to-publication workflow. It accepts user-provided source material and produces a post that is more than a summary.

Required post content:

- source claims: what the source material says,
- viewpoint extraction: the transferable ideas,
- integration: how those ideas combine with previous project direction,
- project mapping: what the ideas mean for Harness Hub's current architecture and gaps,
- iteration record: what small project judgment changed or was confirmed,
- action boundary: what to do now, what to observe, and what not to do,
- source attribution and fact/inference separation.

The first blog generation layer should be `effective-interact`, because it already owns Chinese-first complex communication, evidence-backed reports, research explainers, HTML artifacts, and validation-oriented generation.

Publishing to GitHub Pages is part of this atomic capability, not an npm publishing concern.

### OpenSpec and Codex Goal Positioning

The normal execution loop after bootstrap should be:

1. brainstorm the need,
2. use `grill-me` or equivalent pressure testing to sharpen assumptions,
3. write acceptance criteria into a feature or task artifact,
4. start a Codex goal from that bounded task,
5. validate, update state, and leave a session handoff.

OpenSpec remains available, but it should be an escalation path rather than a mandatory step for every task. Use it when the change affects public CLI contracts, cross-module architecture, publishing side effects, irreversible decisions, or long-lived specs that need archive history.

## Shared Infrastructure

Both capabilities should reuse:

- source ledgers or source metadata,
- UTF-8 validation,
- explicit evidence records,
- validation commands,
- lock-backed ownership where files are managed,
- preflight gates before external side effects.

## Boundary Decisions

### Decision 1: Keep low-level install separate from dev bootstrap

`install` remains a predictable skills-only command. The dev bootstrap command composes skills and harness initialization explicitly.

Rationale: users may want only the skill set in some target repositories, while full harness initialization writes root files and carries more ownership risk.

### Decision 2: Treat published blogs as iteration artifacts

Published posts are not marketing content and not source rewrites. They are iteration artifacts that preserve how external materials changed the user's project thinking.

Rationale: this turns external reading into durable project knowledge instead of transient chat output.

### Decision 3: Use `effective-interact` for initial blog generation

The first version should generate posts through `effective-interact` rather than a new bespoke renderer.

Rationale: the project already has a structured, UTF-8, evidence-aware HTML generation surface. A new renderer should be introduced only if GitHub Pages publishing exposes a concrete gap.

### Decision 4: Publishing requires preflight

The publishing path must check branch, worktree cleanliness, source metadata, generated output, UTF-8 encoding, link integrity, build output, and GitHub Pages workflow state before commit/push/deploy.

Rationale: publishing is an external side effect and should remain explicit and reviewable.

## Open Questions

- What command name should own the one-command dev setup: `bootstrap-dev`, `init-dev`, `init-harness`, or a future `harness-hub` binary?
- Should the blog source of truth be Markdown, generated HTML, or JSON input plus generated HTML?
- Should publish preflight require `main`, or allow a feature branch plus PR preview before deploy?
- Should posts be manually approved in local CLI only, or can an automation publish after all preflight gates pass?

## Risks

- Scope drift: keeping two atomic capabilities explicit prevents bootstrap and publishing from becoming hidden side effects of unrelated commands.
- Source quality drift: published posts need source metadata and fact/inference separation so they do not become unattributed rewrites.
- Template ownership drift: root harness files need managed ownership rules before update/remove behavior touches them.
- Generator drift: `effective-interact` should generate posts without becoming a general CMS or production website builder.
- Context drift: root instructions and handoff files can become too large unless the harness enforces small current-state files plus archived details.
- Parallel write drift: multiple agents can produce conflicting edits unless write tasks are isolated by worktree, branch, path scope, and integration gate.

## Validation Strategy

Planning validation:

- `openspec validate add-dev-bootstrap-and-source-post-publishing`
- `git diff --check`

Future implementation validation should include:

- focused CLI tests for dry-run and confirmed bootstrap,
- disposable target smoke tests,
- dirty-worktree and existing-file conflict tests,
- managed-file ownership and path-scope tests,
- harness file-size and required-artifact checks,
- generated post fixture tests,
- `effective-interact` generator/validator checks,
- Pages build and publish dry-run checks,
- repository-level `bun run validate`.
