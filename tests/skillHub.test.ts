import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'bun:test';

import {
  AGENT_READINESS_CATEGORIES,
  analyzeTarget,
  applyInstall,
  getRemovePlan,
  getStatus,
  getUpdatePlan,
  migrateLock,
  planInstall,
  readCapabilityIndex,
  readLock,
  removeManaged,
  runCli,
  type SkillHubLock,
  updateManaged,
  validateCapabilityIndex,
} from '../src/skillHub';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const AGENT_READINESS_FIXTURES = path.join(TEST_DIR, 'fixtures', 'agent-readiness');
const READINESS_CATEGORIES = [...AGENT_READINESS_CATEGORIES];

test('plans default install into Codex skill directory', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-plan-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });

  expect(plan.profileName).toBe('minimal');
  expect(plan.items.some((item) => item.componentId === 'skill:effective-interact')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:grill-me')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:diagnose')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:prototype')).toBe(true);
  expect(plan.items.every((item) => item.dest.includes(`${path.sep}.codex${path.sep}skills${path.sep}`))).toBe(true);
});

test('plans skills into each selected agent skill directory', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-agent-dirs-'));
  const plan = planInstall({
    targetDir,
    profile: 'minimal',
    agents: ['codex', 'opencode', 'claude-code'],
  });
  const dests = plan.items.map((item) => path.relative(targetDir, item.dest).replaceAll(path.sep, '/'));

  expect(dests).toContain('.codex/skills/grill-me');
  expect(dests).toContain('.opencode/skills/grill-me');
  expect(dests).toContain('.claude/skills/grill-me');
  expect(dests.some((dest) => dest.startsWith('.agents/skills/'))).toBe(false);
});

test('plans harness environment files outside skill directories', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-plan-'));
  const plan = planInstall({ targetDir, profile: 'harness', agents: ['codex'] });
  const plannedDests = plan.items.map((item) => path.relative(targetDir, item.dest).replaceAll(path.sep, '/'));

  expect(plan.profileName).toBe('harness');
  expect(plan.items.some((item) => item.componentId === 'harness:agents-md')).toBe(true);
  expect(plannedDests).toContain('AGENTS.md');
  expect(plannedDests).toContain('harness/feature_list.json');
  expect(plannedDests).toContain('harness/init.sh');
  expect(plannedDests.every((dest) => dest === 'AGENTS.md' || dest.startsWith('harness/'))).toBe(true);
  expect(plannedDests.every((dest) => !dest.startsWith('.agents/'))).toBe(true);
});

test('installs harness environment files with lock-backed status', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-install-'));
  const plan = planInstall({ targetDir, profile: 'harness', agents: ['codex'] });
  const result = applyInstall(plan);

  expect(result.installed.length).toBe(plan.items.length);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'harness', 'README.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'harness', 'feature_list.json'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'harness', 'init.sh'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.agents'))).toBe(false);
  expect(result.lock.data.schemaVersion).toBe(2);
  if (result.lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  expect(result.lock.data.components.some((component) => component.id === 'harness:agents-md')).toBe(true);
  expect(result.lock.data.components.flatMap((component) => component.files.map((file) => file.path)))
    .toEqual(expect.arrayContaining(['AGENTS.md', 'harness/feature_list.json', 'harness/init.sh']));

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  expect(status.current.length).toBe(plan.items.length);
  expect(status.missing.length).toBe(0);
  expect(status.modified.length).toBe(0);
});

test('harness planning skips existing target files instead of overwriting them', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-harness-skip-'));
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), 'local instructions\n');
  fs.mkdirSync(path.join(targetDir, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'harness', 'feature_list.json'), '{}\n');

  const plan = planInstall({ targetDir, profile: 'harness', agents: ['codex'] });
  const agentsItem = plan.items.find((item) => item.componentId === 'harness:agents-md');
  const featureListItem = plan.items.find((item) => item.componentId === 'harness:feature-list');
  const initItem = plan.items.find((item) => item.componentId === 'harness:init-script');

  expect(agentsItem?.exists).toBe(true);
  expect(featureListItem?.exists).toBe(true);
  expect(initItem?.exists).toBe(false);
});

