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
    'missing-scope',
    'missing-spec',
    'missing-acceptance',
    'missing-plan',
  ]);
});

test('advisory check warns before Skill Hub maintenance mutates without aligned artifacts', () => {
  const result = runAdvisory(['--state', 'skill-hub-maintenance', '--phase', 'pre-implementation']);

  expect(result.ok).toBe(false);
  expect(result.blocking).toBe(false);
  expect(result.mutates).toBe(false);
  expect(result.warnings.map((warning: { id: string }) => warning.id)).toEqual([
    'missing-scope',
    'missing-spec',
    'missing-acceptance',
    'missing-plan',
  ]);
});

test('advisory check allows read-only owners unless mutation is explicitly requested', () => {
  const question = runAdvisory(['--state', 'question', '--phase', 'pre-implementation']);
  const review = runAdvisory(['--state', 'review', '--phase', 'pre-implementation']);
  const questionMutation = runAdvisory(['--state', 'question', '--phase', 'pre-implementation', '--will-mutate']);
  const reviewMutation = runAdvisory(['--state', 'review', '--phase', 'pre-implementation', '--will-mutate']);

  expect(question.ok).toBe(true);
  expect(review.ok).toBe(true);
  expect(question.warnings).toEqual([]);
  expect(review.warnings).toEqual([]);
  expect(questionMutation.warnings.map((warning: { id: string }) => warning.id)).toEqual(['read-only-owner-mutation']);
  expect(reviewMutation.warnings.map((warning: { id: string }) => warning.id)).toEqual(['read-only-owner-mutation']);
});

test('advisory check warns before diagnosis fixes without reproduction evidence', () => {
  const missing = runAdvisory(['--state', 'diagnosis', '--phase', 'pre-implementation']);
  const present = runAdvisory([
    '--state',
    'diagnosis',
    '--phase',
    'pre-implementation',
    '--has-reproduction',
    '--has-evidence',
  ]);

  expect(missing.warnings.map((warning: { id: string }) => warning.id)).toEqual([
    'missing-reproduction',
    'missing-evidence',
  ]);
  expect(present.ok).toBe(true);
});

test('advisory check passes when SDD implementation gates are present', () => {
  const result = runAdvisory([
    '--state',
    'sdd-change',
    '--phase',
    'pre-implementation',
    '--has-scope',
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
    'missing-validation',
    'missing-effective-interact-handoff',
  ]);
});

test('advisory check passes delivery when validation and handoff are present', () => {
  const result = runAdvisory([
    '--state',
    'delivery',
    '--phase',
    'pre-delivery',
    '--material-changes',
    '--has-validation',
    '--has-handoff',
  ]);

  expect(result.ok).toBe(true);
  expect(result.warnings).toEqual([]);
});

test('advisory check warns on state and phase mismatches instead of returning a false green', () => {
  const deliveryAtImplementation = runAdvisory([
    '--state',
    'delivery',
    '--phase',
    'pre-implementation',
    '--has-validation',
  ]);
  const implementationAtDelivery = runAdvisory([
    '--state',
    'sdd-change',
    '--phase',
    'pre-delivery',
    '--has-scope',
    '--has-spec',
    '--has-acceptance',
    '--has-plan',
  ]);

  expect(deliveryAtImplementation.ok).toBe(false);
  expect(deliveryAtImplementation.warnings.map((warning: { id: string }) => warning.id)).toEqual([
    'phase-state-mismatch',
  ]);
  expect(implementationAtDelivery.ok).toBe(false);
  expect(implementationAtDelivery.warnings.map((warning: { id: string }) => warning.id)).toEqual([
    'phase-state-mismatch',
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
