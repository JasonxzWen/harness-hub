import { expect, test } from 'bun:test';
import fs from 'node:fs';

test('package manifest keeps release validation and source traceability explicit', () => {
  const artifactPolicy = JSON.parse(fs.readFileSync('config/artifact-policy.json', 'utf8')) as {
    categories: { gitOnly: string[]; ignoredLocal: string[] };
    git: { ignored: string[] };
    npm: { files: string[]; forbidden: string[] };
  };
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
    name?: string;
    repository?: { type?: string; url?: string };
    homepage?: string;
    bugs?: { url?: string };
    publishConfig?: { access?: string; registry?: string };
    bin?: Record<string, string>;
    files: string[];
    scripts: Record<string, string>;
  };

  expect(packageJson.name).toBe('@jasonwen/harness-hub');
  expect(Object.keys(packageJson.bin ?? {})).toEqual(['harness-hub']);
  expect(packageJson.bin?.['harness-hub']).toBe('bin/harness-hub.mjs');
  expect(packageJson.repository?.url).toBe('git+https://github.com/JasonxzWen/harness-hub.git');
  expect(packageJson.homepage).toBe('https://github.com/JasonxzWen/harness-hub#readme');
  expect(packageJson.bugs?.url).toBe('https://github.com/JasonxzWen/harness-hub/issues');
  expect(packageJson.publishConfig?.access).toBe('public');
  expect(packageJson.publishConfig?.registry).toBe('https://registry.npmjs.org/');
  expect(packageJson.scripts['validate:release']).toContain('bun run validate');
  expect(packageJson.scripts['validate:release']).toContain('bun run build');
  expect(packageJson.scripts['validate:release']).toContain('node bin/harness-hub.mjs --help');
  expect(packageJson.scripts['validate:release']).toContain('node bin/harness-hub.mjs check . --json');
  expect(packageJson.scripts['validate:release'].match(/node bin\/harness-hub\.mjs --help/g)?.length).toBe(1);
  expect(packageJson.scripts['validate:release']).toContain('npm pack --dry-run');
  expect(packageJson.scripts.validate).toContain('bun run validate:artifact-policy');
  expect(packageJson.scripts.validate).toContain('bun run validate:skills');
  expect(packageJson.files).toEqual(artifactPolicy.npm.files);
  expect(packageJson.files).toContain('CHANGELOG.md');
  expect(packageJson.files).toContain('BOOTSTRAP-TARGET.md');
  expect(packageJson.files).toContain('README.zh-CN.md');
  expect(packageJson.files).toContain('CLAUDE.md');
  expect(packageJson.files).toContain('config/');
  expect(packageJson.files).toContain('harness/');
  expect(packageJson.files).toContain('scripts/sync-agent-skills.mjs');
  expect(packageJson.files).toContain('scripts/harness-agent-gate.mjs');
  expect(packageJson.files).not.toContain('scripts/check-codex-worktree.mjs');
  expect(packageJson.files).not.toContain('scripts/sync-codex-skills.mjs');
  expect(packageJson.files).not.toContain('scripts/setup-codex-worktree.mjs');
  expect(packageJson.files).not.toContain('scripts/install-codex-worktree-hook.mjs');
  expect(packageJson.files).toContain('scripts/run-validate-skills.mjs');
  expect(packageJson.files).toContain('openspec/config.yaml');
  expect(packageJson.files).toContain('openspec/specs/');
  expect(packageJson.files).not.toContain('openspec/');
  expect(packageJson.files).not.toContain('site/');
  expect(artifactPolicy.categories.gitOnly).toContain('site/');
  expect(artifactPolicy.categories.gitOnly).not.toContain('reports/');
  expect(artifactPolicy.categories.ignoredLocal).toContain('reports/');
  expect(artifactPolicy.categories.ignoredLocal).toContain('.harness-hub/state/');
  expect(artifactPolicy.categories.ignoredLocal).toContain('.codex/');
  expect(artifactPolicy.categories.ignoredLocal).toContain('.claude/');
  expect(artifactPolicy.git.ignored).toContain('reports/');
  expect(artifactPolicy.git.ignored).toContain('.harness-hub/state/');
  expect(artifactPolicy.git.ignored).toContain('.codex/');
  expect(artifactPolicy.git.ignored).toContain('.claude/');
  expect(artifactPolicy.npm.forbidden).toContain('site/');
  expect(artifactPolicy.npm.forbidden).toContain('reports/');
  expect(artifactPolicy.npm.forbidden).toContain('.codex/');
  expect(artifactPolicy.npm.forbidden).toContain('.claude/');
});

