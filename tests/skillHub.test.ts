import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

import {
  analyzeTarget,
  applyInstall,
  getRemovePlan,
  getStatus,
  getUpdatePlan,
  planInstall,
  readCapabilityIndex,
  readLock,
  removeManaged,
  runCli,
  validateCapabilityIndex,
} from '../src/skillHub';

test('plans default install into Codex skill directory', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-plan-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });

  expect(plan.profileName).toBe('minimal');
  expect(plan.items.some((item) => item.componentId === 'skill:html-work-reports')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:grill-me')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:diagnose')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:prototype')).toBe(true);
  expect(plan.items.every((item) => item.dest.includes(`${path.sep}.agents${path.sep}skills${path.sep}`))).toBe(true);
});

test('installs skills, writes lock, and reports current status', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-install-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  const result = applyInstall(plan);

  expect(result.installed.length).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'html-work-reports', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'grill-me', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'diagnose', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'prototype', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(true);
  expect(fs.existsSync(result.report)).toBe(true);
  expect(result.lock.data.schemaVersion).toBe(2);
  if (result.lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  expect(result.lock.data.components.some((component) => component.files.length > 0)).toBe(true);
  expect(result.lock.data.components[0]?.files[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  expect(status.missing.length).toBe(0);
  expect(status.updates.length).toBe(0);
  expect(status.current.length).toBeGreaterThan(0);
});

test('skips existing skills unless overwrite is requested', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-skip-'));
  const firstPlan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(firstPlan);

  const secondPlan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  const secondResult = applyInstall(secondPlan);

  expect(secondResult.installed.length).toBe(0);
  expect(secondResult.skipped.length).toBe(secondPlan.items.length);
});

test('install planning skips capabilities already detected outside install destination', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-plan-detected-'));
  const skillDir = path.join(targetDir, '.codex', 'skills', 'verification-loop');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: verification-loop\n---\n');

  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  const item = plan.items.find((entry) => entry.componentId === 'skill:verification-loop');

  expect(item?.exists).toBe(true);
});


test('capability index has lifecycle metadata for installable components', () => {
  const index = readCapabilityIndex();
  const errors = validateCapabilityIndex(index);

  expect(errors).toEqual([]);
});

test('capability index validation rejects unsafe detect paths', () => {
  const index = readCapabilityIndex();
  const component = index.components['skill:verification-loop'];

  const invalidIndex = {
    ...index,
    components: {
      ...index.components,
      'skill:verification-loop': {
        ...component,
        detects: [
          { path: '' },
          { path: '/absolute/path/SKILL.md' },
          { path: '../outside/SKILL.md' },
          { path: '.agents/skills/*/SKILL.md' },
        ],
      },
    },
  };

  const errors = validateCapabilityIndex(invalidIndex);

  expect(errors.some((error) => error.includes('empty detect path'))).toBe(true);
  expect(errors.some((error) => error.includes('absolute detect path'))).toBe(true);
  expect(errors.some((error) => error.includes('traversal detect path'))).toBe(true);
  expect(errors.some((error) => error.includes('glob detect path'))).toBe(true);
});

test('analyzes empty target repo without writing Skill Hub state', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-analyze-empty-'));
  const result = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'] });

  expect(result.schemaVersion).toBe(1);
  expect(result.profile).toBe('minimal');
  expect(result.agents).toEqual(['codex']);
  expect(result.signals.packageJson).toBe(false);
  expect(result.findings.length).toBeGreaterThan(0);
  expect(result.findings.every((finding) => finding.state === 'recommended')).toBe(true);
  expect(result.findings.every((finding) => finding.reason.length > 0)).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub'))).toBe(false);
});

test('analyzes existing detected capability path', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-analyze-detected-'));
  const skillDir = path.join(targetDir, '.agents', 'skills', 'verification-loop');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: verification-loop\n---\n');

  const result = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'] });
  const finding = result.findings.find((item) => item.componentId === 'skill:verification-loop');

  expect(finding?.state).toBe('detected');
  expect(finding?.defaultAction).toBe('none');
  expect(finding?.evidence).toContain('.agents/skills/verification-loop/SKILL.md');
});

