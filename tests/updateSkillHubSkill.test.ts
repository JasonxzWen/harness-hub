import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillDir = '.agents/skills/update-skill-hub';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

test('update-skill-hub has a narrow maintenance trigger', () => {
  const skill = read(`${skillDir}/SKILL.md`);
  const description = skill.match(/^description:\s*"(.*)"$/m)?.[1] || '';

  expect(skill).toContain('name: update-skill-hub');
  expect(description.startsWith('Load when')).toBe(true);
  expect(description.split(/\s+/).length).toBeLessThanOrEqual(50);
  expect(description).toContain('auditing installed skill versions');
  expect(description).toContain('do not load for ordinary package dependency updates');
});

test('update-skill-hub protects target fit and local adaptations', () => {
  const skill = read(`${skillDir}/SKILL.md`);

  expect(skill).toContain('Deterministic CLI lane');
  expect(skill).toContain('AI guidance lane');
  expect(skill).toContain('npx skill-hub install');
  expect(skill).toContain('npx skill-hub update');
  expect(skill).toContain('Do not reimplement deterministic install, update, status, or remove behavior');
  expect(skill).toContain('Do not install a skill without target-repo evidence');
  expect(skill).toContain('A backend-only repo does not get frontend');
  expect(skill).toContain('Preserve local Codex adaptations');
  expect(skill).toContain('Use `skill-evaluator` for third-party repositories');
  expect(skill).toContain('Update `capabilities/index.json` only when an installable profile or managed component changes');
});

test('update-skill-hub keeps detailed decision rules in a reference spoke', () => {
  const reference = read(`${skillDir}/references/decision-rules.md`);

  expect(fs.existsSync(`${skillDir}/agents/openai.yaml`)).toBe(true);
  expect(reference).toContain('| Existing installed or adapted skill has no upstream delta | `no update` |');
  expect(reference).toContain('| New candidate fills an evidenced gap for the target repo | `install` or `adapt` |');
  expect(reference).toContain('backend-only repositories do not get frontend');
  expect(reference).toContain('Search results only as discovery, not final evidence');
});
