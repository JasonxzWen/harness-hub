import fs from 'node:fs';
import { expect, test } from 'bun:test';

const workflowSkills = [
  'workflow-router',
  'answer-workflow',
  'sdd-workflow',
  'diagnosis-workflow',
  'review-workflow',
  'delivery-workflow',
  'hub-maintenance-workflow',
] as const;

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

function frontmatterValue(skill: string, name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('workflow owner skills are installable and progressively loaded', () => {
  for (const name of workflowSkills) {
    const skillPath = `skills/${name}/SKILL.md`;
    const agentPath = `skills/${name}/agents/openai.yaml`;

    expect(fs.existsSync(skillPath)).toBe(true);
    expect(fs.existsSync(agentPath)).toBe(false);

    const skill = read(skillPath);
    const description = frontmatterValue(skill, 'description');

    expect(frontmatterValue(skill, 'name')).toBe(name);
    expect(description).toContain('Load when');
    expect(description.length).toBeLessThan(360);
    expect(skill.length).toBeLessThan(6500);
    expect(skill).toContain('effective-interact');
  }
});

test('workflow-router owns intent recognition but not execution', () => {
  const skill = read('skills/workflow-router/SKILL.md');

  expect(skill).toContain('exactly one workflow owner');
  expect(skill).toContain('references/intent-taxonomy.md');
  expect(skill).toContain('references/state-handoff.md');
  expect(skill).toContain('does not implement');
  expect(fs.existsSync('skills/workflow-router/references/intent-taxonomy.md')).toBe(true);
  expect(fs.existsSync('skills/workflow-router/references/state-handoff.md')).toBe(true);
});

test('sdd-workflow enforces the canonical lifecycle before implementation', () => {
  const skill = read('skills/sdd-workflow/SKILL.md');

  for (const phrase of [
    'Align user need',
    'Gather required material',
    'Write spec and acceptance',
    'Write executable plan and align',
    'Clean unneeded files',
    'Implement',
    'Test and accept',
    'Deliver report',
  ]) {
    expect(skill).toContain(phrase);
  }

  expect(skill).toContain('Do not start implementation');
  expect(skill).toContain('TDD');
  expect(skill).toContain('goal/story workflows');
  expect(skill).toContain('without approval');
});

test('read-only workflow owners block mutation by default', () => {
  const answer = read('skills/answer-workflow/SKILL.md');
  const review = read('skills/review-workflow/SKILL.md');

  expect(answer).toContain('Do not edit files');
  expect(review).toContain('Do not implement fixes');
  expect(review).toContain('Findings first');
});

test('workflow owners mark UI helper skills as conditional', () => {
  const diagnosis = read('skills/diagnosis-workflow/SKILL.md');
  const review = read('skills/review-workflow/SKILL.md');

  expect(diagnosis).toContain('only when that helper is relevant and available');
  expect(review).toContain('only when that helper is relevant and available');
});
