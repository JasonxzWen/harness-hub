import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'bun:test';

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function skillComponentDirs(): string[] {
  const capabilityIndex = JSON.parse(read('capabilities/index.json')) as {
    components: Record<string, { kind: string; path: string }>;
  };

  return Object.values(capabilityIndex.components)
    .filter((component) => component.kind === 'skill')
    .map((component) => path.basename(component.path))
    .sort();
}

function localSkillDirs(): string[] {
  return fs
    .readdirSync('skills', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join('skills', entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
}

test('active skill root contains only installable skill components', () => {
  expect(localSkillDirs()).toEqual(skillComponentDirs());
});

test('source records keep only current lineage and stay source-repository scoped', () => {
  const sourceProjects = read('docs/source-projects.md');

  for (const phrase of [
    'type: records',
    'okf_version: "0.1"',
    'mattpocock/skills',
    'multica-ai/andrej-karpathy-skills',
    'DietrichGebert/ponytail',
    'Leonxlnx/taste-skill',
    'JCodesMore/ai-website-cloner-template',
    'ThariqS/html-effectiveness',
    'full migration does not copy this file',
    'Target-project knowledge, task cards, sessions, eval cases, and product facts never belong',
  ]) {
    expect(sourceProjects).toContain(phrase);
  }

  expect(sourceProjects).not.toContain('.harness-hub/context');
  expect(sourceProjects).not.toContain('harness/website-cloner');
  expect(sourceProjects).not.toContain('harness-quality-check');
  expect(fs.existsSync('docs/source-skill-inventory.md')).toBe(false);
});

test('removed helper skills are not used as active maintenance routes', () => {
  const agents = read('AGENTS.md');
  const routing = read('docs/skill-routing.md');
  const capabilityIndex = read('capabilities/index.json');

  expect(agents).not.toContain('Use `skill-evaluator`');
  expect(routing).not.toContain('Use `update-harness-hub`');
  expect(capabilityIndex).not.toContain('"skill:update-harness-hub"');
  expect(capabilityIndex).not.toContain('"skill:skill-evaluator"');
  expect(capabilityIndex).not.toContain('"skill:agent-sort"');
  expect(capabilityIndex).not.toContain('"skill:hub-maintenance-workflow"');
  expect(capabilityIndex).not.toContain('"skill:harness-quality-check"');
});

test('active skill bodies do not recommend removed or unavailable helper skills', () => {
  const removedHelperNames = [
    'agent-sort',
    'api-design',
    'backend-patterns',
    'continuous-learning-v2',
    'council',
    'deep-research',
    'exa-search',
    'find-skills',
    'skill-evaluator',
    'strategic-compact',
    'update-harness-hub',
    'vercel-composition-patterns',
    'vercel-react-best-practices',
    'vercel-react-view-transitions',
  ];

  for (const skillName of localSkillDirs()) {
    const skillPath = path.join('skills', skillName, 'SKILL.md');
    const skill = read(skillPath);

    expect(skill, `${skillPath} should not classify itself as a workflow Skill`).not.toContain(
      'This is a workflow skill',
    );

    for (const removedName of removedHelperNames) {
      expect(skill, `${skillPath} should not reference removed helper ${removedName}`).not.toContain(
        `\`${removedName}\``,
      );
      expect(skill, `${skillPath} should not reference removed helper ${removedName}`).not.toContain(removedName);
    }
  }
});
