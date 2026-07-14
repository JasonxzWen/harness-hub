import fs from 'node:fs';
import { expect, test } from 'bun:test';

const workflows = {
  'answer-workflow': ['report-loop'],
  'sdd-workflow': [
    'requirements-loop',
    'spec-loop',
    'test-loop',
    'implementation-review-loop',
    'knowledge-maintain-loop',
    'delivery-loop',
    'retro-loop',
    'report-loop',
  ],
  'diagnosis-workflow': [
    'requirements-loop',
    'test-loop',
    'implementation-review-loop',
    'knowledge-maintain-loop',
    'delivery-loop',
    'retro-loop',
    'report-loop',
  ],
  'review-workflow': ['implementation-review-loop', 'report-loop'],
  'delivery-workflow': ['implementation-review-loop', 'delivery-loop', 'retro-loop', 'report-loop'],
} as const;

function read(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

function frontmatterValue(markdown: string, key: string): string {
  return markdown.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)`, 'm'))?.[1]?.trim() ?? '';
}

test('exactly five generic workflow owner skills remain', () => {
  for (const owner of Object.keys(workflows)) {
    const file = `skills/${owner}/SKILL.md`;
    expect(fs.existsSync(file)).toBe(true);
    const skill = read(file);
    expect(frontmatterValue(skill, 'name')).toBe(owner);
    expect(frontmatterValue(skill, 'description')).toMatch(/^Load when/);
    expect(skill).toMatch(/only (?:runs|orchestrates)/i);
    expect(skill.length).toBeLessThan(2500);
  }

  expect(fs.existsSync('skills/hub-maintenance-workflow/SKILL.md')).toBe(false);
});

test('workflow skill bodies only order loops and preserve their sequence', () => {
  for (const [owner, loops] of Object.entries(workflows)) {
    const skill = read(`skills/${owner}/SKILL.md`);
    let previous = -1;
    for (const loop of loops) {
      const current = skill.indexOf(`\`${loop}\``);
      expect(current, `${owner} is missing ${loop}`).toBeGreaterThan(previous);
      previous = current;
    }

    for (const implementationDetail of [
      'PRODUCER_SCHEMA',
      'VERIFIER_SCHEMA',
      'runExecutableLoop(',
      'spawnSync(',
      'execFileSync(',
      'writeFileSync(',
      '--run-id',
    ]) {
      expect(skill, `${owner} duplicates Loop implementation`).not.toContain(implementationDetail);
    }
  }
});

test('workflow-router declares executable routing and the skill-loop-workflow hierarchy', () => {
  const router = read('skills/workflow-router/SKILL.md');

  expect(router).toContain('skill -> small loop -> workflow');
  expect(router).toContain('scripts/loop-runtime.mjs route');
  expect(router).toContain('returning an owner name without starting the workflow is incomplete');
  expect(router).toContain('A workflow only sequences small loops and handles branches');
  expect(router).toContain('references/agentic-loops.md');
  expect(router).toContain('references/orchestration-policy.md');
});
