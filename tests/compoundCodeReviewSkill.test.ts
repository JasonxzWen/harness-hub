import fs from 'node:fs';
import { expect, test } from 'bun:test';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

function frontmatterValue(skill: string, name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('compound-code-review is a narrow Compound Engineering code review adaptation', () => {
  const skill = read('skills/compound-code-review/SKILL.md');
  const description = frontmatterValue(skill, 'description');

  expect(description).toContain('Compound Engineering-inspired code review');
  expect(description).toContain('structured findings');
  expect(skill).toContain('EveryInc/compound-engineering-plugin');
  expect(skill).toContain('upstream_commit: "d090bde0ff1bbc33ec3c3b2049cb4687e9d76532"');
  expect(skill).toContain('safe_auto');
  expect(skill).toContain('gated_auto');
  expect(skill).toContain('manual');
  expect(skill).toContain('advisory');
  expect(skill).toContain('Default mode is report-only');
  expect(skill).toContain('Do not commit, push, create a pull request');
});

test('compound-code-review keeps detailed contracts in references', () => {
  expect(fs.existsSync('skills/compound-code-review/references/findings-schema.json')).toBe(true);
  expect(fs.existsSync('skills/compound-code-review/references/persona-catalog.md')).toBe(true);
  expect(fs.existsSync('skills/compound-code-review/references/review-output-template.md')).toBe(true);
  expect(read('skills/compound-code-review/SKILL.md').length).toBeLessThan(7500);
});

test('compound-code-review is part of the standard install surface', () => {
  const index = JSON.parse(read('capabilities/index.json')) as {
    components: Record<string, { kind: string; path: string; source: string; provides?: string[] }>;
  };
  const component = index.components['skill:compound-code-review'];

  expect(component.kind).toBe('skill');
  expect(component.path).toBe('skills/compound-code-review');
  expect(component.source).toBe('compound-engineering-plugin-adapted');
  expect(component.provides).toContain('structured-code-review');
});