test('installs skills, writes lock, and reports current status', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-install-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  const result = applyInstall(plan);

  expect(result.installed.length).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'effective-interact', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'grill-me', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'diagnose', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'prototype', 'SKILL.md'))).toBe(true);
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
          { path: '.codex/skills/*/SKILL.md' },
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
  const skillDir = path.join(targetDir, '.codex', 'skills', 'verification-loop');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: verification-loop\n---\n');

  const result = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'] });
  const finding = result.findings.find((item) => item.componentId === 'skill:verification-loop');

  expect(finding?.state).toBe('detected');
  expect(finding?.defaultAction).toBe('none');
  expect(finding?.evidence).toContain('.codex/skills/verification-loop/SKILL.md');
});

test('analyzes destination conflict separately from detected capability', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-analyze-conflict-'));
  const skillDir = path.join(targetDir, '.codex', 'skills', 'grill-me');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'README.md'), 'local placeholder');

  const result = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'] });
  const finding = result.findings.find((item) => item.componentId === 'skill:grill-me');

  expect(finding?.state).toBe('conflict');
  expect(finding?.defaultAction).toBe('skip');
  expect(finding?.dest).toBe('.codex/skills/grill-me');
});

test('analysis findings are deterministic after normalizing generated timestamp', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-analyze-stable-'));

  const first = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'] });
  const second = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'] });

  expect({ ...first, generatedAt: '<timestamp>' }).toEqual({ ...second, generatedAt: '<timestamp>' });
});

test('default analysis omits agent readiness data unless requested', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-analyze-default-shape-'));
  const result = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'] });

  expect('agentReadiness' in result).toBe(false);
});

test('readiness analysis reports unknown states for an empty target repo', async () => {
  const targetDir = path.join(AGENT_READINESS_FIXTURES, 'empty');
  const result = await captureCli(['analyze', targetDir, '--agent-readiness', '--json']);

  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.agentReadiness.categories).toEqual(READINESS_CATEGORIES);
  expect(report.agentReadiness.findings.map((finding: { category: string }) => finding.category))
    .toEqual(READINESS_CATEGORIES);
  expect(report.agentReadiness.findings.every((finding: {
    category: string;
    id: string;
    state: string;
    severity: string;
    reason: string;
    recommendation: string;
    evidence: unknown[];
  }) => (
    (READINESS_CATEGORIES as readonly string[]).includes(finding.category)
    && finding.id.length > 0
    && finding.state.length > 0
    && finding.severity.length > 0
    && finding.reason.length > 0
    && finding.recommendation.length > 0
    && Array.isArray(finding.evidence)
  ))).toBe(true);
  expect(report.agentReadiness.findings.every((finding: { state: string }) => (
    finding.state === 'unknown' || finding.state === 'not-detected'
  ))).toBe(true);
});

test('readiness analysis detects well-instrumented repo evidence', async () => {
  const targetDir = path.join(AGENT_READINESS_FIXTURES, 'well-instrumented');
  const result = await captureCli(['analyze', targetDir, '--agent-readiness', '--json']);

  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  const findings = report.agentReadiness.findings as Array<{
    category: string;
    id: string;
    state: string;
    severity: string;
    evidence: Array<{ kind: string; value: string }>;
  }>;

  expect(findings.find((finding) => finding.category === 'context_budget')?.evidence
    .map((item) => item.value)).toContain('AGENTS.md');
  expect(findings.find((finding) => finding.category === 'outcomes')?.evidence
    .map((item) => item.value)).toContain('openspec/changes/demo/tasks.md');
  expect(findings.find((finding) => finding.category === 'verification')?.evidence
    .map((item) => item.value)).toContain('package.json#scripts.test');
  expect(findings.find((finding) => finding.category === 'agent_routing')?.evidence
    .map((item) => item.value)).toContain('docs/skill-routing.md');
  expect(findings.some((finding) => (
    finding.category === 'automation_candidates'
    && finding.state === 'candidate'
    && finding.id === 'automation_candidates.ci_failure_triage'
  ))).toBe(true);
  expect(findings.find((finding) => finding.category === 'learning_capture')?.evidence
    .map((item) => item.value)).toContain('CHANGELOG.md');
});

