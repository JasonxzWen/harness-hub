import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillPath = 'skills/tdd/SKILL.md';
const skill = fs.readFileSync(skillPath, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('tdd is adapted from current Matt Pocock TDD and routed narrowly', () => {
  const description = frontmatterValue('description');

  expect(description).toContain('red-green-refactor');
  expect(description).toContain('diagnose first');
  expect(description).toContain('prototype for throwaway exploration');
  expect(skill).toContain('mattpocock/skills skills/engineering/tdd');
  expect(skill).toContain('e9fcdf95b402d360f90f1db8d776d5dd450f9234');
});

test('tdd enforces vertical behavior slices and causal red evidence', () => {
  expect(skill).toContain('one observable behavior at a time');
  expect(skill).toContain('Write exactly one test for one behavior');
  expect(skill).toContain('Do not write every imagined test up front');
  expect(skill).toContain('public interface');
  expect(skill).toContain('the failure is caused by the missing target behavior');
  expect(skill).toContain('Use `verification` for final build');
});

test('tdd keeps detailed testing guidance in references', () => {
  expect(fs.existsSync('skills/tdd/references/tests.md')).toBe(true);
  expect(fs.existsSync('skills/tdd/references/mocking.md')).toBe(true);
  expect(fs.existsSync('skills/tdd/references/interface-design.md')).toBe(true);
  expect(fs.existsSync('skills/tdd/references/refactoring.md')).toBe(true);
  expect(skill.length).toBeLessThan(6500);
});

test('tdd capability metadata replaces the misleading workflow name', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { kind: string; path: string; distribution: string }>;
  };
  const component = index.components['skill:tdd'];

  expect(component.kind).toBe('skill');
  expect(component.path).toBe('skills/tdd');
  expect(component.distribution).toBe('target-distributed');
  expect(index.components['skill:tdd-workflow']).toBeUndefined();
  expect(fs.existsSync('skills/tdd-workflow')).toBe(false);
});
