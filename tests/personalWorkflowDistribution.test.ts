import fs from 'node:fs';
import { expect, test } from 'bun:test';

const personalDistribution = fs.readFileSync('docs/personal-workflow-distribution.md', 'utf8');
const bootstrapTarget = fs.readFileSync('BOOTSTRAP-TARGET.md', 'utf8');
const readme = fs.readFileSync('README.md', 'utf8');
const readmeZh = fs.readFileSync('README.zh-CN.md', 'utf8');
const agents = fs.readFileSync('AGENTS.md', 'utf8');
const skillQualityGuide = fs.readFileSync('docs/skill-quality-guide.md', 'utf8');
const skillEvaluationPolicy = fs.readFileSync('docs/skill-evaluation-policy.md', 'utf8');
const sourceProjects = fs.readFileSync('docs/source-projects.md', 'utf8');
const sourceSkillInventory = fs.readFileSync('docs/source-skill-inventory.md', 'utf8');
const workflowSourceDossier = fs.readFileSync('docs/workflow-source-dossier.md', 'utf8');
const capabilityMap = fs.readFileSync('docs/capability-map.md', 'utf8');
const harnessVocabulary = fs.readFileSync('docs/harness-vocabulary.md', 'utf8');
const standardTargetBoundary = fs.readFileSync('docs/standard-target-boundary.md', 'utf8');

test('personal distribution contract is the project positioning source', () => {
  expect(personalDistribution).toContain('personal workflow distribution and repo-harness layer');
  expect(personalDistribution).toContain('not a public skill marketplace');
  expect(personalDistribution).toContain('Preserve upstream skills by default');
  expect(personalDistribution).toContain('Put personal behavior in the overlay');
  expect(personalDistribution).toContain('Keep distribution simple');
  expect(personalDistribution).toContain('Single Standard Target Policy');
  expect(personalDistribution).toContain('one supported user-facing target experience: `standard`');
  expect(personalDistribution).toContain('`harness:minimal` and `harness/minimal/` are internal component/template identifiers');
  expect(personalDistribution).toContain('Acceptance Criteria');

  expect(readme).toContain('personal repo harness toolkit');
  expect(readme).toContain('one user-facing target path: `standard`');
  expect(readme).toContain('`harness:minimal` is only the internal component/template ID');
  expect(readme).toContain('keep their upstream style');
  expect(readme).toContain('docs/personal-workflow-distribution.md');
  expect(readme).toContain('docs/standard-target-boundary.md');
  expect(agents).toContain('repo-local agent harnesses');
  expect(agents).toContain('keep their upstream style by default');
  expect(agents).toContain('receives only this Harness Hub repository link');
  expect(agents).toContain('must follow [BOOTSTRAP-TARGET.md](BOOTSTRAP-TARGET.md)');
  expect(agents).toContain('treat the link as documentation and CLI source, not as a template to copy');
  expect(agents).toContain('report a bootstrap blocker instead of improvising a manual copy');
});

test('README localization stays complete but entry-focused', () => {
  expect(readme).toContain('README.zh-CN.md');
  expect(readmeZh).toContain('README.md');
  expect(readme).toContain('## Visual Navigator');
  expect(readmeZh).toContain('## 可视化导航');
  expect(readme).toContain('## Choose A Path');
  expect(readme).toContain('### Link-only agent bootstrap');
  expect(readme).toContain('[Bootstrap A Target Repository](BOOTSTRAP-TARGET.md)');
  expect(readme).toContain('If you are an agent working in another repo and received only this Harness Hub repository link');
  expect(readme).toContain('do not copy this checkout into the target');
  expect(readme).toContain('npx @jasonwen/harness-hub@latest init-harness');
  expect(readme).toContain('npx @jasonwen/harness-hub loop evaluate');
  expect(readme).toContain('If neither the npm CLI nor the source CLI can run, report a bootstrap blocker');
  expect(readmeZh).toContain('### Link-only agent bootstrap');
  expect(readmeZh).toContain('[Bootstrap A Target Repository](BOOTSTRAP-TARGET.md)');
  expect(readme).toContain('This is the Harness Hub source checkout layout, not the target initialization output.');
  expect(readme).toContain('Target initialization never copies `.claude-plugin/`, root `openspec/`, `docs/`, `config/`, `package.json`');
  expect(readmeZh).toContain('不是 target 初始化输出');
  expect(readmeZh).toContain('`.claude-plugin/`、root `openspec/`、`docs/`、`config/`、`package.json`');
  expect(readmeZh).toContain('## 选择入口');
  expect(readmeZh).toContain('flowchart TD');
  expect(readmeZh).toContain('npx @jasonwen/harness-hub init-harness');
  expect(readmeZh).toContain('npx @jasonwen/harness-hub loop evaluate');
  expect(readmeZh).toContain('bun run validate');

  expect(personalDistribution).toContain('Keep README localization entry-focused');
  expect(personalDistribution).toContain('README files are human-facing entrypoints');
  expect(personalDistribution).toContain('Agent-facing execution rules belong in `AGENTS.md`');
  expect(personalDistribution).toContain('core commands, capability map, and default development workflow');
  expect(personalDistribution).toContain('does not need to mirror every governance detail word for word');
});