test('readiness analysis reports duplicated always-loaded context risk', async () => {
  const targetDir = path.join(AGENT_READINESS_FIXTURES, 'overloaded-context');
  const result = await captureCli(['analyze', targetDir, '--agent-readiness', '--json']);

  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  const contextFinding = report.agentReadiness.findings.find((finding: { id: string }) => (
    finding.id === 'context_budget.duplicated_instruction_surfaces'
  ));

  expect(contextFinding.state).toBe('risk');
  expect(contextFinding.severity).toBe('warning');
  expect(contextFinding.evidence.map((item: { value: string }) => item.value)).toEqual([
    '.agents/AGENTS.md',
    '.codex/AGENTS.md',
    'AGENTS.md',
  ]);
});

test('readiness analysis gates automation candidates when verification is missing', async () => {
  const targetDir = path.join(AGENT_READINESS_FIXTURES, 'verification-gap');
  const result = await captureCli(['analyze', targetDir, '--agent-readiness', '--json']);

  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  const verificationFinding = report.agentReadiness.findings.find((finding: { category: string }) => (
    finding.category === 'verification'
  ));
  const automationFinding = report.agentReadiness.findings.find((finding: { id: string }) => (
    finding.id === 'automation_candidates.verification_required'
  ));

  expect(verificationFinding.state).toBe('not-detected');
  expect(verificationFinding.severity).toBe('warning');
  expect(automationFinding.state).toBe('not-detected');
  expect(automationFinding.reason).toContain('manual');
});

test('readiness analysis has no target side effects', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-readiness-side-effects-'));
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), 'read-only instructions\n');
  fs.mkdirSync(path.join(targetDir, '.git'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  const before = snapshotDirectory(targetDir);

  const result = analyzeTarget({ targetDir, profile: 'minimal', agents: ['codex'], agentReadiness: true });
  const after = snapshotDirectory(targetDir);

  expect(result.agentReadiness?.categories).toEqual(READINESS_CATEGORIES);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub'))).toBe(false);
  expect(after).toEqual(before);
});

test('readiness JSON output is stable after normalizing generated timestamp', async () => {
  const targetDir = path.join(AGENT_READINESS_FIXTURES, 'well-instrumented');

  const first = await captureCli(['analyze', targetDir, '--agent-readiness', '--json']);
  const second = await captureCli(['analyze', targetDir, '--agent-readiness', '--json']);

  expect(first.code).toBe(0);
  expect(second.code).toBe(0);
  expect(normalizeGeneratedAt(JSON.parse(first.stdout))).toEqual(normalizeGeneratedAt(JSON.parse(second.stdout)));
});

test('readiness text and html reports are opt-in and scoreless', async () => {
  const targetDir = path.join(AGENT_READINESS_FIXTURES, 'well-instrumented');

  const text = await captureCli(['analyze', targetDir, '--agent-readiness']);
  const html = await captureCli(['analyze', targetDir, '--agent-readiness', '--html']);

  expect(text.code).toBe(0);
  expect(text.stdout).toContain('Agent readiness');
  expect(text.stdout).not.toMatch(/\bscore\b|\d+%/i);
  expect(html.code).toBe(0);
  expect(html.stdout).toContain('<!doctype html>');
  expect(html.stdout).toContain('context_budget');
});

