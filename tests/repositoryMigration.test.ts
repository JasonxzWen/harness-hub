import { execFileSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'bun:test';

const MIGRATE_SCRIPT = path.resolve('scripts/migrate.mjs');
const MIGRATE_BIN = path.resolve('bin/harness-hub.mjs');
const OKF_VALIDATOR = path.resolve('scripts/okf-validate.mjs');
const SAFETY_HOOK = path.resolve('harness/agent-hooks/safety-hook.mjs');
const TARGET_AGENTS = path.resolve('harness/target/AGENTS.md');
const CLAUDE_HOOKS = path.resolve('harness/agent-hooks/claude/settings.json');
const CODEX_HOOKS = path.resolve('harness/agent-hooks/codex/hooks.json');
const HUB_ONLY_SENTINEL = 'HARNESS HUB PRIVATE KNOWLEDGE MUST NOT REACH A TARGET';

type Host = 'claude' | 'codex';
type MigrationResult = {
  host: 'claude' | 'codex' | 'both';
  knowledgeInitialized: boolean;
  ok: true;
  primaryHost: Host;
  sourceCommit: string;
  targetHead: string;
};

test('the single migrate command supports claude, codex, and both while only primary initializes OKF', () => {
  const invalid = [
    ['install', '.'],
    ['update', '.'],
    ['status', '.'],
    ['migrate', '.', '--host', 'both', '--yes'],
    ['migrate', '.', '--host', 'codex', '--primary', 'codex', '--yes'],
  ];
  for (const args of invalid) {
    const result = spawnSync(process.execPath, [MIGRATE_BIN, ...args], { encoding: 'utf8' });
    expect(result.status, args.join(' ')).toBe(2);
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'E_INPUT', phase: 'input' });
  }

  const cases: Array<{
    host: 'claude' | 'codex' | 'both';
    primary?: Host;
    called: Host;
    installed: Host[];
  }> = [
    { host: 'claude', called: 'claude', installed: ['claude'] },
    { host: 'codex', called: 'codex', installed: ['codex'] },
    { host: 'both', primary: 'claude', called: 'claude', installed: ['claude', 'codex'] },
    { host: 'both', primary: 'codex', called: 'codex', installed: ['claude', 'codex'] },
  ];

  for (const entry of cases) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `harness-modes-${entry.host}-`));
    const sourceDir = path.join(root, 'source');
    const targetDir = path.join(root, 'target');
    const binDir = path.join(root, 'bin');
    const globalConfig = path.join(root, 'home', '.codex', 'config.toml');
    try {
      initMinimalSource(sourceDir);
      initTarget(targetDir);
      fs.mkdirSync(path.dirname(globalConfig), { recursive: true });
      fs.writeFileSync(globalConfig, '[features]\nexisting = true\n');
      const logs = {
        claude: path.join(root, 'claude-calls.jsonl'),
        codex: path.join(root, 'codex-calls.jsonl'),
      };
      writeFakeCli(binDir, 'claude', logs.claude);
      writeFakeCli(binDir, 'codex', logs.codex);

      const result = runMigration(sourceDir, targetDir, entry.host, {
        binDir,
        primary: entry.primary,
        env: { HOME: path.join(root, 'home'), USERPROFILE: path.join(root, 'home') },
      });
      expect(result.status, result.stderr).toBe(0);
      const payload = JSON.parse(result.stdout) as MigrationResult;
      expect(payload).toMatchObject({
        ok: true,
        host: entry.host,
        primaryHost: entry.primary ?? entry.host,
        knowledgeInitialized: true,
      });

      for (const host of ['claude', 'codex'] as const) {
        const calls = readCalls(logs[host]);
        expect(calls.length, `${entry.host}:${host}`).toBe(host === entry.called ? 1 : 0);
        if (host === entry.called) {
          expect(calls[0].prompt).toContain('Google OKF v0.1');
          expect(calls[0].prompt).toContain('Write only under knowledge/');
          if (host === 'codex') {
            expect(calls[0].args).toEqual(expect.arrayContaining(['--ignore-user-config', '--disable', 'hooks']));
          } else {
            expect(calls[0].args).toEqual(expect.arrayContaining(['--bare', '--setting-sources=', '--no-session-persistence']));
          }
        }
      }

      expect(fs.readFileSync(globalConfig, 'utf8')).toBe('[features]\nexisting = true\n');
      expectValidKnowledge(targetDir);
      expect(fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n');
      expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'alpha', 'SKILL.md')))
        .toBe(entry.installed.includes('claude'));
      expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'alpha', 'SKILL.md')))
        .toBe(entry.installed.includes('codex'));
      expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'decision-ui'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'decision-ui', 'SKILL.md')))
        .toBe(entry.installed.includes('codex'));

      const installedTree = listTree(targetDir);
      expect(installedTree.some((item) => /(?:^|\/)(?:runs|trace|receipt)(?:\/|\.|$)/i.test(item))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}, 60_000);

