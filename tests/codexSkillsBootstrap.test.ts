import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const syncScript = path.resolve('scripts/sync-codex-skills.mjs');

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-codex-bootstrap-'));
}

function writeSkill(root: string, name: string, body = '---\nname: test\n---\n\n# Test\n'): void {
  const skillDir = path.join(root, 'skills', name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), body);
}

test('Codex bootstrap sync mirrors standard skills and preserves local artifacts', () => {
  const root = makeTempRoot();
  writeSkill(root, 'alpha');
  fs.mkdirSync(path.join(root, '.codex', 'skills', 'alpha', 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(root, '.codex', 'skills', 'alpha', 'artifacts', 'local.html'), '<html></html>');
  fs.mkdirSync(path.join(root, '.codex', 'skills', 'stale'), { recursive: true });
  fs.writeFileSync(path.join(root, '.codex', 'skills', 'stale', '.skill-hub-managed'), 'generated\n');
  fs.writeFileSync(path.join(root, '.codex', 'skills', 'stale', 'SKILL.md'), '# stale\n');

  const result = spawnSync('node', [syncScript, '--root', root], { encoding: 'utf8' });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Synced 1 skills into .codex/skills/');
  expect(result.stdout).toContain('Removed 1 stale skill directories.');
  expect(fs.existsSync(path.join(root, '.codex', 'skills', 'alpha', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(root, '.codex', 'skills', 'alpha', '.skill-hub-managed'))).toBe(true);
  expect(fs.existsSync(path.join(root, '.codex', 'skills', 'alpha', 'artifacts', 'local.html'))).toBe(true);
  expect(fs.existsSync(path.join(root, '.codex', 'skills', 'stale', 'SKILL.md'))).toBe(false);
});

test('Codex bootstrap sync overwrites same-name Codex skill directories', () => {
  const root = makeTempRoot();
  writeSkill(root, 'alpha', '---\nname: alpha\n---\n\n# Alpha\n');
  fs.mkdirSync(path.join(root, '.codex', 'skills', 'alpha'), { recursive: true });
  fs.writeFileSync(path.join(root, '.codex', 'skills', 'alpha', 'SKILL.md'), '# local\n');
  fs.writeFileSync(path.join(root, '.codex', 'skills', 'alpha', 'LOCAL.md'), 'delete me\n');

  const result = spawnSync('node', [syncScript, '--root', root], { encoding: 'utf8' });

  expect(result.status).toBe(0);
  expect(fs.readFileSync(path.join(root, '.codex', 'skills', 'alpha', 'SKILL.md'), 'utf8')).toContain('name: alpha');
  expect(fs.existsSync(path.join(root, '.codex', 'skills', 'alpha', 'LOCAL.md'))).toBe(false);
  expect(fs.existsSync(path.join(root, '.codex', 'skills', 'alpha', '.skill-hub-managed'))).toBe(true);
});

test('Codex bootstrap output stays ignored local state', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const policy = JSON.parse(fs.readFileSync('config/artifact-policy.json', 'utf8')) as {
    categories: { ignoredLocal: string[] };
    git: { ignored: string[] };
    npm: { forbidden: string[] };
  };

  expect(gitignore).toMatch(/^\.codex\/$/m);
  expect(policy.categories.ignoredLocal).toContain('.codex/');
  expect(policy.git.ignored).toContain('.codex/');
  expect(policy.npm.forbidden).toContain('.codex/');
});