test('readiness option is rejected outside analyze', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-readiness-invalid-option-'));
  const result = await captureCli(['install', targetDir, '--agent-readiness', '--dry-run']);

  expect(result.code).toBe(2);
  expect(result.stderr).toContain('--agent-readiness');
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

  fs.appendFileSync(path.join(targetDir, '.codex', 'skills', 'grill-me', 'SKILL.md'), '\nmodified');
  fs.rmSync(path.join(targetDir, '.codex', 'skills', 'diagnose', 'SKILL.md'));
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
  const skillDir = path.join(targetDir, '.codex', 'skills', 'grill-me');
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
        dest: '.codex/skills/grill-me',
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
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'grill-me', 'SKILL.md'))).toBe(true);
});

test('remove deletes managed files and preserves unmanaged same-name files', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-remove-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);
  const unmanagedFile = path.join(targetDir, '.codex', 'skills', 'grill-me', 'LOCAL.md');
  fs.writeFileSync(unmanagedFile, 'keep me');

  const result = removeManaged(targetDir, { yes: true });

  expect(result.exitCode).toBe(0);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'grill-me', 'SKILL.md'))).toBe(false);
  expect(fs.existsSync(unmanagedFile)).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.skill-hub', 'lock.json'))).toBe(false);
});

test('remove blocks modified files unless force is used', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-remove-modified-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);
  const file = path.join(targetDir, '.codex', 'skills', 'grill-me', 'SKILL.md');
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
  const skillDir = path.join(targetDir, '.codex', 'skills', 'grill-me');
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
        dest: '.codex/skills/grill-me',
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
        source: '.codex/skills/grill-me',
        dest: '.codex/skills/grill-me',
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
  fs.appendFileSync(path.join(targetDir, '.codex', 'skills', 'grill-me', 'SKILL.md'), '\nmodified');
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

test('update applies unmodified managed components and refreshes lock metadata', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-apply-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);
  const unmanagedFile = path.join(targetDir, '.codex', 'skills', 'grill-me', 'LOCAL.md');
  fs.writeFileSync(unmanagedFile, 'keep local note\n');
  const managedFile = path.join(targetDir, '.codex', 'skills', 'grill-me', 'SKILL.md');
  const oldContent = 'old managed content\n';
  fs.writeFileSync(managedFile, oldContent);
  makeLockComponentStale(targetDir, 'skill:grill-me', {
    version: '0.0.0',
    fileOverrides: [{ path: '.codex/skills/grill-me/SKILL.md', content: oldContent }],
  });
  const before = readLock(targetDir);
  if (!before || before.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  const beforeRecord = before.data.components.find((component) => component.id === 'skill:grill-me');

  const result = updateManaged(targetDir, { yes: true });

  expect(result.exitCode).toBe(0);
  expect(result.updated.some((component) => component.id === 'skill:grill-me')).toBe(true);
  expect(result.forced).toEqual([]);
  expect(fs.readFileSync(managedFile, 'utf8')).toBe(fs.readFileSync(path.join(process.cwd(), '.codex', 'skills', 'grill-me', 'SKILL.md'), 'utf8'));
  expect(fs.existsSync(unmanagedFile)).toBe(true);
  const after = readLock(targetDir);
  if (!after || after.data.schemaVersion !== 2) {
    throw new Error('expected updated schema version 2 lock');
  }
  const afterRecord = after.data.components.find((component) => component.id === 'skill:grill-me');
  expect(afterRecord?.version).toBe(readCapabilityIndex().components['skill:grill-me'].version);
  expect(afterRecord?.installedAt).toBe(beforeRecord?.installedAt);
  expect(afterRecord?.updatedAt).toBeTruthy();
  expect(afterRecord?.files.find((file) => file.path === '.codex/skills/grill-me/SKILL.md')?.sha256)
    .not.toBe(hashContent(oldContent));
});

