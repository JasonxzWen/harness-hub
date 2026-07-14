import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const gateScript = path.resolve('skills/workflow-router/scripts/harness-agent-gate.mjs');

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'harness-agent-gate-'));
}

function writeInput(root: string, value: unknown): string {
  const inputPath = path.join(root, 'input.json');
  fs.writeFileSync(inputPath, `${JSON.stringify(value, null, 2)}\n`);
  return inputPath;
}

function runGate(root: string, args: string[], input?: unknown): { status: number | null; json: any; stdout: string; stderr: string } {
  const inputArgs = input === undefined ? [] : ['--input', writeInput(root, input)];
  const result = spawnSync(process.execPath, [gateScript, root, ...args, ...inputArgs, '--json'], {
    encoding: 'utf8',
  });
  return {
    status: result.status,
    json: JSON.parse(result.stdout),
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function snapshotLocalHarnessArtifacts(root: string): string[] {
  return ['.codex', '.claude', '.harness-hub/state', '.harness-hub/reports']
    .filter((relativePath) => fs.existsSync(path.join(root, ...relativePath.split('/'))));
}

test('user-prompt gate routes prompts without writing host or harness runtime state', () => {
  const root = makeTempRoot();
  const before = snapshotLocalHarnessArtifacts(root);

  const result = runGate(root, ['--event', 'user-prompt'], {
    prompt: 'Implement a small source change with tests.',
  });

  expect(result.status).toBe(0);
  expect(result.json.layer).toBe('hook-event-handler');
  expect(result.json.mutates).toBe(false);
  expect(result.json.dispatchesDelegatedAgents).toBe(false);
  expect(result.json.route.state).toBe('sdd-change');
  expect(result.json.blocking).toBe(false);
  expect(snapshotLocalHarnessArtifacts(root)).toEqual(before);
});

test('pre-tool gate is advisory by default and enforceable for deterministic blockers', () => {
  const root = makeTempRoot();
  const input = {
    tool_name: 'Bash',
    tool_input: {
      command: 'git push origin main',
    },
  };

  const advisory = runGate(root, ['--event', 'pre-tool'], input);
  const enforced = runGate(root, ['--event', 'pre-tool', '--enforce'], input);
  const promptFallback = runGate(root, ['--event', 'pre-tool', '--prompt', 'git push origin main']);

  expect(advisory.status).toBe(0);
  expect(advisory.json.decision).toBe('interrupt');
  expect(advisory.json.blocking).toBe(false);
  expect(advisory.json.mutates).toBe(false);
  expect(advisory.json.dispatchesDelegatedAgents).toBe(false);
  expect(advisory.json.findings.map((finding: { id: string }) => finding.id)).toContain('remote-write');
  expect(enforced.status).toBe(3);
  expect(enforced.json.blocking).toBe(true);
  expect(promptFallback.status).toBe(0);
  expect(promptFallback.json.findings.map((finding: { id: string }) => finding.id)).toContain('remote-write');
  expect(snapshotLocalHarnessArtifacts(root)).toEqual([]);
});

test('pre-tool gate blocks deterministic host config mutations without blocking read-only text searches', () => {
  const root = makeTempRoot();

  const readOnlySearch = runGate(root, ['--event', 'pre-tool', '--enforce'], {
    tool_name: 'Bash',
    tool_input: {
      command: 'rg "git push" docs/ && rg "token" .',
    },
  });
  const execCommandHostMutation = runGate(root, ['--event', 'pre-tool'], {
    tool_name: 'functions.exec_command',
    tool_input: {
      cmd: 'mkdir .codex\\hooks',
    },
  });
  const destructive = runGate(root, ['--event', 'pre-tool'], {
    tool_name: 'Bash',
    tool_input: {
      command: 'rm -fr dist',
    },
  });

  expect(readOnlySearch.status).toBe(0);
  expect(readOnlySearch.json.decision).toBe('allow');
  expect(readOnlySearch.json.blocking).toBe(false);
  expect(readOnlySearch.json.mutates).toBe(false);
  expect(readOnlySearch.json.dispatchesDelegatedAgents).toBe(false);
  expect(readOnlySearch.json.findings).toEqual([]);
  expect(execCommandHostMutation.json.findings.map((finding: { id: string }) => finding.id)).toContain('host-config-mutation');
  expect(destructive.json.findings.map((finding: { id: string }) => finding.id)).toContain('destructive-command');
});

test('session-stop gate reports dirty paths as closeout evidence needs without creating loop records', () => {
  const root = makeTempRoot();
  spawnSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'demo.ts'), 'export const demo = true;\n');

  const result = runGate(root, ['--event', 'session-stop']);

  expect(result.status).toBe(0);
  expect(result.json.decision).toBe('interrupt');
  expect(result.json.mutates).toBe(false);
  expect(result.json.dispatchesDelegatedAgents).toBe(false);
  expect(result.json.requiredReviews.map((review: { id: string }) => review.id)).toContain('implementation-review');
  expect(result.json.changedPaths).toContain('src/demo.ts');
  expect(fs.existsSync(path.join(root, '.harness-hub', 'state', 'runs'))).toBe(false);
});

test('git snapshots disable optional locks for read-only hook events', () => {
  const script = fs.readFileSync(gateScript, 'utf8');

  expect(script).toContain("GIT_OPTIONAL_LOCKS: '0'");
  expect(script).toContain('function execGitReadOnly');
});

test('unsupported events fail with stable json and no delegated-agent dispatch', () => {
  const root = makeTempRoot();
  const result = runGate(root, ['--event', 'auto-dispatch-subagent']);

  expect(result.status).toBe(2);
  expect(result.json.ok).toBe(false);
  expect(result.json.mutates).toBe(false);
  expect(result.json.dispatchesDelegatedAgents).toBe(false);
  expect(result.json.findings[0].id).toBe('invalid-input');
});
