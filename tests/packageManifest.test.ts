import { expect, test } from 'bun:test';
import fs from 'node:fs';

test('package manifest keeps release validation and source traceability explicit', () => {
  const artifactPolicy = JSON.parse(fs.readFileSync('config/artifact-policy.json', 'utf8')) as {
    npm: { files: string[] };
  };
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
    name?: string;
    repository?: { type?: string; url?: string };
    homepage?: string;
    bugs?: { url?: string };
    publishConfig?: { access?: string; registry?: string };
    files: string[];
    scripts: Record<string, string>;
  };

  expect(packageJson.name).toBe('@jasonwen/skill-hub');
  expect(packageJson.repository?.url).toBe('git+https://github.com/JasonxzWen/skill-hub.git');
  expect(packageJson.homepage).toBe('https://github.com/JasonxzWen/skill-hub#readme');
  expect(packageJson.bugs?.url).toBe('https://github.com/JasonxzWen/skill-hub/issues');
  expect(packageJson.publishConfig?.access).toBe('public');
  expect(packageJson.publishConfig?.registry).toBe('https://registry.npmjs.org/');
  expect(packageJson.scripts['validate:release']).toContain('bun run validate');
  expect(packageJson.scripts['validate:release']).toContain('bun run build');
  expect(packageJson.scripts['validate:release']).toContain('node bin/skill-hub.mjs --help');
  expect(packageJson.scripts['validate:release']).toContain('npm pack --dry-run');
  expect(packageJson.scripts.validate).toContain('bun run validate:artifact-policy');
  expect(packageJson.files).toEqual(artifactPolicy.npm.files);
  expect(packageJson.files).toContain('CHANGELOG.md');
  expect(packageJson.files).toContain('config/');
  expect(packageJson.files).toContain('harness/');
  expect(packageJson.files).toContain('openspec/config.yaml');
  expect(packageJson.files).toContain('openspec/specs/');
  expect(packageJson.files).toContain('openspec/changes/archive/');
  expect(packageJson.files).not.toContain('openspec/');
});

test('npm publish workflow uses trusted publishing and release tag checks', () => {
  const workflow = fs.readFileSync('.github/workflows/publish-npm.yml', 'utf8');

  expect(workflow).toContain('release:');
  expect(workflow).toContain('id-token: write');
  expect(workflow).toContain('actions/setup-node@v6');
  expect(workflow).toContain('node-version: "24"');
  expect(workflow).toContain('bun run validate:release');
  expect(workflow).toContain('npm publish --access public');
  expect(workflow).toContain('Release tag ${GITHUB_REF_NAME} does not match package version ${EXPECTED_TAG}.');
});