test('update migrates legacy html-work-reports locks to effective-interact', () => {
  const targetDir = createLegacyHtmlWorkReportsTarget('skill-hub-update-legacy-html-');

  const status = getStatus({ targetDir });
  const preview = getUpdatePlan({ targetDir, components: ['skill:effective-interact'] });
  const result = updateManaged(targetDir, { yes: true, components: ['skill:effective-interact'] });

  expect(status.updates.some((row) => row.id === 'skill:html-work-reports')).toBe(true);
  expect(preview.updates.map((row) => row.id)).toEqual(['skill:html-work-reports']);
  expect(preview.blockers).toEqual([]);
  expect(result.exitCode).toBe(0);
  expect(result.updated.map((row) => row.id)).toEqual(['skill:effective-interact']);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'html-work-reports', 'SKILL.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'effective-interact', 'SKILL.md'))).toBe(true);

  const lock = readLock(targetDir);
  if (!lock || lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  const migrated = lock.data.components.find((component) => component.id === 'skill:effective-interact');
  expect(migrated?.dest).toBe('.codex/skills/effective-interact');
  expect(migrated?.source).toBe('.codex/skills/effective-interact');
  expect(getStatus({ targetDir }).current.some((row) => row.id === 'skill:effective-interact')).toBe(true);
});

test('legacy html-work-reports migration overwrites same-name replacement destinations', () => {
  const targetDir = createLegacyHtmlWorkReportsTarget('skill-hub-update-legacy-html-overwrite-');
  const replacementDir = path.join(targetDir, '.codex', 'skills', 'effective-interact');
  fs.mkdirSync(replacementDir, { recursive: true });
  fs.writeFileSync(path.join(replacementDir, 'LOCAL.md'), 'local effective-interact copy\n');

  const preview = getUpdatePlan({ targetDir });
  const result = updateManaged(targetDir, { yes: true });

  expect(preview.blockers).toEqual([]);
  expect(result.exitCode).toBe(0);
  expect(result.updated.map((row) => row.id)).toEqual(['skill:effective-interact']);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'html-work-reports', 'SKILL.md'))).toBe(false);
  expect(fs.existsSync(path.join(replacementDir, 'LOCAL.md'))).toBe(false);
  expect(fs.existsSync(path.join(replacementDir, 'SKILL.md'))).toBe(true);
});

test('update can be scoped to selected components', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-selected-'));
  const plan = planInstall({ targetDir, profile: 'minimal', agents: ['codex'] });
  applyInstall(plan);
  makeLockComponentStale(targetDir, 'skill:grill-me');
  makeLockComponentStale(targetDir, 'skill:diagnose');

  const preview = getUpdatePlan({ targetDir, components: ['skill:grill-me'] });
  const result = updateManaged(targetDir, { yes: true, components: ['skill:grill-me'] });

  expect(preview.selectedComponents).toEqual(['skill:grill-me']);
  expect(preview.updates.map((row) => row.id)).toEqual(['skill:grill-me']);
  expect(result.exitCode).toBe(0);
  const lock = readLock(targetDir);
  if (!lock || lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  const grill = lock.data.components.find((component) => component.id === 'skill:grill-me');
  const diagnose = lock.data.components.find((component) => component.id === 'skill:diagnose');
  expect(grill?.version).toBe(readCapabilityIndex().components['skill:grill-me'].version);
  expect(diagnose?.version).toBe('0.0.0');
});

