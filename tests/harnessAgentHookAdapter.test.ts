import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const adapterScript = path.resolve('scripts/harness-agent-hook-adapter.mjs');

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'harness-agent-hook-'));
}

function runHook(root: string, args: string[], input: unknown): { status: number | null; stdout: string; stderr: string; json: any | null } {
  const result = spawnSync(process.execPath, [adapterScript, root, ...args], {
    encoding: 'utf8',
    input: `${JSON.stringify(input)}\n`,
  });
  const trimmed = result.stdout.trim();
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    json: trimmed ? JSON.parse(trimmed) : null,
  };
}

function collectHookCommands(value: unknown): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectHookCommands);
  }
  const record = value as Record<string, unknown>;
  const ownCommand = typeof record.command === 'string' ? [record.command] : [];
  return [
    ...ownCommand,
    ...Object.values(record).flatMap(collectHookCommands),
  ];
}

function snapshotHostLocalState(root: string): string[] {
  return ['.codex', '.claude', '.harness-hub/state']
    .filter((relativePath) => fs.existsSync(path.join(root, ...relativePath.split('/'))));
}

test('codex hook adapter emits advisory host json without denying by default', () => {
  const root = makeTempRoot();
  const before = snapshotHostLocalState(root);
  const result = runHook(root, ['--host', 'codex', '--event', 'PreToolUse'], {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: {
      command: 'git push origin main',
    },
  });

  expect(result.status).toBe(0);
  expect(result.json?.systemMessage).toContain('remote-write');
  expect(result.json?.hookSpecificOutput.hookEventName).toBe('PreToolUse');
  expect(result.json?.hookSpecificOutput.additionalContext).toContain('remote-write');
  expect(result.json?.hookSpecificOutput.permissionDecision).toBeUndefined();
  expect(snapshotHostLocalState(root)).toEqual(before);
});

test('claude hook adapter denies deterministic pre-tool blockers only when enforced', () => {
  const root = makeTempRoot();
  const result = runHook(root, ['--host', 'claude', '--event', 'PreToolUse', '--enforce'], {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: {
      command: 'git push origin main',
    },
  });

  expect(result.status).toBe(0);
  expect(result.json?.hookSpecificOutput).toMatchObject({
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
  });
  expect(result.json?.hookSpecificOutput.permissionDecisionReason).toContain('remote-write');
});

test('codex hook adapter also emits enforced pre-tool deny shape', () => {
  const root = makeTempRoot();
  const result = runHook(root, ['--host', 'codex', '--event', 'PreToolUse', '--enforce'], {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: {
      command: 'git push origin main',
    },
  });

  expect(result.status).toBe(0);
  expect(result.json?.hookSpecificOutput).toMatchObject({
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
  });
  expect(result.json?.hookSpecificOutput.permissionDecisionReason).toContain('remote-write');
});

test('enforced non-pre-tool blockers stay advisory and never deny', () => {
  const root = makeTempRoot();
  spawnSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'demo.ts'), 'export const demo = true;\n');

  const result = runHook(root, ['--host', 'claude', '--event', 'Stop', '--enforce'], {
    hook_event_name: 'Stop',
  });

  expect(result.status).toBe(0);
  expect(result.json?.hookSpecificOutput.hookEventName).toBe('Stop');
  expect(result.json?.hookSpecificOutput.additionalContext).toContain('missing-closeout-evidence-check');
  expect(result.json?.hookSpecificOutput.permissionDecision).toBeUndefined();
});

test('credential-sensitive pre-tool signals are host formatted without leaking raw input', () => {
  const root = makeTempRoot();
  const result = runHook(root, ['--host', 'claude', '--event', 'PreToolUse', '--enforce'], {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: {
      command: 'export SUPER_SECRET_TOKEN=abc123',
    },
  });

  expect(result.status).toBe(0);
  expect(result.json?.hookSpecificOutput.permissionDecision).toBe('deny');
  expect(result.json?.hookSpecificOutput.permissionDecisionReason).toContain('credential-sensitive');
  expect(JSON.stringify(result.json)).not.toContain('SUPER_SECRET_TOKEN=abc123');
});

test('hook adapter keeps read-only text searches silent under enforce', () => {
  const root = makeTempRoot();
  const result = runHook(root, ['--host', 'claude', '--event', 'PreToolUse', '--enforce'], {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: {
      command: 'rg "git push" docs/ && rg "token" .',
    },
  });

  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe('');
  expect(result.json).toBeNull();
});

test('raw hook adapter exposes the underlying gate json for smoke diagnostics', () => {
  const root = makeTempRoot();
  const result = runHook(root, ['--host', 'raw', '--event', 'UserPromptSubmit'], {
    hook_event_name: 'UserPromptSubmit',
    prompt: 'Implement a small CLI change.',
  });

  expect(result.status).toBe(0);
  expect(result.json?.layer).toBe('hook-event-handler');
  expect(result.json?.route.state).toBe('sdd-change');
  expect(result.json?.mutates).toBe(false);
  expect(result.json?.dispatchesDelegatedAgents).toBe(false);
});

test('agent hook templates are valid advisory host configs', () => {
  const codexTemplate = JSON.parse(fs.readFileSync('harness/agent-hooks/codex/hooks.json', 'utf8'));
  const claudeTemplate = JSON.parse(fs.readFileSync('harness/agent-hooks/claude/settings.json', 'utf8'));
  const commands = [
    ...collectHookCommands(codexTemplate),
    ...collectHookCommands(claudeTemplate),
  ];

  expect(commands.length).toBeGreaterThan(0);
  expect(commands.every((command) => command.includes('harness-agent-hook'))).toBe(true);
  expect(commands.every((command) => !command.includes('--enforce'))).toBe(true);
  expect(commands.every((command) => !command.includes('Task') && !command.includes('Agent'))).toBe(true);
  expect(fs.existsSync('.codex/hooks.json')).toBe(false);
  expect(fs.existsSync('.claude/settings.json')).toBe(false);
});
