## Context

The current CLI is a released Skill Hub lifecycle: `analyze` is read-only, `install` copies standard `skills/<name>/` components, `.skill-hub/lock.json` records ownership, and `status`/`update`/`remove` trust that lock. Recent harness research changes the product boundary. The useful target is no longer only "install these skills"; it is "make this repository ready for repeatable agent work."

The existing cleanup inventory deliberately removed root harness templates from the default install surface. This change reverses that decision only through an explicit harness lifecycle, not through default skill installation.

## Goals / Non-Goals

**Goals:**

- Reframe user-facing docs around Harness Hub while keeping Skill Hub compatibility.
- Add explicit harness planning and initialization commands with safe dry-run defaults.
- Record managed harness files in the existing lock so status, update, and remove remain hash-aware.
- Add `harness-hub` as a compatible CLI alias without immediately requiring users to change commands.
- Create a source-reviewed lane for advanced harness packs and upstream harness references.

**Non-Goals:**

- Do not rename the local checkout directory as part of this code change.
- Do not make `install` write root harness files.
- Do not replace existing skills or rewrite imported skill bodies for new branding.
- Do not execute external automations, create hooks, or add host-specific runner metadata.

## Decisions

### Decision 1: Keep one lock root and add component kinds

Harness files will be recorded in the existing `.skill-hub/lock.json` under component ids such as `harness:minimal`. That keeps ownership, drift, update, and safe removal on the existing path. A future `.harness-hub/lock.json` rename can be introduced only after compatibility tooling exists.

Alternative considered: create `.harness-hub/lock.json` immediately. That would match the new brand but split ownership semantics during the most sensitive migration.

### Decision 2: Add `init-harness` instead of changing `install`

`install` continues to install only standard skill components. `init-harness` plans and writes root-level harness files. This preserves old user expectations and keeps root-file writes explicit.

Alternative considered: make `skill-hub init` initialize the full harness. That would break the existing `init` alias for `install` and make old scripts surprising.

### Decision 3: Use a minimal source-owned template first

The first harness template is local and small: root instructions, feature list, progress, session handoff, and a validation script. It is source-owned under `harness/minimal/` and copied through a template renderer that fills project name and current date.

Alternative considered: import `harness-creator` wholesale. That is deferred because its repository-level license evidence and host-specific metadata need a source decision before redistribution.

### Decision 4: Treat Harness Hub naming as compatibility, not a breaking rename

The npm package can still publish the current package while exposing both `skill-hub` and `harness-hub` binaries. Documentation should lead with Harness Hub and show the old command as compatible. Physical repository and package rename can happen in a later release after the command surface is stable.

Alternative considered: rename `@jasonwen/skill-hub` to `@jasonwen/harness-hub` immediately. That creates package, repository, docs, and marketplace churn before the harness lifecycle has proven stable.

### Decision 5: Advanced packs are source-reviewed metadata first

Advanced harness packs start as evaluated source records and installable package metadata only after license, host metadata, side effects, and overlap boundaries are documented. P0 may add a reference pack descriptor, but not hidden runner files or broad upstream imports.

Alternative considered: copy the full advanced pack into the default package. That conflicts with the repository's distribution policy and would make host-specific assumptions part of the standard tree.

## Risks / Trade-offs

- Existing tests assert no harness surface exists -> update tests to preserve the important invariant: default standard install still omits harness files.
- Root `AGENTS.md` conflicts are common -> default harness init must skip existing files and require `--force` for overwrite.
- Naming migration can confuse users -> help and README must show both command names and state compatibility clearly.
- Harness templates can become platform-specific -> keep commands and scripts portable Node/Markdown/JSON, and document shell examples as optional.
- Source evaluation can drift into broad platform import -> keep evaluated sources in docs until they pass license and side-effect checks.

## Migration Plan

1. Add OpenSpec proposal, design, specs, and tasks for all five phases.
2. Reposition docs and package metadata around Harness Hub while preserving existing `skill-hub` command examples as compatibility.
3. Implement `--harness`, `init-harness`, and `validate-harness` with dry-run/no-side-effect tests.
4. Extend lock-aware status/update/remove behavior through a `harness:minimal` component.
5. Add `harness-hub` binary alias and release validation.
6. Add advanced pack source records and package boundary rules without default install side effects.

Rollback: remove the new harness component and commands, keep existing `skill-hub` lifecycle behavior, and leave already-created harness files protected by their lock entries until users run `remove`.

## Open Questions

- Whether a later major release should physically rename `.skill-hub/` to `.harness-hub/`.
- Whether the npm package should move to `@jasonwen/harness-hub` or publish a second package that depends on the existing one.
- Which advanced pack contents from `walkinglabs/learn-harness-engineering` are safe to redistribute after license review.
