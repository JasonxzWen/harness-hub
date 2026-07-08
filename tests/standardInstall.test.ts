import { expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  applyInstall,
  getStatus,
  planInstall,
  readCapabilityIndex,
} from '../src/harnessHub';

const REQUIRED_WORKFLOW_COMPONENTS = [
  'skill:workflow-router',
  'skill:answer-workflow',
  'skill:sdd-workflow',
  'skill:diagnosis-workflow',
  'skill:review-workflow',
  'skill:delivery-workflow',
  'skill:tdd-workflow',
  'skill:ponytail',
  'skill:effective-interact',
  'skill:verification-loop',
  'skill:insight',
];

const FORBIDDEN_STANDARD_INSTALL_ROOT_ARTIFACTS = [
  '.claude-plugin',
  'openspec',
  'README.md',
  'README.zh-CN.md',
  'BOOTSTRAP-TARGET.md',
  'CHANGELOG.md',
  'package.json',
  'docs',
  'config',
  'capabilities',
  'harness',
  'src',
  'tests',
  'site',
] as const;

test('capability index keeps harness metadata outside the standard install surface', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    defaults?: unknown;
    profiles?: unknown;
    components: Record<string, { kind: string; path: string; distribution?: string }>;
  };

  expect(index.defaults).toBeUndefined();
  expect(index.profiles).toBeUndefined();
  expect(index.components['harness:minimal']?.kind).toBe('harness-template');
  expect(index.components['harness:minimal']?.path).toBe('harness/minimal');
  expect(Object.values(index.components).every((component) => (
    component.kind === 'skill' || component.kind === 'harness-template'
  ))).toBe(true);
  expect(index.components['skill:hub-maintenance-workflow']?.distribution).toBe('hub-internal');
  expect(index.components['skill:insight']?.distribution || 'target').toBe('target');
});

test('default standard install exposes target workflow skills and omits hub-internal maintenance skills', () => {
  const index = readCapabilityIndex();
  const skillComponentIds = Object.entries(index.components)
    .filter(([, component]) => component.kind === 'skill' && (component.distribution || 'target') === 'target')
    .map(([id]) => id)
    .sort();
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-standard-install-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  const plannedComponentIds = plan.items.map((item) => item.componentId).sort();

  expect(plannedComponentIds).toEqual(skillComponentIds);
  for (const componentId of REQUIRED_WORKFLOW_COMPONENTS) {
    expect(plannedComponentIds).toContain(componentId);
  }
  expect(plannedComponentIds).not.toContain('skill:ralph-prd');
  expect(plannedComponentIds).not.toContain('skill:ralph-loop');
  expect(plannedComponentIds).not.toContain('skill:hub-maintenance-workflow');
});

test('default standard install writes lock-backed status for the target-distributed skill set', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-standard-status-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  const result = applyInstall(plan);

  expect(result.installed.length).toBe(plan.items.length);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'sdd-workflow', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'insight', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'ponytail', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'webapp-testing', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'hub-maintenance-workflow', 'SKILL.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'feature_list.json'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'decisions.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'progress.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'session-handoff.md'))).toBe(false);
  for (const relativePath of FORBIDDEN_STANDARD_INSTALL_ROOT_ARTIFACTS) {
    expect(fs.existsSync(path.join(targetDir, relativePath))).toBe(false);
  }
  expect(fs.existsSync(path.join(targetDir, 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  expect(status.current.length).toBe(plan.items.length);
  expect(status.missing.length).toBe(0);
  expect(status.modified.length).toBe(0);
  expect(status.current.some((row) => row.id === 'skill:sdd-workflow' && row.agent === 'standard')).toBe(true);
});
