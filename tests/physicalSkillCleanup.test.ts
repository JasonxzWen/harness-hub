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
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test('active skill root contains only installable skill components', () => {
  expect(localSkillDirs()).toEqual(skillComponentDirs());
});

test('source records keep external repo lineage after physical cleanup', () => {
  const sourceProjects = read('docs/source-projects.md');
  const sourceDossier = read('docs/workflow-source-dossier.md');

  for (const phrase of [
    'mattpocock/skills',
    'obra/superpowers',
    'affaan-m/everything-claude-code',
    'vercel-labs/skills',
    'vercel-labs/agent-skills',
    'open-spec/openspec',
  ]) {
    expect(sourceProjects).toContain(phrase);
  }

  for (const phrase of [
    'Matt Pocock skills',
    'Superpowers',
    'Everything Claude Code',
    'OpenSpec',
    'Effective Interact',
  ]) {
    expect(sourceDossier).toContain(phrase);
  }
});

test('removed helper skills are not used as active maintenance routes', () => {
  const agents = read('AGENTS.md');
  const routing = read('docs/skill-routing.md');
  const hubSkill = read('skills/hub-maintenance-workflow/SKILL.md');
  const capabilityIndex = read('capabilities/index.json');

  expect(agents).not.toContain('Use `skill-evaluator`');
  expect(routing).not.toContain('Use `update-harness-hub`');
  expect(hubSkill).not.toContain('`update-harness-hub` for this repository');
  expect(capabilityIndex).not.toContain('"skill:update-harness-hub"');
  expect(capabilityIndex).not.toContain('"skill:skill-evaluator"');
  expect(capabilityIndex).not.toContain('"skill:agent-sort"');
});

test('active skill bodies do not recommend physically removed helper skills', () => {
  const removedHelperNames = [
    'agent-sort',
    'api-design',
    'backend-patterns',
    'deep-research',
    'exa-search',
    'find-skills',
    'skill-evaluator',
    'update-harness-hub',
    'vercel-composition-patterns',
    'vercel-react-best-practices',
    'vercel-react-view-transitions',
  ];

  for (const skillName of localSkillDirs()) {
    const skillPath = path.join('skills', skillName, 'SKILL.md');
    const skill = read(skillPath);

    for (const removedName of removedHelperNames) {
      expect(skill, `${skillPath} should not reference removed helper ${removedName}`).not.toContain(
        `\`${removedName}\``,
      );
      expect(skill, `${skillPath} should not reference removed helper ${removedName}`).not.toContain(removedName);
    }
  }
});
