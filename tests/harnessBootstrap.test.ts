import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

import {
  applyDevBootstrap,
  getStatus,
  planDevBootstrap,
  readCapabilityIndex,
  readLock,
  runCli,
  validateHarness,
} from '../src/skillHub';

const REQUIRED_HARNESS_FILES = [
  'AGENTS.md',
  'feature_list.json',
  'progress.md',
  'session-handoff.md',
  'clean-state-checklist.md',
  'definition-of-done.md',
  'tasks/current-task.md',
  'scripts/harness-validate.mjs',
] as const;

test('dev bootstrap dry run plans skills plus Codex harness without writing files', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-plan-'));

  const plan = planDevBootstrap({ targetDir, agents: ['standard'] });
  const cli = await captureCli(['init-harness', targetDir, '--target', 'standard', '--dry-run', '--json']);

  expect(plan.install.items.some((item) => item.componentId === 'skill:workflow-router')).toBe(true);
  expect(plan.harnessFiles.map((file) => file.relativePath).sort()).toEqual([...REQUIRED_HARNESS_FILES].sort());
  expect(plan.harnessFiles.every((file) => file.exists === false)).toBe(true);
  expect(plan.blockers).toEqual([]);
  expect(cli.code).toBe(0);
  expect(JSON.parse(cli.stdout).harnessFiles.map((file: { relativePath: string }) => file.relativePath).sort())
    .toEqual([...REQUIRED_HARNESS_FILES].sort());
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);
});

test('confirmed dev bootstrap writes minimal Codex harness and managed ownership', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-apply-'));

  const result = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });

  expect(result.exitCode).toBe(0);
  expect(result.installed.length).toBeGreaterThan(0);
  for (const relativePath of REQUIRED_HARNESS_FILES) {
    expect(fs.existsSync(path.join(targetDir, relativePath))).toBe(true);
  }
  expect(fs.existsSync(path.join(targetDir, 'CLAUDE.md'))).toBe(false);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('Codex');
  expect(fs.readFileSync(path.join(targetDir, 'tasks', 'current-task.md'), 'utf8')).toContain('Allowed paths');
  expect(fs.readFileSync(path.join(targetDir, 'tasks', 'current-task.md'), 'utf8')).toContain('Parallel writes');

  const lock = readLock(targetDir);
  if (!lock || lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  const harness = lock.data.components.find((component) => component.id === 'harness:minimal');
  expect(harness?.kind).toBe('harness-template');
  expect(harness?.dest).toBe('.');
  expect(harness?.files.map((file) => file.path).sort()).toEqual([...REQUIRED_HARNESS_FILES].sort());

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  expect(status.current.some((row) => row.id === 'harness:minimal')).toBe(true);
  expect(status.modified).toEqual([]);

  const validation = validateHarness(targetDir);
  expect(validation.exitCode).toBe(0);
  expect(validation.checks.every((check) => check.state === 'pass')).toBe(true);

  const cliValidation = await captureCli(['validate-harness', targetDir, '--json']);
  expect(cliValidation.code).toBe(0);
  expect(JSON.parse(cliValidation.stdout).reason).toBe('Harness validation passed.');
  const scriptOutput = execFileSync(process.execPath, ['scripts/harness-validate.mjs'], {
    cwd: targetDir,
    encoding: 'utf8',
  });
  expect(scriptOutput).toContain('Harness validation passed.');
});

test('dev bootstrap blocks existing harness files unless force is explicit', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-conflict-'));
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), 'local instructions\n');
  const before = fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8');

  const blocked = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });

  expect(blocked.exitCode).toBe(3);
  expect(blocked.blockers.some((blocker) => blocker.code === 'existing-file' && blocker.path === 'AGENTS.md')).toBe(true);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toBe(before);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);

  const forced = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true, force: true });

  expect(forced.exitCode).toBe(0);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('Codex');
});

test('dev bootstrap rechecks existing harness files before writing', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-stale-conflict-'));
  const plan = planDevBootstrap({ targetDir, agents: ['standard'] });
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), 'local instructions after planning\n');
  const before = fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8');

  const blocked = applyDevBootstrap(plan, { yes: true });

  expect(blocked.exitCode).toBe(3);
  expect(blocked.blockers.some((blocker) => blocker.code === 'existing-file' && blocker.path === 'AGENTS.md')).toBe(true);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toBe(before);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);
});

test('dev bootstrap blocks dirty git worktrees before writing managed files', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-dirty-'));
  execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  fs.writeFileSync(path.join(targetDir, 'dirty.txt'), 'untracked local work\n');

  const result = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });

  expect(result.exitCode).toBe(3);
  expect(result.blockers.some((blocker) => blocker.code === 'dirty-worktree' && blocker.path === 'dirty.txt')).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);
});

test('dev bootstrap rechecks dirty git worktrees before writing', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-stale-dirty-'));
  execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  const plan = planDevBootstrap({ targetDir, agents: ['standard'] });
  fs.writeFileSync(path.join(targetDir, 'dirty.txt'), 'untracked local work after planning\n');

  const result = applyDevBootstrap(plan, { yes: true });

  expect(result.exitCode).toBe(3);
  expect(result.blockers.some((blocker) => blocker.code === 'dirty-worktree' && blocker.path === 'dirty.txt')).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);
});

test('dev bootstrap blocks non-Codex platform instruction files before writing', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-platform-file-'));
  fs.writeFileSync(path.join(targetDir, 'CLAUDE.md'), 'platform-specific instructions\n');

  const result = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true, force: true });

  expect(result.exitCode).toBe(3);
  expect(result.blockers.some((blocker) => (
    blocker.code === 'non-codex-platform-file'
    && blocker.path === 'CLAUDE.md'
  ))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);
});

test('harness validation reports current-state files that exceed size limits', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-size-'));
  applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });
  fs.appendFileSync(path.join(targetDir, 'session-handoff.md'), `\n${'x'.repeat(20_000)}\n`);

  const validation = validateHarness(targetDir);

  expect(validation.exitCode).toBe(3);
  expect(validation.checks.some((check) => (
    check.state === 'fail'
    && check.code === 'file-size'
    && check.path === 'session-handoff.md'
  ))).toBe(true);
});

test('harness validation rejects malformed feature state JSON', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-feature-json-'));
  applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });
  fs.writeFileSync(path.join(targetDir, 'feature_list.json'), '{"features":[],"parallel_write_policy":');

  const validation = validateHarness(targetDir);

  expect(validation.exitCode).toBe(3);
  expect(validation.checks.some((check) => (
    check.state === 'fail'
    && check.code === 'structured-content'
    && check.path === 'feature_list.json'
  ))).toBe(true);

  let failed = false;
  try {
    execFileSync(process.execPath, ['scripts/harness-validate.mjs'], {
      cwd: targetDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    failed = true;
    expect((error as { status?: number }).status).toBe(3);
    expect(String((error as { stderr?: Buffer | string }).stderr)).toContain('feature_list.json');
  }
  expect(failed).toBe(true);
});

async function captureCli(argv: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    stdout.push(args.join(' '));
  };
  console.error = (...args: unknown[]) => {
    stderr.push(args.join(' '));
  };

  try {
    const code = await runCli(argv);
    return { code, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}
