import fs from 'node:fs';
import { expect, test } from 'bun:test';

const inventoryPath = 'docs/workflow-cleanup-inventory.md';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

test('workflow cleanup inventory documents safe cleanup categories', () => {
  expect(fs.existsSync(inventoryPath)).toBe(true);
  const doc = read(inventoryPath);

  for (const heading of [
    '## Keep In Standard Install',
    '## Keep As Source References',
    '## Keep As Library Skills',
    '## Physical Cleanup Completed',
    '## Future Cleanup Requiring Approval',
    '## Forbidden Cleanup',
  ]) {
    expect(doc).toContain(heading);
  }
});

test('workflow cleanup inventory records approval and preserves safety gates', () => {
  const doc = read(inventoryPath);

  expect(doc).toContain('Physical deletion was approved by the user on 2026-05-21');
  expect(doc).toContain('lock-backed');
  expect(doc).toContain('explicit user approval');
  expect(doc).toContain('unmanaged files must not be deleted by name');
  expect(doc).toContain('source records were retained');
});

test('workflow cleanup inventory covers the noisy workflow sources', () => {
  const doc = read(inventoryPath);

  for (const phrase of [
    'OpenSpec',
    'Everything Claude Code',
    'Superpowers',
    'Matt Pocock',
    'standard install',
    'workflow-router',
  ]) {
    expect(doc).toContain(phrase);
  }
});

test('workflow cleanup inventory keeps install and package count boundaries aligned', () => {
  const doc = read(inventoryPath);
  const capabilityIndex = JSON.parse(read('capabilities/index.json')) as {
    components: Record<string, { kind: string; distribution?: string }>;
  };
  const packageJson = JSON.parse(read('package.json')) as { files: string[] };
  const skillDirs = fs.readdirSync('skills', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(`skills/${entry.name}/SKILL.md`))
    .map((entry) => entry.name);
  const targetSkillComponents = Object.values(capabilityIndex.components)
    .filter((component) => component.kind === 'skill' && (component.distribution || 'target') === 'target');
  const hubInternalSkillComponents = Object.entries(capabilityIndex.components)
    .filter(([, component]) => component.kind === 'skill' && component.distribution === 'hub-internal')
    .map(([id]) => id);

  expect(hubInternalSkillComponents).toContain('skill:hub-maintenance-workflow');
  expect(packageJson.files).toContain('skills/');
  expect(doc).toContain(`| Installable skill components | ${targetSkillComponents.length} |`);
  expect(doc).toContain(`| Local \`skills\` directories | ${skillDirs.length} |`);
  expect(doc).toContain(`| Packaged source \`skills\` directories | ${skillDirs.length} |`);
  expect(doc).toContain('`hub-maintenance-workflow` is packaged with the source tree');
  expect(doc).toContain('excluded from standard target install as `hub-internal`');
});
