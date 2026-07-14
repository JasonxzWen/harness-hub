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

  expect(description).toContain('dependency-layered batch interview');
  expect(description).toContain('grill me');
  expect(description).toContain('explicitly asks to be challenged or pressure-tested');
  expect(description).toContain('assumptions are surfaced');
  expect(description).toContain('do not use for routine implementation');
  expect(description).not.toContain('one-question-at-a-time interview');
});

test('grill-me batches the current dependency frontier after exploring first', () => {
  expect(skill).toContain('inspect the repository first instead of asking the user');
  expect(skill).toContain('Ask every unresolved decision whose complete row');
  expect(skill).toContain('recommendation, rationale, tradeoff, and downstream impact');
  expect(skill).toContain('Defer a decision when any part of that row depends on an unresolved answer.');
  expect(skill).not.toContain('Ask exactly one question.');
  expect(skill).not.toContain("Wait for the user's answer before asking the next question.");
});

test('grill-me presents recommendations in a batch answer table', () => {
  expect(skill).toContain('| ID | Decision question | Options | Recommended | Why / tradeoff | Downstream impact | Answer |');
  expect(skill).toContain('Every row must include a recommended default');
  expect(skill).toContain('Do not impose an arbitrary batch-size cap.');
  expect(skill).toContain('D1: choose A');
  expect(skill).toContain('D2: accept recommendation');
  expect(skill).toContain('D3: pause until <condition>');
  expect(skill).toContain('`accept this batch`');
  expect(skill).toContain('`default`, `defaults`, and `defer`');
  expect(skill).toContain('Do not silently apply a recommendation to an unanswered row.');
});

test('grill-me exposes deferred dependencies and batch consequences', () => {
  expect(skill).toContain('| Deferred topic | Prerequisite | Why it waits |');
  expect(skill).toContain('Do not finalize the wording or options for a deferred question until its prerequisite is resolved.');
  expect(skill).toContain('Record its reason and re-entry condition');
  expect(skill).toContain('until that condition becomes true or the user explicitly reopens it');
  expect(skill).toContain('The same lifecycle applies to the `defer` alias.');
  expect(skill).toContain('| ID | Decision | Consequence | Status |');
});

test('grill-me honors an explicit serial override without changing the default', () => {
  expect(skill).toContain('Batching is the default.');
  expect(skill).toContain('If the user explicitly asks for one question at a time, honor that request');
});

test('grill-me stops before implementation', () => {
  expect(skill).toContain('Do not start implementation unless the user explicitly asks');
  expect(skill).toContain('deferred questions and their prerequisites');
  expect(skill).toContain('verification criteria for the next step');
});

test('grill-me registers the batch-grilling behavior in the install surface', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { kind: string; path: string; distribution: string }>;
  };
  const component = index.components['skill:grill-me'];

  expect(component.kind).toBe('skill');
  expect(component.path).toBe('skills/grill-me');
  expect(component.distribution).toBe('target-distributed');
});
