import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillPath = 'skills/tdd-workflow/SKILL.md';
const skill = fs.readFileSync(skillPath, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('tdd-workflow is adapted from Matt Pocock TDD and routed narrowly', () => {
  const description = frontmatterValue('description');

  expect(description).toContain('red-green-refactor');
  expect(description).toContain('diagnose first');
  expect(description).toContain('prototype for throwaway exploration');
  expect(skill).toContain('mattpocock/skills skills/engineering/tdd');
  expect(skill).toContain('d54c497aa94400a496d3f2c38be10fa5f284c5a9');
});

test('tdd-workflow enforces vertical behavior slices', () => {
  expect(skill).toContain('one observable behavior at a time');
  expect(skill).toContain('Write exactly one test for one behavior');
  expect(skill).toContain('Do not write every imagined test up front');
  expect(skill).toContain('public interface');
  expect(skill).toContain('Use `verification-loop` for final build');
});

test('tdd-workflow keeps detailed testing guidance in references', () => {
  expect(fs.existsSync('skills/tdd-workflow/references/tests.md')).toBe(true);
  expect(fs.existsSync('skills/tdd-workflow/references/mocking.md')).toBe(true);
  expect(fs.existsSync('skills/tdd-workflow/references/interface-design.md')).toBe(true);
  expect(fs.existsSync('skills/tdd-workflow/references/refactoring.md')).toBe(true);
  expect(skill.length).toBeLessThan(6500);
});

test('tdd-workflow capability metadata tracks the Matt Pocock replacement', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { kind: string; source: string; version: string; provides?: string[]; overlapsWith?: string[] }>;
  };
  const component = index.components['skill:tdd-workflow'];

  expect(component.kind).toBe('skill');
  expect(component.source).toBe('mattpocock-skills-adapted');
  expect(component.version).toBe('0.2.0');
  expect(component.provides).toContain('tracer-bullet-slices');
  expect(component.overlapsWith).toContain('skill:diagnose');
  expect(component.overlapsWith).toContain('skill:prototype');
});