test('normal update blocks modified, missing, unsafe, schema v1, skipped, and unknown records', () => {
  const modifiedTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-modified-'));
  applyInstall(planInstall({ targetDir: modifiedTarget, profile: 'minimal', agents: ['codex'] }));
  makeLockComponentStale(modifiedTarget, 'skill:grill-me');
  fs.appendFileSync(path.join(modifiedTarget, '.codex', 'skills', 'grill-me', 'SKILL.md'), '\nmodified');

  const missingTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-missing-'));
  applyInstall(planInstall({ targetDir: missingTarget, profile: 'minimal', agents: ['codex'] }));
  makeLockComponentStale(missingTarget, 'skill:grill-me');
  fs.rmSync(path.join(missingTarget, '.codex', 'skills', 'grill-me', 'SKILL.md'));

  const unsafeTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-unsafe-'));
  applyInstall(planInstall({ targetDir: unsafeTarget, profile: 'minimal', agents: ['codex'] }));
  mutateLock(unsafeTarget, (lock) => {
    if (lock.schemaVersion !== 2) throw new Error('expected v2');
    const component = lock.components.find((entry) => entry.id === 'skill:grill-me');
    if (!component) throw new Error('missing component');
    component.version = '0.0.0';
    component.files = [{ path: '../outside.txt', sha256: '0'.repeat(64), size: 1 }];
  });

  const v1Target = createV1Target('skill-hub-update-v1-', { exact: true });
  mutateLock(v1Target, (lock) => {
    lock.components[0]!.version = '0.0.0';
  });

  const skippedTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-skipped-'));
  applyInstall(planInstall({ targetDir: skippedTarget, profile: 'minimal', agents: ['codex'] }));
  mutateLock(skippedTarget, (lock) => {
    if (lock.schemaVersion !== 2) throw new Error('expected v2');
    const component = lock.components.find((entry) => entry.id === 'skill:grill-me');
    if (!component) throw new Error('missing component');
    component.version = '0.0.0';
    component.status = 'skipped';
    component.files = [];
  });

  const unknownTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-unknown-'));
  applyInstall(planInstall({ targetDir: unknownTarget, profile: 'minimal', agents: ['codex'] }));
  mutateLock(unknownTarget, (lock) => {
    if (lock.schemaVersion !== 2) throw new Error('expected v2');
    const component = lock.components.find((entry) => entry.id === 'skill:grill-me');
    if (!component) throw new Error('missing component');
    component.id = 'skill:missing-upstream';
  });

  for (const target of [modifiedTarget, missingTarget, unsafeTarget, v1Target, skippedTarget, unknownTarget]) {
    const before = fs.readFileSync(path.join(target, '.skill-hub', 'lock.json'), 'utf8');
    const result = updateManaged(target, { yes: true });
    expect(result.exitCode).toBe(3);
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(fs.readFileSync(path.join(target, '.skill-hub', 'lock.json'), 'utf8')).toBe(before);
  }
});

test('force update overwrites modified and missing schema version two managed files only', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-force-'));
  applyInstall(planInstall({ targetDir, profile: 'minimal', agents: ['codex'] }));
  makeLockComponentStale(targetDir, 'skill:grill-me');
  makeLockComponentStale(targetDir, 'skill:diagnose');
  const localFile = path.join(targetDir, '.codex', 'skills', 'grill-me', 'LOCAL.md');
  fs.writeFileSync(localFile, 'keep me\n');
  const grillSkill = path.join(targetDir, '.codex', 'skills', 'grill-me', 'SKILL.md');
  fs.writeFileSync(grillSkill, 'local edits\n');
  const diagnoseSkill = path.join(targetDir, '.codex', 'skills', 'diagnose', 'SKILL.md');
  fs.rmSync(diagnoseSkill);

  const blocked = updateManaged(targetDir, { yes: true });
  const forced = updateManaged(targetDir, { yes: true, force: true });

  expect(blocked.exitCode).toBe(3);
  expect(forced.exitCode).toBe(0);
  expect(forced.forced.map((component) => component.id).sort()).toEqual(['skill:diagnose', 'skill:grill-me']);
  expect(fs.readFileSync(grillSkill, 'utf8')).toBe(fs.readFileSync(path.join(process.cwd(), '.codex', 'skills', 'grill-me', 'SKILL.md'), 'utf8'));
  expect(fs.existsSync(diagnoseSkill)).toBe(true);
  expect(fs.existsSync(localFile)).toBe(true);
});

