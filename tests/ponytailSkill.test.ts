import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const skillPath = 'skills/ponytail/SKILL.md';
const skill = fs.readFileSync(skillPath, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return (match?.[1] || '').replace(/^"|"$/g, '');
}

function activation(prompt: string): string | null {
  const result = spawnSync(
    process.execPath,
    ['skills/workflow-router/scripts/skill-activation-check.mjs', '--prompt', prompt, '--json'],
    { encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout).selectedSkill;
}

test('ponytail imports the core coding-minimalism skill with local routing metadata', () => {
  const description = frontmatterValue('description');

  expect(frontmatterValue('name')).toBe('ponytail');
  expect(frontmatterValue('license')).toBe('MIT');
  expect(description.startsWith('Load when')).toBe(true);
  expect(description.split(/\s+/).length).toBeLessThanOrEqual(50);
  expect(description).toContain('coding work should be deliberately minimal');
  expect(description).toContain('YAGNI');
  expect(description).toContain('over-engineering review');
  expect(description).toContain('do not load for non-coding concise reports');
});

test('ponytail preserves the upstream ladder and safety boundaries', () => {
  expect(skill).toContain('ACTIVE EVERY RESPONSE');
  expect(skill).toContain('Does this need to exist at all?');
  expect(skill).toContain('Already in this codebase?');
  expect(skill).toContain('Stdlib does it?');
  expect(skill).toContain('Native platform feature covers it?');
  expect(skill).toContain('Already-installed dependency solves it?');
  expect(skill).toContain('minimum code that works');
  expect(skill).toContain('Bug fix = root cause, not symptom');
  expect(skill).toContain('Never simplify away: input validation at trust boundaries');
  expect(skill).toContain('Lazy code without its check is unfinished');
});

test('ponytail is registered as a standard distributed helper with source coverage', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, {
      kind: string;
      path: string;
      distribution: string;
    }>;
  };
  const sourceProjects = fs.readFileSync('docs/source-projects.md', 'utf8');
  const component = index.components['skill:ponytail'];

  expect(component.kind).toBe('skill');
  expect(component.path).toBe('skills/ponytail');
  expect(component.distribution).toBe('target-distributed');
  expect(sourceProjects).toContain('`DietrichGebert/ponytail`');
  expect(sourceProjects).toContain('`1b2760d384c44e573a9d8c7a729fac616e5c3a76`');
  expect(sourceProjects).toContain('Installed the core `ponytail` standard skill');
});

test('ponytail activation covers coding minimalism without stealing reports', () => {
  expect(activation('Use the simplest solution: fix this parser with the smallest correct diff and no unrequested abstractions.')).toBe('ponytail');
  expect(activation('Review this diff for over-engineering and unnecessary dependencies.')).toBe('ponytail');
  expect(activation('Create a concise visual handoff report with validation evidence and risks.')).toBe('effective-interact');
  expect(activation('Before declaring this task done, run the final build, typecheck, lint, tests, smoke checks, and artifact validation.')).toBe('verification-loop');
});