test('a repository URL clone can run the one public migrate command from its independent checkout', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-repository-url-'));
  const originDir = path.join(root, 'origin');
  const checkoutDir = path.join(root, 'checkout');
  const targetDir = path.join(root, 'target');
  try {
    initMinimalSource(originDir);
    initTarget(targetDir, { knowledge: true });
    execFileSync('git', ['clone', pathToFileURL(originDir).href, checkoutDir], { stdio: 'ignore' });

    const result = runMigration(checkoutDir, targetDir, 'codex');
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      host: 'codex',
      knowledgeInitialized: false,
    });
    expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'alpha', 'SKILL.md'))).toBe(true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('full both migration dynamically distributes every capability and excludes Hub-only source material', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-full-capabilities-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  try {
    initFullSource(sourceDir);
    initTarget(targetDir, { knowledge: true });

    const result = runMigration(sourceDir, targetDir, 'both', { primary: 'codex' });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ knowledgeInitialized: false, primaryHost: 'codex' });

    const index = JSON.parse(fs.readFileSync(path.join(sourceDir, 'capabilities', 'index.json'), 'utf8')) as {
      components: Record<string, { distribution: string; host?: Host; kind: string; path: string }>;
    };
    const expectedManifestFiles = new Set([
      '.harness-hub/.gitignore',
      '.harness-hub/okf-validate.mjs',
      '.harness-hub/safety-hook.mjs',
      '.claude/settings.json',
      '.codex/hooks.json',
      'AGENTS.md',
      'CLAUDE.md',
    ]);

    for (const component of Object.values(index.components)) {
      if (component.kind !== 'skill' || component.distribution !== 'target-distributed') continue;
      const name = path.posix.basename(component.path);
      const files = trackedFiles(sourceDir, component.path);
      for (const host of ['claude', 'codex'] as const) {
        const shouldExist = component.host === undefined || component.host === host;
        const hostRoot = host === 'claude' ? '.claude/skills' : '.agents/skills';
        const targetSkill = path.join(targetDir, hostRoot, name);
        expect(fs.existsSync(targetSkill), `${name}:${host}`).toBe(shouldExist);
        if (!shouldExist) continue;
        for (const relativeFile of files) {
          const sourceBytes = fs.readFileSync(path.join(sourceDir, component.path, relativeFile));
          const targetBytes = fs.readFileSync(path.join(targetSkill, relativeFile));
          expect(targetBytes.equals(sourceBytes), `${name}:${host}:${relativeFile}`).toBe(true);
          expectedManifestFiles.add(`${hostRoot}/${name}/${relativeFile}`);
        }
      }
    }

    const manifest = JSON.parse(fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'), 'utf8')) as {
      files: Array<{ path: string }>;
      hosts: Host[];
      primaryHost: Host;
    };
    expect(manifest.hosts).toEqual(['claude', 'codex']);
    expect(manifest.primaryHost).toBe('codex');
    expect(new Set(manifest.files.map((file) => file.path))).toEqual(expectedManifestFiles);
    expect(fs.existsSync(path.join(targetDir, 'capabilities'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'harness'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'docs'))).toBe(false);
    expect(snapshotFiles(targetDir).map((entry) => entry.text).join('\n')).not.toContain(HUB_ONLY_SENTINEL);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

test('later normal and force migrations call no CLI and preserve tracked OKF byte-for-byte', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-repeat-protect-okf-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const callLog = path.join(root, 'codex-calls.jsonl');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir);
    writeFakeCli(binDir, 'codex', callLog);
    expect(runMigration(sourceDir, targetDir, 'codex', { binDir }).status).toBe(0);
    expect(readCalls(callLog)).toHaveLength(1);
    commitAll(targetDir, 'accept initial migration');
    const knowledge = snapshotFiles(path.join(targetDir, 'knowledge'));
    fs.writeFileSync(callLog, '');

    const normal = runMigration(sourceDir, targetDir, 'codex', { binDir });
    expect(normal.status, normal.stderr).toBe(0);
    const forced = runMigration(sourceDir, targetDir, 'codex', { binDir, force: true });
    expect(forced.status, forced.stderr).toBe(0);
    expect(readCalls(callLog)).toEqual([]);
    expect(snapshotFiles(path.join(targetDir, 'knowledge'))).toEqual(knowledge);
    expect(JSON.parse(normal.stdout)).toMatchObject({ knowledgeInitialized: false });
    expect(JSON.parse(forced.stdout)).toMatchObject({ knowledgeInitialized: false });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('an existing manifest with missing knowledge fails before any CLI call', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-missing-knowledge-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const callLog = path.join(root, 'codex-calls.jsonl');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir);
    writeFakeCli(binDir, 'codex', callLog);
    expect(runMigration(sourceDir, targetDir, 'codex', { binDir }).status).toBe(0);
    commitAll(targetDir, 'accept migration');
    fs.rmSync(path.join(targetDir, 'knowledge'), { recursive: true });
    commitAll(targetDir, 'remove knowledge');
    fs.writeFileSync(callLog, '');

    const result = runMigration(sourceDir, targetDir, 'codex', { binDir });
    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'E_KNOWLEDGE_MISSING', phase: 'preflight' });
    expect(readCalls(callLog)).toEqual([]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('dirty targets, capability path escape, and managed symlinks fail before CLI execution', () => {
  for (const scenario of ['dirty', 'escape', 'symlink'] as const) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `harness-preflight-${scenario}-`));
    const sourceDir = path.join(root, 'source');
    const targetDir = path.join(root, 'target');
    const binDir = path.join(root, 'bin');
    const callLog = path.join(root, 'codex-calls.jsonl');
    try {
      initMinimalSource(sourceDir);
      initTarget(targetDir, { knowledge: true, ignore: scenario === 'symlink' ? ['.agents/'] : [] });
      writeFakeCli(binDir, 'codex', callLog);
      if (scenario === 'dirty') {
        fs.writeFileSync(path.join(targetDir, 'dirty.txt'), 'uncommitted\n');
      } else if (scenario === 'escape') {
        const index = readCapabilityIndex(sourceDir);
        index.components['skill:alpha'].path = '../outside';
        writeCapabilityIndex(sourceDir, index);
        commitAll(sourceDir, 'malicious capability path');
      } else {
        const outside = path.join(root, 'outside');
        fs.mkdirSync(outside);
        fs.symlinkSync(outside, path.join(targetDir, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
      }

      const result = runMigration(sourceDir, targetDir, 'codex', { binDir });
      expect(result.status, `${scenario}: ${result.stderr}`).not.toBe(0);
      const error = JSON.parse(result.stderr) as { code: string; message: string };
      if (scenario === 'dirty') expect(error.code).toBe('E_TARGET_DIRTY');
      if (scenario === 'escape') expect(error.message).toContain("canonical path 'skills/alpha'");
      if (scenario === 'symlink') expect(error.code).toBe('E_SYMLINK');
      expect(readCalls(callLog)).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}, 30_000);

test('normal and force both protect an unmanaged same-name Host skill collision', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-same-name-collision-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const collision = path.join(targetDir, '.agents', 'skills', 'alpha', 'SKILL.md');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir, { knowledge: true, ignore: ['.agents/'] });
    fs.mkdirSync(path.dirname(collision), { recursive: true });
    fs.writeFileSync(collision, 'target-owned alpha\n');

    for (const force of [false, true]) {
      const result = runMigration(sourceDir, targetDir, 'codex', { force });
      expect(result.status).toBe(3);
      expect(JSON.parse(result.stderr)).toMatchObject({ code: 'E_COLLISION', phase: 'preflight' });
      expect(fs.readFileSync(collision, 'utf8')).toBe('target-owned alpha\n');
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('a later migration removes only stale manifest-owned skills', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-stale-owned-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir, { knowledge: true });
    expect(runMigration(sourceDir, targetDir, 'codex').status).toBe(0);
    commitAll(targetDir, 'accept alpha distribution');

    const custom = path.join(targetDir, '.agents', 'skills', 'custom', 'SKILL.md');
    fs.mkdirSync(path.dirname(custom), { recursive: true });
    fs.writeFileSync(custom, 'target custom\n');
    commitAll(targetDir, 'add target-owned custom skill');
    fs.rmSync(path.join(sourceDir, 'skills', 'alpha'), { recursive: true });
    fs.mkdirSync(path.join(sourceDir, 'skills', 'beta'), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'skills', 'beta', 'SKILL.md'), '---\nname: beta\n---\n');
    const index = readCapabilityIndex(sourceDir);
    delete index.components['skill:alpha'];
    index.components['skill:beta'] = {
      kind: 'skill', path: 'skills/beta', distribution: 'target-distributed',
    };
    writeCapabilityIndex(sourceDir, index);
    commitAll(sourceDir, 'replace alpha with beta');

    const result = runMigration(sourceDir, targetDir, 'codex');
    expect(result.status, result.stderr).toBe(0);
    expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'alpha'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'beta', 'SKILL.md'))).toBe(true);
    expect(fs.readFileSync(custom, 'utf8')).toBe('target custom\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('failed initialization rolls the target back exactly without touching target-owned data', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-target-rollback-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const callLog = path.join(root, 'codex-calls.jsonl');
  const globalConfig = path.join(root, 'home', '.codex', 'config.toml');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir, { productData: true });
    fs.mkdirSync(path.dirname(globalConfig), { recursive: true });
    fs.writeFileSync(globalConfig, 'global sentinel\n');
    const before = snapshotFiles(targetDir);
    writeFakeCli(binDir, 'codex', callLog, {
      behavior: 'invalid-and-mutate-product',
      productPath: path.join(targetDir, 'src', 'product.bin'),
    });

    const result = runMigration(sourceDir, targetDir, 'codex', {
      binDir,
      env: { HOME: path.join(root, 'home'), USERPROFILE: path.join(root, 'home') },
    });
    expect(result.status).toBe(3);
    expect(readCalls(callLog)).toHaveLength(1);
    expect(snapshotFiles(targetDir)).toEqual(before);
    expect(gitStatus(targetDir)).toBe('');
    expect(fs.readFileSync(globalConfig, 'utf8')).toBe('global sentinel\n');
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'E_VALIDATE', rolledBack: true });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('source mutation is preserved and reported as an inexact rollback while target rollback stays exact', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-source-mutation-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const callLog = path.join(root, 'codex-calls.jsonl');
  const sourceOwned = path.join(sourceDir, 'source-owned.txt');
  try {
    initMinimalSource(sourceDir);
    fs.writeFileSync(sourceOwned, 'source baseline\n');
    commitAll(sourceDir, 'add source-owned sentinel');
    initTarget(targetDir);
    const targetBefore = snapshotFiles(targetDir);
    writeFakeCli(binDir, 'codex', callLog, {
      behavior: 'valid-and-mutate-source',
      sourcePath: sourceOwned,
    });

    const result = runMigration(sourceDir, targetDir, 'codex', { binDir });
    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_ROLLBACK',
      phase: 'rollback',
      rolledBack: false,
      originalError: { code: 'E_VALIDATE' },
    });
    expect(fs.readFileSync(sourceOwned, 'utf8')).toBe('source changed by host\n');
    expect(snapshotFiles(targetDir)).toEqual(targetBefore);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('source distribution bytes must match the source HEAD even when Git status hides the change', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-source-head-bytes-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const skillPath = path.join(sourceDir, 'skills', 'alpha', 'SKILL.md');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir, { knowledge: true });
    execFileSync('git', ['update-index', '--assume-unchanged', '--', 'skills/alpha/SKILL.md'], { cwd: sourceDir });
    fs.writeFileSync(skillPath, '---\nname: alpha\n---\nhidden mutation\n');
    expect(gitStatus(sourceDir)).toBe('');

    const result = runMigration(sourceDir, targetDir, 'codex');
    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_VALIDATE',
      message: expect.stringContaining("Distribution source 'skills/alpha/SKILL.md' does not match its Git HEAD blob byte-for-byte"),
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('credential-bearing source URLs are rejected before manifest persistence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-source-url-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir, { knowledge: true });
    execFileSync('git', ['remote', 'set-url', 'origin', 'https://secret-token@example.invalid/harness-hub.git'], {
      cwd: sourceDir,
    });

    const result = runMigration(sourceDir, targetDir, 'codex');
    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'E_SOURCE_CREDENTIAL_URL', phase: 'preflight' });
    expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'manifest.json'))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('first OKF CLI runs with isolated user state and no unrelated credential environment', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-host-isolation-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const callLog = path.join(root, 'codex-calls.jsonl');
  const realHome = path.join(root, 'real-home');
  const globalConfig = path.join(realHome, '.codex', 'config.toml');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir);
    writeFile(globalConfig, 'global sentinel\n');
    writeFakeCli(binDir, 'codex', callLog, { behavior: 'valid-and-write-home' });

    const result = runMigration(sourceDir, targetDir, 'codex', {
      binDir,
      env: {
        HOME: realHome,
        USERPROFILE: realHome,
        GITHUB_TOKEN: 'must-not-reach-host',
      },
    });
    expect(result.status, result.stderr).toBe(0);
    const [call] = readCalls(callLog);
    expect(path.resolve(call.home)).not.toBe(path.resolve(realHome));
    expect(call.visibleCredential).toBeNull();
    expect(fs.existsSync(call.home)).toBe(false);
    expect(fs.readFileSync(globalConfig, 'utf8')).toBe('global sentinel\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('rollback restores executable modes exactly when the platform exposes POSIX modes', () => {
  if (process.platform === 'win32') return;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-mode-rollback-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const callLog = path.join(root, 'codex-calls.jsonl');
  const hook = path.join(targetDir, '.git', 'hooks', 'project-hook');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir, { productData: true });
    writeFile(hook, '#!/bin/sh\nexit 0\n');
    fs.chmodSync(hook, 0o755);
    writeFakeCli(binDir, 'codex', callLog, {
      behavior: 'invalid-and-mutate-product',
      productPath: path.join(targetDir, 'src', 'product.bin'),
    });

    const result = runMigration(sourceDir, targetDir, 'codex', { binDir });
    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({ rolledBack: true });
    expect(fs.statSync(hook).mode & 0o777).toBe(0o755);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('non-canonical manifest paths are rejected before force host reduction', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-manifest-normalization-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const customSkill = path.join(targetDir, '.claude', 'skills', 'custom', 'SKILL.md');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir, { knowledge: true });
    expect(runMigration(sourceDir, targetDir, 'both', { primary: 'codex' }).status).toBe(0);
    commitAll(targetDir, 'accept both migration');
    writeFile(path.join(targetDir, '.gitignore'), '.claude/skills/custom/\n');
    commitAll(targetDir, 'ignore target-owned Claude skill');
    writeFile(customSkill, 'target owned\n');
    const manifestPath = path.join(targetDir, '.harness-hub', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { files: Array<{ path: string }> };
    const managed = manifest.files.find((file) => file.path === '.claude/skills/alpha/SKILL.md');
    expect(managed).toBeDefined();
    managed!.path = '.claude/skills/./SKILL.md';
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    commitAll(targetDir, 'inject non-canonical manifest path');

    const result = runMigration(sourceDir, targetDir, 'codex', { force: true });
    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'E_COLLISION', phase: 'preflight' });
    expect(fs.readFileSync(customSkill, 'utf8')).toBe('target owned\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('normal and force preserve target-owned knowledge, skills, evals, product files, and global config', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-owned-protection-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const homeDir = path.join(root, 'home');
  const globalConfig = path.join(homeDir, '.codex', 'config.toml');
  const agentReachConfig = path.join(homeDir, '.agent-reach', 'config.json');
  const browserCredential = path.join(homeDir, '.credentials', 'browser-cookie.bin');
  try {
    initMinimalSource(sourceDir);
    initTarget(targetDir, { knowledge: true, productData: true, customHostSkills: true });
    fs.mkdirSync(path.dirname(globalConfig), { recursive: true });
    fs.writeFileSync(globalConfig, '[features]\nkeep = true\n');
    fs.mkdirSync(path.dirname(agentReachConfig), { recursive: true });
    fs.writeFileSync(agentReachConfig, '{"preserve":"agent-reach"}\n');
    fs.mkdirSync(path.dirname(browserCredential), { recursive: true });
    fs.writeFileSync(browserCredential, Buffer.from([0, 1, 2, 3, 255]));
    const protectedBefore = protectedSnapshot(targetDir, globalConfig, [agentReachConfig, browserCredential]);

    const normal = runMigration(sourceDir, targetDir, 'both', {
      primary: 'codex', env: { HOME: homeDir, USERPROFILE: homeDir },
    });
    expect(normal.status, normal.stderr).toBe(0);
    expect(protectedSnapshot(targetDir, globalConfig, [agentReachConfig, browserCredential])).toEqual(protectedBefore);
    commitAll(targetDir, 'accept normal migration');

    fs.appendFileSync(path.join(sourceDir, 'skills', 'alpha', 'SKILL.md'), 'updated generic skill\n');
    commitAll(sourceDir, 'update managed generic skill');
    const forced = runMigration(sourceDir, targetDir, 'both', {
      primary: 'codex', force: true, env: { HOME: homeDir, USERPROFILE: homeDir },
    });
    expect(forced.status, forced.stderr).toBe(0);
    expect(protectedSnapshot(targetDir, globalConfig, [agentReachConfig, browserCredential])).toEqual(protectedBefore);

    const manifest = fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'), 'utf8');
    for (const targetOwned of ['knowledge/', 'evals/', 'src/', '.agents/skills/custom/', '.claude/skills/custom/']) {
      expect(manifest).not.toContain(targetOwned);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

function initMinimalSource(sourceDir: string): void {
  copyFile(MIGRATE_BIN, path.join(sourceDir, 'bin', 'harness-hub.mjs'));
  copyFile(MIGRATE_SCRIPT, path.join(sourceDir, 'scripts', 'migrate.mjs'));
  copyFile(OKF_VALIDATOR, path.join(sourceDir, 'scripts', 'okf-validate.mjs'));
  copyFile(SAFETY_HOOK, path.join(sourceDir, 'harness', 'agent-hooks', 'safety-hook.mjs'));
  copyFile(CLAUDE_HOOKS, path.join(sourceDir, 'harness', 'agent-hooks', 'claude', 'settings.json'));
  copyFile(CODEX_HOOKS, path.join(sourceDir, 'harness', 'agent-hooks', 'codex', 'hooks.json'));
  copyFile(TARGET_AGENTS, path.join(sourceDir, 'harness', 'target', 'AGENTS.md'));
  writeFile(path.join(sourceDir, 'skills', 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: Shared test skill.\n---\n');
  writeFile(path.join(sourceDir, 'skills', 'alpha', 'scripts', 'check.mjs'), 'export const alpha = true;\n');
  writeFile(path.join(sourceDir, 'skills', 'decision-ui', 'SKILL.md'), '---\nname: decision-ui\ndescription: Codex-only decisions.\n---\n');
  writeFile(path.join(sourceDir, 'skills', 'source-only', 'SKILL.md'), '---\nname: source-only\n---\n');
  writeCapabilityIndex(sourceDir, {
    components: {
      'skill:alpha': { kind: 'skill', path: 'skills/alpha', distribution: 'target-distributed' },
      'skill:decision-ui': {
        kind: 'skill', path: 'skills/decision-ui', distribution: 'target-distributed', host: 'codex',
      },
      'skill:source-only': { kind: 'skill', path: 'skills/source-only', distribution: 'hub-internal' },
    },
  });
  writeFile(path.join(sourceDir, 'knowledge', 'private.md'), `# Private\n\n${HUB_ONLY_SENTINEL}\n`);
  writeFile(path.join(sourceDir, 'source-owned.txt'), 'source baseline\n');
  initGit(sourceDir);
  execFileSync('git', ['remote', 'add', 'origin', 'https://example.invalid/harness-hub.git'], { cwd: sourceDir });
}

function initFullSource(sourceDir: string): void {
  for (const [source, target] of [
    [MIGRATE_BIN, path.join(sourceDir, 'bin', 'harness-hub.mjs')],
    [MIGRATE_SCRIPT, path.join(sourceDir, 'scripts', 'migrate.mjs')],
    [OKF_VALIDATOR, path.join(sourceDir, 'scripts', 'okf-validate.mjs')],
    [SAFETY_HOOK, path.join(sourceDir, 'harness', 'agent-hooks', 'safety-hook.mjs')],
    [CLAUDE_HOOKS, path.join(sourceDir, 'harness', 'agent-hooks', 'claude', 'settings.json')],
    [CODEX_HOOKS, path.join(sourceDir, 'harness', 'agent-hooks', 'codex', 'hooks.json')],
    [TARGET_AGENTS, path.join(sourceDir, 'harness', 'target', 'AGENTS.md')],
    [path.resolve('capabilities/index.json'), path.join(sourceDir, 'capabilities', 'index.json')],
  ] as const) copyFile(source, target);

  const index = JSON.parse(fs.readFileSync(path.join(sourceDir, 'capabilities', 'index.json'), 'utf8')) as {
    components: Record<string, { kind: string; path: string }>;
  };
  for (const component of Object.values(index.components)) {
    if (component.kind !== 'skill') continue;
    fs.cpSync(path.resolve(component.path), path.join(sourceDir, component.path), { recursive: true });
  }
  writeFile(path.join(sourceDir, 'knowledge', 'private.md'), `# Private\n\n${HUB_ONLY_SENTINEL}\n`);
  writeFile(path.join(sourceDir, 'docs', 'source-only.md'), '# Source-only governance\n');
  initGit(sourceDir);
  execFileSync('git', ['remote', 'add', 'origin', 'https://example.invalid/harness-hub.git'], { cwd: sourceDir });
}

function initTarget(targetDir: string, options: {
  customHostSkills?: boolean;
  ignore?: string[];
  knowledge?: boolean;
  productData?: boolean;
} = {}): void {
  writeFile(path.join(targetDir, 'tracked.txt'), 'target project source\n');
  if (options.ignore?.length) writeFile(path.join(targetDir, '.gitignore'), `${options.ignore.join('\n')}\n`);
  if (options.knowledge) writeValidKnowledge(targetDir);
  if (options.productData) {
    writeFile(path.join(targetDir, 'src', 'product.bin'), 'product bytes\n');
    writeFile(path.join(targetDir, 'evals', 'case.json'), '{"task":"target-owned"}\n');
    writeFile(path.join(targetDir, 'skills', 'project', 'SKILL.md'), 'target project skill\n');
    writeFile(path.join(targetDir, '.claude', 'commands', 'custom.md'), 'target command\n');
    writeFile(path.join(targetDir, '.codex', 'skills', 'custom', 'SKILL.md'), 'target codex-local skill\n');
  }
  if (options.customHostSkills) {
    writeFile(path.join(targetDir, '.agents', 'skills', 'custom', 'SKILL.md'), 'target Codex Host skill\n');
    writeFile(path.join(targetDir, '.claude', 'skills', 'custom', 'SKILL.md'), 'target Claude Host skill\n');
  }
  initGit(targetDir);
}

function writeValidKnowledge(targetDir: string): void {
  writeFile(path.join(targetDir, 'knowledge', 'index.md'), `---
type: index
okf_version: "0.1"
---
# Project knowledge

- [Project](project.md)
- [Update log](log.md)
`);
  writeFile(path.join(targetDir, 'knowledge', 'log.md'), `---
type: log
---
# Knowledge update log

## 2026-07-14

- Initialized from target repository sources.
`);
  writeFile(path.join(targetDir, 'knowledge', 'project.md'), `---
type: project
title: Target project
---
# Target project

This page records a stable target fact.

## Sources

- [Tracked source](../tracked.txt)
`);
}

function expectValidKnowledge(targetDir: string): void {
  const result = spawnSync(process.execPath, [OKF_VALIDATOR, targetDir, '--json'], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, conceptCount: 1, sourceCount: 1 });
}

function writeFakeCli(binDir: string, host: Host, callLog: string, options: {
  behavior?: 'valid' | 'invalid-and-mutate-product' | 'valid-and-mutate-source' | 'valid-and-write-home';
  productPath?: string;
  sourcePath?: string;
} = {}): void {
  fs.mkdirSync(binDir, { recursive: true });
  const worker = path.join(binDir, `${host}-fake.mjs`);
  const behavior = options.behavior ?? 'valid';
  const validKnowledge = `
fs.mkdirSync(path.join(process.cwd(), 'knowledge'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'knowledge', 'index.md'), ${JSON.stringify(`---
type: index
okf_version: "0.1"
---
# Project knowledge

- [Project](project.md)
- [Update log](log.md)
`)});
fs.writeFileSync(path.join(process.cwd(), 'knowledge', 'log.md'), ${JSON.stringify(`---
type: log
---
# Knowledge update log

## 2026-07-14

- Initialized from target repository sources.
`)});
fs.writeFileSync(path.join(process.cwd(), 'knowledge', 'project.md'), ${JSON.stringify(`---
type: project
title: Target project
---
# Target project

Generated from the real target source.

## Sources

- [Tracked source](../tracked.txt)
`)});`;
  const behaviorSource = behavior === 'invalid-and-mutate-product'
    ? `fs.writeFileSync(${JSON.stringify(options.productPath)}, 'mutated by host\\n');
fs.mkdirSync(path.join(process.cwd(), 'knowledge'), { recursive: true });
fs.writeFileSync(path.join(process.cwd(), 'knowledge', 'index.md'), '# invalid knowledge\\n');`
    : `${validKnowledge}\n${behavior === 'valid-and-mutate-source'
      ? `fs.writeFileSync(${JSON.stringify(options.sourcePath)}, 'source changed by host\\n');`
      : behavior === 'valid-and-write-home'
        ? "fs.mkdirSync(path.join(process.env.USERPROFILE, '.codex'), { recursive: true }); fs.writeFileSync(path.join(process.env.USERPROFILE, '.codex', 'config.toml'), 'isolated write\\n');"
        : ''}`;
  fs.writeFileSync(worker, [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "let input = ''; for await (const chunk of process.stdin) input += chunk;",
    'const args = process.argv.slice(2);',
    `fs.appendFileSync(${JSON.stringify(callLog)}, JSON.stringify({ args, prompt: input, home: process.env.USERPROFILE, visibleCredential: process.env.GITHUB_TOKEN ?? null }) + '\\n');`,
    behaviorSource,
    host === 'claude' ? "process.stdout.write(JSON.stringify({ is_error: false, result: 'ok' }));" : '',
  ].filter(Boolean).join('\n'));

  if (process.platform === 'win32') {
    fs.writeFileSync(
      path.join(binDir, `${host}.ps1`),
      `& '${process.execPath.replaceAll("'", "''")}' '${worker.replaceAll("'", "''")}' @args\r\nexit $LASTEXITCODE\r\n`,
    );
  } else {
    const command = path.join(binDir, host);
    fs.writeFileSync(command, `#!/bin/sh\nexec "${process.execPath}" "${worker}" "$@"\n`);
    fs.chmodSync(command, 0o755);
  }
}

function runMigration(sourceDir: string, targetDir: string, host: 'claude' | 'codex' | 'both', options: {
  binDir?: string;
  env?: Record<string, string>;
  force?: boolean;
  primary?: Host;
} = {}): SpawnSyncReturns<string> {
  const args = [path.join(sourceDir, 'bin', 'harness-hub.mjs'), 'migrate', targetDir, '--host', host, '--yes'];
  if (options.primary) args.push('--primary', options.primary);
  if (options.force) args.push('--force');
  return spawnSync(process.execPath, args, {
    cwd: sourceDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
      PATH: options.binDir
        ? `${options.binDir}${path.delimiter}${process.env.PATH ?? ''}`
        : process.env.PATH,
    },
  });
}

function readCalls(callLog: string): Array<{
  args: string[];
  home: string;
  prompt: string;
  visibleCredential: string | null;
}> {
  if (!fs.existsSync(callLog)) return [];
  return fs.readFileSync(callLog, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function protectedSnapshot(targetDir: string, globalConfig: string, homeSentinels: string[] = []): Record<string, string> {
  const paths = [
    'knowledge/index.md', 'knowledge/log.md', 'knowledge/project.md',
    'src/product.bin', 'evals/case.json', 'skills/project/SKILL.md',
    '.agents/skills/custom/SKILL.md', '.claude/skills/custom/SKILL.md',
    '.claude/commands/custom.md', '.codex/skills/custom/SKILL.md',
  ];
  return Object.fromEntries([
    ...paths.map((relativePath) => [relativePath, fs.readFileSync(path.join(targetDir, relativePath), 'base64')]),
    ['global-config', fs.readFileSync(globalConfig, 'base64')],
    ...homeSentinels.map((sentinel, index) => [`home-sentinel-${index}`, fs.readFileSync(sentinel, 'base64')]),
  ]);
}

function initGit(root: string): void {
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Harness Test'], { cwd: root });
  commitAll(root, 'initial');
}

function commitAll(root: string, message: string): void {
  execFileSync('git', ['add', '-A'], { cwd: root });
  execFileSync('git', ['commit', '--allow-empty', '-m', message], { cwd: root, stdio: 'ignore' });
}

function gitStatus(root: string): string {
  return execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
}

function copyFile(source: string, target: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function readCapabilityIndex(sourceDir: string): {
  components: Record<string, { distribution: string; host?: Host; kind: string; path: string }>;
} {
  return JSON.parse(fs.readFileSync(path.join(sourceDir, 'capabilities', 'index.json'), 'utf8'));
}

function writeCapabilityIndex(sourceDir: string, value: unknown): void {
  writeFile(path.join(sourceDir, 'capabilities', 'index.json'), `${JSON.stringify(value, null, 2)}\n`);
}

function trackedFiles(repositoryRoot: string, relativeRoot: string): string[] {
  const prefix = `${relativeRoot.replaceAll('\\', '/')}/`;
  return execFileSync('git', ['ls-files', '-z', '--', relativeRoot], { cwd: repositoryRoot, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .map((item) => item.replaceAll('\\', '/'))
    .filter((item) => item.startsWith(prefix))
    .map((item) => item.slice(prefix.length))
    .sort();
}

function listTree(root: string, prefix = ''): string[] {
  if (!fs.existsSync(root)) return [];
  const output: string[] = [];
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    if (!prefix && entry.name === '.git') continue;
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    output.push(relativePath);
    if (entry.isDirectory()) output.push(...listTree(root, relativePath));
  }
  return output;
}

function snapshotFiles(root: string): Array<{ path: string; text: string }> {
  return listTree(root)
    .filter((relativePath) => fs.statSync(path.join(root, relativePath)).isFile())
    .sort()
    .map((relativePath) => ({
      path: relativePath,
      text: fs.readFileSync(path.join(root, relativePath)).toString('base64'),
    }));
}
