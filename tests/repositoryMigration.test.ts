import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

const MIGRATE_SCRIPT = path.resolve('scripts/migrate.mjs');
const MIGRATE_BIN = path.resolve('bin/harness-hub.mjs');
const LOOP_RUNTIME = path.resolve('skills/workflow-router/scripts/loop-runtime.mjs');
const OKF_VALIDATOR = path.resolve('skills/workflow-router/scripts/okf-validate.mjs');
const ROUTE_INTENT = path.resolve('skills/workflow-router/scripts/route-intent.mjs');
const HARNESS_AGENT_GATE = path.resolve('skills/workflow-router/scripts/harness-agent-gate.mjs');
const HARNESS_AGENT_HOOK = path.resolve('skills/workflow-router/scripts/harness-agent-hook.mjs');
const HUB_INTERNAL_BODY = 'INTERNAL ONLY: this synthetic Harness Hub planning paragraph belongs exclusively to the source repository and must never appear in a target project wiki.';

test('repository migration rejects unknown repeated and positional arguments', () => {
  const invalidTarget = path.join(os.tmpdir(), `harness-hub-invalid-args-${process.pid}-${Date.now()}`);
  const invalidArguments = [
    [invalidTarget, '--host', 'codex', '--yes', '--dry-run'],
    [invalidTarget, '--host', 'codex', '--yes', '--target', 'standard'],
    [invalidTarget, 'extra', '--host', 'codex', '--yes'],
    [invalidTarget, '--host', 'codex', '--host', 'codex', '--yes'],
    [invalidTarget, '--host', 'codex', '--yes', '--yes'],
    [invalidTarget, '--host', 'codex', '--yes', '--force', '--force'],
    [invalidTarget, '--host', 'both', '--primary', 'codex', '--primary', 'codex', '--yes'],
    [invalidTarget, '--host', 'codex', '--primary', 'codex', '--yes'],
    [invalidTarget, '--host', 'claude', '--primary', 'claude', '--yes'],
    [invalidTarget, '--host', 'codex', '--primary', 'claude', '--yes'],
  ];

  for (const args of invalidArguments) {
    const result = spawnSync(process.execPath, [MIGRATE_BIN, 'migrate', ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status, args.join(' ')).toBe(2);
    expect(JSON.parse(result.stderr), args.join(' ')).toMatchObject({
      code: 'E_INPUT',
      phase: 'input',
    });
  }
});

test('repository migration rejects using its source checkout as the target before invoking a Host', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-same-root-'));
  const sourceDir = path.join(root, 'source');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');

  try {
    initMigrationSource(sourceDir);
    writeFakeCommand(binDir, 'codex', markerPath);
    const before = snapshotTestTree(sourceDir);

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      sourceDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(2);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_INPUT',
      phase: 'input',
      message: expect.stringContaining('must not overlap'),
    });
    expect(fs.existsSync(markerPath)).toBe(false);
    expect(snapshotTestTree(sourceDir)).toEqual(before);
    expect(gitStatus(sourceDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('repository migration rejects nested source and target repositories before invoking a Host', () => {
  for (const nesting of ['target-in-source', 'source-in-target'] as const) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `harness-hub-migrate-${nesting}-`));
    const outerDir = path.join(root, 'outer');
    const binDir = path.join(root, 'bin');
    const markerPath = path.join(root, 'host-called');
    let sourceDir;
    let targetDir;

    try {
      if (nesting === 'target-in-source') {
        sourceDir = outerDir;
        targetDir = path.join(sourceDir, 'target');
        initMigrationSource(sourceDir);
        fs.writeFileSync(path.join(sourceDir, '.gitignore'), 'target/\n');
        execFileSync('git', ['add', '.gitignore'], { cwd: sourceDir, stdio: 'ignore' });
        execFileSync('git', ['commit', '-m', 'ignore nested target'], { cwd: sourceDir, stdio: 'ignore' });
        fs.mkdirSync(targetDir);
        fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
        initGitRepository(targetDir);
      } else {
        targetDir = outerDir;
        sourceDir = path.join(targetDir, 'source');
        fs.mkdirSync(targetDir);
        fs.writeFileSync(path.join(targetDir, '.gitignore'), 'source/\n');
        fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
        initGitRepository(targetDir);
        initMigrationSource(sourceDir);
      }
      writeFakeCommand(binDir, 'codex', markerPath);
      const sourceHead = gitHead(sourceDir);
      const targetHead = gitHead(targetDir);

      const result = spawnSync(process.execPath, [
        path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
        targetDir,
        '--host',
        'codex',
        '--yes',
      ], {
        cwd: sourceDir,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
        },
      });

      expect(result.status, nesting).toBe(2);
      expect(JSON.parse(result.stderr), nesting).toMatchObject({
        code: 'E_INPUT',
        phase: 'input',
        message: expect.stringContaining('must not overlap'),
      });
      expect(fs.existsSync(markerPath), nesting).toBe(false);
      expect(gitHead(sourceDir), nesting).toBe(sourceHead);
      expect(gitHead(targetDir), nesting).toBe(targetHead);
      expect(gitStatus(sourceDir), nesting).toBe('');
      expect(gitStatus(targetDir), nesting).toBe('');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}, 15_000);

test('repository migration rejects a dirty Git target before invoking the host CLI', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-dirty-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    fs.writeFileSync(path.join(targetDir, 'dirty.txt'), 'not committed\n');
    writeFakeCommand(binDir, 'codex', markerPath);

    const before = gitStatus(targetDir);
    const result = spawnSync(process.execPath, [
      MIGRATE_BIN,
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'preflight',
      code: 'E_TARGET_DIRTY',
    });
    expect(fs.existsSync(markerPath)).toBe(false);
    expect(gitStatus(targetDir)).toBe(before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('repository migration rejects ignored unmanaged collisions before invoking the host CLI', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-collision-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');
  const collisionPath = path.join(targetDir, '.agents', 'skills', 'workflow-router', 'SKILL.md');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(path.dirname(collisionPath), { recursive: true });
    fs.writeFileSync(path.join(targetDir, '.gitignore'), '.agents/\n');
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(collisionPath, 'local ignored content\n');
    initGitRepository(targetDir);
    writeFakeCommand(binDir, 'codex', markerPath, undefined, undefined, validMigrationBehavior(sourceDir, targetDir, 'codex'));

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'preflight',
      code: 'E_COLLISION',
    });
    expect(fs.existsSync(markerPath)).toBe(false);
    expect(fs.readFileSync(collisionPath, 'utf8')).toBe('local ignored content\n');
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('repository migration rejects a managed junction before invoking the host CLI and leaves its target untouched', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-junction-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const externalDir = path.join(root, 'external');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');
  const sentinelPath = path.join(externalDir, 'sentinel.bin');
  const sentinel = Buffer.from([0, 255, 17, 34, 51, 68]);

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.mkdirSync(externalDir);
    fs.writeFileSync(path.join(targetDir, '.gitignore'), '.agents/\n');
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(sentinelPath, sentinel);
    initGitRepository(targetDir);
    fs.symlinkSync(externalDir, path.join(targetDir, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
    writeFakeCommand(binDir, 'codex', markerPath, undefined, undefined, validMigrationBehavior(sourceDir, targetDir, 'codex'));

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--force',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'preflight',
      code: 'E_SYMLINK',
    });
    expect(fs.existsSync(markerPath)).toBe(false);
    expect(fs.lstatSync(path.join(targetDir, '.agents')).isSymbolicLink()).toBe(true);
    expect(fs.readFileSync(sentinelPath)).toEqual(sentinel);
    expect(fs.readdirSync(externalDir)).toEqual(['sentinel.bin']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('repository migration rejects a runtime-state junction before any Loop writes outside the target', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-state-junction-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const externalDir = path.join(root, 'external');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');
  const sentinelPath = path.join(externalDir, 'sentinel.bin');
  const sentinel = Buffer.from([9, 8, 7, 6, 5, 4]);

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(path.join(targetDir, '.harness-hub'), { recursive: true });
    fs.mkdirSync(externalDir);
    fs.writeFileSync(path.join(targetDir, '.gitignore'), '.harness-hub/state/\n');
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(sentinelPath, sentinel);
    initGitRepository(targetDir);
    fs.symlinkSync(externalDir, path.join(targetDir, '.harness-hub', 'state'), process.platform === 'win32' ? 'junction' : 'dir');
    writeFakeCommand(binDir, 'codex', markerPath, undefined, undefined, validMigrationBehavior(sourceDir, targetDir, 'codex'));

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'E_SYMLINK', phase: 'preflight' });
    expect(fs.existsSync(markerPath)).toBe(false);
    expect(fs.readFileSync(sentinelPath)).toEqual(sentinel);
    expect(fs.readdirSync(externalDir)).toEqual(['sentinel.bin']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('repository migration fails closed for a linked target worktree before invoking the host CLI', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-linked-worktree-'));
  const sourceDir = path.join(root, 'source');
  const baseDir = path.join(root, 'base');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(baseDir);
    fs.writeFileSync(path.join(baseDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(baseDir);
    execFileSync('git', ['worktree', 'add', '-b', 'migration-linked-test', targetDir], { cwd: baseDir, stdio: 'ignore' });
    writeFakeCommand(binDir, 'codex', markerPath, undefined, undefined, validMigrationBehavior(sourceDir, targetDir, 'codex'));

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'E_LINKED_WORKTREE', phase: 'preflight' });
    expect(fs.existsSync(markerPath)).toBe(false);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('repository migration rejects untracked project OKF before invoking a host that could not roll it back', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-untracked-okf-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, '.gitignore'), 'knowledge/\n');
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    fs.mkdirSync(path.join(targetDir, 'knowledge'));
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n\n# Knowledge\n\n- [Project](project.md)\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'log.md'), '---\ntype: log\n---\n\n# Knowledge log\n\n## 2026-07-13\n\n- Initialized.\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'project.md'), '---\ntype: concept\n---\n\n# Project\n\n## Sources\n\n- [Tracked source](../tracked.txt)\n');
    writeFakeCommand(binDir, 'codex', markerPath);

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'preflight',
      code: 'E_KNOWLEDGE_UNTRACKED',
      message: expect.stringContaining('knowledge/project.md'),
    });
    expect(fs.existsSync(markerPath)).toBe(false);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('force migration takes over declared managed paths without retaining a backup', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-force-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const collisionPath = path.join(targetDir, '.agents', 'skills', 'workflow-router', 'SKILL.md');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(path.dirname(collisionPath), { recursive: true });
    fs.writeFileSync(path.join(targetDir, '.gitignore'), '.agents/\n');
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(collisionPath, 'local ignored content\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      validMigrationBehavior(sourceDir, targetDir, 'codex'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--force',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(0);
    expect(fs.readFileSync(collisionPath, 'utf8')).toBe(
      fs.readFileSync(path.join(sourceDir, 'skills', 'workflow-router', 'SKILL.md'), 'utf8'),
    );
    expect(listTree(targetDir).some((file) => /backup|\.bak$/i.test(file))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('failed force migration restores ignored managed conflicts byte-for-byte', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-force-rollback-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');
  const ignoredRoot = path.join(targetDir, '.agents');
  const collisionPath = path.join(ignoredRoot, 'skills', 'workflow-router', 'SKILL.md');
  const binaryPath = path.join(ignoredRoot, 'hooks.json');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(path.dirname(collisionPath), { recursive: true });
    fs.writeFileSync(path.join(targetDir, '.gitignore'), '.agents/\nknowledge/\n');
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(collisionPath, 'ignored local workflow\r\n');
    fs.writeFileSync(binaryPath, Buffer.from([0, 255, 1, 254, 2, 253]));
    initGitRepository(targetDir);
    const before = snapshotTestTree(ignoredRoot);
    writeFakeCommand(
      binDir,
      'codex',
      markerPath,
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        'process.exitCode = 9;',
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--force',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'host',
      code: 'E_HOST',
      rolledBack: true,
    });
    expect(fs.readFileSync(markerPath, 'utf8').trim()).toBe('called');
    expect(snapshotTestTree(ignoredRoot)).toEqual(before);
    expect(fs.existsSync(path.join(targetDir, 'knowledge'))).toBe(false);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('Claude Code semantic errors fail as Host errors even when its process exits zero', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-claude-error-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'claude',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      'globalThis.__fakeSkipMigrationTrace = true; globalThis.__fakeClaudeHostError = true;',
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'claude',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_HOST',
      phase: 'host',
      rolledBack: true,
      message: expect.stringContaining('Not logged in'),
    });
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('Windows launcher rejection survives migration rollback as closed Agent evidence', () => {
  if (process.platform !== 'win32') return;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-launcher-evidence-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    fs.mkdirSync(binDir);
    fs.writeFileSync(path.join(binDir, 'codex.cmd'), '@exit /b 0\r\n');

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    const failure = JSON.parse(result.stderr);
    expect(failure).toMatchObject({ code: 'E_HOST', phase: 'host', rolledBack: true });
    expect(failure.runIds).toHaveLength(1);
    const failedRunId = failure.runIds[0];
    expect(typeof failedRunId).toBe('string');
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', failedRunId);
    expect(JSON.parse(fs.readFileSync(path.join(runDir, 'integration.json'), 'utf8')).agentEvidence).toEqual([
      expect.objectContaining({ agentId: 'producer-1', sha256: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    ]);
    expect(JSON.parse(fs.readFileSync(path.join(runDir, 'agents', 'producer-1', 'state.json'), 'utf8'))).toMatchObject({
      status: 'failed',
      failure: { code: 'E_HOST_LAUNCHER' },
    });
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('repository migration runs one Codex repository slice plus the independent knowledge init loop', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-codex-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');
  const argsPath = path.join(root, 'host-args');
  const promptPath = path.join(root, 'host-prompt');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      markerPath,
      argsPath,
      promptPath,
      `${validMigrationBehavior(sourceDir, targetDir, 'codex')}\nglobalThis.__fakePassiveError = true;`,
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      host: 'codex',
      sourceCommit: gitHead(sourceDir),
      targetHead: gitHead(targetDir),
    });
    expect(fs.readFileSync(markerPath, 'utf8').trim().split(/\r?\n/)).toEqual(['called', 'called', 'called']);
    const hostArgs = fs.readFileSync(argsPath, 'utf8');
    const hostInvocations = hostArgs.split(/\r?\n--- invocation ---\r?\n/)
      .filter((entry) => entry.trim())
      .map((entry) => entry.trim().split(/\r?\n/));
    const writePrefix = [
      '--ask-for-approval',
      'never',
      ...(process.platform === 'win32' ? ['-c', 'windows.sandbox=unelevated'] : []),
      'exec',
      '--sandbox',
      'workspace-write',
      '--ephemeral',
      '--ignore-user-config',
      '--ignore-rules',
      '--disable',
      'hooks',
    ];
    const readPrefix = [
      '--ask-for-approval',
      'never',
      'exec',
      '--sandbox',
      'read-only',
      '--ephemeral',
      '--ignore-user-config',
      '--ignore-rules',
      '--disable',
      'hooks',
    ];
    expect(hostInvocations).toHaveLength(3);
    expect(hostInvocations[0].slice(0, writePrefix.length)).toEqual(writePrefix);
    expect(hostInvocations[1].slice(0, writePrefix.length)).toEqual(writePrefix);
    expect(hostInvocations[2].slice(0, readPrefix.length)).toEqual(readPrefix);
    expect(hostArgs).toContain('exec');
    expect(hostArgs).toContain('--ask-for-approval');
    expect(hostArgs).toContain('never');
    if (process.platform === 'win32') {
      expect(hostArgs).toContain('-c');
      expect(hostArgs).toContain('windows.sandbox=unelevated');
    }
    expect(hostArgs).toContain('--sandbox');
    expect(hostArgs).toContain('workspace-write');
    expect(hostArgs).not.toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(hostArgs).toContain('--ephemeral');
    expect(hostArgs).toContain('--ignore-user-config');
    expect(hostArgs).toContain('--ignore-rules');
    expect(hostArgs).toContain('--disable');
    expect(hostArgs).toContain('hooks');
    expect(hostArgs).toContain('--json');
    expect(hostArgs).toContain('--output-schema');
    expect(hostArgs).toContain('-o');
    expect(hostArgs).not.toContain('--dangerously-bypass-hook-trust');
    expect(hostArgs.replaceAll('\\', '/')).toContain(targetDir.replaceAll('\\', '/'));
    const prompt = JSON.parse(fs.readFileSync(promptPath, 'utf8'));
    expect(prompt.allowedPaths).toEqual([
      '.agents/skills',
      '.codex/hooks.json',
      'AGENTS.md',
      'CLAUDE.md',
    ]);
    expect(prompt.forbiddenPaths).toContain('knowledge');
    expect(prompt.validationCommands).toEqual([]);
    expect(prompt.lifecycleContext.migrationCopy.command.replaceAll('\\', '/')).toContain(
      `${targetDir.replaceAll('\\', '/')}/.harness-hub/state/runs/`,
    );
    expect(prompt.lifecycleContext.migrationCopy.command.replaceAll('\\', '/')).not.toContain(
      `${sourceDir.replaceAll('\\', '/')}/scripts/migrate.mjs`,
    );
    expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.codex', 'hooks.json'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.codex', 'skills'))).toBe(false);
    const localHook = path.join(targetDir, '.agents', 'skills', 'workflow-router', 'scripts', 'harness-agent-hook.mjs');
    const hookResult = spawnSync(process.execPath, [
      localHook,
      targetDir,
      '--host',
      'codex',
      '--event',
      'UserPromptSubmit',
    ], {
      cwd: targetDir,
      encoding: 'utf8',
      input: '{"prompt":"Explain the current repository."}',
      env: {
        ...process.env,
        NODE_PATH: '',
        PATH: '',
      },
    });
    expect(hookResult.status).toBe(0);
    expect(hookResult.stderr).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('a fresh clone from the repository URL runs the full migration at the cloned commit', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-fresh-clone-'));
  const originDir = path.join(root, 'origin');
  const cloneDir = path.join(root, 'clone');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(originDir);
    execFileSync('git', ['clone', '--quiet', originDir, cloneDir], { stdio: 'ignore' });
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      validMigrationBehavior(cloneDir, targetDir, 'codex'),
    );

    const result = spawnSync(process.execPath, [
      path.join(cloneDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: cloneDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({ ok: true, sourceCommit: gitHead(originDir) });
    expect(output.sourceCommit).toBe(gitHead(cloneDir));
    const manifest = JSON.parse(fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'), 'utf8'));
    expect(manifest.source).toEqual({
      url: execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: cloneDir, encoding: 'utf8' }).trim(),
      commit: gitHead(cloneDir),
    });
    expect(fs.existsSync(path.join(cloneDir, 'dist'))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('repeating the same source commit against an accepted target is idempotent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-idempotent-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      markerPath,
      undefined,
      undefined,
      validMigrationBehavior(sourceDir, targetDir, 'codex'),
    );
    const args = [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ];
    const environment = { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` };

    const first = spawnSync(process.execPath, args, { cwd: sourceDir, encoding: 'utf8', env: environment });
    expect(first.status, `${first.stdout}\n${first.stderr}`).toBe(0);
    execFileSync('git', ['add', '-A'], { cwd: targetDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'accept full migration'], { cwd: targetDir, stdio: 'ignore' });
    const acceptedHead = gitHead(targetDir);
    const manifestBefore = fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'));

    const second = spawnSync(process.execPath, args, { cwd: sourceDir, encoding: 'utf8', env: environment });
    expect(second.status, `${second.stdout}\n${second.stderr}`).toBe(0);
    expect(JSON.parse(second.stdout)).toMatchObject({
      ok: true,
      sourceCommit: gitHead(sourceDir),
      targetHead: acceptedHead,
      loopRuns: [{ host: 'codex', role: 'primary', status: 'completed' }],
    });
    expect(gitHead(targetDir)).toBe(acceptedHead);
    expect(gitStatus(targetDir)).toBe('');
    expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'))).toEqual(manifestBefore);
    expect(fs.readFileSync(markerPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(4);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('migration distributes the complete canonical skill tree and target contract byte-for-byte', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-full-tree-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const codexCalls = path.join(root, 'codex-called');

  try {
    initFullMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'target-owned baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      codexCalls,
      undefined,
      undefined,
      validMigrationBehavior(sourceDir, targetDir, 'codex'),
    );
    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    const capabilities = JSON.parse(fs.readFileSync(path.join(sourceDir, 'capabilities', 'index.json'), 'utf8')) as {
      components: Record<string, { distribution: string; kind: string; path: string }>;
    };
    const distributedSkills = Object.values(capabilities.components)
      .filter((component) => component.kind === 'skill' && component.distribution === 'target-distributed')
      .map((component) => ({ name: path.basename(component.path), path: component.path }))
      .sort((left, right) => left.name.localeCompare(right.name));
    expect(distributedSkills).toHaveLength(47);

    const managedSkillFiles: string[] = [];
    const trackedSkillFiles = trackedTestFiles(sourceDir, 'skills');
    const testedHosts: ReadonlyArray<'claude' | 'codex'> = ['codex'];
    for (const host of testedHosts) {
      const skillRoot = host === 'claude' ? '.claude/skills' : '.agents/skills';
      for (const skill of distributedSkills) {
        const sourceSkill = path.join(sourceDir, skill.path);
        const targetSkill = path.join(targetDir, skillRoot, skill.name);
        const skillPrefix = `${skill.name}/`;
        const trackedFiles = trackedSkillFiles
          .filter((relativePath) => relativePath.startsWith(skillPrefix))
          .map((relativePath) => relativePath.slice(skillPrefix.length));
        const trackedSnapshot = trackedFiles.map((relativePath) => ({
          path: relativePath,
          bytes: fs.readFileSync(path.join(sourceSkill, relativePath)).toString('base64'),
        }));
        expect(snapshotTestTree(targetSkill), `${host}:${skill.name}`).toEqual(trackedSnapshot);
        managedSkillFiles.push(...trackedFiles.map((file) => `${skillRoot}/${skill.name}/${file}`));
      }
    }

    expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'))).toEqual(
      fs.readFileSync(path.join(sourceDir, 'harness', 'target', 'AGENTS.md')),
    );
    expect(fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n');
    expect(fs.existsSync(path.join(targetDir, '.claude'))).toBe(false);
    expect(fs.readFileSync(path.join(targetDir, '.codex', 'hooks.json'))).toEqual(
      fs.readFileSync(path.join(sourceDir, 'harness', 'agent-hooks', 'codex', 'hooks.json')),
    );
    expect(fs.existsSync(path.join(targetDir, '.codex', 'skills'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'skills'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'capabilities'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'docs'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'tests'))).toBe(false);

    const manifest = JSON.parse(fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'), 'utf8')) as {
      files: Array<{ path: string; sha256: string }>;
    };
    const manifestPaths = manifest.files.map((file) => file.path);
    expect(manifestPaths).toEqual([
      ...managedSkillFiles,
      '.codex/hooks.json',
      '.harness-hub/.gitignore',
      'AGENTS.md',
      'CLAUDE.md',
    ].sort());
    expect(fs.readFileSync(codexCalls, 'utf8').trim().split(/\r?\n/)).toHaveLength(3);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 120_000);

test('migration rejects an incomplete or source-only skill index before invoking a Host', () => {
  const cases: Array<{
    name: string;
    mutate: (sourceDir: string) => void;
    message: RegExp;
  }> = [
    {
      name: 'unindexed canonical skill',
      mutate(sourceDir) {
        const skillRoot = path.join(sourceDir, 'skills', 'unindexed-skill');
        fs.mkdirSync(skillRoot, { recursive: true });
        fs.writeFileSync(path.join(skillRoot, 'SKILL.md'), '---\nname: unindexed-skill\n---\n');
      },
      message: /exactly match canonical skill directories/i,
    },
    {
      name: 'source-only capability path',
      mutate(sourceDir) {
        const indexPath = path.join(sourceDir, 'capabilities', 'index.json');
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        index.components['skill:workflow-router'].path = 'knowledge';
        fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
      },
      message: /canonical path 'skills\/workflow-router'/i,
    },
  ];

  for (const testCase of cases) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-index-'));
    const sourceDir = path.join(root, 'source');
    const targetDir = path.join(root, 'target');
    const binDir = path.join(root, 'bin');
    const markerPath = path.join(root, 'host-called');
    try {
      initMigrationSource(sourceDir);
      testCase.mutate(sourceDir);
      execFileSync('git', ['add', '.'], { cwd: sourceDir, stdio: 'ignore' });
      execFileSync('git', ['commit', '-m', testCase.name], { cwd: sourceDir, stdio: 'ignore' });
      fs.mkdirSync(targetDir);
      fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
      initGitRepository(targetDir);
      writeFakeCommand(binDir, 'codex', markerPath);

      const result = spawnSync(process.execPath, [
        path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
        targetDir,
        '--host',
        'codex',
        '--yes',
      ], {
        cwd: sourceDir,
        encoding: 'utf8',
        env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
      });

      expect(result.status, testCase.name).toBe(3);
      expect(JSON.parse(result.stderr), testCase.name).toMatchObject({
        code: 'E_VALIDATE',
        message: expect.stringMatching(testCase.message),
      });
      expect(fs.existsSync(markerPath), testCase.name).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}, 30_000);

test('migration rejects worktree bytes hidden from a clean Git status', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-head-bytes-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');

  try {
    initMigrationSource(sourceDir);
    execFileSync('git', ['config', 'core.autocrlf', 'true'], { cwd: sourceDir, stdio: 'ignore' });
    const skillPath = path.join(sourceDir, 'skills', 'workflow-router', 'SKILL.md');
    const normalizedSkill = fs.readFileSync(skillPath, 'utf8').replaceAll('\r\n', '\n');
    fs.writeFileSync(skillPath, normalizedSkill.replaceAll('\n', '\r\n'));
    execFileSync('git', ['update-index', '--assume-unchanged', '--', 'skills/workflow-router/SKILL.md'], {
      cwd: sourceDir,
      stdio: 'ignore',
    });
    expect(gitStatus(sourceDir)).toBe('');

    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(binDir, 'codex', markerPath);

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_VALIDATE',
      message: expect.stringContaining("Distribution source 'skills/workflow-router/SKILL.md' does not match its Git HEAD blob byte-for-byte"),
    });
    expect(fs.existsSync(markerPath)).toBe(false);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('migration distributes only Git-tracked skill files and excludes ignored local artifacts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-tracked-only-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const ignoredArtifact = path.join(sourceDir, 'skills', 'workflow-router', 'artifacts', 'private-report.html');

  try {
    initMigrationSource(sourceDir);
    fs.writeFileSync(path.join(sourceDir, 'skills', 'workflow-router', '.gitignore'), 'artifacts/\n');
    execFileSync('git', ['add', 'skills/workflow-router/.gitignore'], { cwd: sourceDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'ignore local skill artifacts'], { cwd: sourceDir, stdio: 'ignore' });
    fs.mkdirSync(path.dirname(ignoredArtifact), { recursive: true });
    fs.writeFileSync(ignoredArtifact, '<p>private local report</p>\n');
    expect(gitStatus(sourceDir)).toBe('');

    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      validMigrationBehavior(sourceDir, targetDir, 'codex'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(fs.existsSync(path.join(
      targetDir,
      '.agents',
      'skills',
      'workflow-router',
      'artifacts',
      'private-report.html',
    ))).toBe(false);
    const manifest = fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'), 'utf8');
    expect(manifest).not.toContain('private-report.html');
    expect(fs.readFileSync(ignoredArtifact, 'utf8')).toContain('private local report');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('repository migration rejects writes elsewhere in the selected host root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-exact-boundary-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const unmanagedPath = path.join(targetDir, '.codex', 'unmanaged.json');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `fs.writeFileSync(${JSON.stringify(unmanagedPath)}, '{}\\n');`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
      message: expect.stringContaining('outside its allowed path lease'),
    });
    expect(fs.existsSync(unmanagedPath)).toBe(false);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('repository migration rejects extra entries in the selected Host skill root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-skill-closure-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const rogueSkill = path.join(targetDir, '.agents', 'skills', 'rogue', 'SKILL.md');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `if (prompt.loop?.id === 'repository-migration-loop' && prompt.role === 'producer') { fs.mkdirSync(${JSON.stringify(path.dirname(rogueSkill))}, { recursive: true }); fs.writeFileSync(${JSON.stringify(rogueSkill)}, '---\\nname: rogue\\n---\\n'); }`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_VALIDATE',
      phase: 'validation',
      rolledBack: true,
      message: expect.stringContaining('target-owned Host skill entries must remain unchanged'),
    });
    expect(fs.existsSync(rogueSkill)).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'manifest.json'))).toBe(false);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('normal and force migration preserve pre-existing custom Host skills byte-for-byte', () => {
  for (const force of [false, true]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `harness-hub-migrate-custom-skill-${force}-`));
    const sourceDir = path.join(root, 'source');
    const targetDir = path.join(root, 'target');
    const binDir = path.join(root, 'bin');
    const customSkillRoot = path.join(targetDir, '.agents', 'skills', 'custom-project-skill');
    const customSkill = path.join(customSkillRoot, 'SKILL.md');
    const customAsset = path.join(customSkillRoot, 'assets', 'project.bin');

    try {
      initMigrationSource(sourceDir);
      fs.mkdirSync(path.dirname(customAsset), { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
      fs.writeFileSync(customSkill, '---\nname: custom-project-skill\n---\n');
      fs.writeFileSync(customAsset, Buffer.from([0, 1, 255, 2, 254, 3]));
      initGitRepository(targetDir);
      const before = snapshotTestTree(customSkillRoot);
      writeFakeCommand(
        binDir,
        'codex',
        path.join(root, 'host-called'),
        undefined,
        undefined,
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
      );

      const result = spawnSync(process.execPath, [
        path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
        targetDir,
        '--host',
        'codex',
        ...(force ? ['--force'] : []),
        '--yes',
      ], {
        cwd: sourceDir,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
        },
      });

      expect({ force, status: result.status, stderr: result.stderr }).toMatchObject({ force, status: 0, stderr: '' });
      expect(snapshotTestTree(customSkillRoot), String(force)).toEqual(before);
      const manifest = fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'), 'utf8');
      expect(manifest, String(force)).not.toContain('custom-project-skill');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}, 30_000);

test('repository migration rejects and rolls back changes to a pre-existing custom Host skill', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-custom-skill-mutation-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const customSkillRoot = path.join(targetDir, '.agents', 'skills', 'custom-project-skill');
  const customSkill = path.join(customSkillRoot, 'SKILL.md');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(customSkillRoot, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(customSkill, '---\nname: custom-project-skill\n---\n');
    initGitRepository(targetDir);
    const before = snapshotTestTree(customSkillRoot);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `if (prompt.loop?.id === 'repository-migration-loop' && prompt.role === 'producer') fs.writeFileSync(${JSON.stringify(customSkill)}, 'tampered\\n');`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_VALIDATE',
      phase: 'validation',
      rolledBack: true,
      message: expect.stringContaining('target-owned Host skill entries must remain unchanged'),
    });
    expect(snapshotTestTree(customSkillRoot)).toEqual(before);
    expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'manifest.json'))).toBe(false);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('repository migration is executed by the canonical Loop runtime with a deterministic verifier', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-loop-runtime-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const knowledgePromptsPath = path.join(root, 'knowledge-prompts.jsonl');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      validMigrationBehavior(sourceDir, targetDir, 'codex'),
      knowledgePromptsPath,
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.loopRuns).toHaveLength(2);
    expect(output.loopRuns[0]).toMatchObject({
      host: 'codex',
      role: 'primary',
      status: 'completed',
      metrics: { cliCalls: 1, firstAttemptSuccess: true },
    });
    expect(output.loopRuns[1]).toMatchObject({
      loop: 'knowledge-init-loop',
      host: 'codex',
      role: 'knowledge-init',
      status: 'completed',
      metrics: { cliCalls: 2, firstAttemptSuccess: true },
    });
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', output.loopRuns[0].runId);
    expect(JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'))).toMatchObject({
      loop: 'repository-migration-loop',
      status: 'completed',
      phase: 'completed',
    });
    expect(JSON.parse(fs.readFileSync(path.join(runDir, 'agents', 'producer-1', 'state.json'), 'utf8'))).toMatchObject({
      host: 'codex',
      role: 'producer',
      status: 'completed',
      trace: { source: 'runtime-captured' },
    });
    expect(JSON.parse(fs.readFileSync(path.join(runDir, 'agents', 'verifier-1', 'state.json'), 'utf8'))).toMatchObject({
      role: 'verifier',
      status: 'completed',
      executorMode: 'deterministic',
      result: { verdict: 'pass' },
    });
    expect(JSON.parse(fs.readFileSync(path.join(runDir, 'integration.json'), 'utf8'))).toMatchObject({
      verdict: 'pass',
      loop: 'repository-migration-loop',
      agentEvidence: [
        { agentId: 'producer-1', sha256: expect.stringMatching(/^[a-f0-9]{64}$/) },
        { agentId: 'verifier-1', sha256: expect.stringMatching(/^[a-f0-9]{64}$/) },
      ],
    });
    const knowledgeRunDir = path.join(targetDir, '.harness-hub', 'state', 'runs', output.loopRuns[1].runId);
    const sourceKnowledgePath = path.join(sourceDir, 'knowledge');
    expect(fs.readFileSync(knowledgePromptsPath, 'utf8')).not.toContain(sourceKnowledgePath);
    expect(fs.readFileSync(knowledgePromptsPath, 'utf8')).not.toContain('forbidKnowledgeTree');
    expect(JSON.stringify(JSON.parse(fs.readFileSync(path.join(knowledgeRunDir, 'run.json'), 'utf8')))).not.toContain(sourceKnowledgePath);
    expect(JSON.parse(fs.readFileSync(path.join(knowledgeRunDir, 'agents', 'producer-1', 'state.json'), 'utf8'))).toMatchObject({
      status: 'completed',
      deterministicValidation: { kind: 'google-okf-v0.1', status: 'pass' },
    });
    expect(JSON.parse(fs.readFileSync(path.join(knowledgeRunDir, 'agents', 'verifier-1', 'state.json'), 'utf8'))).toMatchObject({
      role: 'verifier',
      status: 'completed',
      result: { verdict: 'pass' },
    });
    const okf = spawnSync(process.execPath, [
      path.join(sourceDir, 'skills', 'workflow-router', 'scripts', 'okf-validate.mjs'),
      targetDir,
      '--json',
    ], { cwd: sourceDir, encoding: 'utf8' });
    expect(okf.status).toBe(0);
    expect(JSON.parse(okf.stdout)).toMatchObject({
      ok: true,
      status: 'pass',
      conceptCount: 1,
      sources: ['tracked.txt'],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('repository migration runs Claude Code repository and knowledge-init loops with full autonomy', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-claude-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');
  const argsPath = path.join(root, 'host-args');
  const promptPath = path.join(root, 'host-prompt');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'claude',
      markerPath,
      argsPath,
      promptPath,
      validMigrationBehavior(sourceDir, targetDir, 'claude'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'claude',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output).toMatchObject({
      ok: true,
      host: 'claude',
      sourceCommit: gitHead(sourceDir),
      targetHead: gitHead(targetDir),
    });
    expect(fs.readFileSync(markerPath, 'utf8').trim().split(/\r?\n/)).toEqual(['called', 'called', 'called']);
    const invocations = fs.readFileSync(argsPath, 'utf8')
      .split('--- invocation ---')
      .map((invocation) => invocation.trim().split(/\r?\n/).filter(Boolean))
      .filter((invocation) => invocation.length > 0);
    expect(invocations).toHaveLength(3);
    const repositoryArgs = invocations[0];
    const prompt = JSON.parse(fs.readFileSync(promptPath, 'utf8'));
    const copyCommand = prompt.lifecycleContext.migrationCopy.command;
    const copyTool = process.platform === 'win32' ? 'PowerShell' : 'Bash';
    expect(repositoryArgs).toContain('-p');
    expect(repositoryArgs).toContain('--safe-mode');
    expect(repositoryArgs).toContain('--setting-sources=');
    expect(repositoryArgs).toContain('--strict-mcp-config');
    expect(repositoryArgs).toContain('--mcp-config');
    expect(repositoryArgs).toContain(process.platform === 'win32' ? '{mcpServers:{}}' : '{"mcpServers":{}}');
    expect(repositoryArgs).toContain('--permission-mode');
    expect(repositoryArgs).toContain('dontAsk');
    expect(repositoryArgs).toContain('--tools');
    expect(repositoryArgs).toContain(copyTool);
    expect(repositoryArgs).toContain('--allowedTools');
    expect(repositoryArgs).toContain(`${copyTool}(${copyCommand})`);
    expect(repositoryArgs).not.toContain('acceptEdits');
    expect(repositoryArgs).not.toContain('Read,Glob,Grep,Edit,Write');
    expect(repositoryArgs).not.toContain('--add-dir');
    expect(repositoryArgs).not.toContain('--dangerously-skip-permissions');
    expect(repositoryArgs).toContain('--no-session-persistence');
    expect(repositoryArgs).toContain('--output-format');
    expect(repositoryArgs).toContain('stream-json');
    expect(repositoryArgs).toContain('--json-schema');
    expect(prompt.lifecycleContext.migrationCopy).toEqual({ command: copyCommand, tool: copyTool });
    expect(copyCommand.replaceAll('\\', '/')).toContain(
      `${targetDir.replaceAll('\\', '/')}/.harness-hub/state/runs/`,
    );
    expect(copyCommand.replaceAll('\\', '/')).not.toContain(
      `${sourceDir.replaceAll('\\', '/')}/scripts/migrate.mjs`,
    );
    expect(JSON.stringify(prompt.lifecycleContext)).not.toMatch(/managedSkills|capabilityIndex|sourceCommit|hookConfig/);
    const receiptPath = path.join(
      targetDir,
      '.harness-hub',
      'state',
      'runs',
      output.loopRuns[0].runId,
      'migration-copy-receipt.json',
    );
    expect(fs.existsSync(receiptPath)).toBe(true);
    expect(fs.existsSync(path.join(path.dirname(receiptPath), 'migration-copy-plan.json'))).toBe(false);
    expect(fs.existsSync(path.join(path.dirname(receiptPath), 'migration-copy-runner.mjs'))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('deterministic migration verification rejects structured evidence for the wrong host role', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-evidence-role-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        "globalThis.__fakeResponse = { status: 'completed', output: { host: 'codex', role: 'secondary', migrationSummary: 'Lied about the role.' }, handoff: { summary: 'Invalid role evidence.' } };",
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
      message: expect.stringContaining("host 'codex' and role 'primary'"),
    });
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('migration rejects a Host trace that does not prove the approved copy command ran', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-command-trace-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        "globalThis.__fakeTraceCommand = 'node unapproved-copy.mjs';",
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_VALIDATE',
      rolledBack: true,
      message: expect.stringMatching(/command other than the approved byte-copy command/i),
    });
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('migration rejects extra Host tool activity even when the approved copy command ran', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-extra-tool-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        'globalThis.__fakeExtraToolActivity = true;',
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_VALIDATE',
      rolledBack: true,
      message: expect.stringMatching(/must not use other tools.*file_change/i),
    });
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('first migration rejects reused Harness Hub internal knowledge even when the target changes its wrapper', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-knowledge-isolation-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    const splitInternalBody = `${HUB_INTERNAL_BODY.slice(0, 47)}\n\n${HUB_INTERNAL_BODY.slice(47)}`;
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `if (prompt.loop?.id === 'knowledge-init-loop' && prompt.role === 'producer') fs.writeFileSync(${JSON.stringify(path.join(targetDir, 'knowledge', 'project.md'))}, ${JSON.stringify(`---\ntype: project\ntitle: Target wrapper\n---\n# Target project\n\n${splitInternalBody}\n\n## Sources\n\n- [Target source](../tracked.txt)\n`)});`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
      message: expect.stringContaining('forbidden-tree-copy'),
    });
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('first migration requires knowledge to cite a pre-migration project source', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-project-source-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      validMigrationBehavior(sourceDir, targetDir, 'codex', true, 'AGENTS.md'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_VALIDATE',
      rolledBack: true,
      message: expect.stringContaining('pre-migration target HEAD file'),
    });
    expect(fs.readFileSync(path.join(targetDir, 'tracked.txt'), 'utf8')).toBe('baseline\n');
    expect(fs.existsSync(path.join(targetDir, 'knowledge'))).toBe(false);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('first migration rejects project knowledge ignored by the target repository', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-ignored-knowledge-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, '.gitignore'), 'knowledge/\n');
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      validMigrationBehavior(sourceDir, targetDir, 'codex'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_VALIDATE',
      rolledBack: true,
      message: expect.stringContaining('Project knowledge must not be ignored by Git'),
    });
    expect(fs.existsSync(path.join(targetDir, 'knowledge'))).toBe(false);
    expect(fs.readFileSync(path.join(targetDir, '.gitignore'), 'utf8')).toBe('knowledge/\n');
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('knowledge-init verifier failure restores the complete target and reports rolledBack true', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-knowledge-verifier-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      markerPath,
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        "if (prompt.loop?.id === 'knowledge-init-loop' && prompt.role === 'verifier') globalThis.__fakeResponse = { status: 'completed', verdict: 'blocked', findings: ['Synthetic independent verifier rejection.'], handoff: { summary: 'Knowledge verification rejected.' } };",
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    const failure = JSON.parse(result.stderr);
    const migrationRunId = failure.runIds?.find((runId: string) => runId.startsWith('migration-primary-codex-'));
    const failedRunId = failure.runIds?.find((runId: string) => runId.startsWith('knowledge-init-codex-'));
    expect(typeof migrationRunId).toBe('string');
    expect(typeof failedRunId).toBe('string');
    expect(failure).toMatchObject({
      code: 'E_VALIDATE',
      phase: 'validation',
      rolledBack: true,
      message: expect.stringContaining('Synthetic independent verifier rejection'),
      runIds: [expect.any(String), expect.any(String)],
    });
    expect(fs.readFileSync(markerPath, 'utf8').trim().split(/\r?\n/)).toEqual(['called', 'called', 'called']);
    expect(fs.readFileSync(path.join(targetDir, 'tracked.txt'), 'utf8')).toBe('baseline\n');
    expect(fs.existsSync(path.join(targetDir, 'knowledge'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.codex'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
    expect(gitStatus(targetDir)).toBe('');
    expect(JSON.parse(fs.readFileSync(path.join(
      targetDir,
      '.harness-hub',
      'state',
      'runs',
      migrationRunId,
      'integration.json',
    ), 'utf8'))).toMatchObject({ status: 'completed' });

    writeFakeCommand(
      binDir,
      'codex',
      markerPath,
      undefined,
      undefined,
      validMigrationBehavior(sourceDir, targetDir, 'codex'),
    );
    const retry = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });
    expect(retry.status, `${retry.stdout}\n${retry.stderr}`).toBe(0);
    expect(fs.existsSync(path.join(
      targetDir,
      '.harness-hub',
      'state',
      'runs',
      failedRunId,
      'integration.json',
    ))).toBe(true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 60_000);

test('both mode runs knowledge init only on the primary host and keeps shared writes primary-owned', () => {
  for (const primary of ['claude', 'codex'] as const) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `harness-hub-migrate-both-${primary}-`));
    const sourceDir = path.join(root, 'source');
    const targetDir = path.join(root, 'target');
    const binDir = path.join(root, 'bin');
    const claudeMarker = path.join(root, 'claude-called');
    const codexMarker = path.join(root, 'codex-called');
    const claudePrompt = path.join(root, 'claude-prompt');
    const codexPrompt = path.join(root, 'codex-prompt');

    try {
      initMigrationSource(sourceDir);
      fs.mkdirSync(targetDir);
      fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
      initGitRepository(targetDir);
      writeFakeCommand(
        binDir,
        'claude',
        claudeMarker,
        undefined,
        claudePrompt,
        validMigrationBehavior(sourceDir, targetDir, 'claude', primary === 'claude'),
      );
      writeFakeCommand(
        binDir,
        'codex',
        codexMarker,
        undefined,
        codexPrompt,
        validMigrationBehavior(sourceDir, targetDir, 'codex', primary === 'codex'),
      );

      const result = spawnSync(process.execPath, [
        path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
        targetDir,
        '--host',
        'both',
        '--primary',
        primary,
        '--yes',
      ], {
        cwd: sourceDir,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
        },
      });

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, host: 'both', primaryHost: primary });
      expect(fs.readFileSync(claudeMarker, 'utf8').trim().split(/\r?\n/)).toEqual(
        primary === 'claude' ? ['called', 'called', 'called'] : ['called'],
      );
      expect(fs.readFileSync(codexMarker, 'utf8').trim().split(/\r?\n/)).toEqual(
        primary === 'codex' ? ['called', 'called', 'called'] : ['called'],
      );

      const prompts = {
        claude: JSON.parse(fs.readFileSync(claudePrompt, 'utf8')),
        codex: JSON.parse(fs.readFileSync(codexPrompt, 'utf8')),
      };
      const secondary = primary === 'claude' ? 'codex' : 'claude';
      expect(prompts[primary].lifecycleContext.role).toBe('primary');
      expect(prompts[secondary].lifecycleContext.role).toBe('secondary');
      for (const host of ['claude', 'codex'] as const) {
        expect(Object.keys(prompts[host].lifecycleContext).sort()).toEqual(['host', 'migrationCopy', 'role']);
        expect(prompts[host].lifecycleContext.migrationCopy).toEqual({
          command: expect.any(String),
          tool: process.platform === 'win32' ? 'PowerShell' : 'Bash',
        });
      }
      expect(prompts.claude.lifecycleContext.host).toBe('claude');
      expect(prompts.codex.lifecycleContext.host).toBe('codex');
      expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, '.codex', 'hooks.json'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, '.codex', 'skills'))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}, 60_000);

test('both mode rejects a secondary CLI that modifies shared migration output', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-secondary-boundary-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'claude',
      path.join(root, 'claude-called'),
      undefined,
      undefined,
      validMigrationBehavior(sourceDir, targetDir, 'claude', true),
    );
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'codex-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex', false),
        `fs.writeFileSync(${JSON.stringify(path.join(targetDir, 'AGENTS.md'))}, ${JSON.stringify('# Rewritten by secondary\n')});`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'both',
      '--primary',
      'claude',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
    });
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 45_000);

test('migration removes only previously managed stale skills and deselected Host surfaces', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-stale-managed-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const claudeCustom = path.join(targetDir, '.claude', 'skills', 'target-custom', 'SKILL.md');
  const codexCustom = path.join(targetDir, '.agents', 'skills', 'target-custom', 'SKILL.md');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(path.join(sourceDir, 'skills', 'obsolete-skill'), { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'skills', 'obsolete-skill', 'SKILL.md'), '---\nname: obsolete-skill\n---\n');
    const capabilityPath = path.join(sourceDir, 'capabilities', 'index.json');
    const capabilities = JSON.parse(fs.readFileSync(capabilityPath, 'utf8'));
    capabilities.components['skill:obsolete-skill'] = {
      kind: 'skill',
      path: 'skills/obsolete-skill',
      distribution: 'target-distributed',
    };
    fs.writeFileSync(capabilityPath, `${JSON.stringify(capabilities, null, 2)}\n`);
    execFileSync('git', ['add', '.'], { cwd: sourceDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'source v1 with obsolete skill'], { cwd: sourceDir, stdio: 'ignore' });

    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(path.join(targetDir, '.gitignore'), '.claude/\n');
    initGitRepository(targetDir);
    writeFakeCommand(binDir, 'codex', path.join(root, 'codex-called'), undefined, undefined, validMigrationBehavior(sourceDir, targetDir, 'codex'));
    writeFakeCommand(binDir, 'claude', path.join(root, 'claude-called'), undefined, undefined, validMigrationBehavior(sourceDir, targetDir, 'claude', false));
    const initial = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'), 'migrate', targetDir,
      '--host', 'both', '--primary', 'codex', '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });
    expect(initial.status, `${initial.stdout}\n${initial.stderr}`).toBe(0);

    fs.mkdirSync(path.dirname(claudeCustom), { recursive: true });
    fs.mkdirSync(path.dirname(codexCustom), { recursive: true });
    fs.writeFileSync(claudeCustom, '# Target-owned Claude skill\n');
    fs.writeFileSync(codexCustom, '# Target-owned Codex skill\n');
    execFileSync('git', ['add', '.'], { cwd: targetDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'accept v1 migration and custom skills'], { cwd: targetDir, stdio: 'ignore' });
    const originalManifest = fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'));

    fs.rmSync(path.join(sourceDir, 'skills', 'obsolete-skill'), { recursive: true, force: true });
    const nextCapabilities = JSON.parse(fs.readFileSync(capabilityPath, 'utf8'));
    delete nextCapabilities.components['skill:obsolete-skill'];
    fs.writeFileSync(capabilityPath, `${JSON.stringify(nextCapabilities, null, 2)}\n`);
    execFileSync('git', ['add', '-A'], { cwd: sourceDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'source v2 removes obsolete skill'], { cwd: sourceDir, stdio: 'ignore' });

    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'codex-failed'),
      undefined,
      undefined,
      `${validMigrationBehavior(sourceDir, targetDir, 'codex')}\nprocess.exit(9);`,
    );
    const failed = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'), 'migrate', targetDir, '--host', 'codex', '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });
    expect(failed.status, `${failed.stdout}\n${failed.stderr}`).toBe(3);
    expect(JSON.parse(failed.stderr)).toMatchObject({ rolledBack: true });
    expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'obsolete-skill', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'obsolete-skill', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
    expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'))).toEqual(originalManifest);
    expect(fs.readFileSync(claudeCustom, 'utf8')).toBe('# Target-owned Claude skill\n');
    expect(fs.readFileSync(codexCustom, 'utf8')).toBe('# Target-owned Codex skill\n');

    writeFakeCommand(binDir, 'codex', path.join(root, 'codex-success'), undefined, undefined, validMigrationBehavior(sourceDir, targetDir, 'codex'));
    const updated = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'), 'migrate', targetDir, '--host', 'codex', '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(updated.status, `${updated.stdout}\n${updated.stderr}`).toBe(0);
    expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'obsolete-skill'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'obsolete-skill'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'workflow-router'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.claude', 'settings.json'))).toBe(false);
    expect(fs.readFileSync(claudeCustom, 'utf8')).toBe('# Target-owned Claude skill\n');
    expect(fs.readFileSync(codexCustom, 'utf8')).toBe('# Target-owned Codex skill\n');
    expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
    const updatedManifest = JSON.parse(fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'), 'utf8'));
    expect(updatedManifest.hosts).toEqual(['codex']);
    expect(updatedManifest.files.map((file: { path: string }) => file.path).join('\n')).not.toMatch(/obsolete-skill|^\.claude\//m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 90_000);

test('failed Host boundary validation rolls tracked and non-ignored untracked changes back to target HEAD', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-rollback-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    const targetHead = gitHead(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      markerPath,
      undefined,
      undefined,
      [
        `fs.writeFileSync(${JSON.stringify(path.join(targetDir, 'tracked.txt'))}, 'changed\\n');`,
        `fs.writeFileSync(${JSON.stringify(path.join(targetDir, 'untracked.txt'))}, 'created\\n');`,
        'process.exitCode = 9;',
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'host',
      code: 'E_HOST',
      rolledBack: true,
    });
    expect(fs.readFileSync(markerPath, 'utf8').trim()).toBe('called');
    expect(fs.readFileSync(path.join(targetDir, 'tracked.txt'), 'utf8')).toBe('baseline\n');
    expect(fs.existsSync(path.join(targetDir, 'untracked.txt'))).toBe(false);
    expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'manifest.json'))).toBe(false);
    expect(gitHead(targetDir)).toBe(targetHead);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('failed migration restores pre-existing target runtime state byte-for-byte', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-state-rollback-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');
  const stateRoot = path.join(targetDir, '.harness-hub', 'state');
  const currentTask = path.join(stateRoot, 'current-task.md');
  const existingRun = path.join(stateRoot, 'runs', 'existing-run', 'integration.json');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(path.dirname(existingRun), { recursive: true });
    fs.writeFileSync(path.join(targetDir, '.gitignore'), '.harness-hub/state/\n');
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(currentTask, Buffer.from([0, 255, 1, 254, 2, 253]));
    fs.writeFileSync(existingRun, '{"status":"completed"}\n');
    fs.writeFileSync(path.join(stateRoot, 'loop-runs.jsonl'), '{"event":"existing"}\n');
    initGitRepository(targetDir);
    const before = snapshotTestTree(stateRoot);
    writeFakeCommand(
      binDir,
      'codex',
      markerPath,
      undefined,
      undefined,
      [
        `fs.writeFileSync(${JSON.stringify(currentTask)}, 'corrupted\\n');`,
        `fs.rmSync(${JSON.stringify(existingRun)}, { force: true });`,
        `fs.writeFileSync(${JSON.stringify(path.join(stateRoot, 'rogue-state.json'))}, '{}\\n');`,
        "const fakeOutputIndex = args.indexOf('-o'); const fakeAgentDir = args[fakeOutputIndex + 1].replace(/[\\\\/][^\\\\/]+$/, ''); fs.writeFileSync(fakeAgentDir + '/forged-agent-evidence.json', '{}\\n');",
        'process.exitCode = 9;',
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    const failure = JSON.parse(result.stderr);
    expect(failure.ok).toBe(false);
    expect(failure.rolledBack).toBe(true);
    expect(failure.runIds).toHaveLength(1);
    const failedRunId = failure.runIds[0];
    expect(failedRunId).toMatch(/^migration-primary-codex-/);
    expect(fs.existsSync(markerPath), result.stderr).toBe(true);
    expect(fs.readFileSync(markerPath, 'utf8').trim()).toBe('called');
    const failedRunDir = path.join(stateRoot, 'runs', failedRunId);
    expect(JSON.parse(fs.readFileSync(path.join(failedRunDir, 'run.json'), 'utf8'))).toMatchObject({
      runId: failedRunId,
      loop: 'repository-migration-loop',
      status: 'failed',
    });
    expect(JSON.parse(fs.readFileSync(path.join(failedRunDir, 'integration.json'), 'utf8'))).toMatchObject({
      runId: failedRunId,
      status: 'failed',
    });
    expect(fs.existsSync(path.join(failedRunDir, 'agents', 'producer-1', 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(failedRunDir, 'agents', 'producer-1', 'trace.jsonl'))).toBe(true);
    expect(fs.existsSync(path.join(failedRunDir, 'agents', 'producer-1', 'forged-agent-evidence.json'))).toBe(false);
    expect(fs.readFileSync(currentTask)).toEqual(Buffer.from([0, 255, 1, 254, 2, 253]));
    expect(fs.readFileSync(existingRun, 'utf8')).toBe('{"status":"completed"}\n');
    expect(fs.readFileSync(path.join(stateRoot, 'loop-runs.jsonl'), 'utf8')).toBe('{"event":"existing"}\n');
    expect(fs.existsSync(path.join(stateRoot, 'rogue-state.json'))).toBe(false);
    expect(snapshotTestTree(path.join(stateRoot, 'runs', 'existing-run'))).toEqual(
      before.filter((entry) => entry.path.startsWith('runs/existing-run/')).map((entry) => ({
        ...entry,
        path: entry.path.replace(/^runs\/existing-run\//, ''),
      })),
    );
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('repository migration detects and restores target Git config refs index and info exclude', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-git-control-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    const gitDir = gitPath(targetDir, '--absolute-git-dir');
    const configPath = path.join(gitDir, 'config');
    const refsPath = path.join(gitDir, 'refs');
    const indexPath = gitPath(targetDir, '--git-path', 'index');
    const excludePath = gitPath(targetDir, '--git-path', 'info/exclude');
    const before = {
      config: fs.readFileSync(configPath),
      refs: snapshotTestTree(refsPath),
      index: fs.readFileSync(indexPath),
      exclude: fs.readFileSync(excludePath),
    };
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `fs.appendFileSync(${JSON.stringify(configPath)}, '\\n[host-mutation]\\n\\tvalue = changed\\n');`,
        `fs.mkdirSync(${JSON.stringify(path.join(refsPath, 'heads'))}, { recursive: true });`,
        `fs.writeFileSync(${JSON.stringify(path.join(refsPath, 'heads', 'host-created'))}, ${JSON.stringify(`${gitHead(targetDir)}\n`)});`,
        `fs.writeFileSync(${JSON.stringify(indexPath)}, 'corrupt index');`,
        `fs.appendFileSync(${JSON.stringify(excludePath)}, '\\nhost-created\\n');`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
    });
    expect(fs.readFileSync(configPath)).toEqual(before.config);
    expect(snapshotTestTree(refsPath)).toEqual(before.refs);
    expect(fs.readFileSync(indexPath)).toEqual(before.index);
    expect(fs.readFileSync(excludePath)).toEqual(before.exclude);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('repository migration reports rolledBack false when target restoration cannot succeed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-rollback-failed-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    const objectsPath = path.join(gitPath(targetDir, '--absolute-git-dir'), 'objects');
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `fs.rmSync(${JSON.stringify(objectsPath)}, { recursive: true, force: true });`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'rollback',
      code: 'E_ROLLBACK',
      rolledBack: false,
      evidenceRestored: true,
      originalError: {
        code: expect.stringMatching(/^E_/),
        message: expect.any(String),
        runId: expect.any(String),
      },
      runIds: [expect.any(String)],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('repository migration restores an ignored project eval changed outside the migration boundary', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-ignored-target-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const ignoredEval = path.join(targetDir, 'evals', 'generic-case.bin');
  const before = Buffer.from([1, 3, 5, 7, 9]);

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(path.dirname(ignoredEval), { recursive: true });
    fs.writeFileSync(path.join(targetDir, '.gitignore'), 'evals/\n');
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(ignoredEval, before);
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `if (prompt.loop?.id === 'repository-migration-loop') fs.writeFileSync(${JSON.stringify(ignoredEval)}, Buffer.from([2, 4, 6, 8]));`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      code: 'E_VALIDATE',
      phase: 'validation',
      rolledBack: true,
    });
    expect(fs.readFileSync(ignoredEval)).toEqual(before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('repository migration does not claim rollback for an arbitrary ignored target residue it cannot restore', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-ignored-residue-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const ignoredPath = path.join(targetDir, 'cache', 'transient.bin');
  const before = Buffer.from([1, 3, 5, 7, 9]);

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(path.dirname(ignoredPath), { recursive: true });
    fs.writeFileSync(path.join(targetDir, '.gitignore'), 'cache/\n');
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(ignoredPath, before);
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `if (prompt.loop?.id === 'repository-migration-loop') fs.writeFileSync(${JSON.stringify(ignoredPath)}, Buffer.from([2, 4, 6, 8]));`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    const failure = JSON.parse(result.stderr);
    expect(failure).toMatchObject({
      code: 'E_ROLLBACK',
      phase: 'rollback',
      rolledBack: false,
      evidenceRestored: true,
      originalError: {
        code: expect.stringMatching(/^E_/),
        message: expect.any(String),
        runId: expect.any(String),
      },
    });
    expect(failure.runIds).toHaveLength(1);
    const failedRunId = failure.runIds[0];
    expect(typeof failedRunId).toBe('string');
    const failedRunDir = path.join(targetDir, '.harness-hub', 'state', 'runs', failedRunId);
    expect(JSON.parse(fs.readFileSync(path.join(failedRunDir, 'integration.json'), 'utf8'))).toMatchObject({
      runId: failedRunId,
    });
    expect(fs.existsSync(path.join(failedRunDir, 'agents', 'producer-1', 'state.json'))).toBe(true);
    expect(fs.readFileSync(ignoredPath)).not.toEqual(before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('host CLI cannot commit migration output or move the target HEAD', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-head-boundary-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    const targetHead = gitHead(targetDir);
    const gitLogsPath = path.join(gitPath(targetDir, '--absolute-git-dir'), 'logs');
    const gitLogsBefore = snapshotTestTree(gitLogsPath);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        "const { execFileSync } = await import('node:child_process');",
        `execFileSync('git', ['add', '.'], { cwd: ${JSON.stringify(targetDir)} });`,
        `execFileSync('git', ['commit', '-m', 'host commit'], { cwd: ${JSON.stringify(targetDir)} });`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
    });
    expect(gitHead(targetDir)).toBe(targetHead);
    expect(snapshotTestTree(gitLogsPath)).toEqual(gitLogsBefore);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('host CLI cannot modify the Harness Hub source worktree', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-source-boundary-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const sourceMutation = path.join(sourceDir, 'tampered.txt');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `fs.writeFileSync(${JSON.stringify(sourceMutation)}, 'not allowed');`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
    });
    expect(fs.existsSync(sourceMutation)).toBe(false);
    expect(gitStatus(sourceDir)).toBe('');
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('host CLI cannot modify the Harness Hub source Git control plane', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-source-git-control-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    const gitDir = gitPath(sourceDir, '--absolute-git-dir');
    const configPath = path.join(gitDir, 'config');
    const refsPath = path.join(gitDir, 'refs');
    const indexPath = gitPath(sourceDir, '--git-path', 'index');
    const excludePath = gitPath(sourceDir, '--git-path', 'info/exclude');
    const before = {
      config: fs.readFileSync(configPath),
      refs: snapshotTestTree(refsPath),
      index: fs.readFileSync(indexPath),
      exclude: fs.readFileSync(excludePath),
    };
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `fs.appendFileSync(${JSON.stringify(configPath)}, '\\n[source-host-mutation]\\n\\tvalue = changed\\n');`,
        `fs.mkdirSync(${JSON.stringify(path.join(refsPath, 'heads'))}, { recursive: true });`,
        `fs.writeFileSync(${JSON.stringify(path.join(refsPath, 'heads', 'host-created'))}, ${JSON.stringify(`${gitHead(sourceDir)}\n`)});`,
        `fs.writeFileSync(${JSON.stringify(indexPath)}, 'corrupt source index');`,
        `fs.appendFileSync(${JSON.stringify(excludePath)}, '\\nhost-created\\n');`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
    });
    expect(fs.readFileSync(configPath)).toEqual(before.config);
    expect(snapshotTestTree(refsPath)).toEqual(before.refs);
    expect(fs.readFileSync(indexPath)).toEqual(before.index);
    expect(fs.readFileSync(excludePath)).toEqual(before.exclude);
    expect(gitStatus(sourceDir)).toBe('');
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('repository migration detects source ignored-file mutation and refuses a false rollback claim', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-source-ignored-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const ignoredSource = path.join(sourceDir, 'local-cache', 'state.bin');
  const before = Buffer.from([11, 22, 33, 44]);

  try {
    initMigrationSource(sourceDir);
    const excludePath = gitPath(sourceDir, '--git-path', 'info/exclude');
    fs.appendFileSync(excludePath, '\nlocal-cache/\n');
    fs.mkdirSync(path.dirname(ignoredSource), { recursive: true });
    fs.writeFileSync(ignoredSource, before);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex'),
        `if (prompt.loop?.id === 'repository-migration-loop') fs.writeFileSync(${JSON.stringify(ignoredSource)}, Buffer.from([55, 66, 77]));`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
      'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    const failure = JSON.parse(result.stderr);
    expect(failure).toMatchObject({
      code: 'E_ROLLBACK',
      phase: 'rollback',
      rolledBack: false,
      evidenceRestored: true,
      originalError: {
        code: expect.stringMatching(/^E_/),
        message: expect.any(String),
        runId: expect.any(String),
      },
    });
    expect(failure.runIds).toHaveLength(1);
    const failedRunId = failure.runIds[0];
    expect(typeof failedRunId).toBe('string');
    const failedRunDir = path.join(targetDir, '.harness-hub', 'state', 'runs', failedRunId);
    expect(JSON.parse(fs.readFileSync(path.join(failedRunDir, 'integration.json'), 'utf8'))).toMatchObject({
      runId: failedRunId,
    });
    expect(fs.existsSync(path.join(failedRunDir, 'agents', 'producer-1', 'state.json'))).toBe(true);
    expect(fs.readFileSync(ignoredSource)).not.toEqual(before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('host exit zero without the complete migration output fails validation and rolls back', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-validate-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const markerPath = path.join(root, 'host-called');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(binDir, 'codex', markerPath);

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
    });
    expect(fs.readFileSync(markerPath, 'utf8').trim()).toBe('called');
    expect(gitStatus(targetDir)).toBe('');
    expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'manifest.json'))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('successful validation writes a versionless manifest for managed files only', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-manifest-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      validMigrationBehavior(sourceDir, targetDir, 'codex'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(0);
    const manifest = JSON.parse(fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({
      source: {
        url: 'https://example.invalid/harness-hub.git',
        commit: gitHead(sourceDir),
      },
      hosts: ['codex'],
      primaryHost: 'codex',
    });
    expect(manifest).not.toHaveProperty('version');
    expect(manifest).not.toHaveProperty('generatedAt');
    expect(manifest.files.map((file: { path: string }) => file.path)).toEqual([
      '.agents/skills/workflow-router/SKILL.md',
      '.agents/skills/workflow-router/scripts/harness-agent-gate.mjs',
      '.agents/skills/workflow-router/scripts/harness-agent-hook.mjs',
      '.agents/skills/workflow-router/scripts/loop-runtime.mjs',
      '.agents/skills/workflow-router/scripts/okf-validate.mjs',
      '.agents/skills/workflow-router/scripts/route-intent.mjs',
      '.codex/hooks.json',
      '.harness-hub/.gitignore',
      'AGENTS.md',
      'CLAUDE.md',
    ]);
    expect(manifest.files.every((file: { sha256?: string }) => /^[a-f0-9]{64}$/.test(file.sha256 ?? ''))).toBe(true);
    expect(JSON.stringify(manifest)).not.toContain('knowledge/project.md');
    expect(JSON.stringify(manifest)).not.toContain('hub-maintenance-workflow');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('existing project OKF is validated and preserved byte-for-byte', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-preserve-okf-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const projectKnowledge = path.join(targetDir, 'knowledge', 'project.md');
  const originalKnowledge = '---\ntype: concept\n---\n\n# Existing project knowledge\n\n## Sources\n\n- [Tracked source](../tracked.txt)\n';

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(path.join(targetDir, 'knowledge'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n\n# Knowledge\n\n- [Project](project.md)\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'log.md'), '---\ntype: log\n---\n\n# Knowledge log\n\n## 2026-07-13\n\n- Existing project knowledge initialized.\n');
    fs.writeFileSync(projectKnowledge, originalKnowledge);
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex', false),
        `fs.copyFileSync(${JSON.stringify(path.join(sourceDir, 'harness', 'target', 'AGENTS.md'))}, ${JSON.stringify(path.join(targetDir, 'AGENTS.md'))});`,
        `fs.writeFileSync(${JSON.stringify(path.join(targetDir, 'CLAUDE.md'))}, '@AGENTS.md\\n');`,
        `fs.writeFileSync(${JSON.stringify(projectKnowledge)}, '---\\ntype: concept\\n---\\n\\n# Rewritten but valid\\n');`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    const failure = JSON.parse(result.stderr);
    expect(failure).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
    });
    expect(failure.message).toContain('knowledge/project.md');
    expect(fs.readFileSync(projectKnowledge, 'utf8')).toBe(originalKnowledge);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('force migration still protects existing project OKF byte-for-byte', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-migrate-force-preserve-okf-'));
  const sourceDir = path.join(root, 'source');
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const projectKnowledge = path.join(targetDir, 'knowledge', 'project.md');
  const originalKnowledge = '---\ntype: concept\n---\n\n# Existing project knowledge\n\n## Sources\n\n- [Tracked source](../tracked.txt)\n';

  try {
    initMigrationSource(sourceDir);
    fs.mkdirSync(path.join(targetDir, 'knowledge'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n\n# Knowledge\n\n- [Project](project.md)\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'log.md'), '---\ntype: log\n---\n\n# Knowledge log\n\n## 2026-07-13\n\n- Existing project knowledge initialized.\n');
    fs.writeFileSync(projectKnowledge, originalKnowledge);
    initGitRepository(targetDir);
    writeFakeCommand(
      binDir,
      'codex',
      path.join(root, 'host-called'),
      undefined,
      undefined,
      [
        validMigrationBehavior(sourceDir, targetDir, 'codex', false),
        `fs.writeFileSync(${JSON.stringify(projectKnowledge)}, '---\\ntype: concept\\n---\\n\\n# Force rewrite\\n');`,
      ].join('\n'),
    );

    const result = spawnSync(process.execPath, [
      path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
      targetDir,
      '--host',
      'codex',
      '--force',
      '--yes',
    ], {
      cwd: sourceDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      phase: 'validation',
      code: 'E_VALIDATE',
      rolledBack: true,
    });
    expect(fs.readFileSync(projectKnowledge, 'utf8')).toBe(originalKnowledge);
    expect(gitStatus(targetDir)).toBe('');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('normal and force migration preserve project OKF evals and product files on success', () => {
  for (const force of [false, true]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `harness-hub-migrate-success-preserve-okf-${force}-`));
    const sourceDir = path.join(root, 'source');
    const targetDir = path.join(root, 'target');
    const binDir = path.join(root, 'bin');

    try {
      initMigrationSource(sourceDir);
      fs.mkdirSync(path.join(targetDir, 'knowledge'), { recursive: true });
      fs.mkdirSync(path.join(targetDir, 'evals', 'real-tasks'), { recursive: true });
      fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(targetDir, 'skills'), { recursive: true });
      fs.mkdirSync(path.join(targetDir, '.claude', 'commands'), { recursive: true });
      fs.mkdirSync(path.join(targetDir, '.codex', 'skills', 'target-custom'), { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'tracked.txt'), 'baseline\n');
      fs.writeFileSync(path.join(targetDir, 'knowledge', 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n\n# Knowledge\n\n- [Project](project.md)\n');
      fs.writeFileSync(path.join(targetDir, 'knowledge', 'log.md'), '---\ntype: log\n---\n\n# Knowledge log\n\n## 2026-07-13\n\n- Existing project knowledge initialized.\n');
      fs.writeFileSync(path.join(targetDir, 'knowledge', 'project.md'), '---\ntype: concept\n---\n\n# Existing project knowledge\n\n## Sources\n\n- [Tracked source](../tracked.txt)\n');
      fs.writeFileSync(path.join(targetDir, 'evals', 'real-tasks', 'generic-task.json'), '{"task":"generic repository check"}\n');
      fs.writeFileSync(path.join(targetDir, 'src', 'product.bin'), Buffer.from([0, 1, 255, 2, 254, 3]));
      fs.writeFileSync(path.join(targetDir, 'skills', 'product-skill.txt'), 'target product skill\n');
      fs.writeFileSync(path.join(targetDir, '.claude', 'commands', 'custom.md'), '# Target command\n');
      fs.writeFileSync(path.join(targetDir, '.codex', 'skills', 'target-custom', 'SKILL.md'), '# Target Codex skill\n');
      initGitRepository(targetDir);
      const before = snapshotTestTree(path.join(targetDir, 'knowledge'));
      const evalsBefore = snapshotTestTree(path.join(targetDir, 'evals'));
      const productBefore = fs.readFileSync(path.join(targetDir, 'src', 'product.bin'));
      const targetOwnedBefore = {
        productSkill: fs.readFileSync(path.join(targetDir, 'skills', 'product-skill.txt')),
        claudeCommand: fs.readFileSync(path.join(targetDir, '.claude', 'commands', 'custom.md')),
        codexSkill: fs.readFileSync(path.join(targetDir, '.codex', 'skills', 'target-custom', 'SKILL.md')),
      };
      writeFakeCommand(
        binDir,
        'codex',
        path.join(root, 'host-called'),
        undefined,
        undefined,
        [
          validMigrationBehavior(sourceDir, targetDir, 'codex', false),
          `fs.copyFileSync(${JSON.stringify(path.join(sourceDir, 'harness', 'target', 'AGENTS.md'))}, ${JSON.stringify(path.join(targetDir, 'AGENTS.md'))});`,
          `fs.writeFileSync(${JSON.stringify(path.join(targetDir, 'CLAUDE.md'))}, '@AGENTS.md\\n');`,
        ].join('\n'),
      );

      const result = spawnSync(process.execPath, [
        path.join(sourceDir, 'bin', 'harness-hub.mjs'),
        'migrate',
        targetDir,
        '--host',
        'codex',
        ...(force ? ['--force'] : []),
        '--yes',
      ], {
        cwd: sourceDir,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
        },
      });

      expect({ force, status: result.status, stderr: result.stderr }).toMatchObject({ force, status: 0, stderr: '' });
      expect(fs.readFileSync(path.join(root, 'host-called'), 'utf8').trim().split(/\r?\n/)).toEqual(['called']);
      expect(snapshotTestTree(path.join(targetDir, 'knowledge'))).toEqual(before);
      expect(snapshotTestTree(path.join(targetDir, 'evals'))).toEqual(evalsBefore);
      expect(fs.readFileSync(path.join(targetDir, 'src', 'product.bin'))).toEqual(productBefore);
      expect(fs.readFileSync(path.join(targetDir, 'skills', 'product-skill.txt'))).toEqual(targetOwnedBefore.productSkill);
      expect(fs.readFileSync(path.join(targetDir, '.claude', 'commands', 'custom.md'))).toEqual(targetOwnedBefore.claudeCommand);
      expect(fs.readFileSync(path.join(targetDir, '.codex', 'skills', 'target-custom', 'SKILL.md'))).toEqual(targetOwnedBefore.codexSkill);
      const manifest = fs.readFileSync(path.join(targetDir, '.harness-hub', 'manifest.json'), 'utf8');
      expect(manifest).not.toContain('evals/');
      expect(manifest).not.toContain('src/product.bin');
      expect(manifest).not.toContain('skills/product-skill.txt');
      expect(manifest).not.toContain('.claude/commands/custom.md');
      expect(manifest).not.toContain('.codex/skills/target-custom');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}, 30_000);

function initGitRepository(targetDir: string): void {
  execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Harness Test'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['add', '.'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: targetDir, stdio: 'ignore' });
}

function initMigrationSource(sourceDir: string): void {
  fs.mkdirSync(path.join(sourceDir, 'bin'), { recursive: true });
  fs.copyFileSync(MIGRATE_BIN, path.join(sourceDir, 'bin', 'harness-hub.mjs'));
  fs.mkdirSync(path.join(sourceDir, 'scripts'), { recursive: true });
  fs.copyFileSync(MIGRATE_SCRIPT, path.join(sourceDir, 'scripts', 'migrate.mjs'));
  fs.mkdirSync(path.join(sourceDir, 'skills', 'workflow-router', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'skills', 'workflow-router', 'SKILL.md'), '---\nname: workflow-router\n---\n');
  fs.copyFileSync(LOOP_RUNTIME, path.join(sourceDir, 'skills', 'workflow-router', 'scripts', 'loop-runtime.mjs'));
  fs.copyFileSync(OKF_VALIDATOR, path.join(sourceDir, 'skills', 'workflow-router', 'scripts', 'okf-validate.mjs'));
  fs.copyFileSync(ROUTE_INTENT, path.join(sourceDir, 'skills', 'workflow-router', 'scripts', 'route-intent.mjs'));
  fs.copyFileSync(HARNESS_AGENT_GATE, path.join(sourceDir, 'skills', 'workflow-router', 'scripts', 'harness-agent-gate.mjs'));
  fs.copyFileSync(HARNESS_AGENT_HOOK, path.join(sourceDir, 'skills', 'workflow-router', 'scripts', 'harness-agent-hook.mjs'));
  fs.mkdirSync(path.join(sourceDir, 'skills', 'hub-maintenance-workflow'), { recursive: true });
  fs.writeFileSync(
    path.join(sourceDir, 'skills', 'hub-maintenance-workflow', 'SKILL.md'),
    '---\nname: hub-maintenance-workflow\n---\n',
  );
  fs.mkdirSync(path.join(sourceDir, 'capabilities'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'capabilities', 'index.json'), `${JSON.stringify({
    components: {
      'skill:workflow-router': {
        kind: 'skill',
        path: 'skills/workflow-router',
        distribution: 'target-distributed',
      },
      'skill:hub-maintenance-workflow': {
        kind: 'skill',
        path: 'skills/hub-maintenance-workflow',
        distribution: 'hub-internal',
      },
    },
  }, null, 2)}\n`);
  fs.mkdirSync(path.join(sourceDir, 'harness', 'agent-hooks', 'claude'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'harness', 'agent-hooks', 'codex'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'harness', 'target'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'harness', 'agent-hooks', 'claude', 'settings.json'), '{"hooks":{}}\n');
  fs.writeFileSync(path.join(sourceDir, 'harness', 'agent-hooks', 'codex', 'hooks.json'), '{"hooks":{}}\n');
  fs.writeFileSync(path.join(sourceDir, 'harness', 'target', 'AGENTS.md'), '# Project agent contract\n');
  fs.mkdirSync(path.join(sourceDir, 'knowledge'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'knowledge', 'hub-internal.md'), `---\ntype: concept\n---\n\n# Harness Hub internal knowledge\n\n${HUB_INTERNAL_BODY}\n\n## Sources\n\n- [Tracked source](../tracked.txt)\n`);
  fs.writeFileSync(path.join(sourceDir, 'BOOTSTRAP-TARGET.md'), '# Full migration\n');
  initGitRepository(sourceDir);
  execFileSync('git', ['remote', 'add', 'origin', 'https://example.invalid/harness-hub.git'], {
    cwd: sourceDir,
    stdio: 'ignore',
  });
}

function initFullMigrationSource(sourceDir: string): void {
  const files = [
    'bin/harness-hub.mjs',
    'scripts/migrate.mjs',
    'capabilities/index.json',
    'BOOTSTRAP-TARGET.md',
  ];
  for (const relativePath of files) {
    const targetPath = path.join(sourceDir, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(path.resolve(relativePath), targetPath);
  }
  for (const relativePath of ['harness/agent-hooks', 'harness/target', 'knowledge']) {
    fs.cpSync(path.resolve(relativePath), path.join(sourceDir, relativePath), { recursive: true });
  }
  const capabilities = JSON.parse(fs.readFileSync(path.join(sourceDir, 'capabilities', 'index.json'), 'utf8')) as {
    components: Record<string, { kind: string; path: string }>;
  };
  for (const component of Object.values(capabilities.components)) {
    if (component.kind !== 'skill') continue;
    fs.cpSync(path.resolve(component.path), path.join(sourceDir, component.path), { recursive: true });
  }
  fs.mkdirSync(path.join(sourceDir, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'docs', 'source-only.md'), '# Source-only governance\n');
  fs.writeFileSync(path.join(sourceDir, 'tests', 'source-only.test.ts'), '// Source-only test sentinel.\n');
  initGitRepository(sourceDir);
  execFileSync('git', ['remote', 'add', 'origin', 'https://example.invalid/harness-hub.git'], {
    cwd: sourceDir,
    stdio: 'ignore',
  });
}

function validMigrationBehavior(
  _sourceDir: string,
  _targetDir: string,
  _host: 'claude' | 'codex',
  writeShared = true,
  knowledgeSource = 'tracked.txt',
): string {
  const repositoryLines = [
    'const migration = prompt.lifecycleContext;',
    "const copyResult = process.platform === 'win32' ? spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', migration.migrationCopy.command], { cwd: process.cwd(), encoding: 'utf8' }) : spawnSync('/bin/sh', ['-lc', migration.migrationCopy.command], { cwd: process.cwd(), encoding: 'utf8' });",
    "if (copyResult.status !== 0) throw new Error(`migration copy failed: ${copyResult.stderr || copyResult.stdout}`);",
  ];
  const knowledgeLines = [];
  if (writeShared) {
    knowledgeLines.push(
      "fs.mkdirSync(path.join(prompt.lifecycleContext.targetRoot, 'knowledge'), { recursive: true });",
      "fs.writeFileSync(path.join(prompt.lifecycleContext.targetRoot, 'knowledge', 'index.md'), '---\\ntype: index\\nokf_version: \"0.1\"\\n---\\n\\n# Project knowledge\\n\\n- [Project](project.md)\\n');",
      "fs.writeFileSync(path.join(prompt.lifecycleContext.targetRoot, 'knowledge', 'log.md'), '---\\ntype: log\\n---\\n\\n# Knowledge log\\n\\n## 2026-07-13\\n\\n- Initialized from target repository sources.\\n');",
      `fs.writeFileSync(path.join(prompt.lifecycleContext.targetRoot, 'knowledge', 'project.md'), '---\\ntype: concept\\n---\\n\\n# Project\\n\\n## Sources\\n\\n- [Tracked source](../${knowledgeSource})\\n');`,
    );
  }
  return [
    `if (prompt.loop?.id === 'repository-migration-loop') {\n${repositoryLines.join('\n')}\n}`,
    ...(knowledgeLines.length > 0
      ? [`if (prompt.loop?.id === 'knowledge-init-loop' && prompt.role === 'producer') {\n${knowledgeLines.join('\n')}\n}`]
      : []),
  ].join('\n');
}

function gitStatus(targetDir: string): string {
  return execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: targetDir,
    encoding: 'utf8',
  });
}

function gitHead(targetDir: string): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDir, encoding: 'utf8' }).trim();
}

function gitPath(targetDir: string, ...args: string[]): string {
  const value = execFileSync('git', ['rev-parse', ...args], { cwd: targetDir, encoding: 'utf8' }).trim();
  return path.isAbsolute(value) ? value : path.resolve(targetDir, value);
}

function listTree(root: string, prefix = ''): string[] {
  const files = [];
  for (const entry of fs.readdirSync(path.join(root, prefix), { withFileTypes: true })) {
    if (prefix === '' && entry.name === '.git') {
      continue;
    }
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    files.push(relativePath);
    if (entry.isDirectory()) {
      files.push(...listTree(root, relativePath));
    }
  }
  return files;
}

function snapshotTestTree(root: string): Array<{ path: string; bytes: string }> {
  return listTree(root)
    .filter((relativePath) => fs.statSync(path.join(root, relativePath)).isFile())
    .sort()
    .map((relativePath) => ({
      path: relativePath,
      bytes: fs.readFileSync(path.join(root, relativePath)).toString('base64'),
    }));
}

function trackedTestFiles(repositoryRoot: string, relativeRoot: string): string[] {
  const prefix = `${relativeRoot.replaceAll('\\', '/')}/`;
  return execFileSync('git', ['ls-files', '-z', '--', relativeRoot], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((trackedPath) => trackedPath.replaceAll('\\', '/'))
    .filter((trackedPath) => trackedPath.startsWith(prefix))
    .map((trackedPath) => trackedPath.slice(prefix.length))
    .sort();
}

function writeFakeCommand(
  binDir: string,
  name: string,
  markerPath: string,
  argsPath?: string,
  promptPath?: string,
  behavior = '',
  knowledgePromptPath?: string,
): void {
  fs.mkdirSync(binDir, { recursive: true });
  const workerPath = path.join(binDir, `${name}-fake.mjs`);
  const traceOutputPath = path.join(binDir, `${name}-fake.stdout`);
  fs.writeFileSync(workerPath, [
    "import { spawnSync } from 'node:child_process';",
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "let input = ''; for await (const chunk of process.stdin) input += chunk;",
    'const args = process.argv.slice(2);',
    "const prompt = JSON.parse(input);",
    `fs.appendFileSync(${JSON.stringify(markerPath)}, 'called\\n');`,
    argsPath ? `fs.appendFileSync(${JSON.stringify(argsPath)}, args.join('\\n') + '\\n--- invocation ---\\n');` : '',
    promptPath ? `if (prompt.loop?.id === 'repository-migration-loop') fs.writeFileSync(${JSON.stringify(promptPath)}, input);` : '',
    knowledgePromptPath ? `if (prompt.loop?.id === 'knowledge-init-loop') fs.appendFileSync(${JSON.stringify(knowledgePromptPath)}, input + '\\n');` : '',
    behavior,
    `const defaultResponse = prompt.loop?.id === 'knowledge-init-loop'
      ? (prompt.role === 'producer'
        ? { status: 'completed', output: { knowledgeRoot: 'knowledge', concepts: ['knowledge/project.md'], sources: ['tracked.txt'], logEntry: 'Initialized from target repository sources.' }, handoff: { summary: 'Synthetic project knowledge initialized.' } }
        : { status: 'completed', verdict: 'pass', findings: [], handoff: { summary: 'Synthetic project knowledge independently verified.' } })
      : { status: 'completed', output: { host: ${JSON.stringify(name)}, role: prompt.lifecycleContext?.role || 'primary', migrationSummary: 'Synthetic full migration slice completed.' }, handoff: { summary: 'Synthetic migration output ready for deterministic verification.' } };`,
    'const response = globalThis.__fakeResponse || defaultResponse;',
    "const outputIndex = args.indexOf('-o');",
    "if (outputIndex >= 0 && args[outputIndex + 1]) fs.writeFileSync(args[outputIndex + 1], JSON.stringify(response));",
    'const traceEvents = [];',
    `if (prompt.loop?.id === 'repository-migration-loop' && !globalThis.__fakeSkipMigrationTrace) {
      const migrationCommand = globalThis.__fakeTraceCommand || prompt.lifecycleContext.migrationCopy.command;
      const shlexQuote = (value) => /^[A-Za-z0-9_@%+=:,./-]+$/.test(value) ? value : "'" + value.replaceAll("'", "'\\\"'\\\"'") + "'";
      const tracedCommand = ${JSON.stringify(name)} === 'codex'
        ? (process.platform === 'win32'
          ? ['powershell.exe', '-Command', migrationCommand]
          : ['/bin/sh', '-lc', migrationCommand]).map(shlexQuote).join(' ')
        : migrationCommand;
      if (${JSON.stringify(name)} === 'claude') {
        traceEvents.push({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'migration-copy-1', name: prompt.lifecycleContext.migrationCopy.tool, input: { command: tracedCommand } }] } });
        traceEvents.push({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'migration-copy-1', is_error: false, content: '' }] } });
      } else {
        traceEvents.push({ type: 'item.completed', item: { type: 'command_execution', command: tracedCommand, status: 'completed', exit_code: 0 } });
      }
    }`,
    `if (globalThis.__fakePassiveError && ${JSON.stringify(name)} === 'codex') {
      traceEvents.push({ type: 'item.completed', item: { type: 'error', message: 'Synthetic passive diagnostic.' } });
    }`,
    `if (globalThis.__fakeExtraToolActivity) {
      if (${JSON.stringify(name)} === 'claude') {
        traceEvents.push({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'unexpected-tool-1', name: 'Edit', input: {} }] } });
      } else {
        traceEvents.push({ type: 'item.completed', item: { type: 'file_change', status: 'completed' } });
      }
    }`,
    `if (globalThis.__fakeClaudeHostError && ${JSON.stringify(name)} === 'claude') {
      traceEvents.push({ type: 'result', subtype: 'success', is_error: true, result: 'Not logged in · Please run /login', usage: { input_tokens: 0, output_tokens: 0 } });
    } else {
      traceEvents.push({ type: ${JSON.stringify(name === 'claude' ? 'result' : 'turn.completed')}, is_error: false, structured_output: response, usage: { input_tokens: 10, output_tokens: 5 } });
    }`,
    `fs.writeFileSync(${JSON.stringify(traceOutputPath)}, traceEvents.map((event) => JSON.stringify(event)).join('\\n') + '\\n');`,
  ].filter(Boolean).join('\n'));

  if (process.platform === 'win32') {
    fs.writeFileSync(
      path.join(binDir, `${name}.ps1`),
      `Remove-Item -LiteralPath '${traceOutputPath.replaceAll("'", "''")}' -ErrorAction SilentlyContinue\r\n& '${process.execPath.replaceAll("'", "''")}' '${workerPath.replaceAll("'", "''")}' @args | Out-Null\r\n$code = $LASTEXITCODE\r\nif (Test-Path -LiteralPath '${traceOutputPath.replaceAll("'", "''")}') { Get-Content -Raw -LiteralPath '${traceOutputPath.replaceAll("'", "''")}' | Write-Output }\r\nexit $code\r\n`,
    );
    return;
  }

  const commandPath = path.join(binDir, name);
  fs.writeFileSync(commandPath, `#!/bin/sh\nrm -f "${traceOutputPath}"\n"${process.execPath}" "${workerPath}" "$@" >/dev/null\ncode=$?\nif [ -f "${traceOutputPath}" ]; then cat "${traceOutputPath}"; fi\nexit $code\n`);
  fs.chmodSync(commandPath, 0o755);
}
