# Harness Vocabulary

This document defines the local Harness Hub vocabulary used by routing docs, owner workflow skills, root harness files, validation reports, and `effective-interact` explainers.

Source note: this is local-original wording. `mattpocock/dictionary-of-ai-coding` is a reference-only inspiration for glossary structure and concept boundaries, not copied source text.

## Use Rules

- Use these terms in locally authored or deeply adapted Harness Hub skills.
- Do not rewrite imported skill bodies only to match this vocabulary.
- Fix a term only when the mismatch changes routing, safety, validation, or handoff meaning.
- Keep heavy explanations here or in skill references; root `AGENTS.md` should carry only always-on rules and pointers.

## Model, Agent, And Harness

| Term | Local definition | Use in Harness Hub | Avoid mixing with |
|---|---|---|---|
| `model` | The provider-served language model that generates responses from a context window. | Mention only when behavior depends on provider/model capability or nondeterminism. | `agent`, because the model alone does not own tools, filesystem access, or policy. |
| `agent` | The model running inside a harness with instructions, tools, permissions, and a working environment. | Use for the acting collaborator that reads files, calls tools, runs commands, or produces handoffs. | `model`, because tool use and repo mutation are harnessed behavior. |
| `harness` | The repo-local operating layer around an agent: standing instructions, skills, validation, state files, and lifecycle ownership. | Use for Harness Hub's target-repo bootstrap contract and validation surface. | `skill`, because a skill is one conditional context unit inside the harness. |
| `root harness` | The target-repo files installed by `init-harness`, such as `AGENTS.md`, definition-of-done, state templates, and validation scripts. | Use when discussing explicit root-file initialization or `validate-harness`. | `install`, because default skill installation must not create root harness files. |

## Context And Steering

| Term | Local definition | Use in Harness Hub | Avoid mixing with |
|---|---|---|---|
| `context window` | The bounded working input the active model sees on a request. | Use when explaining context cost, compaction risk, or why heavy docs should stay behind pointers. | `memory system`, because the context window is current working state, not persistence. |
| `context pointer` | A small reference that tells the agent where to load more conditional context when needed. | Use for pointers from `AGENTS.md`, routing docs, or skill bodies into `references/`, `scripts/`, or durable docs. | Full inline guidance, because pointers preserve progressive disclosure. |
| `skill` | A bounded capability package under `skills/<name>/` with `SKILL.md` and optional spokes. | Use for installable, routable, reusable agent context. | `tool`, because a skill is read; a tool is called. |
| `tool` | A callable function or command surface exposed by the host or environment. | Use for shell, browser, GitHub, MCP, file, and other callable capabilities. | `skill`, because tools execute actions and skills steer behavior. |
| `memory system` | A persistence layer that records selected information outside a session and reloads it later. | Use for cross-session continuity, not ordinary file reads or current-context facts. | `context window`, because persistence and current visibility are different layers. |

## Workflow And Handoff

| Term | Local definition | Use in Harness Hub | Avoid mixing with |
|---|---|---|---|
| `workflow owner` | The single top-level workflow selected for a non-trivial request. | Use for `workflow-router` states such as answer, SDD, diagnosis, review, delivery, or hub maintenance. | Helper skills, because helpers do not own the lifecycle. |
| `helper atom` | A narrow skill used under an owner workflow for a specific capability. | Use for provider docs, MCP building, security review, frontend testing, or communication artifacts after the owner is selected. | Workflow owner, because helper atoms should not expand scope on their own. |
| `handoff artifact` | A durable artifact that lets a later user, agent, or session continue from verified facts. | Use for restart notes, implementation handoffs, review artifacts, and `effective-interact` reports. | Final answer, because a final answer may be enough when there is no continuation cost. |
| `compaction` | A lossy session summary that carries selected state into a fresh context. | Use when discussing context pressure and continuity risk. | Handoff artifact, because a handoff artifact is explicit and inspectable. |

## Verification And Review

| Term | Local definition | Use in Harness Hub | Avoid mixing with |
|---|---|---|---|
| `automated check` | A deterministic pass/fail command such as tests, typecheck, lint, validation, or smoke scripts. | Use for gates the agent can run and self-correct from. | `automated review`, because judgement by an LLM or human is not deterministic. |
| `automated review` | A non-deterministic judgement produced by an agent, model, or review workflow. | Use for review findings, risk scans, and LLM-as-reviewer outputs. | `automated check`, because review is evidence, not a deterministic gate. |
| `human review` | A person inspecting the actual diff, code, artifact, or behavior. | Use when acceptance depends on the user's judgement of the produced artifact. | Reading an agent summary, because summary reading is not artifact review. |
| `validation gate` | A named command or inspection that must pass before claiming completion. | Use in plans, delivery reports, and `definition-of-done` boundaries. | General confidence, because gates need concrete evidence. |

## Effective Interact Explainer Shape

When `effective-interact` explains a Harness Hub or AI coding concept, prefer this compact shape:

1. Definition: one local definition in the first screen.
2. Boundary: the closest adjacent concept and how not to confuse them.
3. Use case: one repo-local scenario where the term changes the next action.
4. Evidence: source file, command, or explicit source note when the claim depends on evidence.
5. Acceptance: the check or user decision that proves the explanation is useful.
