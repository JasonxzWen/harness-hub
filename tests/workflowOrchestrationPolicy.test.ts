import fs from 'node:fs';
import { expect, test } from 'bun:test';

function read(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

test('orchestration policy limits workflows to ordering, branching, and compact handoffs', () => {
  const policy = read('skills/workflow-router/references/orchestration-policy.md');

  for (const requirement of [
    'choose and order small loops',
    "pass the previous Loop's compact handoff",
    'branch on `completed`, `paused`, or `failed` status',
    'return the final compact handoff to the main Agent',
    'must not duplicate Producer prompts, Verifier criteria, retry logic, deterministic checks, path boundaries, or state persistence',
    'Never fabricate user acceptance',
    'Delegated CLI Agents never perform remote actions or merge',
    'only the main Agent may perform an explicitly authorized remote action',
  ]) {
    expect(policy).toContain(requirement);
  }
});

test('the executable Loop reference defines one complete runtime contract', () => {
  const contract = read('skills/workflow-router/references/agentic-loops.md');
  const handoff = read('skills/workflow-router/references/state-handoff.md');

  for (const requirement of [
    'id, objective, input schema, and structured output',
    'optional skills',
    'Producer, independent Verifier, and optional read-only Arbiter',
    'maximum iterations and stop conditions',
    'user-question pause/resume state',
    'local and remote side-effect boundaries',
    'compact handoff to the main Agent',
    'Missing evidence never passes',
  ]) {
    expect(contract).toContain(requirement);
  }

  for (const field of ['status', 'summary', 'output', 'findings', 'openQuestions', 'nextAction']) {
    expect(handoff).toContain(field);
  }
  expect(handoff).toContain('`source: user` answers are the sole basis');
});

test('there is no parallel passive Loop or Workflow implementation', () => {
  const scriptsDir = 'skills/workflow-router/scripts';
  const removed = [
    'agentic-loop-check.mjs',
    'advisory-check.mjs',
    'helper-contract-check.mjs',
    'owner-contract-check.mjs',
    'workflow-check.mjs',
  ];
  for (const name of removed) {
    expect(fs.existsSync(`${scriptsDir}/${name}`)).toBe(false);
  }

  for (const name of fs.readdirSync(scriptsDir).filter((entry) => entry.endsWith('.mjs'))) {
    if (name === 'loop-runtime.mjs') continue;
    const source = read(`${scriptsDir}/${name}`);
    expect(source, `${name} contains a second workflow registry`).not.toContain('EXECUTABLE_WORKFLOWS');
    expect(source, `${name} contains a second Loop runner`).not.toContain('function runExecutableLoop');
  }
});
