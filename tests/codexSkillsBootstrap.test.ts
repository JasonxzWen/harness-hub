import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const syncScript = path.resolve('scripts/sync-codex-skills.mjs');
const checkScript = path.resolve('scripts/check-codex-worktree.mjs');
const setupScript = path.resolve('scripts/setup-codex-worktree.mjs');

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-codex-bootstrap-'));
}

function writeSkill(root: string, name: string, body = '---\nname: test\n---\n\n# Test\n'): void {
  const skillDir = path.join(root, 'skills', name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), body);
}

function writeStateTemplates(root: string): void {
  const templateDir = path.join(root, 'harness', 'minimal', 'state-templates');
  fs.mkdirSync(templateDir, { recursive: true });
  for (const name of ['current-task.md', 'decisions.md', 'progress.md', 'session-handoff.md']) {
    fs.writeFileSync(path.join(templateDir, name), `# ${name}\n\nclean template\n`);
  }
}

test('Codex bootstrap sync mirrors standard skills and preserves local artifacts', () => {
  const root = makeTempRoot();
  writeSkill(root, 'alpha');
  fs.mkdirSync(path.join(root, '.codex', 'skills', 'alpha', 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(root, '.codex', 'skills', 'alpha', 'artifacts', 'local.html'), '<html></html>');
  fs.mkdirSync(path.join(root, '.codex', 'skills', 'stale'), { recursive: true });
  fs.writeFileSync(path.join(root, '.codex', 'skills', 'stale', '.harness-hub-managed'), 'generated\n');
  fs.writeFileSync(path.join(root, '.codex', 'skills', 'stale', 'SKILL.md'), '# stale\n');

  const result = spawnSync('node', [syncScript, '--root', root], { encoding: 'utf8' });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Synced 1 skills into .codex/skills/');
  expect(result.stdout).toContain('Removed 1 stale skill directories.');
  expect(fs.existsSync(path.join(root, '.codex', 'skills', 'alpha', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(root, '.codex', 'skills', 'alpha', '.harness-hub-managed'))).toBe(true);
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
  expect(fs.existsSync(path.join(root, '.codex', 'skills', 'alpha', '.harness-hub-managed'))).toBe(true);
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

test('Codex worktree check soft-warns for read-only work without writing files', () => {
  const root = makeTempRoot();

  const result = spawnSync('node', [checkScript, '--root', root], { encoding: 'utf8' });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Warning: Codex worktree bootstrap is incomplete; read-only work may continue.');
  expect(result.stdout).toContain('Run: bun run codex:worktree-setup');
  expect(fs.existsSync(path.join(root, '.codex'))).toBe(false);
  expect(fs.existsSync(path.join(root, '.harness-hub'))).toBe(false);
});

test('Codex worktree check hard-fails write tasks when bootstrap outputs are missing', () => {
  const root = makeTempRoot();

  const result = spawnSync('node', [checkScript, '--root', root, '--write-task'], { encoding: 'utf8' });

  expect(result.status).toBe(2);
  expect(result.stdout).toContain('Codex worktree bootstrap is incomplete for write tasks.');
  expect(result.stdout).toContain('missing .codex/skills');
  expect(result.stdout).toContain('missing .harness-hub/state');
  expect(result.stdout).toContain('Run: bun run codex:worktree-setup');
  expect(fs.existsSync(path.join(root, '.codex'))).toBe(false);
  expect(fs.existsSync(path.join(root, '.harness-hub'))).toBe(false);
});

test('Codex worktree check passes after skills and harness state exist', () => {
  const root = makeTempRoot();
  fs.mkdirSync(path.join(root, '.codex', 'skills', 'alpha'), { recursive: true });
  fs.writeFileSync(path.join(root, '.codex', 'skills', 'alpha', 'SKILL.md'), '# Alpha\n');
  fs.mkdirSync(path.join(root, '.harness-hub', 'state'), { recursive: true });
  for (const name of ['current-task.md', 'decisions.md', 'progress.md', 'session-handoff.md']) {
    fs.writeFileSync(path.join(root, '.harness-hub', 'state', name), `${name}\n`);
  }

  const result = spawnSync('node', [checkScript, '--root', root, '--write-task'], { encoding: 'utf8' });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Codex worktree bootstrap is ready.');
  expect(result.stdout).toContain('ok .codex/skills');
  expect(result.stdout).toContain('ok .harness-hub/state');
  expect(result.stdout).not.toContain('Run: bun run codex:worktree-setup');
});

test('Codex worktree setup syncs skills and preserves existing harness state without committing', () => {
  const root = makeTempRoot();
  writeSkill(root, 'alpha');
  writeStateTemplates(root);
  fs.writeFileSync(path.join(root, '.gitignore'), '.codex/\n.harness-hub/state/\n');
  spawnSync('git', ['init'], { cwd: root, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.email', 'codex@example.com'], { cwd: root, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.name', 'Codex'], { cwd: root, encoding: 'utf8' });
  spawnSync('git', ['add', '.gitignore'], { cwd: root, encoding: 'utf8' });
  spawnSync('git', ['commit', '-m', 'baseline'], { cwd: root, encoding: 'utf8' });
  const commitsBefore = spawnSync('git', ['rev-list', '--count', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();

  const stateDir = path.join(root, '.harness-hub', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'current-task.md'), 'stale task\n');
  fs.writeFileSync(path.join(stateDir, 'old-task.md'), 'delete me\n');

  const result = spawnSync('node', [setupScript, '--root', root], { encoding: 'utf8' });
  const commitsAfter = spawnSync('git', ['rev-list', '--count', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Synced 1 skills into .codex/skills/');
  expect(result.stdout).toContain('Preserved existing harness state and created 3 missing templates in .harness-hub/state/.');
  expect(result.stdout).toContain('No checkpoint commit was created for worktree setup.');
  expect(fs.readFileSync(path.join(stateDir, 'current-task.md'), 'utf8')).toBe('stale task\n');
  expect(fs.existsSync(path.join(stateDir, 'decisions.md'))).toBe(true);
  expect(fs.existsSync(path.join(stateDir, 'progress.md'))).toBe(true);
  expect(fs.existsSync(path.join(stateDir, 'session-handoff.md'))).toBe(true);
  expect(fs.existsSync(path.join(stateDir, 'old-task.md'))).toBe(true);
  expect(commitsAfter).toBe(commitsBefore);
});

test('Codex worktree setup reset-state explicitly restores clean harness state', () => {
  const root = makeTempRoot();
  writeSkill(root, 'alpha');
  writeStateTemplates(root);
  const stateDir = path.join(root, '.harness-hub', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'current-task.md'), 'stale task\n');
  fs.writeFileSync(path.join(stateDir, 'old-task.md'), 'delete me\n');

  const result = spawnSync('node', [setupScript, '--root', root, '--reset-state'], { encoding: 'utf8' });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Reset clean harness state in .harness-hub/state/ from 4 templates.');
  expect(result.stdout).toContain('No checkpoint commit was created for worktree setup.');
  expect(fs.readFileSync(path.join(stateDir, 'current-task.md'), 'utf8')).toContain('clean template');
  expect(fs.existsSync(path.join(stateDir, 'decisions.md'))).toBe(true);
  expect(fs.existsSync(path.join(stateDir, 'progress.md'))).toBe(true);
  expect(fs.existsSync(path.join(stateDir, 'session-handoff.md'))).toBe(true);
  expect(fs.existsSync(path.join(stateDir, 'old-task.md'))).toBe(false);
});

test('Codex worktree setup command stays portable and documented', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as {
    scripts: Record<string, string>;
  };
  const agents = fs.readFileSync('AGENTS.md', 'utf8');
  const lifecycleDesign = fs.readFileSync('docs/cli-lifecycle-design.md', 'utf8');
  const capabilityMap = fs.readFileSync('docs/capability-map.md', 'utf8');
  const worktreeSetupSection = agents.slice(agents.indexOf('## Codex Worktree Setup'), agents.indexOf('## Third-Party Skill Evaluation'));
  const startupGateIndex = agents.indexOf('## Codex Worktree Startup Gate');
  const skillRoutingIndex = agents.indexOf('## Skill Routing');

  expect(packageJson.scripts['codex:worktree-setup']).toBe('node ./scripts/setup-codex-worktree.mjs');
  expect(packageJson.scripts['codex:worktree-check']).toBe('node ./scripts/check-codex-worktree.mjs');
  expect(startupGateIndex).toBeGreaterThan(-1);
  expect(startupGateIndex).toBeLessThan(skillRoutingIndex);
  expect(agents.slice(startupGateIndex, skillRoutingIndex)).toContain('Before using repo-local skill activation or running `workflow-router`');
  expect(agents.slice(startupGateIndex, skillRoutingIndex)).toContain('bun run codex:worktree-check -- --write-task');
  expect(agents.slice(startupGateIndex, skillRoutingIndex)).toContain('For purely read-only questions');
  expect(agents.slice(startupGateIndex, skillRoutingIndex)).toContain('bun run codex:worktree-setup');
  expect(agents.slice(startupGateIndex, skillRoutingIndex)).toContain('must not create a checkpoint commit');
  expect(agents.slice(startupGateIndex, skillRoutingIndex)).toContain('preserves existing task state by default');
  expect(worktreeSetupSection).toContain('node scripts/setup-codex-worktree.mjs');
  expect(worktreeSetupSection).toContain('bun run codex:worktree-setup');
  expect(worktreeSetupSection).toContain('before relying on repo-local skill activation or workflow routing');
  expect(worktreeSetupSection).toContain('Git worktree creation does not copy ignored generated directories');
  expect(worktreeSetupSection).toContain('create missing `.harness-hub/state/` templates');
  expect(worktreeSetupSection).toContain('preserve existing task state on reruns');
  expect(worktreeSetupSection).toContain('skip checkpoint commits for setup-only work');
  expect(worktreeSetupSection).toContain('`--reset-state` or `--fresh`');
  expect(worktreeSetupSection).toContain('Do not hard-code a machine path');
  expect(worktreeSetupSection).not.toMatch(/[A-Za-z]:\\/);
  expect(lifecycleDesign).toContain('node scripts/setup-codex-worktree.mjs');
  expect(lifecycleDesign).toContain('node scripts/check-codex-worktree.mjs --write-task');
  expect(lifecycleDesign).toContain('bun run codex:worktree-check -- --write-task');
  expect(lifecycleDesign).toContain('Read-only tasks may use `bun run codex:worktree-check` as a soft warning');
  expect(lifecycleDesign).toContain('git worktree creation does not copy ignored generated directories');
  expect(lifecycleDesign).toContain('preserves existing task state on reruns');
  expect(lifecycleDesign).toContain('`--reset-state` or `--fresh` is required');
  expect(lifecycleDesign).toContain('does not create a checkpoint commit for setup-only work');
  expect(lifecycleDesign).toContain('Host-local absolute paths must stay out of the project design');
  expect(capabilityMap).toContain('scripts/check-codex-worktree.mjs');
  expect(capabilityMap).toContain('scripts/setup-codex-worktree.mjs');
  expect(capabilityMap).toContain('`.codex/` and `.harness-hub/state/` stay local');
});
