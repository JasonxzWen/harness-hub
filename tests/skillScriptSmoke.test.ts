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
    expected: 'Usage: route-intent.mjs',
  },
  {
    name: 'workflow deterministic gate',
    command: process.execPath,
    args: ['skills/workflow-router/scripts/harness-agent-gate.mjs', '--help'],
    expected: 'hook-event adapter',
  },
  {
    name: 'workflow host hook adapter',
    command: process.execPath,
    args: ['skills/workflow-router/scripts/harness-agent-hook.mjs', '--help'],
    expected: 'host-compatible JSON',
  },
  {
    name: 'workflow skill activation check',
    command: process.execPath,
    args: ['skills/workflow-router/scripts/skill-activation-check.mjs', '--help'],
    expected: 'Checks helper skill activation',
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
    name: 'quick-learn project logger',
    command: 'python',
    args: ['-B', 'skills/quick-learn/scripts/log_quick_learn_event.py', '--help'],
    expected: 'Log a quick-learn learning event',
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