test('migrate-lock converts exact schema version one records and blocks divergent records', () => {
  const exactTarget = createV1Target('skill-hub-migrate-v1-exact-', { exact: true });
  const dryRun = migrateLock(exactTarget, { dryRun: true });
  const migrated = migrateLock(exactTarget, { yes: true });

  expect(dryRun.exitCode).toBe(0);
  expect(dryRun.migratable.some((row) => row.id === 'skill:grill-me')).toBe(true);
  expect(migrated.exitCode).toBe(0);
  const migratedLock = readLock(exactTarget);
  if (!migratedLock || migratedLock.data.schemaVersion !== 2) {
    throw new Error('expected migrated schema version 2 lock');
  }
  expect(migratedLock.data.components[0]?.files[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(getStatus({ targetDir: exactTarget }).current.some((row) => row.id === 'skill:grill-me')).toBe(true);
  expect(updateManaged(exactTarget, { yes: true }).exitCode).toBe(0);
  expect(removeManaged(exactTarget, { yes: true }).exitCode).toBe(0);

  const divergentTarget = createV1Target('skill-hub-migrate-v1-divergent-', { exact: false });
  const before = fs.readFileSync(path.join(divergentTarget, '.skill-hub', 'lock.json'), 'utf8');
  const blocked = migrateLock(divergentTarget, { yes: true });

  expect(blocked.exitCode).toBe(3);
  expect(blocked.blockers.some((row) => row.id === 'skill:grill-me')).toBe(true);
  expect(fs.readFileSync(path.join(divergentTarget, '.skill-hub', 'lock.json'), 'utf8')).toBe(before);
});

test('update and migrate-lock CLI paths support confirmation, selection, force, and json output', async () => {
  const confirmTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-confirm-'));
  const missingConfirmation = await captureCli(['update', confirmTarget]);
  expect(missingConfirmation.code).toBe(2);
  expect(missingConfirmation.stdout).toContain('--yes');

  const selectedTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-cli-selected-'));
  applyInstall(planInstall({ targetDir: selectedTarget, profile: 'minimal', agents: ['codex'] }));
  makeLockComponentStale(selectedTarget, 'skill:grill-me');
  makeLockComponentStale(selectedTarget, 'skill:diagnose');
  const dryRun = await captureCli(['update', selectedTarget, '--dry-run', '--component', 'skill:grill-me', '--json']);
  const selected = await captureCli(['update', selectedTarget, '--component', 'skill:grill-me', '--yes', '--json']);

  expect(dryRun.code).toBe(0);
  expect(JSON.parse(dryRun.stdout).updates.map((row: { id: string }) => row.id)).toEqual(['skill:grill-me']);
  expect(selected.code).toBe(0);
  expect(JSON.parse(selected.stdout).updated.map((row: { id: string }) => row.id)).toEqual(['skill:grill-me']);

  const forceTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-update-cli-force-'));
  applyInstall(planInstall({ targetDir: forceTarget, profile: 'minimal', agents: ['codex'] }));
  makeLockComponentStale(forceTarget, 'skill:grill-me');
  fs.appendFileSync(path.join(forceTarget, '.codex', 'skills', 'grill-me', 'SKILL.md'), '\nmodified');
  const force = await captureCli(['update', forceTarget, '--force', '--yes', '--json']);
  expect(force.code).toBe(0);
  expect(JSON.parse(force.stdout).forced.some((row: { id: string }) => row.id === 'skill:grill-me')).toBe(true);

  const migrateTarget = createV1Target('skill-hub-migrate-cli-', { exact: true });
  const migrateDryRun = await captureCli(['migrate-lock', migrateTarget, '--dry-run', '--json']);
  const migrateConfirmed = await captureCli(['migrate-lock', migrateTarget, '--yes', '--json']);
  expect(migrateDryRun.code).toBe(0);
  expect(JSON.parse(migrateDryRun.stdout).migratable.length).toBe(1);
  expect(migrateConfirmed.code).toBe(0);
  expect(JSON.parse(migrateConfirmed.stdout).migrated.length).toBe(1);
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

function normalizeGeneratedAt<T extends { generatedAt?: string }>(value: T): T {
  return { ...value, generatedAt: '<timestamp>' };
}

function snapshotDirectory(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  return listSnapshotEntries(root, root).sort();
}

function listSnapshotEntries(root: string, current: string): string[] {
  const entries: string[] = [];
  for (const dirent of fs.readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, dirent.name);
    const relativePath = path.relative(root, fullPath).replaceAll(path.sep, '/');
    if (dirent.isDirectory()) {
      entries.push(`${relativePath}/`);
      entries.push(...listSnapshotEntries(root, fullPath));
    } else {
      entries.push(`${relativePath}:${fs.readFileSync(fullPath, 'utf8')}`);
    }
  }
  return entries;
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function mutateLock(targetDir: string, mutate: (lock: SkillHubLock) => void): void {
  const lockPath = path.join(targetDir, '.skill-hub', 'lock.json');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as SkillHubLock;
  mutate(lock);
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}

function makeLockComponentStale(
  targetDir: string,
  componentId: string,
  options: {
    version?: string;
    fileOverrides?: Array<{ path: string; content: string }>;
  } = {},
): void {
  mutateLock(targetDir, (lock) => {
    if (lock.schemaVersion !== 2) {
      throw new Error('expected schema version 2 lock');
    }
    const component = lock.components.find((entry) => entry.id === componentId);
    if (!component) {
      throw new Error(`missing component ${componentId}`);
    }
    component.version = options.version || '0.0.0';
    for (const override of options.fileOverrides || []) {
      const file = component.files.find((entry) => entry.path === override.path);
      if (!file) {
        throw new Error(`missing managed file ${override.path}`);
      }
      file.sha256 = hashContent(override.content);
      file.size = Buffer.byteLength(override.content);
    }
  });
}

function createLegacyHtmlWorkReportsTarget(prefix: string): string {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const legacyContent = [
    '---',
    'name: html-work-reports',
    'description: Legacy HTML report skill.',
    '---',
    '',
    '# HTML Work Reports',
    '',
  ].join('\n');
  const legacyAsset = 'legacy managed asset\n';
  const skillDir = path.join(targetDir, '.codex', 'skills', 'html-work-reports');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), legacyContent);
  fs.writeFileSync(path.join(skillDir, 'asset.txt'), legacyAsset);
  fs.mkdirSync(path.join(targetDir, '.skill-hub'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.skill-hub', 'lock.json'), `${JSON.stringify({
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    hubVersion: '0.1.4',
    profile: 'minimal',
    agents: ['codex'],
    components: [
      {
        id: 'skill:html-work-reports',
        version: '0.1.0',
        agent: 'codex',
        kind: 'skill',
        source: '.codex/skills/html-work-reports',
        dest: '.codex/skills/html-work-reports',
        files: [
          {
            path: '.codex/skills/html-work-reports/SKILL.md',
            sha256: hashContent(legacyContent),
            size: Buffer.byteLength(legacyContent),
          },
          {
            path: '.codex/skills/html-work-reports/asset.txt',
            sha256: hashContent(legacyAsset),
            size: Buffer.byteLength(legacyAsset),
          },
        ],
        installedAt: new Date().toISOString(),
        status: 'installed',
      },
    ],
  }, null, 2)}\n`);
  return targetDir;
}

function createV1Target(prefix: string, options: { exact: boolean }): string {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const source = path.join(process.cwd(), '.codex', 'skills', 'grill-me');
  const dest = path.join(targetDir, '.codex', 'skills', 'grill-me');
  fs.cpSync(source, dest, { recursive: true });
  if (!options.exact) {
    fs.appendFileSync(path.join(dest, 'SKILL.md'), '\ndivergent');
  }
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
        version: readCapabilityIndex().components['skill:grill-me'].version,
        agent: 'codex',
        dest: '.codex/skills/grill-me',
        status: 'installed',
      },
    ],
  }, null, 2)}\n`);
  return targetDir;
}
