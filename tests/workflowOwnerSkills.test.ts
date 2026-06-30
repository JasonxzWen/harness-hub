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
    'Finish closeout',
    'Deliver report',
  ]) {
    expect(skill).toContain(phrase);
  }

  expect(skill).toContain('Do not start implementation');
  expect(skill).toContain('TDD');
  expect(skill).toContain('insight');
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

test('delivery workflow captures PR closeout without remote side effects', () => {
  const delivery = read('skills/delivery-workflow/SKILL.md');

  expect(delivery).toContain('check remote PR state after push');
  expect(delivery).toContain('mergeability');
  expect(delivery).toContain('CI/check runs');
  expect(delivery).toContain('Resolve actionable PR blockers in scope');
  expect(delivery).toContain('finish closeout');
  expect(delivery).toContain('insight recommendations');
  expect(delivery).toContain('PR URL or number');
  expect(delivery).toContain('Do not mark a PR ready');
  expect(delivery).toContain('resolve review threads');
  expect(delivery).toContain('Do not silently resolve conflicts');
});

test('workflow owners expose agentic loops as stage mechanics', () => {
  const sdd = read('skills/sdd-workflow/SKILL.md');
  const diagnosis = read('skills/diagnosis-workflow/SKILL.md');
  const review = read('skills/review-workflow/SKILL.md');
  const delivery = read('skills/delivery-workflow/SKILL.md');
  const maintenance = read('skills/hub-maintenance-workflow/SKILL.md');

  for (const skill of [sdd, diagnosis, review, delivery, maintenance]) {
    expect(skill).toContain('workflow-router/references/agentic-loops.md');
  }

  expect(sdd).toContain('plan-review');
  expect(sdd).toContain('test-design');
  expect(sdd).toContain('implementation-review');
  expect(sdd).toContain('docs-consistency');
  expect(delivery).toContain('frontend-acceptance');
  expect(delivery).toContain('pr-closeout');
  expect(delivery).toContain('docs-consistency');
  expect(delivery).toContain('insight-retro');
  expect(diagnosis).toContain('diagnosis-regression');
  expect(review).toContain('read-only arbiter');
  expect(maintenance).toContain('delegated-agent');
  expect(maintenance).toContain('docs-consistency');
});

test('workflow owners mark UI helper skills as conditional', () => {
  const diagnosis = read('skills/diagnosis-workflow/SKILL.md');
  const review = read('skills/review-workflow/SKILL.md');

  expect(diagnosis).toContain('only when that helper is relevant and available');
  expect(review).toContain('only when that helper is relevant and available');
});
