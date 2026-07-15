import { expect, test } from 'bun:test';
import fs from 'node:fs';

const skillPath = 'skills/ponytail/SKILL.md';
const skill = fs.readFileSync(skillPath, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return (match?.[1] || '').replace(/^"|"$/g, '');
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

test('ponytail stays an atomic Host-selected coding skill without a Router dependency', () => {
  const routing = fs.readFileSync('docs/skill-routing.md', 'utf8');

  expect(routing).toContain('Claude Code or Codex is the only main-Agent runtime');
  expect(routing).toContain('| YAGNI, minimum change, entity-count, subtraction review | `ponytail` |');
  expect(skill).not.toContain('workflow-router');
  expect(routing).not.toContain('skill-activation-check.mjs');
});
