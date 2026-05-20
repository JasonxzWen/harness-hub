import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillPath = 'skills/grill-me/SKILL.md';
const skill = fs.readFileSync(skillPath, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('grill-me has a narrow pressure-testing trigger', () => {
  const description = frontmatterValue('description');

  expect(description).toContain('one-question-at-a-time interview');
  expect(description).toContain('grill me');
  expect(description).toContain('assumptions surfaced');
  expect(description).toContain('do not use for routine implementation');
});

test('grill-me asks one question and explores first', () => {
  expect(skill).toContain('Ask exactly one question.');
  expect(skill).toContain('inspect the repository first instead of asking the user');
  expect(skill).toContain('why this decision matters');
  expect(skill).toContain('your recommended answer');
  expect(skill).toContain('Wait for the user');
});

test('grill-me stops before implementation', () => {
  expect(skill).toContain('Do not start implementation unless the user explicitly asks');
  expect(skill).toContain('verification criteria for the next step');
});
