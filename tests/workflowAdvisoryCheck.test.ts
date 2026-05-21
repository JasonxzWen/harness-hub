import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from 'bun:test';

const scriptPath = 'skills/workflow-router/scripts/advisory-check.mjs';

function runAdvisory(args: string[], cwd = process.cwd()) {
  const result = spawnSync(process.execPath, [path.resolve(scriptPath), ...args, '--json'], {
    cwd,
    encoding: 'utf8',
  });

  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

test('advisory check warns before SDD implementation without aligned artifacts', () => {
  const result = runAdvisory(['--state', 'sdd-change', '--phase', 'pre-implementation']);

  expect(result.ok).toBe(false);
  expect(result.blocking).toBe(false);
  expect(result.mutates).toBe(false);
  expect(result.warnings.map((warning: { id: string }) => warning.id)).toEqual([
    'missing-spec',
    'missing-acceptance',
    'missing-plan',
  ]);
});

test('advisory check passes when SDD implementation gates are present', () => {
  const result = runAdvisory([
    '--state',
    'sdd-change',
    '--phase',
    'pre-implementation',
    '--has-spec',
    '--has-acceptance',
    '--has-plan',
  ]);

  expect(result.ok).toBe(true);
  expect(result.warnings).toEqual([]);
});

test('advisory check warns when material delivery lacks an effective-interact handoff', () => {
  const result = runAdvisory([
    '--state',
    'delivery',
    '--phase',
    'pre-delivery',
    '--material-changes',
  ]);

  expect(result.ok).toBe(false);
  expect(result.warnings.map((warning: { id: string }) => warning.id)).toEqual([
    'missing-effective-interact-handoff',
  ]);
});

test('advisory check is side-effect free in disposable directories', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-advisory-check-'));
  const before = fs.readdirSync(targetDir);

  const result = runAdvisory([
    '--state',
    'sdd-change',
    '--phase',
    'pre-implementation',
  ], targetDir);

  const after = fs.readdirSync(targetDir);
  expect(result.mutates).toBe(false);
  expect(after).toEqual(before);

  fs.rmSync(targetDir, { recursive: true, force: true });
});
