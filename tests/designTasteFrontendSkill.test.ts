import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillDir = 'skills/design-taste-frontend';
const skill = fs.readFileSync(`${skillDir}/SKILL.md`, 'utf8');

function frontmatterValue(key: string): string {
  const match = skill.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() || '';
}

test('design-taste-frontend is a narrow Taste Skill adaptation with source metadata', () => {
  expect(frontmatterValue('name')).toBe('design-taste-frontend');
  expect(frontmatterValue('description')).toContain('anti-template frontend visual direction');
  expect(frontmatterValue('description')).toContain('landing pages');
  expect(frontmatterValue('description')).toContain('portfolios');
  expect(frontmatterValue('description')).toContain('redesigns');
  expect(frontmatterValue('description')).toContain('do not load for dashboards');
  expect(frontmatterValue('source')).toBe('https://github.com/Leonxlnx/taste-skill');
  expect(frontmatterValue('upstream_commit')).toBe('3c7017d636c3a4aad378433ea6d0cfa6c921da4a');
  expect(frontmatterValue('license')).toBe('MIT');
  expect(fs.existsSync(`${skillDir}/agents`)).toBe(false);
});

test('design-taste-frontend keeps long upstream taste rules in references', () => {
  const designRead = fs.readFileSync(`${skillDir}/references/design-read-and-systems.md`, 'utf8');
  const visualDiscipline = fs.readFileSync(`${skillDir}/references/visual-discipline.md`, 'utf8');
  const redesign = fs.readFileSync(`${skillDir}/references/redesign-and-preflight.md`, 'utf8');

  expect(skill).toContain('references/design-read-and-systems.md');
  expect(skill).toContain('references/visual-discipline.md');
  expect(skill).toContain('references/redesign-and-preflight.md');
  expect(designRead).toContain('DESIGN_VARIANCE');
  expect(designRead).toContain('MOTION_INTENSITY');
  expect(designRead).toContain('VISUAL_DENSITY');
  expect(designRead).toContain('official design system');
  expect(visualDiscipline).toContain('AI-purple');
  expect(visualDiscipline).toContain('three equal feature cards');
  expect(visualDiscipline).toContain('prefers-reduced-motion');
  expect(redesign).toContain('dashboards, dense data tables');
  expect(redesign).toContain('Final Pre-Flight');
});

test('design-taste-frontend is installable with frontend boundary metadata', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { path: string; source?: string; overlapsWith?: string[]; routing?: string }>;
  };
  const routingDocs = fs.readFileSync('docs/skill-routing.md', 'utf8');
  const sourceProjects = fs.readFileSync('docs/source-projects.md', 'utf8');
  const sourceInventory = fs.readFileSync('docs/source-skill-inventory.md', 'utf8');
  const component = index.components['skill:design-taste-frontend'];

  expect(component.path).toBe('skills/design-taste-frontend');
  expect(component.source).toBe('Leonxlnx/taste-skill');
  expect(component.overlapsWith).toEqual(expect.arrayContaining([
    'skill:frontend-design',
    'skill:frontend-patterns',
    'skill:effective-interact',
  ]));
  expect(component.routing).toContain('landing pages');
  expect(component.routing).toContain('do not use for dashboards');
  expect(routingDocs).toContain('`design-taste-frontend` loads for anti-template visual direction');
  expect(sourceProjects).toContain('Installed a narrow `design-taste-frontend` standard skill');
  expect(sourceInventory).toContain('Installed as `design-taste-frontend`');
});
