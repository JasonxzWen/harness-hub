import fs from 'node:fs';
import { expect, test } from 'bun:test';

function readSkill(name: string): string {
  return fs.readFileSync(`skills/${name}/SKILL.md`, 'utf8');
}

function frontmatterValue(skill: string, name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('diagnose is routed to runtime failures, not agent failures', () => {
  const skill = readSkill('diagnose');
  const description = frontmatterValue(skill, 'description');

  expect(description).toContain('hard bugs and performance regressions');
  expect(description).toContain('agent-introspection-debugging instead');
  expect(skill).toContain('Build The Feedback Loop');
  expect(skill).toContain('one command that has already been run');
  expect(skill).toContain('Minimize The Reproduction');
  expect(skill).toContain('raise the reproduction rate');
  expect(skill).toContain('Rank Hypotheses');
  expect(skill).toContain('Re-run the original feedback loop');
  expect(skill).toContain('Use `verification` after code changes');
  expect(skill).toContain('e9fcdf95b402d360f90f1db8d776d5dd450f9234');
});

test('prototype is routed to throwaway design learning', () => {
  const skill = readSkill('prototype');
  const description = frontmatterValue(skill, 'description');

  expect(description).toContain('throwaway prototype');
  expect(description).toContain('do not use for production feature work');
  expect(skill).toContain('Logic prototype');
  expect(skill).toContain('UI prototype');
  expect(skill).toContain('Delete the prototype or fold the winning decision into production code');
});

test('prototype keeps detailed branch guidance in references', () => {
  expect(fs.existsSync('skills/prototype/references/logic-prototype.md')).toBe(true);
  expect(fs.existsSync('skills/prototype/references/ui-prototype.md')).toBe(true);
  expect(readSkill('prototype').length).toBeLessThan(6000);
});
