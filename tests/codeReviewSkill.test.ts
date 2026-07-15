import fs from 'node:fs';
import { expect, test } from 'bun:test';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

function frontmatterValue(skill: string, name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('code-review combines independent Standards and Spec axes', () => {
  const skill = read('skills/code-review/SKILL.md');
  const description = frontmatterValue(skill, 'description');

  expect(description).toContain('Standards and Spec');
  expect(description).toContain('native Subagents');
  expect(skill).toContain('EveryInc/compound-engineering-plugin');
  expect(skill).toContain('mattpocock/skills skills/engineering/code-review');
  expect(skill).toContain('Standards axis');
  expect(skill).toContain('Spec axis');
  expect(skill).toContain('dispatch both axes as bounded, independent, read-only native Subagents');
  expect(skill).toContain('Deterministic failures remain failures');
  expect(skill).toContain('Report only');
  expect(skill).toContain('Do not commit, push, create a pull request');
  expect(skill).not.toContain('mode:autofix');
  expect(skill).not.toContain('review-fixer');
});

test('code-review removes the old review control-plane vocabulary', () => {
  expect(fs.existsSync('skills/compound-code-review')).toBe(false);
  expect(read('skills/code-review/LICENSE.everyinc.txt')).toContain('Copyright (c) 2025 Every');
  expect(read('skills/code-review/LICENSE.txt')).toContain('Copyright (c) 2026 Matt Pocock');
  expect(read('skills/code-review/SKILL.md').length).toBeLessThan(6500);
});

test('code-review replaces compound-code-review in the install surface', () => {
  const index = JSON.parse(read('capabilities/index.json')) as {
    components: Record<string, { kind: string; path: string; distribution: string }>;
  };
  const component = index.components['skill:code-review'];

  expect(component.kind).toBe('skill');
  expect(component.path).toBe('skills/code-review');
  expect(component.distribution).toBe('target-distributed');
  expect(index.components['skill:compound-code-review']).toBeUndefined();
});
