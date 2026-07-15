import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const syncScript = path.resolve('scripts/sync-agent-skills.mjs');
const hostRoots = ['.agents', '.claude'];

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-agent-skills-'));
}

function writeSkill(
  root: string,
  name: string,
  body = '---\nname: test\n---\n\n# Test\n',
  host?: 'claude' | 'codex',
): void {
  const skillDir = path.join(root, 'skills', name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), body);
  const indexPath = path.join(root, 'capabilities', 'index.json');
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  const index = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
    : { components: {} };
  index.components[`skill:${name}`] = {
    kind: 'skill',
    path: `skills/${name}`,
    distribution: 'target-distributed',
    ...(host ? { host } : {}),
  };
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
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
  expect(result.stdout).toContain('Synced 1 skills into .agents/skills/');
  expect(result.stdout).toContain('Synced 1 skills into .claude/skills/');
  expect(result.stdout).toContain('Removed 1 stale skill directories from codex.');
  expect(result.stdout).toContain('Removed 1 stale skill directories from claude.');
  expect(result.stdout).toContain('project-local host mirrors only');
  expect(result.stdout).toContain('does not install user-level/global skills');
  for (const hostRoot of hostRoots) {
    expect(fs.existsSync(path.join(root, hostRoot, 'skills', 'alpha', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, hostRoot, 'skills', 'alpha', '.harness-hub-managed'))).toBe(true);
    expect(fs.existsSync(path.join(root, hostRoot, 'skills', 'alpha', 'artifacts', 'local.html'))).toBe(true);
    expect(fs.existsSync(path.join(root, hostRoot, 'skills', 'stale', 'SKILL.md'))).toBe(false);
  }
  expect(fs.existsSync(path.join(root, '.codex', 'skills'))).toBe(false);
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
  expect(result.stdout).not.toContain('.agents/skills/');
  expect(result.stdout).toContain('Synced 1 skills into .claude/skills/');
  expect(result.stdout).toContain('project-local host mirrors only');
  expect(fs.existsSync(path.join(root, '.agents'))).toBe(false);
  expect(fs.existsSync(path.join(root, '.claude', 'skills', 'alpha', 'SKILL.md'))).toBe(true);
});

test('agent skill sync mirrors Codex-only skills only to the Codex surface', () => {
  const root = makeTempRoot();
  writeSkill(root, 'alpha');
  writeSkill(root, 'decision-ui', '---\nname: decision-ui\n---\n\n# Decision UI\n', 'codex');

  const result = spawnSync('node', [syncScript, '--root', root], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('Synced 2 skills into .agents/skills/');
  expect(result.stdout).toContain('Synced 1 skills into .claude/skills/');
  expect(fs.existsSync(path.join(root, '.agents', 'skills', 'decision-ui', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(root, '.claude', 'skills', 'decision-ui'))).toBe(false);
});

test('agent skill sync output stays ignored local state', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');

  expect(gitignore).toContain('.agents/skills/');
  for (const hostRoot of hostRoots) {
    expect(gitignore).toContain(`${hostRoot}/`);
  }
});

test('agent rules use AGENTS.md as the Codex and Claude Code source', () => {
  expect(fs.existsSync('CLAUDE.md')).toBe(true);
  const claude = fs.readFileSync('CLAUDE.md', 'utf8');
  const agents = fs.readFileSync('AGENTS.md', 'utf8');
  const oldSectionTitle = ['## Response', 'Structure'].join(' ');
  const oldPrimaryLabel = ['直', '接', '执', '行'].join('');
  const oldChallengeLabel = ['深', '度', '交', '互'].join('');

  expect(claude).toBe('@AGENTS.md\n');
  expect(agents).toContain('## Core rules');
  expect(agents).toContain('## Native Agent operating model');
  expect(agents).toContain('Claude Code or Codex is the only main-Agent runtime');
  expect(agents).toContain('Use Subagents for bounded independent read-only exploration');
  expect(agents).not.toContain('## Subagent Auto-Arbiter');
  expect(agents).toContain('Do not create `.harness-hub/state/runs/`, leases, integration records, or a second execution control plane');
  expect(agents).not.toContain('workflow-router');
  expect(agents).not.toContain(oldSectionTitle);
  expect(agents).not.toContain(oldPrimaryLabel);
  expect(agents).not.toContain(oldChallengeLabel);
});

test('agent skill sync remains repository-local and old worktree bootstrap commands are removed', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
    scripts: Record<string, string>;
  };

  expect(packageJson.scripts['sync:agent-skills']).toBe('node ./scripts/sync-agent-skills.mjs');
  expect(packageJson.scripts['sync:agent-skills:dry-run']).toBe('node ./scripts/sync-agent-skills.mjs --dry-run');
  expect(packageJson.scripts['bootstrap:codex-skills']).toBeUndefined();
  expect(packageJson.scripts['codex:worktree-setup']).toBeUndefined();
  expect(packageJson.scripts['codex:worktree-check']).toBeUndefined();
  expect(packageJson.scripts['codex:worktree-hook:install']).toBeUndefined();
  expect(fs.existsSync('scripts/sync-codex-skills.mjs')).toBe(false);
  expect(fs.existsSync('scripts/setup-codex-worktree.mjs')).toBe(false);
  expect(fs.existsSync('scripts/check-codex-worktree.mjs')).toBe(false);
  expect(fs.existsSync('scripts/install-codex-worktree-hook.mjs')).toBe(false);
});