test('analyzes destination conflict separately from detected capability', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-analyze-conflict-'));
  const skillDir = path.join(targetDir, '.agents', 'skills', 'grill-me');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'README.md'), 'local placeholder');

  const result = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'] });
  const finding = result.findings.find((item) => item.componentId === 'skill:grill-me');

  expect(finding?.state).toBe('conflict');
  expect(finding?.defaultAction).toBe('skip');
  expect(finding?.dest).toBe('.agents/skills/grill-me');
});

test('analysis findings are deterministic after normalizing generated timestamp', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-analyze-stable-'));

  const first = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'] });
  const second = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'] });

  expect({ ...first, generatedAt: '<timestamp>' }).toEqual({ ...second, generatedAt: '<timestamp>' });
});

test('install dry run does not copy files or write a lock', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-install-dry-run-'));
  const exitCode = await captureCli(['install', targetDir, '--profile', 'minimal', '--agent', 'codex', '--dry-run']);

  expect(exitCode.code).toBe(0);
  expect(fs.existsSync(path.join(targetDir, '.agents'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);
});

test('install dry run supports json output without side effects', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-install-dry-run-json-'));
  const result = await captureCli(['install', targetDir, '--profile', 'minimal', '--agent', 'codex', '--dry-run', '--json']);

  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.profileName).toBe('minimal');
  expect(report.items.length).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);
});

test('install supports json output after mutation', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-install-json-'));
  const result = await captureCli(['install', targetDir, '--profile', 'minimal', '--agent', 'codex', '--yes', '--json']);

  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.installed.length).toBeGreaterThan(0);
  expect(report.lock.data.schemaVersion).toBe(2);
  expect(report.report).toContain('install-');
});

test('install html output includes component versions', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-install-html-'));
  const result = await captureCli(['install', targetDir, '--profile', 'minimal', '--agent', 'codex', '--dry-run', '--html']);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Skill Hub Install Plan');
  expect(result.stdout).toContain('<td>0.1.0</td>');
});

test('install and init produce equivalent plans', async () => {
  const installTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-install-plan-'));
  const initTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-init-plan-'));

  const install = await captureCli(['install', installTarget, '--profile', 'minimal', '--agent', 'codex', '--dry-run']);
  const init = await captureCli(['init', initTarget, '--profile', 'minimal', '--agent', 'codex', '--dry-run']);

  expect(install.code).toBe(0);
  expect(init.code).toBe(0);
  expect(install.stdout.replaceAll(installTarget, '<target>')).toBe(init.stdout.replaceAll(initTarget, '<target>'));
});

test('mutating install requires explicit yes', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-install-confirm-'));
  const result = await captureCli(['install', targetDir, '--profile', 'minimal', '--agent', 'codex']);

  expect(result.code).toBe(2);
  expect(result.stderr).toContain('--yes');
  expect(fs.existsSync(path.join(targetDir, '.skill-hub'))).toBe(false);
});

test('status reports modified, missing, and update available states', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-status-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);

  fs.appendFileSync(path.join(targetDir, '.agents', 'skills', 'grill-me', 'SKILL.md'), '\nmodified');
  fs.rmSync(path.join(targetDir, '.agents', 'skills', 'diagnose', 'SKILL.md'));
  const index = readCapabilityIndex();
  const changedIndex = {
    ...index,
    components: {
      ...index.components,
      'skill:prototype': {
        ...index.components['skill:prototype'],
        version: '999.0.0',
      },
    },
  };

  const status = getStatus({ targetDir, index: changedIndex });

  expect(status.modified.some((row) => row.id === 'skill:grill-me')).toBe(true);
  expect(status.missing.some((row) => row.id === 'skill:diagnose')).toBe(true);
  expect(status.updates.some((row) => row.id === 'skill:prototype')).toBe(true);
});

