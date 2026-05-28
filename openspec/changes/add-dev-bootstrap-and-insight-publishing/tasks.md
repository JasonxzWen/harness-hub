## 1. Product Contract

- [x] 1.1 Re-check current branch state, active OpenSpec changes, and relevant lifecycle docs before drafting.
- [x] 1.2 Capture the two atomic capabilities as separate specs.
- [x] 1.3 Record that `effective-interact` is the initial blog generation layer.
- [x] 1.4 Record that publishing and root harness writes are explicit side-effect boundaries.
- [x] 1.5 Record Codex-only scope and avoid other-agent platform instruction files.
- [x] 1.6 Record bootstrap-stage expectations for worktree/task isolation, dirty-write protection, parallel-work policy, file-size policy, and session handoff.
- [x] 1.7 Record that OpenSpec is an escalation path, while normal execution can proceed through brainstorm, pressure testing, acceptance criteria, Codex goal, validation, and handoff.

## 2. Personal Dev Harness Bootstrap Implementation

- [x] 2.1 Choose the command name and CLI shape for one-command dev setup.
- [x] 2.2 Define the managed root harness template files and ownership model.
- [x] 2.3 Include required bootstrap artifacts: root Codex instructions, feature state, task state, progress, session handoff, clean-state checklist, evaluator/definition-of-done guidance, validation entry point, and source/ownership evidence.
- [x] 2.4 Add dry-run planning output for skill installation plus harness initialization.
- [x] 2.5 Add confirmed execution that writes only planned managed files.
- [x] 2.6 Add dirty-worktree, existing-file conflict, allowed-path, forbidden-path, and managed ownership protections.
- [x] 2.7 Add worktree/task isolation guidance and block same-file or same-feature-state parallel writes by default.
- [x] 2.8 Add file-size/context-budget checks for always-loaded instructions, handoff, progress, and task artifacts.
- [x] 2.9 Add harness validation and disposable target smoke tests.
- [x] 2.10 Update user-facing docs and CLI help.

## 3. Insight Publishing Loop Implementation

- [x] 3.1 Choose the content source of truth: Markdown, JSON input plus generated HTML, or both.
- [x] 3.2 Define the post directory, slug format, source metadata file, and index generation.
- [x] 3.3 Add an `effective-interact` fixture for source-to-insight blog generation.
- [x] 3.4 Add UTF-8, source attribution, fact/inference, and link validation.
- [x] 3.5 Add source-ledger, copyright-safe excerpt, and source-size controls so public posts do not become source rewrites or unbounded archives.
- [x] 3.6 Add GitHub Pages build and publish workflow.
- [x] 3.7 Add publish preflight for branch, worktree, generated content, sources, and build output.
- [x] 3.8 Add docs for the source-to-blog workflow and manual/automation approval boundary.

## 4. Integration and Validation

- [x] 4.1 Ensure bootstrap implementation does not broaden low-level `install` semantics unless explicitly accepted.
- [x] 4.2 Ensure insight publishing does not reuse ignored local artifact directories as the public site source.
- [x] 4.3 Ensure normal Codex goal execution can start from a bounded task artifact without requiring OpenSpec.
- [x] 4.4 Ensure high-risk or public-contract changes can still escalate to OpenSpec.
- [x] 4.5 Run focused tests for both capabilities.
- [x] 4.6 Run `scripts/validate-skills.ps1 -SkipExternal`.
- [x] 4.7 Run `bun run validate`.
- [x] 4.8 Run Pages build/publish dry-run validation when the site workflow exists.
- [x] 4.9 Run `git diff --check`.
