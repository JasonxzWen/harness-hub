import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillDir = 'skills/karpathy-guidelines';
const skill = fs.readFileSync(`${skillDir}/SKILL.md`, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim() || '';
}

test('karpathy-guidelines keeps upstream standard skill body with local routing metadata', () => {
  expect(fs.existsSync(`${skillDir}/SKILL.md`)).toBe(true);
  expect(fs.existsSync(`${skillDir}/CLAUDE.md`)).toBe(false);
  expect(fs.existsSync(`${skillDir}/.cursor`)).toBe(false);
  expect(fs.existsSync(`${skillDir}/.claude-plugin`)).toBe(false);

  expect(frontmatterValue('name')).toBe('karpathy-guidelines');
  const description = frontmatterValue('description');
  expect(description.startsWith('Load when')).toBe(true);
  expect(description).toContain('workflow-router-selected owner workflow');
  expect(description).toContain('coding behavior baseline');
  expect(description).toContain('do not use as the top-level owner');
  expect(frontmatterValue('source')).toBe('https://github.com/multica-ai/andrej-karpathy-skills');
  expect(frontmatterValue('upstream_commit')).toBe('2c606141936f1eeef17fa3043a72095b4765b9c2');
  expect(frontmatterValue('license')).toBe('MIT');
});

test('karpathy-guidelines retains the four upstream behavior principles', () => {
  expect(skill).toContain('Think Before Coding');
  expect(skill).toContain('Simplicity First');
  expect(skill).toContain('Surgical Changes');
  expect(skill).toContain('Goal-Driven Execution');
  expect(skill).toContain('State your assumptions explicitly');
  expect(skill).toContain('Minimum code that solves the problem');
  expect(skill).toContain('Touch only what you must');
  expect(skill).toContain('Define success criteria');
});

test('karpathy-guidelines is installable as a helper baseline with source coverage', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, {
      kind: string;
      path: string;
      distribution: string;
    }>;
  };
  const sourceProjects = fs.readFileSync('docs/source-projects.md', 'utf8');
  const component = index.components['skill:karpathy-guidelines'];

  expect(component.kind).toBe('skill');
  expect(component.path).toBe(skillDir);
  expect(component.distribution).toBe('target-distributed');
  expect(sourceProjects).toContain('`multica-ai/andrej-karpathy-skills`');
  expect(sourceProjects).toContain('`2c606141936f1eeef17fa3043a72095b4765b9c2`');
  expect(sourceProjects).toContain('MIT stated by upstream README/plugin metadata');
  expect(sourceProjects).toContain('Installed `karpathy-guidelines` as a standard helper skill');
});