test('bootstrap target guide gives link-only agents a copy-safe contract', () => {
  expect(bootstrapTarget).toContain('Treat this repository as documentation and a CLI source, not as a template.');
  expect(bootstrapTarget).toContain('npx @jasonwen/harness-hub@latest init-harness');
  expect(bootstrapTarget).toContain('clone Harness Hub outside the target worktree');
  expect(bootstrapTarget).toContain('Do not copy these Harness Hub source-repo paths into the target repository');
  expect(bootstrapTarget).toContain('.claude-plugin/');
  expect(bootstrapTarget).toContain('openspec/');
  expect(bootstrapTarget).toContain("this repository's root `AGENTS.md`");
  expect(bootstrapTarget).toContain('Stop and report a bootstrap blocker instead of manually copying folders');
  expect(bootstrapTarget).toContain('forbidden source-repo paths are absent from the target root');
});

test('imported skills are governed by routing overlay, not style rewrites', () => {
  expect(agents).toContain('Do not rewrite imported skill bodies solely for house style');
  expect(skillQualityGuide).toContain('Imported descriptions can keep upstream wording');
  expect(skillEvaluationPolicy).toContain('Preserve upstream body text unless');
  expect(sourceProjects).toContain('Prefer preserving upstream skill bodies over local style rewrites');
  expect(sourceProjects).toContain('Use selective adaptation only when');
});

test('local vocabulary governs concept boundaries without rewriting imported skills', () => {
  expect(sourceProjects).toContain('mattpocock/dictionary-of-ai-coding');
  expect(sourceProjects).toContain('Reference-only');
  expect(sourceProjects).toContain('do not copy dictionary entry text');
  expect(sourceProjects).toContain('no license file or `package.json` license field');

  expect(skillQualityGuide).toContain('Vocabulary And Concept Boundary');
  expect(skillQualityGuide).toContain('docs/harness-vocabulary.md');
  expect(skillQualityGuide).toContain('Do not rewrite imported skill bodies merely because');
  expect(skillQualityGuide).toContain('Do not copy external glossary text into local skills');

  expect(harnessVocabulary).toContain('local-original wording');
  expect(harnessVocabulary).toContain('Do not rewrite imported skill bodies only to match this vocabulary');
  expect(harnessVocabulary).toContain('`skill`');
  expect(harnessVocabulary).toContain('`tool`');
  expect(harnessVocabulary).toContain('`automated check`');
  expect(harnessVocabulary).toContain('`automated review`');
  expect(harnessVocabulary).toContain('Effective Interact Explainer Shape');
});

test('Matt Pocock source refresh records selective absorption without expanding install surface', () => {
  const docs = `${sourceProjects}\n${sourceSkillInventory}\n${workflowSourceDossier}\n${capabilityMap}`;

  expect(sourceProjects).toContain('999745ead1b37119380ad1f4de2bcdda5aa5bc84');
  expect(sourceSkillInventory).toContain('37 total `SKILL.md`; 17 plugin-registered active');
  expect(sourceSkillInventory).toContain('`mattpocock/skills` 2026-06-30 Refresh Decision');

  expect(docs).toContain('`codebase-design`');
  expect(docs).toContain('`improve-codebase-architecture`');
  expect(docs).toContain('deep modules');
  expect(docs).toContain('review/refactor rubrics');

  expect(docs).toContain('`domain-modeling`');
  expect(docs).toContain('docs-consistency');
  expect(docs).toContain('LLM Wiki');
  expect(docs).toContain('human-confirmed');

  expect(docs).toContain('`writing-great-skills`');
  expect(docs).toContain('skill-quality');
  expect(docs).toContain('evals');

  expect(sourceProjects).toContain('`to-prd`, `to-issues`, `triage`, `setup-matt-pocock-skills`, and `implement`');
  expect(sourceProjects).toContain('Reject by default');
  expect(sourceProjects).toContain('external issue-tracker');
  expect(sourceProjects).toContain('Do not import the hard rule to always resolve and never abort');
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
    'standard target harness',
  );
  expect(capabilityIndex.components['skill:workflow-router'].recommendation).toContain(
    'exactly one workflow owner',
  );
  expect(capabilityIndex.components['skill:workflow-router'].recommendation).not.toContain(
    'public workflow owner',
  );
});

test('standard target boundary replaces stale harness pack policy', () => {
  expect(fs.existsSync('docs/harness-packs.md')).toBe(false);
  expect(standardTargetBoundary).toContain('Harness Hub has one user-facing target path: `standard`');
  expect(standardTargetBoundary).toContain('`harness:minimal` and `harness/minimal/` are internal component/template identifiers');
  expect(standardTargetBoundary).toContain('must not create pack levels');
  expect(personalDistribution).toContain('The only supported target experience is `standard`');
  expect(sourceProjects).toContain('single `standard` path');
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
    'hardikpandya/stop-slop': 'hardikpandya/stop-slop',
    'JCodesMore/ai-website-cloner-template': 'JCodesMore/ai-website-cloner-template',
    'Leonxlnx/taste-skill': 'Leonxlnx/taste-skill',
    'learn-faster-kit-inspired-local': 'hluaguo/learn-faster-kit',
    'mattpocock-skills-adapted': 'mattpocock/skills',
    'multica-ai/andrej-karpathy-skills': 'multica-ai/andrej-karpathy-skills',
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
