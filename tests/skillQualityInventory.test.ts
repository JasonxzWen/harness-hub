import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';
import {
  buildSkillQualityInventory,
  parseInventoryCliArgs,
} from '../scripts/skill-quality-inventory.ts';

function writeSkill(root: string, name: string, frontmatter: string, body = '# Test Skill\n'): void {
  const skillDir = path.join(root, 'skills', name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---\n${frontmatter}\n---\n\n${body}`, 'utf8');
}

function writeCapabilityIndex(root: string, components: Record<string, unknown>): void {
  const capabilitiesDir = path.join(root, 'capabilities');
  fs.mkdirSync(capabilitiesDir, { recursive: true });
  fs.writeFileSync(
    path.join(capabilitiesDir, 'index.json'),
    JSON.stringify({ components }, null, 2),
    'utf8',
  );
}

test('skill quality inventory enforces routing metadata for installed skills', () => {
  const inventory = buildSkillQualityInventory(process.cwd());

  expect(inventory.summary.qualityGate).toBe('strict');
  expect(inventory.roots).toEqual(['skills']);
  expect(inventory.skills.length).toBeGreaterThan(0);
  expect(inventory.summary.warningCount).toBe(0);
  expect(inventory.summary.descriptionMissingLoadWhenCount).toBe(0);
  expect(inventory.summary.descriptionOverTargetCount).toBe(0);
  expect(inventory.summary.largeBodyWithoutSpokesCount).toBe(0);
  expect(inventory.summary.importedOrAdaptedMissingMetadataCount).toBe(0);

  const htmlReport = inventory.skills.find((skill) => skill.name === 'effective-interact');
  expect(htmlReport).toBeDefined();
  expect(htmlReport?.descriptionWordCount).toBeGreaterThan(0);
  expect(typeof htmlReport?.descriptionStartsWithLoadWhen).toBe('boolean');
  expect(htmlReport?.nameMatchesDirectory).toBe(true);
  expect(htmlReport?.bodyBytes).toBeGreaterThan(0);
  expect(typeof htmlReport?.hasProgressiveSpokes).toBe('boolean');
});

test('skill quality inventory marks imported metadata gaps as warnings', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-quality-warn-'));
  writeSkill(root, 'imported-warning', [
    'name: imported-warning',
    'description: Imported skill without the required Load when routing prefix.',
  ].join('\n'));
  writeCapabilityIndex(root, {
    'skill:imported-warning': {
      kind: 'skill',
      path: 'skills/imported-warning',
      source: 'upstream-example',
    },
  });

  const inventory = buildSkillQualityInventory(root);
  const imported = inventory.skills.find((skill) => skill.name === 'imported-warning');

  expect(imported?.isImportedOrAdapted).toBe(true);
  expect(imported?.warnings).toContain('description-missing-load-when');
  expect(imported?.warnings).toContain('missing-frontmatter-license');
  expect(inventory.summary.warningCount).toBeGreaterThan(0);
});

test('skill quality inventory CLI accepts json flag without treating it as a root', () => {
  const result = spawnSync(process.execPath, [
    path.resolve('scripts/skill-quality-inventory.ts'),
    '--json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
  });

  expect(result.status).toBe(0);
  const inventory = JSON.parse(result.stdout);
  expect(inventory.summary.scannedSkillCount).toBeGreaterThan(0);
  expect(inventory.skills.length).toBe(inventory.summary.scannedSkillCount);
  expect(inventory.summary.warningCount).toBe(0);
});

test('skill quality inventory CLI fails when warnings exist', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-quality-cli-'));
  writeSkill(root, 'bad-skill', [
    'name: bad-skill',
    'description: Missing load when prefix.',
  ].join('\n'));

  const result = spawnSync(process.execPath, [
    path.resolve('scripts/skill-quality-inventory.ts'),
    root,
    '--json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
  });

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('quality warning');
  const inventory = JSON.parse(result.stdout);
  expect(inventory.summary.qualityGate).toBe('strict');
  expect(inventory.summary.warningCount).toBeGreaterThan(0);
});

test('skill quality inventory CLI rejects missing roots instead of returning an empty pass', () => {
  const missingRoot = path.join(os.tmpdir(), `skill-hub-missing-${Date.now()}`);
  const result = spawnSync(process.execPath, [
    path.resolve('scripts/skill-quality-inventory.ts'),
    missingRoot,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
  });

  expect(result.status).toBe(2);
  expect(result.stderr).toContain('Root directory does not exist');
});

test('skill quality inventory CLI parser supports root and json options together', () => {
  const parsed = parseInventoryCliArgs(['--json', '--root', '.'], process.cwd());

  expect(parsed.json).toBe(true);
  expect(parsed.rootDir).toBe(process.cwd());
});