test('npm package publishes the personal distributed skill source tree', () => {
  const artifactPolicy = JSON.parse(fs.readFileSync('config/artifact-policy.json', 'utf8')) as {
    npm: { files: string[] };
  };
  const capabilityIndex = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { kind: string; path: string }>;
  };

  const skillComponentPaths = Object.values(capabilityIndex.components)
    .filter((component) => component.kind === 'skill')
    .map((component) => component.path)
    .sort();

  expect(artifactPolicy.npm.files).toContain('skills/');
  expect(artifactPolicy.npm.files).toContain('harness/');
  expect(artifactPolicy.npm.files).toContain('.claude-plugin/');
  expect(artifactPolicy.npm.files).not.toContain('.codex/');
  expect(artifactPolicy.npm.files).not.toContain('.codex/skills/');
  expect(artifactPolicy.npm.files).not.toContain('.claude/');
  expect(artifactPolicy.npm.files).not.toContain('.claude/skills/');
  expect(skillComponentPaths).toContain('skills/workflow-router');
  expect(skillComponentPaths).not.toContain('skills/everything-claude-code');
  expect(Object.entries(capabilityIndex.components)
    .filter(([, component]) => component.kind === 'skill')
    .map(([id]) => id)).not.toContain('harness:minimal');
});

test('npm publish workflow uses trusted publishing and release tag checks', () => {
  const workflow = fs.readFileSync('.github/workflows/publish-npm.yml', 'utf8');

  expect(workflow).toContain('release:');
  expect(workflow).not.toContain('pull_request:');
  expect(workflow).toContain('id-token: write');
  expect(workflow).toContain('actions/setup-node@v6');
  expect(workflow).toContain('node-version: "24"');
  expect(workflow).toContain('bun run validate:release');
  expect(workflow).toContain('npm publish --access public');
  expect(workflow).toContain('Release tag ${GITHUB_REF_NAME} does not match package version ${EXPECTED_TAG}.');
});

test('release policy and PR template require release decisions without PR-time publishing', () => {
  const artifactPolicy = JSON.parse(fs.readFileSync('config/artifact-policy.json', 'utf8')) as {
    npm: { files: string[]; forbidden: string[] };
  };
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
    files: string[];
  };
  const npmPublishingDoc = fs.readFileSync('docs/npm-publishing.md', 'utf8');
  const releasePolicy = fs.readFileSync('docs/release-policy.md', 'utf8');
  const prTemplate = fs.readFileSync('.github/PULL_REQUEST_TEMPLATE.md', 'utf8');
  const categories = ['none', 'patch', 'minor', 'major', 'prerelease'];

  expect(npmPublishingDoc).toContain('[Release Policy](release-policy.md)');
  expect(npmPublishingDoc).toContain('PR creation must not publish npm `latest`');
  expect(packageJson.files).toContain('docs/');
  expect(packageJson.files).not.toContain('.github/');
  expect(artifactPolicy.npm.files).toContain('docs/');
  expect(artifactPolicy.npm.forbidden).toContain('.github/');

  expect(releasePolicy).toContain('A pull request does not automatically publish a formal npm `latest` release.');
  expect(releasePolicy).toContain('Formal npm publishing remains controlled by a maintainer-created GitHub Release.');
  expect(releasePolicy).toContain('Do not publish a prerelease from automation unless the maintainer explicitly requested that remote mutation.');
  expect(releasePolicy).toContain('Add a lightweight PR-body check only if authors repeatedly omit the release-impact section.');
  for (const category of categories) {
    expect(releasePolicy).toContain(`\`${category}\``);
    expect(prTemplate).toContain(`\`${category}\``);
  }

  expect(prTemplate).toContain('Select exactly one category and explain the choice.');
  expect(prTemplate).toContain('This PR does not publish npm `latest`.');
  expect(prTemplate).toContain('No PR-time publish, tag, merge, or credential mutation is introduced.');
});
