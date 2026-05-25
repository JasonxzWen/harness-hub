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
    'diagnosis without reproduction/evidence',
    'delivery without validation or handoff',
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

test('active skill bodies do not invoke host-specific subagent tools', () => {
  for (const name of fs.readdirSync('skills')) {
    const skillPath = `skills/${name}/SKILL.md`;
    if (!fs.existsSync(skillPath)) {
      continue;
    }

    const skill = read(skillPath);
    expect(skill, `${name} must not invoke spawn_agent directly`).not.toContain('spawn_agent');
    expect(skill, `${name} must not hard-code subagent_type payloads`).not.toContain('subagent_type');
  }
});

test('active skill references do not keep upstream unconditional subagent instructions', () => {
  const reference = read('skills/mcp-builder/references/evaluation.md');

  for (const phrase of [
    'Parallelize this step AS MUCH AS POSSIBLE',
    'individual sub-agents',
    'Remember to parallelize solving tasks',
  ]) {
    expect(reference).not.toContain(phrase);
  }

  expect(reference).toContain('workflow-router/references/orchestration-policy.md');
  expect(reference).toContain('active workflow plan explicitly permits independent read-only scopes');
  expect(reference).toContain('main agent keeps synthesis');
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
