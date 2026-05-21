import fs from 'node:fs';
import { expect, test } from 'bun:test';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

test('workflow orchestration policy keeps subagents parent-controlled and bounded', () => {
  const policyPath = 'skills/workflow-router/references/orchestration-policy.md';

  expect(fs.existsSync(policyPath)).toBe(true);

  const policy = read(policyPath);
  for (const phrase of [
    'parent workflow owner controls orchestration',
    'critical-path blockers stay local',
    'disjoint write scopes only',
    'main agent owns synthesis',
    'final user-facing conclusions',
  ]) {
    expect(policy).toContain(phrase);
  }
});

test('workflow orchestration policy keeps hooks advisory before security review', () => {
  const policy = read('skills/workflow-router/references/orchestration-policy.md');

  for (const phrase of [
    'advisory by default',
    'No hook dispatches subagents',
    'No hook performs remote writes',
    'No hook bypasses SDD alignment',
    'blocking hook requires security review',
  ]) {
    expect(policy).toContain(phrase);
  }
});

test('workflow owner skills point to the shared orchestration policy', () => {
  for (const name of [
    'workflow-router',
    'sdd-workflow',
    'diagnosis-workflow',
    'review-workflow',
    'delivery-workflow',
    'hub-maintenance-workflow',
  ]) {
    expect(read(`skills/${name}/SKILL.md`)).toContain('references/orchestration-policy.md');
  }
});

test('workflow docs record hook and subagent source decisions', () => {
  const docs = [
    'docs/workflow-router-spec.md',
    'docs/workflow-router-execution-plan.md',
    'docs/workflow-source-dossier.md',
    'docs/skill-routing.md',
  ].map(read).join('\n');

  for (const phrase of [
    'Advisory hooks only',
    'Subagents are parent-workflow controlled',
    'No automatic subagent dispatch',
    'No remote writes from hooks',
  ]) {
    expect(docs).toContain(phrase);
  }
});
