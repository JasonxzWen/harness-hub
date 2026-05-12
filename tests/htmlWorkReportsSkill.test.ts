import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillPath = '.agents/skills/html-work-reports/SKILL.md';
const skill = fs.readFileSync(skillPath, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('html-work-reports has a narrow trigger description', () => {
  const description = frontmatterValue('description');

  expect(description.startsWith('Load when')).toBe(true);
  expect(description.split(/\s+/).length).toBeLessThanOrEqual(50);
  expect(description).toContain('self-contained HTML report');
  expect(description).toContain('review');
  expect(description).toContain('architecture walkthrough');
  expect(description).toContain('lightweight export editor');
  expect(description).toContain('do not load for simple chat answers');
  expect(description).toContain('normal code edits');
  expect(description).toContain('bundled web apps');
});

test('html-work-reports documents positive and negative trigger examples', () => {
  expect(skill).toContain('## Trigger Examples');
  expect(skill).toContain('HTML');
  expect(skill).toContain('review');
  expect(skill).toContain('JSON');
  expect(skill).toContain('Do not use this skill for:');
  expect(skill).toContain('direct code implementation or bug fixes');
  expect(skill).toContain('slide decks; use `frontend-slides`');
});

test('html-work-reports keeps detailed patterns in references', () => {
  expect(skill).toContain('references/html-report-patterns.md');
  expect(skill.length).toBeLessThan(6000);
});
