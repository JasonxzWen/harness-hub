import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from 'bun:test';

const scriptPath = 'skills/workflow-router/scripts/advisory-check.mjs';

function makeTempDir(prefix = 'harness-hub-advisory-check-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runAdvisory(args: string[], cwd = makeTempDir()) {
  const result = spawnSync(process.execPath, [path.resolve(scriptPath), ...args, '--json'], {
    cwd,
    encoding: 'utf8',
  });

  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

function writeCurrentTask(targetDir: string, body = completeCurrentTaskBody()) {
  const taskPath = path.join(targetDir, '.harness-hub', 'state', 'current-task.md');
  fs.mkdirSync(path.dirname(taskPath), { recursive: true });
  fs.writeFileSync(taskPath, body);
  return taskPath;
}

function completeCurrentTaskBody() {
  return [
    '# Current Task',
    '',
    '## Goal',
    '',
    'Add workflow contract tests.',
    '',
    '## Non-goals',
    '',
    '- Do not change remote systems.',
    '',
    '## Allowed paths',
    '',
    '- tests/workflowAdvisoryCheck.test.ts',
    '- skills/workflow-router/scripts/advisory-check.mjs',
    '',
    '## Forbidden paths',
    '',
    '- production credentials',
    '',
    '## Target spec',
    '',
    '- advisory-check reads current task state when available.',
    '- discovery remains side-effect free.',
    '',
    '## Acceptance criteria',
    '',
    '- Explicit current-task paths override cwd discovery.',
    '- Cwd discovery does not recurse upward.',
    '',
    '## Test matrix',
    '',
    '| Priority | Test type | Behavior or boundary | Command or method | Expected RED | Expected GREEN | Evidence |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| P0 | Unit | current-task discovery | bun test ./tests/workflowAdvisoryCheck.test.ts | missing gates | passed | pending |',
    '',
    '## Alignment status',
    '',
    '- User-visible details aligned: yes',
    '- Spec aligned: yes',
    '- Acceptance criteria aligned: yes',
    '- Test matrix aligned: yes',
    '- Blocking open questions resolved: yes',
    '- Implementation may start: yes',
    '',
  ].join('\n');
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

test('advisory check warns before Harness Hub maintenance mutates without aligned artifacts', () => {
  const result = runAdvisory(['--state', 'harness-hub-maintenance', '--phase', 'pre-implementation']);

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
  expect(result.expectedOutputMode).toBe('html-artifact');
  expect(result.htmlRequired).toBe(true);
  expect(result.warnings.map((warning: { id: string }) => warning.id)).toEqual([
    'missing-validation',
    'missing-closeout-review',
    'missing-pr-readiness',
    'missing-insight-audit',
    'missing-acceptance-arbiter',
    'missing-final-review-arbiter',
    'missing-effective-interact-html-handoff',
  ]);
});

test('advisory check passes delivery when validation, closeout evidence, and HTML handoff are present', () => {
  const result = runAdvisory([
    '--state',
    'delivery',
    '--phase',
    'pre-delivery',
    '--material-changes',
    '--has-validation',
    '--has-html-handoff',
    '--has-closeout-review',
    '--has-pr-readiness',
    '--has-insight',
    '--has-acceptance-arbiter',
    '--has-final-review-arbiter',
  ]);

  expect(result.ok).toBe(true);
  expect(result.expectedOutputMode).toBe('html-artifact');
  expect(result.htmlRequired).toBe(true);
  expect(result.warnings).toEqual([]);
});

test('advisory check accepts explicit HTML handoff waiver for material delivery', () => {
  const result = runAdvisory([
    '--state',
    'delivery',
    '--phase',
    'pre-delivery',
    '--material-changes',
    '--has-validation',
    '--has-closeout-review',
    '--has-pr-readiness',
    '--has-insight',
    '--has-acceptance-arbiter',
    '--has-final-review-arbiter',
    '--html-handoff-waiver',
    'Tiny packaging-only release; chat summary is sufficient.',
  ]);

  expect(result.ok).toBe(true);
  expect(result.expectedOutputMode).toBe('html-artifact');
  expect(result.htmlRequired).toBe(true);
  expect(result.handoffWaived).toBe(true);
  expect(result.handoffWaiver).toContain('Tiny packaging-only release');
  expect(result.warnings).toEqual([]);
});

test('advisory check can explicitly require html-artifact output mode', () => {
  const result = runAdvisory([
    '--state',
    'delivery',
    '--phase',
    'pre-delivery',
    '--material-changes',
    '--has-validation',
    '--has-handoff',
    '--has-closeout-review',
    '--has-pr-readiness',
    '--has-insight',
    '--has-acceptance-arbiter',
    '--has-final-review-arbiter',
    '--expected-output-mode',
    'html-artifact',
  ]);

  expect(result.ok).toBe(false);
  expect(result.expectedOutputMode).toBe('html-artifact');
  expect(result.htmlRequired).toBe(true);
  expect(result.warnings.map((warning: { id: string }) => warning.id)).toEqual([
    'missing-effective-interact-html-handoff',
  ]);
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
  const targetDir = makeTempDir();
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

test('advisory check treats an explicit current-task path as highest priority', () => {
  const cwd = makeTempDir('harness-hub-advisory-cwd-');
  const explicitDir = makeTempDir('harness-hub-advisory-explicit-');
  writeCurrentTask(cwd, [
    '# Current Task',
    '',
    '## Goal',
    '',
    'Incomplete cwd task.',
    '',
  ].join('\n'));
  const explicitTask = writeCurrentTask(explicitDir);

  const result = runAdvisory([
    '--state',
    'sdd-change',
    '--phase',
    'pre-implementation',
    '--current-task',
    explicitTask,
  ], cwd);

  expect(result.ok).toBe(true);
  expect(result.detection.currentTaskSource).toBe('explicit');
  expect(result.detection.currentTaskPath).toBe(path.resolve(explicitTask));
  expect(result.warnings).toEqual([]);
});

test('advisory check auto-discovers current-task from the current working directory only', () => {
  const targetDir = makeTempDir('harness-hub-advisory-auto-');
  const taskPath = writeCurrentTask(targetDir);

  const result = runAdvisory([
    '--state',
    'sdd-change',
    '--phase',
    'pre-implementation',
  ], targetDir);

  expect(result.ok).toBe(true);
  expect(result.detection.currentTaskSource).toBe('cwd');
  expect(result.detection.currentTaskPath).toBe(path.resolve(taskPath));
  expect(result.warnings).toEqual([]);
});

test('advisory check does not recurse upward when auto-discovering current-task', () => {
  const parentDir = makeTempDir('harness-hub-advisory-parent-');
  const childDir = path.join(parentDir, 'child');
  fs.mkdirSync(childDir);
  writeCurrentTask(parentDir);

  const result = runAdvisory([
    '--state',
    'sdd-change',
    '--phase',
    'pre-implementation',
  ], childDir);

  expect(result.ok).toBe(false);
  expect(result.detection.currentTaskSource).toBe('none');
  expect(result.detection.currentTaskPath).toBeNull();
  expect(result.warnings.map((warning: { id: string }) => warning.id)).toEqual([
    'missing-scope',
    'missing-spec',
    'missing-acceptance',
    'missing-plan',
  ]);
});

test('advisory check does not treat an unfilled current-task template as aligned', () => {
  const targetDir = makeTempDir('harness-hub-advisory-template-');
  const templatePath = writeCurrentTask(
    targetDir,
    fs.readFileSync('harness/minimal/state-templates/current-task.md', 'utf8'),
  );

  const result = runAdvisory([
    '--state',
    'sdd-change',
    '--phase',
    'pre-implementation',
    '--current-task',
    templatePath,
  ]);

  expect(result.ok).toBe(false);
  expect(result.detection.currentTaskSource).toBe('explicit');
  expect(result.warnings.map((warning: { id: string }) => warning.id)).toEqual([
    'missing-scope',
    'missing-spec',
    'missing-acceptance',
    'missing-plan',
  ]);
});
