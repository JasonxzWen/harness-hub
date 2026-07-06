# Agentic Loop Catalog

Harness Hub treats agentic loops as workflow-stage mechanics, not as a new top-level workflow owner. The installable canonical reference is [workflow-router/references/agentic-loops](../skills/workflow-router/references/agentic-loops.md). This source-repo catalog expands the same contract with examples and host adapter links.

A loop separates context, evidence, arbitration, and final responsibility:

```text
Producer -> Verifier -> Arbiter -> Main Agent Decision
```

- **Producer** prepares the work under the active workflow owner. It can be the main agent, a delegated agent with an owned write scope, or a deterministic generator.
- **Verifier** gathers evidence without changing the product decision. It can be a delegated-agent acceptance runner, browser check, test command, CI result, or read-only source review.
- **Arbiter** evaluates the original task, acceptance criteria, current diff, verifier evidence, and risk. It is read-only and must not edit code, resolve conflicts, push, merge, or make final user-facing decisions.
- **Main Agent Decision** integrates the verdict, auto-arbitrates subagent interruption questions inside the autonomy envelope, applies or delegates scoped fixes, interrupts for human decisions when needed, and owns the final user-facing handoff.

`delegated-agent` is the host-neutral term. In Codex it may map to a subagent role such as `explorer` or `worker`; in Claude Code it may map to a custom subagent. It can also be replaced by a deterministic command when no model judgement is needed. Generic skills and harness templates must use `delegated-agent`, `verifier`, and `arbiter`; host-specific invocation details belong in adapter docs.

Subagent runtime state is local and ignored. A loop run may record `run.json`, per-agent `state.json` / `events.jsonl` / `result.json`, path leases, trace summaries, and `integration.json` under `.harness-hub/state/runs/<runId>/`. Subagents do not write root `progress.md` or `session-handoff.md` directly; the main agent summarizes accepted evidence there after integration.

## Loop Contract

Every loop record should capture:

- stage and loop type;
- producer, verifier, arbiter, and main-agent decision owner;
- input contract: original task, target spec, acceptance criteria, current diff or artifact, commands, and risk boundaries;
- autonomy envelope: allowed paths, forbidden paths, path leases for writes, local reversible side-effect boundary, validation commands, and user-interrupt conditions;
- evidence: command output, screenshots, traces, source links, review findings, or explicit skip reason;
- orchestration evidence when delegated agents run: host, agent id, read-only flag, owned paths, lease status, trace source, trace path, and integration record;
- verdict: pass, fail, warn, blocked, or skipped;
- iteration controls: optional `iteration` and `maxIterations` positive integers when the loop may repeat; if either field is recorded, both fields and a stop condition are required;
- stop condition: `continue`, `revise`, `interrupt`, `deliver`, `handoff`, or `complete`; required for bounded or repeating loops.

The arbiter must use evidence, not majority vote. If reviewers disagree, the arbiter reports the conflict, severity, and confidence; the main agent makes the integration decision.

## Standard Loops

| Loop | Stage | Producer | Verifier | Arbiter | Main-agent decision |
| --- | --- | --- | --- | --- | --- |
| `plan-review` | Before implementation | Main agent plan | Delegated-agent plan reviewer or checklist | Read-only plan arbiter | Proceed, revise plan, or ask a blocking question. |
| `test-design` | Before implementation | Test matrix draft | Test-strategy reviewer | Acceptance arbiter | Add missing P0/P1/P2 coverage or accept deterministic substitute. |
| `implementation-review` | After a slice | Implementer | Parallel code-review lenses | Review arbiter | Fix, defer with risk, or continue. |
| `frontend-acceptance` | Acceptance | Current app/version | Fresh-context browser verifier | UX/acceptance arbiter | Fix UI, record skip, or deliver. |
| `diagnosis-regression` | Diagnosis | Fix candidate | Reproducer and regression check | Root-cause arbiter | Continue diagnosis or accept fix. |
| `docs-consistency` | Finish closeout | Current docs/code/spec diff | Documentation reader and code reader, or deterministic drift check | Docs/code drift arbiter | Fix docs or code, record accepted drift, or deliver. |
| `pr-closeout` | Delivery | Branch/PR | PR status checker | Release-risk arbiter | Fix in scope, ask user, or hand off. |
| `insight-retro` | Finish closeout | Session trace | `insight` report | Workflow-learning arbiter | Add rule, eval case, skill follow-up, or no-op. |

## Safety Boundaries

- Hooks may remind or validate loop evidence, but must not dispatch agents.
- Subagent interruption questions go first to the main agent. The main agent may continue without user interruption only when the autonomy envelope covers the action, path leases cover writes, side effects are local and reversible, validation is known, and evidence can be recorded.
- Delegated agents may write only with explicit disjoint ownership; default loop verification and arbitration are read-only.
- Write-capable delegated agents may share the current worktree, but they need a path lease and must keep changed paths inside their owned paths.
- Arbiters do not edit files, close review threads, resolve conflicts, push, publish, merge, or mutate third-party resources.
- Human interrupt is required for product tradeoffs, data ownership, safety, credentials, permissions, protected-branch overrides, external service failures, and remote mutations.
- Loop evidence is advisory until the active workflow owner and deterministic validation agree that the stage can proceed.
- Bounded loops must stop or interrupt when `iteration` reaches `maxIterations`; they should not silently continue with another review pass.

## Host Adapter Boundary

Use [Codex agentic loops](host-adapters/codex-agentic-loops.md) and [Claude Code agentic loops](host-adapters/claude-code-agentic-loops.md) for host-specific execution details. The canonical loop policy stays in this catalog and the target harness templates.
