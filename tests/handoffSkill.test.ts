import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillPath = 'skills/handoff/SKILL.md';
const skill = fs.readFileSync(skillPath, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('handoff has a narrow restart-notes trigger', () => {
  const description = frontmatterValue('description');

  expect(description).toContain('hand off current work');
  expect(description).toContain('another agent/session');
  expect(description).toContain('do not load for visual HTML repo reports');
  expect(skill).toContain('mattpocock/skills skills/productivity/handoff');
  expect(skill).toContain('d574778f94cf620fcc8ce741584093bc650a61d3');
});

test('handoff writes temp restart notes with safety boundaries', () => {
  expect(skill).toContain('operating system temp directory');
  expect(skill).toContain('$env:TEMP');
  expect(skill).toContain('Suggested skills');
  expect(skill).toContain('Redact secrets');
  expect(skill).toContain('Reference existing PRDs');
  expect(skill).toContain('Do not include hidden reasoning');
});

test('handoff is part of the standard install surface', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { kind: string; path: string; distribution: string }>;
  };
  const component = index.components['skill:handoff'];

  expect(component.kind).toBe('skill');
  expect(component.path).toBe('skills/handoff');
  expect(component.distribution).toBe('target-distributed');
});