test('status reads schema version one locks without crashing', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-status-v1-'));
  const skillDir = path.join(targetDir, '.agents', 'skills', 'grill-me');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'local');
  fs.mkdirSync(path.join(targetDir, '.skill-hub'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.skill-hub', 'lock.json'), `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    hubVersion: '0.1.0',
    profile: 'minimal',
    agents: ['codex'],
    components: [
      {
        id: 'skill:grill-me',
        version: '0.1.0',
        agent: 'codex',
        dest: '.agents/skills/grill-me',
        status: 'installed',
      },
    ],
  }, null, 2)}\n`);

  const status = getStatus({ targetDir, index: readCapabilityIndex() });

  expect(status.current.some((row) => row.id === 'skill:grill-me')).toBe(true);
  expect(status.current[0]?.reason).toContain('schema version 1');
});

test('remove dry run uses lock records without deleting files', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-remove-dry-run-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);

  const result = removeManaged(targetDir, { dryRun: true });

  expect(result.exitCode).toBe(0);
  expect(result.removed.length).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'grill-me', 'SKILL.md'))).toBe(true);
});

test('remove deletes managed files and preserves unmanaged same-name files', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-remove-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);
  const unmanagedFile = path.join(targetDir, '.agents', 'skills', 'grill-me', 'LOCAL.md');
  fs.writeFileSync(unmanagedFile, 'keep me');

  const result = removeManaged(targetDir, { yes: true });

  expect(result.exitCode).toBe(0);
  expect(fs.existsSync(path.join(targetDir, '.agents', 'skills', 'grill-me', 'SKILL.md'))).toBe(false);
  expect(fs.existsSync(unmanagedFile)).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);
});

test('remove blocks modified files unless force is used', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-remove-modified-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);
  const file = path.join(targetDir, '.agents', 'skills', 'grill-me', 'SKILL.md');
  fs.appendFileSync(file, '\nmodified');

  const blocked = removeManaged(targetDir, { yes: true });
  expect(blocked.exitCode).toBe(3);
  expect(fs.existsSync(file)).toBe(true);

  const forced = removeManaged(targetDir, { yes: true, force: true });
  expect(forced.exitCode).toBe(0);
  expect(fs.existsSync(file)).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);
});

test('remove treats missing lock as idempotent no-op with confirmation', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-remove-no-lock-'));
  const result = removeManaged(targetDir, { yes: true });

  expect(result.exitCode).toBe(0);
  expect(result.reason).toContain('No Skill Hub lock');
});

test('remove blocks schema version one hashless locks even with force', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-remove-v1-'));
  const skillDir = path.join(targetDir, '.agents', 'skills', 'grill-me');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'local');
  fs.mkdirSync(path.join(targetDir, '.skill-hub'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.skill-hub', 'lock.json'), `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    hubVersion: '0.1.0',
    profile: 'minimal',
    agents: ['codex'],
    components: [
      {
        id: 'skill:grill-me',
        version: '0.1.0',
        agent: 'codex',
        dest: '.agents/skills/grill-me',
        status: 'installed',
      },
    ],
  }, null, 2)}\n`);

  const result = removeManaged(targetDir, { yes: true, force: true });

  expect(result.exitCode).toBe(3);
  expect(fs.existsSync(path.join(skillDir, 'SKILL.md'))).toBe(true);
});

test('remove blocks unsafe schema version two lock paths', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-remove-unsafe-'));
  fs.mkdirSync(path.join(targetDir, '.skill-hub'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.skill-hub', 'lock.json'), `${JSON.stringify({
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    hubVersion: '0.1.0',
    profile: 'minimal',
    agents: ['codex'],
    components: [
      {
        id: 'skill:grill-me',
        version: '0.1.0',
        agent: 'codex',
        kind: 'skill',
        source: '.agents/skills/grill-me',
        dest: '.agents/skills/grill-me',
        files: [
          {
            path: '../outside.txt',
            sha256: '0'.repeat(64),
            size: 1,
          },
        ],
        installedAt: new Date().toISOString(),
        status: 'installed',
      },
    ],
  }, null, 2)}\n`);

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  const result = removeManaged(targetDir, { yes: true, force: true });

  expect(status.modified[0]?.reason).toContain('unsafe managed path');
  expect(result.exitCode).toBe(3);
  expect(result.blocked[0]?.reason).toContain('unsafe managed path');
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(true);
});

test('update dry run reports version differences and modified blockers', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);
  fs.appendFileSync(path.join(targetDir, '.agents', 'skills', 'grill-me', 'SKILL.md'), '\nmodified');
  const index = readCapabilityIndex();
  const changedIndex = {
    ...index,
    components: {
      ...index.components,
      'skill:grill-me': {
        ...index.components['skill:grill-me'],
        version: '999.0.0',
      },
    },
  };

  const planResult = getUpdatePlan({ targetDir, index: changedIndex });

  expect(planResult.updates.some((row) => row.id === 'skill:grill-me')).toBe(true);
  expect(planResult.blockers.some((row) => row.id === 'skill:grill-me')).toBe(true);
});

test('mutating update is rejected in first release', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-reject-'));
  const result = await captureCli(['update', targetDir]);

  expect(result.code).toBe(2);
  expect(result.stderr).toContain('deferred');
});

test('analyze html without output writes to stdout only', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-analyze-html-'));
  const result = await captureCli(['analyze', targetDir, '--html']);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('<!doctype html>');
  expect(fs.existsSync(path.join(targetDir, '.skill-hub'))).toBe(false);
});

test('analyze output writes explicit report path', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-analyze-output-'));
  const output = path.join(os.tmpdir(), `skill-hub-analysis-${Date.now()}.html`);
  const result = await captureCli(['analyze', targetDir, '--html', '--output', output]);

  expect(result.code).toBe(0);
  expect(fs.existsSync(output)).toBe(true);
  expect(fs.readFileSync(output, 'utf8')).toContain('<!doctype html>');
});

test('analyze reports invalid option and unknown profile as usage errors', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-analyze-errors-'));

  const invalidOption = await captureCli(['analyze', targetDir, '--bogus']);
  const unknownProfile = await captureCli(['analyze', targetDir, '--profile', 'nope']);

  expect(invalidOption.code).toBe(2);
  expect(invalidOption.stderr).toContain('Unsupported option');
  expect(unknownProfile.code).toBe(2);
  expect(unknownProfile.stderr).toContain('Unknown profile');
});

test('status supports json, html stdout, and explicit output', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-status-cli-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);
  const output = path.join(os.tmpdir(), `skill-hub-status-${Date.now()}.html`);

  const json = await captureCli(['status', targetDir, '--json']);
  const html = await captureCli(['status', targetDir, '--html']);
  const written = await captureCli(['status', targetDir, '--html', '--output', output]);

  expect(json.code).toBe(0);
  expect(JSON.parse(json.stdout).current.length).toBeGreaterThan(0);
  expect(html.code).toBe(0);
  expect(html.stdout).toContain('<!doctype html>');
  expect(written.code).toBe(0);
  expect(fs.existsSync(output)).toBe(true);
});

test('remove command requires confirmation for mutation', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-remove-confirm-'));
  const result = await captureCli(['remove', targetDir]);

  expect(result.code).toBe(2);
  expect(result.stdout).toContain('--yes');
});

test('update command supports dry-run json output', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-cli-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);

  const result = await captureCli(['update', targetDir, '--dry-run', '--json']);

  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).updates).toEqual([]);
});

async function captureCli(argv: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    stdout.push(args.join(' '));
  };
  console.error = (...args: unknown[]) => {
    stderr.push(args.join(' '));
  };

  try {
    const code = await runCli(argv);
    return { code, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}
