import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

import {
  applyInstall,
  getStatus,
  planInstall,
  readCapabilityIndex,
  runCli,
  validateCapabilityIndex,
} from '../src/harnessHub';

const requiredWorkflowComponents = [
  'skill:workflow-router',
  'skill:answer-workflow',
  'skill:sdd-workflow',
  'skill:diagnosis-workflow',
  'skill:review-workflow',
  'skill:delivery-workflow',
  'skill:hub-maintenance-workflow',
] as const;

test('capability index has no alternate install sets', () => {
  const index = readCapabilityIndex();

  expect(validateCapabilityIndex(index)).toEqual([]);
  expect((index as { defaults?: unknown }).defaults).toBeUndefined();
  expect((index as { profiles?: unknown }).profiles).toBeUndefined();
});

test('default install set includes every standard skill component', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-all-skills-'));
  const index = readCapabilityIndex();
  const skillComponentIds = Object.entries(index.components)
    .filter(([, component]) => component.kind === 'skill')
    .map(([id]) => id)
    .sort();
  const plan = planInstall({ targetDir, agents: ['standard'] });
  const plannedIds = plan.items.map((item) => item.componentId).sort();

  expect(plan.installSetName).toBe('all-skills');
  expect(plannedIds).toEqual(skillComponentIds);
  expect(plannedIds).toEqual(expect.arrayContaining([...requiredWorkflowComponents]));
  expect(plan.items.every((item) => path.relative(targetDir, item.dest).startsWith(`skills${path.sep}`))).toBe(true);
});

test('default install set does not write root harness files', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-no-harness-'));

  applyInstall(planInstall({ targetDir, agents: ['standard'] }));

  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'harness'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
});

test('docs describe the single full install set', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  const capabilityMap = fs.readFileSync('docs/capability-map.md', 'utf8');

  expect(readme).toContain('There are no named skill install variants');
  expect(readme).toContain('overwrites an existing same-name skill directory');
  expect(readme).toContain('Skill and harness component metadata');
  expect(capabilityMap).toContain('one personal skill install set');
  expect(capabilityMap).toContain('No named skill variants');
  expect(capabilityMap).toContain('`install` never writes root harness files');
});

test('current lifecycle specs and smokes do not use named install variants', () => {
  const currentLifecycleFiles = [
    'openspec/specs/managed-capability-lifecycle/spec.md',
    'openspec/specs/repo-capability-analysis/spec.md',
    'openspec/specs/cli-distribution/spec.md',
    'scripts/smoke-managed-update.ps1',
  ];

  for (const filePath of currentLifecycleFiles) {
    const body = fs.readFileSync(filePath, 'utf8');

    expect(body).not.toContain('--profile');
    expect(body.toLowerCase()).not.toContain('profiles');
  }
});

test('confirmed install overwrites same-name skills and records lock-backed status', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-overwrite-skill-'));
  const localSkillDir = path.join(targetDir, 'skills', 'workflow-router');
  fs.mkdirSync(localSkillDir, { recursive: true });
  fs.writeFileSync(path.join(localSkillDir, 'SKILL.md'), 'local stale router\n');
  fs.writeFileSync(path.join(localSkillDir, 'LOCAL.md'), 'delete me\n');

  const plan = planInstall({ targetDir, agents: ['standard'] });
  const routerItem = plan.items.find((item) => item.componentId === 'skill:workflow-router');

  expect(routerItem?.exists).toBe(true);

  const result = applyInstall(plan);

  expect(result.skipped).toEqual([]);
  expect(result.installed.length).toBe(plan.items.length);
  expect(fs.readFileSync(path.join(localSkillDir, 'SKILL.md'), 'utf8')).toContain('name: workflow-router');
  expect(fs.existsSync(path.join(localSkillDir, 'LOCAL.md'))).toBe(false);

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  expect(status.current.some((row) => row.id === 'skill:workflow-router' && row.agent === 'standard')).toBe(true);
  expect(status.modified.length).toBe(0);
  expect(status.missing.length).toBe(0);
});

test('CLI confirmed install overwrites same-name skills by default', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-cli-overwrite-skill-'));
  const localSkillDir = path.join(targetDir, 'skills', 'workflow-router');
  fs.mkdirSync(localSkillDir, { recursive: true });
  fs.writeFileSync(path.join(localSkillDir, 'SKILL.md'), 'local stale router\n');
  fs.writeFileSync(path.join(localSkillDir, 'LOCAL.md'), 'delete me\n');

  const result = await captureRunCli(['install', targetDir, '--target', 'standard', '--yes', '--json']);

  expect(result.code).toBe(0);
  expect(result.stderr).toBe('');
  const report = JSON.parse(result.stdout);
  const skillCount = Object.values(readCapabilityIndex().components)
    .filter((component) => component.kind === 'skill')
    .length;
  expect(report.installed.length).toBe(skillCount);
  expect(report.skipped.length).toBe(0);
  expect(fs.readFileSync(path.join(localSkillDir, 'SKILL.md'), 'utf8')).toContain('name: workflow-router');
  expect(fs.existsSync(path.join(localSkillDir, 'LOCAL.md'))).toBe(false);
});

async function captureRunCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const originalLog = console.log;
  const originalError = console.error;
  let stdout = '';
  let stderr = '';
  console.log = (message?: unknown) => {
    stdout += `${message ?? ''}\n`;
  };
  console.error = (message?: unknown) => {
    stderr += `${message ?? ''}\n`;
  };

  try {
    const code = await runCli(args);
    return { code, stdout, stderr };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}
