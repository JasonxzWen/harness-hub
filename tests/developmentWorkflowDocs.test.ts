import fs from 'node:fs';
import { expect, test } from 'bun:test';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

test('README exposes human-facing visual navigation', () => {
  const readme = read('README.md');

  expect(readme).toContain('## Visual Navigator');
  expect(readme).toContain('## Choose A Path');
  expect(readme).toContain('```mermaid');
  expect(readme).toContain('Agent execution rules live in synchronized [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md)');
  expect(readme).toContain('harness-hub init-harness --target standard');
  expect(readme).toContain('.harness-hub/context/wiki');
  expect(readme).toContain('docs/development-workflow.md');
  expect(readme).toContain('docs/agentic-loop-catalog.md');
});

test('AGENTS owns the agent-facing development checklist', () => {
  const agents = read('AGENTS.md');

  for (const phrase of [
    'README files are human-facing visual navigation',
    'Agent Development Workflow',
    'Route first with `workflow-router`',
    'Treat lightweight brainstorming as part of SDD',
    'P0/P1/P2 test matrix',
    'RED, GREEN, REFACTOR',
    'Do not claim completion from intent or partial progress',
  ]) {
    expect(agents).toContain(phrase);
  }
});

test('development workflow guide documents state files, TDD, and skill extension rules', () => {
  const doc = read('docs/development-workflow.md');

  for (const phrase of [
    'SDD-first with embedded TDD',
    'Discovery and brainstorming',
    'Finish Closeout',
    'Agentic Loops',
    'Producer -> Verifier -> Arbiter -> Main Agent Decision',
    'workflow-router/references/agentic-loops.md',
    'P0/P1/P2',
    'Open Question Discipline',
    'State File Responsibilities',
    'Skill Extension Rules',
    'Current State Model',
    'not yet a full multi-agent orchestrator',
    'maxIterations',
    'New workflow owner',
    'Helper atom',
    'Source-only idea',
  ]) {
    expect(doc).toContain(phrase);
  }
});

test('standard harness state templates capture planning and handoff memory', () => {
  const currentTask = read('harness/minimal/state-templates/current-task.md');
  const progress = read('harness/minimal/state-templates/progress.md');
  const decisions = read('harness/minimal/state-templates/decisions.md');
  const handoff = read('harness/minimal/state-templates/session-handoff.md');

  for (const phrase of [
    'Requirement intake',
    'Discovery and brainstorming',
    'Target spec',
    'Test matrix',
    'Open questions',
    'Alignment status',
  ]) {
    expect(currentTask).toContain(phrase);
  }

  expect(progress).toContain('Plan Checkpoints');
  expect(progress).toContain('Discovery and brainstorming');
  expect(progress).toContain('Finish Closeout');
  expect(progress).toContain('Agentic Loop Records');
  expect(progress).toContain('Main Agent Decision');
  expect(progress).toContain('Insight Recommendations');
  expect(decisions).toContain('Alternatives considered');
  expect(decisions).toContain('State-file impact');
  expect(handoff).toContain('Active Plan Snapshot');
  expect(handoff).toContain('P0/P1/P2 test matrix status');
  expect(handoff).toContain('Finish Closeout');
  expect(handoff).toContain('Agentic Loop Records');
  expect(handoff).toContain('Main Agent Decision');
  expect(handoff).toContain('Insight Recommendations');
});

