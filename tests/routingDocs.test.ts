import fs from 'node:fs';
import { expect, test } from 'bun:test';

const routing = fs.readFileSync('docs/skill-routing.md', 'utf8');
const capabilityMap = fs.readFileSync('docs/capability-map.md', 'utf8');

test('routing docs expose only five generic workflow owners', () => {
  const expected = [
    ['Read-only evidence or explanation', 'answer-workflow'],
    ['Feature/fix/refactor/policy/docs/test mutation', 'sdd-workflow'],
    ['Failure, regression, flaky behavior, performance symptom', 'diagnosis-workflow'],
    ['Report-only code/security/UI/test/risk review', 'review-workflow'],
    ['Accepted-scope validation, cleanup, PR/CI closure, handoff', 'delivery-workflow'],
  ];
  for (const [intent, owner] of expected) {
    expect(routing).toContain(intent);
    expect(routing).toContain(`\`${owner}\``);
  }

  expect(routing).toContain('Owner workflows only orchestrate small Loops');
  expect(routing).toContain('`report-loop` owns lifecycle activation');
  expect(routing).toContain('batches every independently answerable decision in the current dependency layer');
  expect(routing).toContain('serializes only when the user explicitly requests one question at a time');
  expect(routing).not.toContain('hub-maintenance-workflow');
  expect(routing).not.toContain('harness-quality-check');
});

test('capability map documents a versionless full-distribution surface', () => {
  expect(capabilityMap).toContain('versionless classification');
  expect(capabilityMap).toContain('Every current canonical skill is `target-distributed`');
  expect(capabilityMap).toContain('.claude/skills/<name>/');
  expect(capabilityMap).toContain('.agents/skills/<name>/');
  expect(capabilityMap).toContain('no named packs, optional levels, partial install sets, component versions');
});
