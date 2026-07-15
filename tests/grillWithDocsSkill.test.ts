import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skill = fs.readFileSync('skills/grill-with-docs/SKILL.md', 'utf8');
const reference = fs.readFileSync('skills/grill-with-docs/references/domain-modeling.md', 'utf8');

test('grill-with-docs is an OKF-aware atomic requirements skill', () => {
  expect(skill).toContain('atomic requirements skill called directly by the native Host main Agent');
  expect(skill).toContain('`knowledge/index.md`');
  expect(skill).toContain('Load and apply `grill-me`');
  expect(skill).toContain('one shared unresolved-decision graph');
  expect(skill).toContain('current dependency frontier in one batch');
  expect(skill).toContain('temporary `.harness-hub/state/` maintenance alone does not trigger this skill');
  expect(skill).toContain('After alignment, let the main Agent update durable documents once');
  expect(skill).toContain('Continue autonomously');
  expect(skill).toContain('Return constraints, accepted details, contradictions, open questions, and source anchors to the main Agent');
  expect(skill).toContain('the project contract owns the write and deterministic OKF validation');
  expect(skill).toContain('mattpocock/skills skills/engineering/grill-with-docs');
  expect(skill).toContain('e9fcdf95b402d360f90f1db8d776d5dd450f9234');
  expect(skill).not.toContain('Ask only one blocking question at a time');
  expect(skill).not.toContain('requirements-loop');
  expect(skill).not.toContain('knowledge-maintain-loop');
  expect(skill).not.toContain('.harness-hub/context/wiki');
  expect(skill).not.toContain('human confirmation');

  expect(reference).toContain('frontmatter `type`');
  expect(reference).toContain('OKF `0.1`');
  expect(reference).toContain('relative links');
  expect(reference).toContain('Create no empty taxonomy');
  expect(reference).toContain('Let the main Agent perform writes under the project contract and run the deterministic OKF validator');
});

test('grill-with-docs is explicitly target-distributed', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { kind: string; path: string; distribution: string }>;
  };
  expect(index.components['skill:grill-with-docs']).toEqual({
    kind: 'skill',
    path: 'skills/grill-with-docs',
    distribution: 'target-distributed',
  });
});