test('standard harness state templates expose the full SDD and TDD memory contract', () => {
  const files = {
    currentTask: read('harness/minimal/state-templates/current-task.md'),
    progress: read('harness/minimal/state-templates/progress.md'),
    decisions: read('harness/minimal/state-templates/decisions.md'),
    handoff: read('harness/minimal/state-templates/session-handoff.md'),
  };

  const currentTaskSections = [
    '## Goal',
    '## Assumptions',
    '## Requirement intake',
    '## Discovery and brainstorming',
    '## Target spec',
    '## Non-goals',
    '## Worktree / Branch',
    '## Allowed paths',
    '## Forbidden paths',
    '## Acceptance criteria',
    '## Test matrix',
    '## Open questions',
    '## Alignment status',
    '## Standard startup path',
    '## Validation commands',
    '## Validation tiers',
    '## Agentic loops',
    '## Web browser acceptance',
    '## Runtime signals',
    '## PR closeout',
    '## Finish closeout',
    '## Checkpoint policy',
    '## Spec updates',
    '## Decision log',
    '## Parallel writes',
    '## Handoff requirements',
  ];
  const progressSections = [
    '## Current State',
    '## Completed',
    '## In Progress',
    '## Plan Checkpoints',
    '## Recent Validation',
    '## Validation Records',
    '## Runtime Signals',
    '## Web browser acceptance',
    '## PR Status',
    '## Agentic Loop Records',
    '## Finish Closeout',
    '## Insight Recommendations',
    '## Review Feedback To Rules',
    '## Blockers',
    '## Next',
  ];
  const handoffSections = [
    '## Current Status',
    '## Active Plan Snapshot',
    '## Changed Files',
    '## Validation Evidence',
    '## Validation Records',
    '## Runtime Signals',
    '## Web browser acceptance',
    '## PR Status',
    '## Agentic Loop Records',
    '## Finish Closeout',
    '## Insight Recommendations',
    '## Review Feedback To Rules',
    '## Residual Risk',
    '## Blockers',
    '## Next Action',
  ];
  const decisionFields = [
    '- Date:',
    '- Decision:',
    '- Rationale:',
    '- Alternatives considered:',
    '- Status:',
    '- State-file impact:',
    '- Follow-up:',
  ];

  for (const section of currentTaskSections) {
    expect(files.currentTask).toContain(section);
  }
  for (const section of progressSections) {
    expect(files.progress).toContain(section);
  }
  for (const section of handoffSections) {
    expect(files.handoff).toContain(section);
  }
  for (const field of decisionFields) {
    expect(files.decisions).toContain(field);
  }

  expect(files.currentTask).toContain('Implementation may start: no');
  expect(files.currentTask).toContain('P0');
  expect(files.currentTask).toContain('P1');
  expect(files.currentTask).toContain('P2');
  expect(files.currentTask).toContain('Insight audit');
  expect(files.currentTask).toContain('delegated-agent');
  expect(files.currentTask).toContain('Arbiters are read-only');
  expect(files.progress).toContain('| Command | Status | Exit code | Passed | Failed | Evidence | Commit |');
  expect(files.handoff).toContain('| Command | Status | Exit code | Passed | Failed | Evidence | Commit |');
});

test('agentic loop catalog documents host-neutral arbitration and adapters', () => {
  const catalog = read('docs/agentic-loop-catalog.md');
  const reference = read('skills/workflow-router/references/agentic-loops.md');
  const codex = read('docs/host-adapters/codex-agentic-loops.md');
  const claude = read('docs/host-adapters/claude-code-agentic-loops.md');

  for (const phrase of [
    'Producer -> Verifier -> Arbiter -> Main Agent Decision',
    'delegated-agent',
    'frontend-acceptance',
    'docs-consistency',
    'insight-retro',
    'maxIterations',
    'Arbiter',
    'must not edit code',
    'Host Adapter Boundary',
  ]) {
    expect(catalog).toContain(phrase);
  }
  for (const phrase of [
    'Producer -> Verifier -> Arbiter -> Main Agent Decision',
    'delegated-agent',
    'frontend-acceptance',
    'docs-consistency',
    'maxIterations',
    'Arbiters must not edit files',
    'must not auto-dispatch delegated agents',
  ]) {
    expect(reference).toContain(phrase);
  }

  expect(codex).toContain('Codex subagent');
  expect(codex).toContain('parent Codex agent');
  expect(claude).toContain('Claude Code subagent');
  expect(claude).toContain('custom subagent');
  expect(claude).toContain('stream-json');
  expect(claude).toContain('task_started');
  expect(catalog).not.toContain('mcp__');
});

test('standard harness initializes durable LLM wiki context pack', () => {
  const agents = read('harness/minimal/AGENTS.md');
  const contextAgents = read('harness/minimal/context-templates/AGENTS.md');
  const schema = read('harness/minimal/context-templates/llm-wiki-schema.md');
  const index = read('harness/minimal/context-templates/wiki/index.md');
  const updateLog = read('harness/minimal/context-templates/wiki/update-log.md');

  expect(agents).toContain('LLM Wiki');
  expect(agents).toContain('.harness-hub/context/wiki');
  expect(contextAgents).toContain('No Redundant Facts');
  expect(contextAgents).toContain('human confirmation');
  expect(schema).toContain('Stable Knowledge Boundary');
  expect(schema).toContain('Update Protocol');
  expect(schema).toContain('Contradictions');
  expect(index).toContain('LLM Wiki Index');
  expect(updateLog).toContain('Human confirmation');
});
