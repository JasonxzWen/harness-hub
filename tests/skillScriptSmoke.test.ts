import { spawnSync } from 'node:child_process';
import { expect, test } from 'bun:test';

type ScriptSmoke = {
  name: string;
  command: string;
  args: string[];
  expected: string;
};

const smokes: ScriptSmoke[] = [
  {
    name: 'workflow route intent',
    command: process.execPath,
    args: ['skills/workflow-router/scripts/route-intent.mjs', '--help'],
    expected: 'Classifies a user request',
  },
  {
    name: 'workflow check',
    command: process.execPath,
    args: ['skills/workflow-router/scripts/workflow-check.mjs', '--help'],
    expected: 'composes intent routing',
  },
  {
    name: 'workflow advisory check',
    command: process.execPath,
    args: ['skills/workflow-router/scripts/advisory-check.mjs', '--help'],
    expected: 'advisory and side-effect free',
  },
  {
    name: 'workflow agentic loop check',
    command: process.execPath,
    args: ['skills/workflow-router/scripts/agentic-loop-check.mjs', '--help'],
    expected: 'Validates recorded agentic loop evidence',
  },
  {
    name: 'workflow skill activation check',
    command: process.execPath,
    args: ['skills/workflow-router/scripts/skill-activation-check.mjs', '--help'],
    expected: 'Checks helper skill activation',
  },
  {
    name: 'workflow owner contract check',
    command: process.execPath,
    args: ['skills/workflow-router/scripts/owner-contract-check.mjs', '--help'],
    expected: 'Checks installed workflow owner',
  },
  {
    name: 'workflow helper contract check',
    command: process.execPath,
    args: ['skills/workflow-router/scripts/helper-contract-check.mjs', '--help'],
    expected: 'Checks high-risk helper skills',
  },
  {
    name: 'effective-interact create',
    command: process.execPath,
    args: ['skills/effective-interact/scripts/create-interaction.mjs', '--help'],
    expected: 'Usage:',
  },
  {
    name: 'effective-interact validate',
    command: process.execPath,
    args: ['skills/effective-interact/scripts/validate-interaction.mjs', '--help'],
    expected: 'Usage:',
  },
  {
    name: 'webapp testing server helper',
    command: 'python',
    args: ['-B', 'skills/webapp-testing/scripts/with_server.py', '--help'],
    expected: 'Run command with one or more servers',
  },
  {
    name: 'feynman learning logger',
    command: 'python',
    args: ['-B', 'skills/feynman-learning-coach/scripts/log_learning_event.py', '--help'],
    expected: 'Log a Feynman learning event',
  },
  {
    name: 'mcp builder connection support module',
    command: 'python',
    args: ['-B', 'skills/mcp-builder/scripts/connections.py', '--help'],
    expected: 'support module for evaluation.py',
  },
  {
    name: 'mcp builder evaluation harness',
    command: 'python',
    args: ['-B', 'skills/mcp-builder/scripts/evaluation.py', '--help'],
    expected: 'Evaluate MCP servers using test questions',
  },
  {
    name: 'source-post validate',
    command: process.execPath,
    args: ['skills/source-post/scripts/validate-source-post.mjs', '--help'],
    expected: 'Validates a source-backed public post',
  },
];

test('skill script entrypoints expose help without optional runtime dependencies', () => {
  for (const smoke of smokes) {
    const result = spawnSync(smoke.command, smoke.args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: false,
    });

    expect(result.status, `${smoke.name}: ${result.stderr}`).toBe(0);
    expect(result.stdout, smoke.name).toContain(smoke.expected);
  }
});
