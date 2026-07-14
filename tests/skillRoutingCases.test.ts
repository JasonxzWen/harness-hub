import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'bun:test';

type SkillCase = {
  id: string;
  skill: string;
  kind: 'positive' | 'boundary';
  prompt: string;
  expectedSkill: string;
  expectedLoop: string;
};

const fixture = JSON.parse(fs.readFileSync('tests/fixtures/skill-routing-cases.json', 'utf8')) as {
  schemaVersion: number;
  cases: SkillCase[];
};
const ownerSkills = new Set([
  'workflow-router',
  'answer-workflow',
  'sdd-workflow',
  'diagnosis-workflow',
  'review-workflow',
  'delivery-workflow',
]);

function contracts(): Map<string, { skills: string[] }> {
  const runtime = path.resolve('skills/workflow-router/scripts/loop-runtime.mjs');
  const result = spawnSync(process.execPath, [runtime, 'contracts', '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  expect(result.status, result.stderr).toBe(0);
  const report = JSON.parse(result.stdout) as { contracts: Array<{ id: string; skills: string[] }> };
  return new Map(report.contracts.map((contract) => [contract.id, contract]));
}

test('skill routing fixture describes optional atoms owned by executable small loops', () => {
  const loopContracts = contracts();
  const ids = new Set<string>();

  expect(fixture.schemaVersion).toBe(1);
  expect(fixture.cases.some((entry) => entry.kind === 'boundary')).toBe(true);
  for (const entry of fixture.cases) {
    expect(entry.id).toMatch(/^[a-z0-9-]+$/);
    expect(ids.has(entry.id)).toBe(false);
    ids.add(entry.id);
    expect(entry.prompt.trim().length).toBeGreaterThan(12);
    expect(ownerSkills.has(entry.expectedSkill)).toBe(false);
    expect(fs.existsSync(`skills/${entry.skill}/SKILL.md`)).toBe(true);
    expect(fs.existsSync(`skills/${entry.expectedSkill}/SKILL.md`)).toBe(true);

    const contract = loopContracts.get(entry.expectedLoop);
    expect(contract, `${entry.expectedLoop} must be executable`).toBeDefined();
    expect(contract!.skills, `${entry.expectedSkill} must be composed by ${entry.expectedLoop}`).toContain(entry.expectedSkill);
    expect(entry.kind === 'positive' ? entry.expectedSkill === entry.skill : entry.expectedSkill !== entry.skill).toBe(true);
  }
});

test('skill routing fixture contains no removed Hub-only or advisory capability', () => {
  const serialized = JSON.stringify(fixture);
  for (const removed of ['hub-maintenance-workflow', 'harness-quality-check', 'workflow-check', 'advisory-check']) {
    expect(serialized).not.toContain(removed);
  }
});
