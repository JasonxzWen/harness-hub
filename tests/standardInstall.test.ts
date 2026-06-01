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
  'skill:hub-maintenance-workflow',
  'skill:tdd-workflow',
  'skill:effective-interact',
  'skill:verification-loop',
];

test('capability index keeps harness metadata outside the standard install surface', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    defaults?: unknown;
    profiles?: unknown;
    components: Record<string, { kind: string; path: string }>;
  };

  expect(index.defaults).toBeUndefined();
  expect(index.profiles).toBeUndefined();
  expect(index.components['harness:minimal']?.kind).toBe('harness-template');
  expect(index.components['harness:minimal']?.path).toBe('harness/minimal');
  expect(Object.values(index.components).every((component) => (
    component.kind === 'skill' || component.kind === 'harness-template'
  ))).toBe(true);
});

test('default standard install exposes all workflow skills and omits retired Ralph skills', () => {
  const index = readCapabilityIndex();
  const skillComponentIds = Object.entries(index.components)
    .filter(([, component]) => component.kind === 'skill')
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
});

test('default standard install writes lock-backed status for the full skill set', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-standard-status-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  const result = applyInstall(plan);

  expect(result.installed.length).toBe(plan.items.length);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'sdd-workflow', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'webapp-testing', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'feature_list.json'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'decisions.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'progress.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'session-handoff.md'))).toBe(false);

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  expect(status.current.length).toBe(plan.items.length);
  expect(status.missing.length).toBe(0);
  expect(status.modified.length).toBe(0);
  expect(status.current.some((row) => row.id === 'skill:sdd-workflow' && row.agent === 'standard')).toBe(true);
});
