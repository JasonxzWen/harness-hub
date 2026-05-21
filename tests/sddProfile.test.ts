import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

import {
  applyInstall,
  getStatus,
  planInstall,
  readCapabilityIndex,
  validateCapabilityIndex,
} from '../src/skillHub';

const workflowComponents = [
  'skill:workflow-router',
  'skill:answer-workflow',
  'skill:sdd-workflow',
  'skill:diagnosis-workflow',
  'skill:review-workflow',
  'skill:delivery-workflow',
  'skill:hub-maintenance-workflow',
] as const;

test('sdd profile exposes public workflow skills for the standard target', () => {
  const index = readCapabilityIndex();

  expect(validateCapabilityIndex(index)).toEqual([]);
  expect(index.profiles.sdd.description).toContain('SDD-first');

  for (const componentId of workflowComponents) {
    expect(index.profiles.sdd.components).toContain(componentId);
    expect(index.components[componentId].path).toBe(`skills/${componentId.replace('skill:', '')}`);
    expect(index.components[componentId].agents).toEqual(['standard']);
  }

  expect(index.profiles.minimal.components).not.toContain('skill:workflow-router');
});

test('profiles only reference declared components', () => {
  const index = readCapabilityIndex();

  for (const [profileName, profile] of Object.entries(index.profiles)) {
    for (const componentId of profile.components) {
      expect(index.components[componentId], `${profileName} references ${componentId}`).toBeDefined();
    }
  }
});

test('sdd profile installs workflow set for the standard target with lock-backed status', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-sdd-profile-'));
  const plan = planInstall({ targetDir, profile: 'sdd', agents: ['standard'] });
  const dests = plan.items.map((item) => path.relative(targetDir, item.dest).replaceAll(path.sep, '/'));

  expect(plan.profileName).toBe('sdd');
  expect(dests).toContain('skills/workflow-router');
  expect(dests).toContain('skills/sdd-workflow');
  expect(dests.some((dest) => dest.startsWith('.codex/'))).toBe(false);
  expect(dests.some((dest) => dest.startsWith('.claude/'))).toBe(false);
  expect(dests.some((dest) => dest.startsWith('.opencode/'))).toBe(false);

  const result = applyInstall(plan);
  expect(result.installed.length).toBe(plan.items.length);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'sdd-workflow', 'SKILL.md'))).toBe(true);

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  expect(status.current.some((row) => row.id === 'skill:sdd-workflow' && row.agent === 'standard')).toBe(true);
});
