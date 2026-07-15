import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SAFETY_HOOK = path.resolve('harness/agent-hooks/safety-hook.mjs');

function runHook(input: unknown): {
  status: number | null;
  stdout: string;
  stderr: string;
  json: any | null;
} {
  const result = spawnSync(process.execPath, [SAFETY_HOOK], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: `${JSON.stringify(input)}\n`,
  });
  const output = result.stdout.trim();
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    json: output ? JSON.parse(output) : null,
  };
}

function collectCommands(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectCommands);
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  return [
    ...(typeof record.command === 'string' ? [record.command] : []),
    ...Object.values(record).flatMap(collectCommands),
  ];
}

test('safety hook deterministically reports remote destructive credential and Host-config mutations', () => {
  const cases = [
    ['git push origin main', 'remote-write'],
    ['git reset --hard HEAD~1', 'destructive-command'],
    ['export SUPER_SECRET_TOKEN=abc123', 'credential-sensitive'],
    ['Set-Content .codex/config.toml "unsafe"', 'host-config-mutation'],
  ] as const;

  for (const [command, finding] of cases) {
    const result = runHook({
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command },
    });

    expect(result.status, command).toBe(0);
    expect(result.stderr, command).toBe('');
    expect(result.json?.systemMessage, command).toContain(finding);
    expect(JSON.stringify(result.json), command).not.toContain('permissionDecision');
    expect(JSON.stringify(result.json), command).not.toContain(command);
  }
});

test('safety hook leaves low-risk reads silent and writes no local state', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-safety-hook-'));
  try {
    const result = spawnSync(process.execPath, [SAFETY_HOOK], {
      cwd: root,
      encoding: 'utf8',
      input: `${JSON.stringify({
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'rg "git push" docs/' },
      })}\n`,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    expect(fs.readdirSync(root)).toEqual([]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('safety hook fails closed on invalid input without exposing an Agent dispatcher', () => {
  const result = spawnSync(process.execPath, [SAFETY_HOOK], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: '[]\n',
  });
  const source = fs.readFileSync(SAFETY_HOOK, 'utf8');

  expect(result.status).toBe(2);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('Hook input must be a JSON object');
  expect(source).toContain('dispatchesAgents: false');
  expect(source).toContain('mutates: false');
  expect(source).not.toMatch(/node:child_process|spawnSync|execFile|workflow-router|loop-runtime|state\/runs|\bleases?\b|integration/);
  expect(source).not.toMatch(/writeFileSync|appendFileSync|mkdirSync|rmSync|renameSync/);
});

test('Host templates expose only PreToolUse through the migrated safety hook', () => {
  const codex = JSON.parse(fs.readFileSync('harness/agent-hooks/codex/hooks.json', 'utf8'));
  const claude = JSON.parse(fs.readFileSync('harness/agent-hooks/claude/settings.json', 'utf8'));

  for (const config of [codex, claude]) {
    expect(Object.keys(config.hooks)).toEqual(['PreToolUse']);
    expect(collectCommands(config)).toEqual(['node .harness-hub/safety-hook.mjs']);
    expect(JSON.stringify(config)).not.toMatch(/workflow-router|loop-runtime|Task|Agent|--enforce/);
  }
});
