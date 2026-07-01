import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const syncScript = path.resolve('scripts/sync-agent-skills.mjs');
const hostRoots = ['.codex', '.claude'];

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-agent-skills-'));
}

function writeSkill(root: string, name: string, body = '---\nname: test\n---\n\n# Test\n'): void {
  const skillDir = path.join(root, 'skills', name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), body);
}

test('agent skill sync mirrors standard skills to Codex and Claude while preserving local artifacts', () => {
  const root = makeTempRoot();
  writeSkill(root, 'alpha');
  for (const hostRoot of hostRoots) {
    fs.mkdirSync(path.join(root, hostRoot, 'skills', 'alpha', 'artifacts'), { recursive: true });
    fs.writeFileSync(path.join(root, hostRoot, 'skills', 'alpha', 'artifacts', 'local.html'), '<html></html>');
    fs.mkdirSync(path.join(root, hostRoot, 'skills', 'stale'), { recursive: true });
    fs.writeFileSync(path.join(root, hostRoot, 'skills', 'stale', '.harness-hub-managed'), 'generated\n');
    fs.writeFileSync(path.join(root, hostRoot, 'skills', 'stale', 'SKILL.md'), '# stale\n');
  }

  const result = spawnSync('node', [syncScript, '--root', root], { encoding: 'utf8' });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Synced 1 skills into .codex/skills/');
  expect(result.stdout).toContain('Synced 1 skills into .claude/skills/');
  expect(result.stdout).toContain('Removed 1 stale skill directories from codex.');
  expect(result.stdout).toContain('Removed 1 stale skill directories from claude.');
  for (const hostRoot of hostRoots) {
    expect(fs.existsSync(path.join(root, hostRoot, 'skills', 'alpha', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, hostRoot, 'skills', 'alpha', '.harness-hub-managed'))).toBe(true);
    expect(fs.existsSync(path.join(root, hostRoot, 'skills', 'alpha', 'artifacts', 'local.html'))).toBe(true);
    expect(fs.existsSync(path.join(root, hostRoot, 'skills', 'stale', 'SKILL.md'))).toBe(false);
  }
});

test('agent skill sync overwrites same-name generated skill directories', () => {
  const root = makeTempRoot();
  writeSkill(root, 'alpha', '---\nname: alpha\n---\n\n# Alpha\n');
  for (const hostRoot of hostRoots) {
    fs.mkdirSync(path.join(root, hostRoot, 'skills', 'alpha'), { recursive: true });
    fs.writeFileSync(path.join(root, hostRoot, 'skills', 'alpha', 'SKILL.md'), '# local\n');
    fs.writeFileSync(path.join(root, hostRoot, 'skills', 'alpha', 'LOCAL.md'), 'delete me\n');
  }

  const result = spawnSync('node', [syncScript, '--root', root], { encoding: 'utf8' });

  expect(result.status).toBe(0);
  for (const hostRoot of hostRoots) {
    expect(fs.readFileSync(path.join(root, hostRoot, 'skills', 'alpha', 'SKILL.md'), 'utf8')).toContain('name: alpha');
    expect(fs.existsSync(path.join(root, hostRoot, 'skills', 'alpha', 'LOCAL.md'))).toBe(false);
    expect(fs.existsSync(path.join(root, hostRoot, 'skills', 'alpha', '.harness-hub-managed'))).toBe(true);
  }
});

test('agent skill sync can target one host for troubleshooting', () => {
  const root = makeTempRoot();
  writeSkill(root, 'alpha');

  const result = spawnSync('node', [syncScript, '--root', root, '--host', 'claude'], { encoding: 'utf8' });

  expect(result.status).toBe(0);
  expect(result.stdout).not.toContain('.codex/skills/');
  expect(result.stdout).toContain('Synced 1 skills into .claude/skills/');
  expect(fs.existsSync(path.join(root, '.codex'))).toBe(false);
  expect(fs.existsSync(path.join(root, '.claude', 'skills', 'alpha', 'SKILL.md'))).toBe(true);
});

test('agent skill sync output stays ignored local state', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const policy = JSON.parse(fs.readFileSync('config/artifact-policy.json', 'utf8')) as {
    categories: { ignoredLocal: string[] };
    git: { ignored: string[] };
    npm: { forbidden: string[] };
  };

  for (const hostRoot of hostRoots) {
    expect(gitignore).toContain(`${hostRoot}/`);
    expect(policy.categories.ignoredLocal).toContain(`${hostRoot}/`);
    expect(policy.git.ignored).toContain(`${hostRoot}/`);
    expect(policy.npm.forbidden).toContain(`${hostRoot}/`);
  }
});

test('agent rules stay synchronized for Codex and Claude Code', () => {
  expect(fs.existsSync('CLAUDE.md')).toBe(true);
  expect(fs.readFileSync('CLAUDE.md', 'utf8')).toBe(fs.readFileSync('AGENTS.md', 'utf8'));
});

test('agent skill sync command is packaged and old worktree bootstrap commands are removed', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
    files: string[];
    scripts: Record<string, string>;
  };
  const lifecycleDesign = fs.readFileSync('docs/cli-lifecycle-design.md', 'utf8');
  const capabilityMap = fs.readFileSync('docs/capability-map.md', 'utf8');

  expect(packageJson.scripts['sync:agent-skills']).toBe('node ./scripts/sync-agent-skills.mjs');
  expect(packageJson.scripts['sync:agent-skills:dry-run']).toBe('node ./scripts/sync-agent-skills.mjs --dry-run');
  expect(packageJson.scripts['bootstrap:codex-skills']).toBeUndefined();
  expect(packageJson.scripts['codex:worktree-setup']).toBeUndefined();
  expect(packageJson.scripts['codex:worktree-check']).toBeUndefined();
  expect(packageJson.scripts['codex:worktree-hook:install']).toBeUndefined();
  expect(packageJson.files).toContain('scripts/sync-agent-skills.mjs');
  expect(packageJson.files).not.toContain('scripts/sync-codex-skills.mjs');
  expect(packageJson.files).not.toContain('scripts/setup-codex-worktree.mjs');
  expect(packageJson.files).not.toContain('scripts/check-codex-worktree.mjs');
  expect(packageJson.files).not.toContain('scripts/install-codex-worktree-hook.mjs');
  expect(lifecycleDesign).toContain('scripts/sync-agent-skills.mjs');
  expect(lifecycleDesign).toContain('.codex/skills/');
  expect(lifecycleDesign).toContain('.claude/skills/');
  expect(lifecycleDesign).not.toContain('setup-codex-worktree');
  expect(lifecycleDesign).not.toContain('check-codex-worktree');
  expect(lifecycleDesign).not.toContain('install-codex-worktree-hook');
  expect(capabilityMap).toContain('scripts/sync-agent-skills.mjs');
  expect(capabilityMap).toContain('`.codex/` and `.claude/` stay local');
  expect(capabilityMap).not.toContain('setup-codex-worktree');
  expect(capabilityMap).not.toContain('check-codex-worktree');
  expect(capabilityMap).not.toContain('install-codex-worktree-hook');
});
