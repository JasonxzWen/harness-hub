import fs from 'node:fs';
import { expect, test } from 'bun:test';

const personalDistribution = fs.readFileSync('docs/personal-workflow-distribution.md', 'utf8');
const readme = fs.readFileSync('README.md', 'utf8');
const agents = fs.readFileSync('AGENTS.md', 'utf8');
const skillQualityGuide = fs.readFileSync('docs/skill-quality-guide.md', 'utf8');
const skillEvaluationPolicy = fs.readFileSync('docs/skill-evaluation-policy.md', 'utf8');
const sourceProjects = fs.readFileSync('docs/source-projects.md', 'utf8');
const sourceSkillInventory = fs.readFileSync('docs/source-skill-inventory.md', 'utf8');

test('personal distribution contract is the project positioning source', () => {
  expect(personalDistribution).toContain('personal workflow distribution and repo-harness layer');
  expect(personalDistribution).toContain('not a public skill marketplace');
  expect(personalDistribution).toContain('Preserve upstream skills by default');
  expect(personalDistribution).toContain('Put personal behavior in the overlay');
  expect(personalDistribution).toContain('Keep distribution simple');
  expect(personalDistribution).toContain('Acceptance Criteria');

  expect(readme).toContain('personal repo harness toolkit');
  expect(readme).toContain('keep their upstream style');
  expect(readme).toContain('docs/personal-workflow-distribution.md');
  expect(agents).toContain('repo-local agent harnesses');
  expect(agents).toContain('keep their upstream style by default');
});

test('imported skills are governed by routing overlay, not style rewrites', () => {
  expect(agents).toContain('Do not rewrite imported skill bodies solely for house style');
  expect(skillQualityGuide).toContain('Imported descriptions can keep upstream wording');
  expect(skillEvaluationPolicy).toContain('Preserve upstream body text unless');
  expect(sourceProjects).toContain('Prefer preserving upstream skill bodies over local style rewrites');
  expect(sourceProjects).toContain('Use selective adaptation only when');
});

test('package metadata reflects personal distribution scope', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
    description?: string;
  };
  const capabilityIndex = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { recommendation?: string }>;
  };

  expect(packageJson.description).toContain('Personal repo harness toolkit');
  expect(capabilityIndex.components['harness:minimal'].recommendation).toContain(
    'minimal repo-local harness',
  );
  expect(capabilityIndex.components['skill:workflow-router'].recommendation).toContain(
    'exactly one workflow owner',
  );
  expect(capabilityIndex.components['skill:workflow-router'].recommendation).not.toContain(
    'public workflow owner',
  );
});

test('default distributed imported skills have source registry coverage', () => {
  const capabilityIndex = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { source?: string }>;
  };
  const registryText = `${sourceProjects}\n${sourceSkillInventory}`;
  const sourceNeedles: Record<string, string> = {
    'anthropic-builtins-adapted': 'anthropics/skills',
    'anthropics-skills-adapted': 'anthropics/skills',
    'compound-engineering-plugin-adapted': 'EveryInc/compound-engineering-plugin',
    'everything-claude-code': 'everything-claude-code',
    'learn-faster-kit-inspired-local': 'hluaguo/learn-faster-kit',
    'mattpocock-skills-adapted': 'mattpocock/skills',
    openspec: 'Fission-AI/OpenSpec',
    'vercel-agent-skills': 'vercel-labs/agent-skills',
  };

  for (const component of Object.values(capabilityIndex.components)) {
    if (!component.source || component.source === 'local' || component.source === 'local-original') {
      continue;
    }

    const expectedNeedle = sourceNeedles[component.source];
    expect(expectedNeedle).toBeDefined();
    expect(registryText).toContain(expectedNeedle);
  }
});
