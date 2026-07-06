import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { expect, test } from 'bun:test';

import {
  AGENT_READINESS_CATEGORIES,
  activateAgents,
  analyzeTarget,
  applyInstall,
  applyHarnessInit,
  checkHarnessHub,
  getRemovePlan,
  getStatus,
  getUpdatePlan,
  migrateLock,
  planHarnessInit,
  planInstall,
  readCapabilityIndex,
  readLock,
  removeManaged,
  runCli,
  selfCheckHarnessHub,
  type HarnessHubLock,
  updateManaged,
  validateHarness,
  validateCapabilityIndex,
  verifyLoopEvidence,
} from '../src/harnessHub';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const AGENT_READINESS_FIXTURES = path.join(TEST_DIR, 'fixtures', 'agent-readiness');
const READINESS_CATEGORIES = [...AGENT_READINESS_CATEGORIES];
const REQUIRED_HARNESS_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  'clean-state-checklist.md',
  'definition-of-done.md',
  'evaluator-rubric.md',
  'quality-document.md',
  'feature_list.json',
  '.harness-hub/.gitignore',
  '.harness-hub/state/current-task.md',
  '.harness-hub/state/decisions.md',
  '.harness-hub/state/progress.md',
  '.harness-hub/state/session-handoff.md',
  '.harness-hub/state/loop-runs.jsonl',
  '.harness-hub/state/interrupt-decisions.jsonl',
  '.harness-hub/state/capability-events.jsonl',
  '.harness-hub/loop/policies/interrupt-policy.md',
  '.harness-hub/loop/policies/action-audit-schema.md',
  '.harness-hub/loop/evals/interrupt-policy/good-cases.jsonl',
  '.harness-hub/loop/evals/interrupt-policy/bad-cases.jsonl',
  '.harness-hub/loop/evals/interrupt-policy/regression-cases.jsonl',
  '.harness-hub/context/AGENTS.md',
  '.harness-hub/context/README.md',
  '.harness-hub/context/llm-wiki-schema.md',
  '.harness-hub/context/wiki/index.md',
  '.harness-hub/context/wiki/sources/README.md',
  '.harness-hub/context/wiki/concepts/README.md',
  '.harness-hub/context/wiki/topics/README.md',
  '.harness-hub/context/wiki/people/README.md',
  '.harness-hub/context/wiki/contradictions.md',
  '.harness-hub/context/wiki/update-log.md',
  '.harness-hub/context/wiki/templates/wiki-page.md',
  '.harness-hub/context/wiki/.obsidian/app.json',
  '.harness-hub/context/wiki/.obsidian/core-plugins.json',
  '.harness-hub/context/wiki/.obsidian/graph.json',
  'scripts/harness-validate.mjs',
] as const;

test('plans default install into standard skill directory', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-plan-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });

  expect(plan.items.some((item) => item.componentId === 'skill:effective-interact')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:grill-me')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:diagnose')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:prototype')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:sdd-workflow')).toBe(true);
  expect(plan.items.some((item) => item.componentId === 'skill:webapp-testing')).toBe(true);
  expect(plan.items.every((item) => path.relative(targetDir, item.dest).startsWith(`skills${path.sep}`))).toBe(true);
});

test('plans skills into the selected standard skill directory', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-agent-dirs-'));
  const plan = planInstall({
    targetDir,
    agents: ['standard'],
  });
  const dests = plan.items.map((item) => path.relative(targetDir, item.dest).replaceAll(path.sep, '/'));

  expect(dests).toContain('skills/grill-me');
  expect(dests).not.toContain('.opencode/skills/grill-me');
  expect(dests).not.toContain('.claude/skills/grill-me');
  expect(dests.some((dest) => dest.startsWith('.agents/skills/'))).toBe(false);
});

test('installs skills, writes lock, and reports current status', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-install-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  const result = applyInstall(plan);

  expect(result.installed.length).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'effective-interact', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'grill-me', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'diagnose', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'prototype', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(true);
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

test('activate-agents syncs installed skills into project-local Codex and Claude Code caches', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-agent-activate-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));

  const result = activateAgents({ targetDir });

  expect(result.exitCode).toBe(0);
  expect(result.synced.length).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'package-release-sniffer', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'package-release-sniffer', 'SKILL.md'))).toBe(true);
  expect(fs.readFileSync(path.join(targetDir, '.codex', 'skills', 'workflow-router', '.harness-hub-managed'), 'utf8')).toContain('activate-agents');
  expect(fs.readFileSync(path.join(targetDir, '.claude', 'skills', 'workflow-router', '.harness-hub-managed'), 'utf8')).toContain('activate-agents');
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(true);
});

test('activate-agents blocks unmarked existing host skill directories', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-agent-activate-block-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));
  fs.mkdirSync(path.join(targetDir, '.claude', 'skills', 'workflow-router'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.claude', 'skills', 'workflow-router', 'SKILL.md'), '# local override\n');

  const result = activateAgents({ targetDir });

  expect(result.exitCode).toBe(1);
  expect(result.blockers.map((item) => item.skillName)).toContain('workflow-router');
  expect(result.blockers.map((item) => item.host)).toContain('claude');
  expect(fs.readFileSync(path.join(targetDir, '.claude', 'skills', 'workflow-router', 'SKILL.md'), 'utf8')).toBe('# local override\n');
});

test('confirmed install overwrites same-name skill directories by default', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-overwrite-default-'));
  const firstPlan = planInstall({ targetDir, agents: ['standard'] });
  applyInstall(firstPlan);
  const localFile = path.join(targetDir, 'skills', 'workflow-router', 'LOCAL.md');
  fs.writeFileSync(localFile, 'local file that should be replaced\n');

  const secondPlan = planInstall({ targetDir, agents: ['standard'] });
  const secondResult = applyInstall(secondPlan);

  expect(secondResult.installed.length).toBe(secondPlan.items.length);
  expect(secondResult.skipped.length).toBe(0);
  expect(fs.existsSync(localFile)).toBe(false);
});

test('install planning skips capabilities already detected outside install destination', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-plan-detected-'));
  const skillDir = path.join(targetDir, 'skills', 'verification-loop');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: verification-loop\n---\n');

  const plan = planInstall({ targetDir, agents: ['standard'] });
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
          { path: 'skills/*/SKILL.md' },
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

test('analyzes empty target repo without writing Harness Hub state', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-analyze-empty-'));
  const result = analyzeTarget({ targetDir, agents: ['standard'] });

  expect(result.schemaVersion).toBe(1);
  expect(result.agents).toEqual(['standard']);
  expect(result.signals.packageJson).toBe(false);
  expect(result.findings.length).toBeGreaterThan(0);
  expect(result.findings.every((finding) => finding.state === 'recommended')).toBe(true);
  expect(result.findings.every((finding) => finding.reason.length > 0)).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub'))).toBe(false);
});

test('analyzes existing detected capability path', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-analyze-detected-'));
  const skillDir = path.join(targetDir, 'skills', 'verification-loop');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: verification-loop\n---\n');

  const result = analyzeTarget({ targetDir, agents: ['standard'] });
  const finding = result.findings.find((item) => item.componentId === 'skill:verification-loop');

  expect(finding?.state).toBe('detected');
  expect(finding?.defaultAction).toBe('none');
  expect(finding?.evidence).toContain('skills/verification-loop/SKILL.md');
});

test('analyzes destination conflict separately from detected capability', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-analyze-conflict-'));
  const skillDir = path.join(targetDir, 'skills', 'grill-me');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'README.md'), 'local placeholder');

  const result = analyzeTarget({ targetDir, agents: ['standard'] });
  const finding = result.findings.find((item) => item.componentId === 'skill:grill-me');

  expect(finding?.state).toBe('conflict');
  expect(finding?.defaultAction).toBe('install');
  expect(finding?.reason).toContain('will be overwritten by confirmed install');
  expect(finding?.dest).toBe('skills/grill-me');
});

test('analysis findings are deterministic after normalizing generated timestamp', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-analyze-stable-'));

  const first = analyzeTarget({ targetDir, agents: ['standard'] });
  const second = analyzeTarget({ targetDir, agents: ['standard'] });

  expect({ ...first, generatedAt: '<timestamp>' }).toEqual({ ...second, generatedAt: '<timestamp>' });
});

test('default analysis omits agent readiness data unless requested', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-analyze-default-shape-'));
  const result = analyzeTarget({ targetDir, agents: ['standard'] });

  expect('agentReadiness' in result).toBe(false);
});

test('harness analysis is opt-in and side-effect-free', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-analysis-'));
  const defaultResult = analyzeTarget({ targetDir, agents: ['standard'] });
  const result = await captureCli(['analyze', targetDir, '--harness', '--json']);

  expect('harness' in defaultResult).toBe(false);
  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.harness.componentId).toBe('harness:minimal');
  expect(report.harness.requiredFiles).toContain('AGENTS.md');
  expect(report.harness.findings.some((finding: { state: string }) => finding.state === 'missing')).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub'))).toBe(false);
});

test('harness init dry-run reports exact plan without writing files', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-dry-run-'));
  const result = await captureCli(['init-harness', targetDir, '--dry-run', '--json']);

  expect(result.code).toBe(0);
  const plan = JSON.parse(result.stdout);
  expect(plan.harnessComponentId).toBe('harness:minimal');
  expect(plan.harnessFiles.map((item: { relativePath: string }) => item.relativePath).sort())
    .toEqual([...REQUIRED_HARNESS_FILES].sort());
  expect(plan.harnessFiles.every((item: { exists: boolean }) => item.exists === false)).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(false);
});

test('confirmed harness init writes lock-managed files and validates', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-init-'));
  const result = await captureCli(['init-harness', targetDir, '--yes', '--json']);

  expect(result.code).toBe(0);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'feature_list.json'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', '.gitignore'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'decisions.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'clean-state-checklist.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'definition-of-done.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'evaluator-rubric.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'quality-document.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'scripts', 'harness-validate.mjs'))).toBe(true);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('PR handoff');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('freshness gate');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('Subagent interruption questions go first to the main agent');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('stale-read gate');
  expect(fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8')).toContain('@AGENTS.md');
  expect(fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8')).toContain('Claude Code');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('main_agent_auto_arbitration_policy');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('freshness_gate_policy');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('stale_read_gate_policy');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'utf8')).toContain('Stale-read gate');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'utf8')).toContain('Stale-read result');
  expect(fs.readFileSync(path.join(targetDir, 'clean-state-checklist.md'), 'utf8')).toContain('PR URL');

  const lock = readLock(targetDir);
  expect(lock?.data.schemaVersion).toBe(2);
  if (!lock || lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  const component = lock.data.components.find((entry) => entry.id === 'harness:minimal');
  expect(component?.kind).toBe('harness-template');
  expect(component?.dest).toBe('.');
  expect(component?.files.map((file) => file.path).sort()).toEqual([...REQUIRED_HARNESS_FILES].sort());

  const validation = validateHarness(targetDir);
  expect(validation.exitCode).toBe(0);
  expect(validation.missing).toEqual([]);

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  expect(status.current.some((row) => row.id === 'harness:minimal')).toBe(true);
});

test('harness init skips existing root files unless forced', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-skip-'));
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), 'user-owned instructions\n');

  const plan = planHarnessInit({ targetDir });
  const agentsItem = plan.items.find((item) => item.relativePath === 'AGENTS.md');
  expect(agentsItem?.action).toBe('skip');

  const result = applyHarnessInit(plan);
  expect(result.skipped.some((item) => item.relativePath === 'AGENTS.md')).toBe(true);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toBe('user-owned instructions\n');
});

test('harness init blocks schema version one locks before writing files', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-v1-preflight-'));
  fs.mkdirSync(path.join(targetDir, '.harness-hub'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'lock.json'), `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    hubVersion: '0.1.0',
    agents: ['standard'],
    components: [],
  }, null, 2)}\n`);

  expect(() => applyHarnessInit(planHarnessInit({ targetDir }))).toThrow('schema version 1 lock');
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'feature_list.json'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'scripts', 'harness-validate.mjs'))).toBe(false);
});

test('harness managed files report modified and missing states', () => {
  const modifiedTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-modified-'));
  applyHarnessInit(planHarnessInit({ targetDir: modifiedTarget }));
  fs.appendFileSync(path.join(modifiedTarget, 'AGENTS.md'), '\nlocal edit\n');
  const modifiedStatus = getStatus({ targetDir: modifiedTarget, index: readCapabilityIndex() });

  expect(modifiedStatus.modified.some((row) => row.id === 'harness:minimal')).toBe(true);
  const removeResult = removeManaged(modifiedTarget, { yes: true });
  expect(removeResult.exitCode).toBe(3);
  expect(fs.existsSync(path.join(modifiedTarget, 'AGENTS.md'))).toBe(true);

  const missingTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-missing-'));
  applyHarnessInit(planHarnessInit({ targetDir: missingTarget }));
  fs.rmSync(path.join(missingTarget, '.harness-hub', 'state', 'progress.md'));
  const missingStatus = getStatus({ targetDir: missingTarget, index: readCapabilityIndex() });

  expect(missingStatus.missing.some((row) => row.id === 'harness:minimal')).toBe(true);
});

test('harness local state edits do not report managed-file modifications', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-local-state-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'local progress\n');
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'local task\n');
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'state', 'decisions.md'), 'local decisions\n');
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'local handoff\n');
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'context', 'wiki', 'index.md'), 'local wiki index\n');

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  const removePreview = getRemovePlan(targetDir);

  expect(status.modified).toEqual([]);
  expect(status.current.some((row) => row.id === 'harness:minimal')).toBe(true);
  expect(removePreview.blocked).toEqual([]);
  expect(removePreview.removed).toContain('.harness-hub/state/decisions.md');
  expect(removePreview.removed).toContain('.harness-hub/state/progress.md');
  expect(removePreview.removed).toContain('.harness-hub/context/wiki/index.md');
});

test('harness init force preserves existing worktree-local state', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-force-preserve-state-'));
  const progressPath = path.join(targetDir, '.harness-hub', 'state', 'progress.md');
  const taskPath = path.join(targetDir, '.harness-hub', 'state', 'current-task.md');
  const decisionsPath = path.join(targetDir, '.harness-hub', 'state', 'decisions.md');
  const handoffPath = path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md');
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  fs.writeFileSync(progressPath, 'existing progress\n');
  fs.writeFileSync(taskPath, 'existing task\n');
  fs.writeFileSync(decisionsPath, 'existing decisions\n');
  fs.writeFileSync(handoffPath, 'existing handoff\n');

  const plan = planHarnessInit({ targetDir, force: true });
  const localStateActions = plan.items
    .filter((item) => item.relativePath.startsWith('.harness-hub/state/'))
    .map((item) => [item.relativePath, item.action]);
  const result = applyHarnessInit(plan);

  expect(localStateActions).toContainEqual(['.harness-hub/state/current-task.md', 'skip']);
  expect(localStateActions).toContainEqual(['.harness-hub/state/decisions.md', 'skip']);
  expect(localStateActions).toContainEqual(['.harness-hub/state/progress.md', 'skip']);
  expect(localStateActions).toContainEqual(['.harness-hub/state/session-handoff.md', 'skip']);
  expect(localStateActions).toContainEqual(['.harness-hub/state/loop-runs.jsonl', 'create']);
  expect(localStateActions).toContainEqual(['.harness-hub/state/interrupt-decisions.jsonl', 'create']);
  expect(localStateActions).toContainEqual(['.harness-hub/state/capability-events.jsonl', 'create']);
  expect(result.exitCode).toBe(0);
  expect(fs.readFileSync(progressPath, 'utf8')).toBe('existing progress\n');
  expect(fs.readFileSync(taskPath, 'utf8')).toBe('existing task\n');
  expect(fs.readFileSync(decisionsPath, 'utf8')).toBe('existing decisions\n');
  expect(fs.readFileSync(handoffPath, 'utf8')).toBe('existing handoff\n');
  const lock = readLock(targetDir);
  if (!lock || lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  const component = lock.data.components.find((entry) => entry.id === 'harness:minimal');
  expect(component?.files.filter((file) => file.role === 'local-state').map((file) => file.path).sort()).toEqual([
    '.harness-hub/context/wiki/concepts/README.md',
    '.harness-hub/context/wiki/contradictions.md',
    '.harness-hub/context/wiki/index.md',
    '.harness-hub/context/wiki/people/README.md',
    '.harness-hub/context/wiki/sources/README.md',
    '.harness-hub/context/wiki/templates/wiki-page.md',
    '.harness-hub/context/wiki/topics/README.md',
    '.harness-hub/context/wiki/update-log.md',
    '.harness-hub/state/capability-events.jsonl',
    '.harness-hub/state/current-task.md',
    '.harness-hub/state/decisions.md',
    '.harness-hub/state/interrupt-decisions.jsonl',
    '.harness-hub/state/loop-runs.jsonl',
    '.harness-hub/state/progress.md',
    '.harness-hub/state/session-handoff.md',
  ]);
});

test('harness component supports selected update planning', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-update-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  makeLockComponentStale(targetDir, 'harness:minimal', { version: '0.0.0' });

  const plan = getUpdatePlan({
    targetDir,
    index: readCapabilityIndex(),
    components: ['harness:minimal'],
  });

  expect(plan.updates.map((row) => row.id)).toEqual(['harness:minimal']);
  expect(plan.blockers).toEqual([]);
});

test('standard install preserves existing harness lock records', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-install-preserve-'));
  applyHarnessInit(planHarnessInit({ targetDir }));

  applyInstall(planInstall({ targetDir, agents: ['standard'] }));

  const lock = readLock(targetDir);
  if (!lock || lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  expect(lock.data.components.some((entry) => entry.id === 'harness:minimal')).toBe(true);
  expect(lock.data.components.some((entry) => entry.id === 'skill:grill-me')).toBe(true);
  expect(getStatus({ targetDir }).current.some((row) => row.id === 'harness:minimal')).toBe(true);
});

test('harness update refreshes stable lock-owned files without overwriting local state', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-update-owned-only-'));
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), 'user-owned instructions\n');
  applyHarnessInit(planHarnessInit({ targetDir }));
  makeLockComponentStale(targetDir, 'harness:minimal', { version: '0.0.0' });
  const progressPath = path.join(targetDir, '.harness-hub', 'state', 'progress.md');
  const taskPath = path.join(targetDir, '.harness-hub', 'state', 'current-task.md');
  const decisionsPath = path.join(targetDir, '.harness-hub', 'state', 'decisions.md');
  const handoffPath = path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md');
  const interruptLedgerPath = path.join(targetDir, '.harness-hub', 'state', 'interrupt-decisions.jsonl');
  const wikiIndexPath = path.join(targetDir, '.harness-hub', 'context', 'wiki', 'index.md');
  fs.writeFileSync(progressPath, 'local progress must stay\n');
  fs.writeFileSync(taskPath, 'local current task must stay\n');
  fs.writeFileSync(decisionsPath, 'local decisions must stay\n');
  fs.writeFileSync(handoffPath, 'local handoff must stay\n');
  fs.writeFileSync(interruptLedgerPath, '{"schemaVersion":1,"event":"local decision must stay"}\n');
  fs.writeFileSync(wikiIndexPath, 'local wiki knowledge must stay\n');

  const result = updateManaged(targetDir, { yes: true, components: ['harness:minimal'] });

  expect(result.exitCode).toBe(0);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toBe('user-owned instructions\n');
  expect(fs.readFileSync(path.join(targetDir, 'clean-state-checklist.md'), 'utf8')).toContain('PR URL');
  expect(fs.readFileSync(progressPath, 'utf8')).toBe('local progress must stay\n');
  expect(fs.readFileSync(taskPath, 'utf8')).toBe('local current task must stay\n');
  expect(fs.readFileSync(decisionsPath, 'utf8')).toBe('local decisions must stay\n');
  expect(fs.readFileSync(handoffPath, 'utf8')).toBe('local handoff must stay\n');
  expect(fs.readFileSync(interruptLedgerPath, 'utf8')).toBe('{"schemaVersion":1,"event":"local decision must stay"}\n');
  expect(fs.readFileSync(wikiIndexPath, 'utf8')).toBe('local wiki knowledge must stay\n');
  const lock = readLock(targetDir);
  if (!lock || lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  const harness = lock.data.components.find((entry) => entry.id === 'harness:minimal');
  expect(harness?.files.map((file) => file.path).sort()).toEqual(
    REQUIRED_HARNESS_FILES.filter((file) => file !== 'AGENTS.md').sort(),
  );
});

test('harness update migrates legacy root state into ignored local state', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-legacy-state-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  const legacyTask = path.join(targetDir, 'tasks', 'current-task.md');
  const legacyDecisions = path.join(targetDir, 'decision-log.md');
  const legacyProgress = path.join(targetDir, 'progress.md');
  const legacyHandoff = path.join(targetDir, 'session-handoff.md');
  fs.mkdirSync(path.dirname(legacyTask), { recursive: true });
  fs.writeFileSync(legacyTask, 'legacy current task\n');
  fs.writeFileSync(legacyDecisions, 'legacy decisions\n');
  fs.writeFileSync(legacyProgress, 'legacy progress\n');
  fs.writeFileSync(legacyHandoff, 'legacy handoff\n');
  fs.rmSync(path.join(targetDir, '.harness-hub', 'state'), { recursive: true, force: true });
  mutateLock(targetDir, (lock) => {
    if (lock.schemaVersion !== 2) throw new Error('expected v2');
    const component = lock.components.find((entry) => entry.id === 'harness:minimal');
    if (!component) throw new Error('missing harness component');
    component.version = '0.0.0';
    component.files = [
      { path: 'tasks/current-task.md', sha256: hashContent('legacy current task\n'), size: Buffer.byteLength('legacy current task\n') },
      { path: 'decision-log.md', sha256: hashContent('legacy decisions\n'), size: Buffer.byteLength('legacy decisions\n') },
      { path: 'progress.md', sha256: hashContent('legacy progress\n'), size: Buffer.byteLength('legacy progress\n') },
      { path: 'session-handoff.md', sha256: hashContent('legacy handoff\n'), size: Buffer.byteLength('legacy handoff\n') },
    ];
  });

  const result = updateManaged(targetDir, { yes: true, components: ['harness:minimal'] });

  expect(result.exitCode).toBe(0);
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toBe('legacy current task\n');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'decisions.md'), 'utf8')).toBe('legacy decisions\n');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'utf8')).toBe('legacy progress\n');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'utf8')).toBe('legacy handoff\n');
  expect(fs.existsSync(legacyTask)).toBe(false);
  expect(fs.existsSync(legacyDecisions)).toBe(false);
  expect(fs.existsSync(legacyProgress)).toBe(false);
  expect(fs.existsSync(legacyHandoff)).toBe(false);
  expect(getStatus({ targetDir }).modified).toEqual([]);
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

test('readiness analysis surfaces external tool target markers', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-readiness-external-tools-'));
  fs.mkdirSync(path.join(targetDir, '.codegraph'));

  const result = analyzeTarget({ targetDir, agents: ['standard'], agentReadiness: true });
  const finding = result.agentReadiness?.findings.find((entry) => entry.category === 'external_tools');

  expect(finding?.state).toBe('detected');
  expect(finding?.evidence.map((item) => item.value)).toContain('.codegraph');
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
    'AGENTS.md',
    'skills',
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
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-readiness-side-effects-'));
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), 'read-only instructions\n');
  fs.mkdirSync(path.join(targetDir, '.git'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  const before = snapshotDirectory(targetDir);

  const result = analyzeTarget({ targetDir, agents: ['standard'], agentReadiness: true });
  const after = snapshotDirectory(targetDir);

  expect(result.agentReadiness?.categories).toEqual(READINESS_CATEGORIES);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub'))).toBe(false);
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
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-readiness-invalid-option-'));
  const result = await captureCli(['install', targetDir, '--agent-readiness', '--dry-run']);

  expect(result.code).toBe(2);
  expect(result.stderr).toContain('--agent-readiness');
});

test('install dry run does not copy files or write a lock', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-install-dry-run-'));
  const exitCode = await captureCli(['install', targetDir, '--target', 'standard', '--dry-run']);

  expect(exitCode.code).toBe(0);
  expect(fs.existsSync(path.join(targetDir, '.agents'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(false);
});

test('install dry run supports json output without side effects', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-install-dry-run-json-'));
  const result = await captureCli(['install', targetDir, '--target', 'standard', '--dry-run', '--json']);

  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.items.length).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(false);
});

test('install supports json output after mutation', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-install-json-'));
  const result = await captureCli(['install', targetDir, '--target', 'standard', '--yes', '--json']);

  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.installed.length).toBeGreaterThan(0);
  expect(report.lock.data.schemaVersion).toBe(2);
  expect(report.report).toContain('install-');
});

test('install html output includes component versions', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-install-html-'));
  const result = await captureCli(['install', targetDir, '--target', 'standard', '--dry-run', '--html']);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('Harness Hub Install Plan');
  expect(result.stdout).toContain('<td>0.1.0</td>');
});

test('install and init produce equivalent plans', async () => {
  const installTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-install-plan-'));
  const initTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-init-plan-'));

  const install = await captureCli(['install', installTarget, '--target', 'standard', '--dry-run']);
  const init = await captureCli(['init', initTarget, '--target', 'standard', '--dry-run']);

  expect(install.code).toBe(0);
  expect(init.code).toBe(0);
  expect(install.stdout.replaceAll(installTarget, '<target>')).toBe(init.stdout.replaceAll(initTarget, '<target>'));
});

test('mutating install requires explicit yes', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-install-confirm-'));
  const result = await captureCli(['install', targetDir, '--target', 'standard']);

  expect(result.code).toBe(2);
  expect(result.stderr).toContain('--yes');
  expect(fs.existsSync(path.join(targetDir, '.harness-hub'))).toBe(false);
});

test('status reports modified, missing, and update available states', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-status-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  applyInstall(plan);

  fs.appendFileSync(path.join(targetDir, 'skills', 'grill-me', 'SKILL.md'), '\nmodified');
  fs.rmSync(path.join(targetDir, 'skills', 'diagnose', 'SKILL.md'));
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

test('effective-interact version bump is discoverable as a managed update', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-effective-interact-update-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));
  makeLockComponentStale(targetDir, 'skill:effective-interact', { version: '0.1.0' });

  const status = getStatus({ targetDir });
  const preview = getUpdatePlan({ targetDir, components: ['skill:effective-interact'] });

  const effectiveInteract = readCapabilityIndex().components['skill:effective-interact'];
  expect(effectiveInteract.version).toBe('0.2.4');
  expect(effectiveInteract.provides).toContain('visual-language-first-handoffs');
  expect(status.updates.some((row) => row.id === 'skill:effective-interact')).toBe(true);
  expect(preview.updates.map((row) => row.id)).toEqual(['skill:effective-interact']);
  expect(preview.blockers).toEqual([]);
});

test('status reads schema version one locks without crashing', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-status-v1-'));
  const skillDir = path.join(targetDir, 'skills', 'grill-me');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'local');
  fs.mkdirSync(path.join(targetDir, '.harness-hub'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'lock.json'), `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    hubVersion: '0.1.0',
    agents: ['standard'],
    components: [
      {
        id: 'skill:grill-me',
        version: '0.1.0',
        agent: 'standard',
        dest: 'skills/grill-me',
        status: 'installed',
      },
    ],
  }, null, 2)}\n`);

  const status = getStatus({ targetDir, index: readCapabilityIndex() });

  expect(status.current.some((row) => row.id === 'skill:grill-me')).toBe(true);
  expect(status.current[0]?.reason).toContain('schema version 1');
});

test('remove dry run uses lock records without deleting files', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-remove-dry-run-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  applyInstall(plan);

  const result = removeManaged(targetDir, { dryRun: true });

  expect(result.exitCode).toBe(0);
  expect(result.removed.length).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'grill-me', 'SKILL.md'))).toBe(true);
});

test('remove deletes managed files and preserves unmanaged same-name files', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-remove-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  applyInstall(plan);
  const unmanagedFile = path.join(targetDir, 'skills', 'grill-me', 'LOCAL.md');
  fs.writeFileSync(unmanagedFile, 'keep me');

  const result = removeManaged(targetDir, { yes: true });

  expect(result.exitCode).toBe(0);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'grill-me', 'SKILL.md'))).toBe(false);
  expect(fs.existsSync(unmanagedFile)).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(false);
});

test('remove blocks modified files unless force is used', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-remove-modified-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  applyInstall(plan);
  const file = path.join(targetDir, 'skills', 'grill-me', 'SKILL.md');
  fs.appendFileSync(file, '\nmodified');

  const blocked = removeManaged(targetDir, { yes: true });
  expect(blocked.exitCode).toBe(3);
  expect(fs.existsSync(file)).toBe(true);

  const forced = removeManaged(targetDir, { yes: true, force: true });
  expect(forced.exitCode).toBe(0);
  expect(fs.existsSync(file)).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(false);
});

test('remove treats missing lock as idempotent no-op with confirmation', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-remove-no-lock-'));
  const result = removeManaged(targetDir, { yes: true });

  expect(result.exitCode).toBe(0);
  expect(result.reason).toContain('No Harness Hub lock');
});

test('remove blocks schema version one hashless locks even with force', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-remove-v1-'));
  const skillDir = path.join(targetDir, 'skills', 'grill-me');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), 'local');
  fs.mkdirSync(path.join(targetDir, '.harness-hub'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'lock.json'), `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    hubVersion: '0.1.0',
    agents: ['standard'],
    components: [
      {
        id: 'skill:grill-me',
        version: '0.1.0',
        agent: 'standard',
        dest: 'skills/grill-me',
        status: 'installed',
      },
    ],
  }, null, 2)}\n`);

  const result = removeManaged(targetDir, { yes: true, force: true });

  expect(result.exitCode).toBe(3);
  expect(fs.existsSync(path.join(skillDir, 'SKILL.md'))).toBe(true);
});

test('remove blocks unsafe schema version two lock paths', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-remove-unsafe-'));
  fs.mkdirSync(path.join(targetDir, '.harness-hub'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'lock.json'), `${JSON.stringify({
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    hubVersion: '0.1.0',
    agents: ['standard'],
    components: [
      {
        id: 'skill:grill-me',
        version: '0.1.0',
        agent: 'standard',
        kind: 'skill',
        source: 'skills/grill-me',
        dest: 'skills/grill-me',
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
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(true);
});

test('update dry run reports version differences and modified blockers', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  applyInstall(plan);
  fs.appendFileSync(path.join(targetDir, 'skills', 'grill-me', 'SKILL.md'), '\nmodified');
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
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-apply-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  applyInstall(plan);
  const unmanagedFile = path.join(targetDir, 'skills', 'grill-me', 'LOCAL.md');
  fs.writeFileSync(unmanagedFile, 'keep local note\n');
  const managedFile = path.join(targetDir, 'skills', 'grill-me', 'SKILL.md');
  const oldContent = 'old managed content\n';
  fs.writeFileSync(managedFile, oldContent);
  makeLockComponentStale(targetDir, 'skill:grill-me', {
    version: '0.0.0',
    fileOverrides: [{ path: 'skills/grill-me/SKILL.md', content: oldContent }],
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
  expect(fs.readFileSync(managedFile, 'utf8')).toBe(fs.readFileSync(path.join(process.cwd(), 'skills', 'grill-me', 'SKILL.md'), 'utf8'));
  expect(fs.existsSync(unmanagedFile)).toBe(true);
  const after = readLock(targetDir);
  if (!after || after.data.schemaVersion !== 2) {
    throw new Error('expected updated schema version 2 lock');
  }
  const afterRecord = after.data.components.find((component) => component.id === 'skill:grill-me');
  expect(afterRecord?.version).toBe(readCapabilityIndex().components['skill:grill-me'].version);
  expect(afterRecord?.installedAt).toBe(beforeRecord?.installedAt);
  expect(afterRecord?.updatedAt).toBeTruthy();
  expect(afterRecord?.files.find((file) => file.path === 'skills/grill-me/SKILL.md')?.sha256)
    .not.toBe(hashContent(oldContent));
});

test('update migrates legacy html-work-reports locks to effective-interact', () => {
  const targetDir = createLegacyHtmlWorkReportsTarget('harness-hub-update-legacy-html-');

  const status = getStatus({ targetDir });
  const preview = getUpdatePlan({ targetDir, components: ['skill:effective-interact'] });
  const result = updateManaged(targetDir, { yes: true, components: ['skill:effective-interact'] });

  expect(status.updates.some((row) => row.id === 'skill:html-work-reports')).toBe(true);
  expect(preview.updates.map((row) => row.id)).toEqual(['skill:html-work-reports']);
  expect(preview.blockers).toEqual([]);
  expect(result.exitCode).toBe(0);
  expect(result.updated.map((row) => row.id)).toEqual(['skill:effective-interact']);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'html-work-reports', 'SKILL.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'effective-interact', 'SKILL.md'))).toBe(true);

  const lock = readLock(targetDir);
  if (!lock || lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  const migrated = lock.data.components.find((component) => component.id === 'skill:effective-interact');
  expect(migrated?.dest).toBe('skills/effective-interact');
  expect(migrated?.source).toBe('skills/effective-interact');
  expect(getStatus({ targetDir }).current.some((row) => row.id === 'skill:effective-interact')).toBe(true);
});

test('legacy html-work-reports migration overwrites same-name replacement destinations', () => {
  const targetDir = createLegacyHtmlWorkReportsTarget('harness-hub-update-legacy-html-overwrite-');
  const replacementDir = path.join(targetDir, 'skills', 'effective-interact');
  fs.mkdirSync(replacementDir, { recursive: true });
  fs.writeFileSync(path.join(replacementDir, 'LOCAL.md'), 'local effective-interact copy\n');

  const preview = getUpdatePlan({ targetDir });
  const result = updateManaged(targetDir, { yes: true });

  expect(preview.blockers).toEqual([]);
  expect(result.exitCode).toBe(0);
  expect(result.updated.map((row) => row.id)).toEqual(['skill:effective-interact']);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'html-work-reports', 'SKILL.md'))).toBe(false);
  expect(fs.existsSync(path.join(replacementDir, 'LOCAL.md'))).toBe(false);
  expect(fs.existsSync(path.join(replacementDir, 'SKILL.md'))).toBe(true);
});

test('update can be scoped to selected components', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-selected-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
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
  const modifiedTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-modified-'));
  applyInstall(planInstall({ targetDir: modifiedTarget, agents: ['standard'] }));
  makeLockComponentStale(modifiedTarget, 'skill:grill-me');
  fs.appendFileSync(path.join(modifiedTarget, 'skills', 'grill-me', 'SKILL.md'), '\nmodified');

  const missingTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-missing-'));
  applyInstall(planInstall({ targetDir: missingTarget, agents: ['standard'] }));
  makeLockComponentStale(missingTarget, 'skill:grill-me');
  fs.rmSync(path.join(missingTarget, 'skills', 'grill-me', 'SKILL.md'));

  const unsafeTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-unsafe-'));
  applyInstall(planInstall({ targetDir: unsafeTarget, agents: ['standard'] }));
  mutateLock(unsafeTarget, (lock) => {
    if (lock.schemaVersion !== 2) throw new Error('expected v2');
    const component = lock.components.find((entry) => entry.id === 'skill:grill-me');
    if (!component) throw new Error('missing component');
    component.version = '0.0.0';
    component.files = [{ path: '../outside.txt', sha256: '0'.repeat(64), size: 1 }];
  });

  const v1Target = createV1Target('harness-hub-update-v1-', { exact: true });
  mutateLock(v1Target, (lock) => {
    lock.components[0]!.version = '0.0.0';
  });

  const skippedTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-skipped-'));
  applyInstall(planInstall({ targetDir: skippedTarget, agents: ['standard'] }));
  mutateLock(skippedTarget, (lock) => {
    if (lock.schemaVersion !== 2) throw new Error('expected v2');
    const component = lock.components.find((entry) => entry.id === 'skill:grill-me');
    if (!component) throw new Error('missing component');
    component.version = '0.0.0';
    component.status = 'skipped';
    component.files = [];
  });

  const unknownTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-unknown-'));
  applyInstall(planInstall({ targetDir: unknownTarget, agents: ['standard'] }));
  mutateLock(unknownTarget, (lock) => {
    if (lock.schemaVersion !== 2) throw new Error('expected v2');
    const component = lock.components.find((entry) => entry.id === 'skill:grill-me');
    if (!component) throw new Error('missing component');
    component.id = 'skill:missing-upstream';
  });

  for (const target of [modifiedTarget, missingTarget, unsafeTarget, v1Target, skippedTarget, unknownTarget]) {
    const before = fs.readFileSync(path.join(target, '.harness-hub', 'lock.json'), 'utf8');
    const result = updateManaged(target, { yes: true });
    expect(result.exitCode).toBe(3);
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(fs.readFileSync(path.join(target, '.harness-hub', 'lock.json'), 'utf8')).toBe(before);
  }
});

test('force update overwrites modified and missing schema version two managed files only', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-force-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));
  makeLockComponentStale(targetDir, 'skill:grill-me');
  makeLockComponentStale(targetDir, 'skill:diagnose');
  const localFile = path.join(targetDir, 'skills', 'grill-me', 'LOCAL.md');
  fs.writeFileSync(localFile, 'keep me\n');
  const grillSkill = path.join(targetDir, 'skills', 'grill-me', 'SKILL.md');
  fs.writeFileSync(grillSkill, 'local edits\n');
  const diagnoseSkill = path.join(targetDir, 'skills', 'diagnose', 'SKILL.md');
  fs.rmSync(diagnoseSkill);

  const blocked = updateManaged(targetDir, { yes: true });
  const forced = updateManaged(targetDir, { yes: true, force: true });

  expect(blocked.exitCode).toBe(3);
  expect(forced.exitCode).toBe(0);
  expect(forced.forced.map((component) => component.id).sort()).toEqual(['skill:diagnose', 'skill:grill-me']);
  expect(fs.readFileSync(grillSkill, 'utf8')).toBe(fs.readFileSync(path.join(process.cwd(), 'skills', 'grill-me', 'SKILL.md'), 'utf8'));
  expect(fs.existsSync(diagnoseSkill)).toBe(true);
  expect(fs.existsSync(localFile)).toBe(true);
});

test('migrate-lock converts exact schema version one records and blocks divergent records', () => {
  const exactTarget = createV1Target('harness-hub-migrate-v1-exact-', { exact: true });
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

  const divergentTarget = createV1Target('harness-hub-migrate-v1-divergent-', { exact: false });
  const before = fs.readFileSync(path.join(divergentTarget, '.harness-hub', 'lock.json'), 'utf8');
  const blocked = migrateLock(divergentTarget, { yes: true });

  expect(blocked.exitCode).toBe(3);
  expect(blocked.blockers.some((row) => row.id === 'skill:grill-me')).toBe(true);
  expect(fs.readFileSync(path.join(divergentTarget, '.harness-hub', 'lock.json'), 'utf8')).toBe(before);
});

test('update and migrate-lock CLI paths support confirmation, selection, force, and json output', async () => {
  const confirmTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-confirm-'));
  const missingConfirmation = await captureCli(['update', confirmTarget]);
  expect(missingConfirmation.code).toBe(2);
  expect(missingConfirmation.stdout).toContain('--yes');

  const selectedTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-cli-selected-'));
  applyInstall(planInstall({ targetDir: selectedTarget, agents: ['standard'] }));
  makeLockComponentStale(selectedTarget, 'skill:grill-me');
  makeLockComponentStale(selectedTarget, 'skill:diagnose');
  const dryRun = await captureCli(['update', selectedTarget, '--dry-run', '--component', 'skill:grill-me', '--json']);
  const selected = await captureCli(['update', selectedTarget, '--component', 'skill:grill-me', '--yes', '--json']);

  expect(dryRun.code).toBe(0);
  expect(JSON.parse(dryRun.stdout).updates.map((row: { id: string }) => row.id)).toEqual(['skill:grill-me']);
  expect(selected.code).toBe(0);
  expect(JSON.parse(selected.stdout).updated.map((row: { id: string }) => row.id)).toEqual(['skill:grill-me']);

  const forceTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-cli-force-'));
  applyInstall(planInstall({ targetDir: forceTarget, agents: ['standard'] }));
  makeLockComponentStale(forceTarget, 'skill:grill-me');
  fs.appendFileSync(path.join(forceTarget, 'skills', 'grill-me', 'SKILL.md'), '\nmodified');
  const force = await captureCli(['update', forceTarget, '--force', '--yes', '--json']);
  expect(force.code).toBe(0);
  expect(JSON.parse(force.stdout).forced.some((row: { id: string }) => row.id === 'skill:grill-me')).toBe(true);

  const migrateTarget = createV1Target('harness-hub-migrate-cli-', { exact: true });
  const migrateDryRun = await captureCli(['migrate-lock', migrateTarget, '--dry-run', '--json']);
  const migrateConfirmed = await captureCli(['migrate-lock', migrateTarget, '--yes', '--json']);
  expect(migrateDryRun.code).toBe(0);
  expect(JSON.parse(migrateDryRun.stdout).migratable.length).toBe(1);
  expect(migrateConfirmed.code).toBe(0);
  expect(JSON.parse(migrateConfirmed.stdout).migrated.length).toBe(1);
});

test('analyze html without output writes to stdout only', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-analyze-html-'));
  const result = await captureCli(['analyze', targetDir, '--html']);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('<!doctype html>');
  expect(fs.existsSync(path.join(targetDir, '.harness-hub'))).toBe(false);
});

test('analyze output writes explicit report path', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-analyze-output-'));
  const output = path.join(os.tmpdir(), `harness-hub-analysis-${Date.now()}.html`);
  const result = await captureCli(['analyze', targetDir, '--html', '--output', output]);

  expect(result.code).toBe(0);
  expect(fs.existsSync(output)).toBe(true);
  expect(fs.readFileSync(output, 'utf8')).toContain('<!doctype html>');
});

test('analyze rejects unsupported profile option as a usage error', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-analyze-errors-'));

  const invalidOption = await captureCli(['analyze', targetDir, '--bogus']);
  const profileOption = await captureCli(['analyze', targetDir, '--profile', 'nope']);

  expect(invalidOption.code).toBe(2);
  expect(invalidOption.stderr).toContain('Unsupported option');
  expect(profileOption.code).toBe(2);
  expect(profileOption.stderr).toContain("Unsupported option '--profile'");
});

test('help lists the full public command surface', async () => {
  const result = await captureCli(['--help']);

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('harness-hub check');
  expect(result.stdout).toContain('harness-hub init-harness');
  expect(result.stdout).toContain('harness-hub activate-agents');
  expect(result.stdout).not.toContain('harness-hub activate-codex');
  expect(result.stdout).toContain('harness-hub source-post generate');
  expect(result.stdout).toContain('harness-hub source-post build');
  expect(result.stdout).toContain('harness-hub source-post validate');
  expect(result.stdout).toContain('harness-hub source-post publish');
  expect(result.stdout).toContain('harness-hub loop evaluate');
  expect(result.stdout).toContain('harness-hub loop schedule');
  expect(result.stdout).not.toContain('harness-hub source-post-generate');
  expect(result.stdout).not.toContain('harness-hub source-post-build');
  expect(result.stdout).not.toContain('harness-hub source-post-validate');
  expect(result.stdout).not.toContain('harness-hub source-post-publish');
  expect(result.stdout).toContain('harness-hub migrate-lock');
});

test('loop evaluate continues low-risk local actions and interrupts risky actions', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-eval-'));
  const continueInput = path.join(targetDir, 'continue-action.json');
  const interruptInput = path.join(targetDir, 'interrupt-action.json');
  fs.writeFileSync(continueInput, `${JSON.stringify({
    schemaVersion: 1,
    id: 'local-fix',
    summary: 'Patch a scoped local unit test and rerun the focused test.',
    capabilityInvocation: 'standalone',
    action: 'edit local unit test expectation',
    sideEffects: ['local-files', 'validation-run'],
    riskSignals: ['validation-passed'],
    requiredEvidence: ['focused test command'],
    validation: { status: 'pass', command: 'bun test tests/example.test.ts' },
  }, null, 2)}\n`);
  fs.writeFileSync(interruptInput, `${JSON.stringify({
    schemaVersion: 1,
    id: 'publish-report',
    summary: 'Publish a generated report to GitHub Pages.',
    capabilityInvocation: 'loop-participant',
    action: 'publish report to GitHub Pages',
    sideEffects: ['remote-write'],
    riskSignals: ['publication-boundary'],
    requiredEvidence: ['publish draft'],
  }, null, 2)}\n`);

  const continued = await captureCli(['loop', 'evaluate', targetDir, '--input', continueInput, '--json']);
  const interrupted = await captureCli(['loop', 'evaluate', targetDir, '--input', interruptInput, '--json']);

  expect(continued.code).toBe(0);
  const continueReport = JSON.parse(continued.stdout);
  expect(continueReport.decision).toBe('continue');
  expect(continueReport.recorded).toBe(false);
  expect(continueReport.continueReasons).toContain('side effects are local, read-only, or validation-only');

  expect(interrupted.code).toBe(3);
  const interruptReport = JSON.parse(interrupted.stdout);
  expect(interruptReport.decision).toBe('interrupt');
  expect(interruptReport.riskSignals).toContain('publication-boundary');
  expect(interruptReport.interruptReasons).toContain("risk signal 'publication-boundary'");
  expect(interruptReport.requiredEvidence).toContain('human approval record');
});

test('loop evaluate records auditable decisions only with confirmation', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-record-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  const inputPath = path.join(targetDir, 'local-action.json');
  const ledgerPath = path.join(targetDir, '.harness-hub', 'state', 'interrupt-decisions.jsonl');
  fs.writeFileSync(inputPath, `${JSON.stringify({
    schemaVersion: 1,
    id: 'document-local-fix',
    summary: 'Update a local progress note after validation passes.',
    capabilityInvocation: 'standalone',
    action: 'append local progress evidence',
    sideEffects: ['local-state'],
    riskSignals: ['validation-passed'],
    validation: { status: 'passed' },
  }, null, 2)}\n`);
  const before = fs.readFileSync(ledgerPath, 'utf8').trim().split(/\r?\n/).length;

  const result = await captureCli(['loop', 'evaluate', targetDir, '--input', inputPath, '--yes', '--json']);

  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.recorded).toBe(true);
  expect(report.decision).toBe('continue');
  const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split(/\r?\n/);
  expect(lines.length).toBe(before + 1);
  expect(JSON.parse(lines.at(-1) || '{}')).toMatchObject({
    event: 'interrupt_decision',
    actionId: 'document-local-fix',
    decision: 'continue',
  });
});

test('loop schedule chooses the next continue action and records scheduler state', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-schedule-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  const inputPath = path.join(targetDir, 'actions.jsonl');
  const decisionLedger = path.join(targetDir, '.harness-hub', 'state', 'interrupt-decisions.jsonl');
  const runLedger = path.join(targetDir, '.harness-hub', 'state', 'loop-runs.jsonl');
  fs.writeFileSync(inputPath, [
    JSON.stringify({
      schemaVersion: 1,
      id: 'publish-draft',
      summary: 'Publish a draft report to a remote page.',
      capabilityInvocation: 'loop-participant',
      action: 'publish draft report',
      sideEffects: ['remote-write'],
      riskSignals: ['publication-boundary'],
    }),
    JSON.stringify({
      schemaVersion: 1,
      id: 'local-test-fix',
      summary: 'Apply a scoped local fix and run validation.',
      capabilityInvocation: 'composable',
      action: 'apply scoped local fix',
      sideEffects: ['local-files', 'validation-run'],
      riskSignals: ['validation-passed'],
      validation: { status: 'pass' },
    }),
  ].join('\n'));
  const decisionBefore = fs.readFileSync(decisionLedger, 'utf8').trim().split(/\r?\n/).length;
  const runBefore = fs.readFileSync(runLedger, 'utf8').trim().split(/\r?\n/).length;

  const result = await captureCli(['loop', 'schedule', targetDir, '--input', inputPath, '--yes', '--json']);

  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.nextActionId).toBe('local-test-fix');
  expect(report.interruptedActionIds).toEqual(['publish-draft']);
  expect(report.recorded).toBe(true);
  expect(report.decisions.map((decision: { decision: string }) => decision.decision)).toEqual(['interrupt', 'continue']);
  expect(fs.readFileSync(decisionLedger, 'utf8').trim().split(/\r?\n/).length).toBe(decisionBefore + 2);
  const runLines = fs.readFileSync(runLedger, 'utf8').trim().split(/\r?\n/);
  expect(runLines.length).toBe(runBefore + 1);
  expect(JSON.parse(runLines.at(-1) || '{}')).toMatchObject({
    event: 'loop_run',
    status: 'running',
    nextActionId: 'local-test-fix',
    interruptedActionIds: ['publish-draft'],
  });
});

test('loop required classifies dirty worktree paths into mandatory review loops', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-required-'));
  fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'src', 'feature.ts'), 'export const feature = 1;\n');
  fs.writeFileSync(path.join(targetDir, 'tests', 'feature.test.ts'), 'expect(1).toBe(1);\n');
  fs.writeFileSync(path.join(targetDir, 'README.md'), '# Fixture\n');
  initGitFixture(targetDir);

  fs.writeFileSync(path.join(targetDir, 'src', 'feature.ts'), 'export const feature = 2;\n');
  fs.writeFileSync(path.join(targetDir, 'tests', 'feature.test.ts'), 'expect(2).toBe(2);\n');
  fs.writeFileSync(path.join(targetDir, 'README.md'), '# Fixture\n\nChanged.\n');

  const result = await captureCli(['loop', 'required', targetDir, '--json']);

  expect(result.code).toBe(3);
  const report = JSON.parse(result.stdout);
  expect(report.changedPaths).toEqual(['README.md', 'src/feature.ts', 'tests/feature.test.ts']);
  expect(report.requiredLoops).toContainEqual(expect.objectContaining({
    loop: 'implementation-review',
    level: 'L1',
    paths: ['src/feature.ts'],
  }));
  expect(report.requiredLoops).toContainEqual(expect.objectContaining({
    loop: 'test-review',
    level: 'L1',
    paths: ['tests/feature.test.ts'],
  }));
  expect(report.requiredLoops).toContainEqual(expect.objectContaining({
    loop: 'docs-consistency',
    level: 'L1',
    paths: ['README.md'],
  }));
});

test('loop required treats uncategorized mutation paths as implementation review', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-required-general-'));
  fs.mkdirSync(path.join(targetDir, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'package.json'), '{"name":"fixture"}\n');
  fs.writeFileSync(path.join(targetDir, 'bin', 'fixture.mjs'), 'console.log("old");\n');
  fs.writeFileSync(path.join(targetDir, 'scripts', 'tool.mjs'), 'console.log("old");\n');
  initGitFixture(targetDir);

  fs.writeFileSync(path.join(targetDir, 'package.json'), '{"name":"fixture","type":"module"}\n');
  fs.writeFileSync(path.join(targetDir, 'bin', 'fixture.mjs'), 'console.log("new");\n');
  fs.writeFileSync(path.join(targetDir, 'scripts', 'tool.mjs'), 'console.log("new");\n');

  const result = await captureCli(['loop', 'required', targetDir, '--json']);

  expect(result.code).toBe(3);
  const report = JSON.parse(result.stdout);
  expect(report.changedPaths).toEqual(['bin/fixture.mjs', 'package.json', 'scripts/tool.mjs']);
  expect(report.requiredLoops).toContainEqual(expect.objectContaining({
    loop: 'implementation-review',
    level: 'L1',
    paths: ['bin/fixture.mjs', 'package.json', 'scripts/tool.mjs'],
  }));
});

test('loop required derives committed change ranges and classifies root harness governance as L2', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-required-range-'));
  fs.mkdirSync(path.join(targetDir, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'feature_list.json'), '{"features":[]}\n');
  fs.writeFileSync(path.join(targetDir, 'scripts', 'harness-validate.mjs'), 'console.log("old");\n');
  initGitFixture(targetDir);

  fs.writeFileSync(path.join(targetDir, 'feature_list.json'), '{"features":[{"id":"loop"}]}\n');
  fs.writeFileSync(path.join(targetDir, 'scripts', 'harness-validate.mjs'), 'console.log("new");\n');
  execFileSync('git', ['add', '.'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'change harness governance'], { cwd: targetDir, stdio: 'ignore' });

  const dirty = await captureCli(['loop', 'required', targetDir, '--json']);
  expect(JSON.parse(dirty.stdout).requiredLoops).toEqual([]);

  const result = await captureCli(['loop', 'required', targetDir, '--base', 'HEAD~1', '--head', 'HEAD', '--json']);

  expect(result.code).toBe(3);
  const report = JSON.parse(result.stdout);
  expect(report.changeSource).toBe('git-diff');
  expect(report.changedPaths).toEqual(['feature_list.json', 'scripts/harness-validate.mjs']);
  expect(report.requiredLoops).toContainEqual(expect.objectContaining({
    loop: 'workflow-review',
    level: 'L2',
    paths: ['feature_list.json', 'scripts/harness-validate.mjs'],
  }));
});

test('loop required includes deleted governance paths in committed ranges', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-required-deletion-'));
  fs.writeFileSync(path.join(targetDir, 'feature_list.json'), '{"features":[]}\n');
  initGitFixture(targetDir);

  fs.rmSync(path.join(targetDir, 'feature_list.json'));
  execFileSync('git', ['add', '-A'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'delete governance file'], { cwd: targetDir, stdio: 'ignore' });

  const result = await captureCli(['loop', 'required', targetDir, '--base', 'HEAD~1', '--head', 'HEAD', '--json']);

  expect(result.code).toBe(3);
  const report = JSON.parse(result.stdout);
  expect(report.changedPaths).toEqual(['feature_list.json']);
  expect(report.requiredLoops).toContainEqual(expect.objectContaining({
    loop: 'workflow-review',
    level: 'L2',
    paths: ['feature_list.json'],
  }));
});

test('loop run-start creates ignored runtime state without full harness init', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-runtime-'));
  fs.writeFileSync(path.join(targetDir, 'README.md'), '# Fixture\n');
  initGitFixture(targetDir);
  const runInput = path.join(targetDir, 'run.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-auto-state',
    loop: 'implementation-review',
    task: 'Start loop state without a full harness.',
    acceptanceCriteria: ['runtime state is ignored'],
  }, null, 2)}\n`);

  const result = await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json']);

  expect(result.code).toBe(0);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'runs', 'run-auto-state', 'run.json'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', '.gitignore'))).toBe(false);
  execFileSync('git', ['check-ignore', '-q', '.harness-hub/state/runs/run-auto-state/run.json'], {
    cwd: targetDir,
    stdio: 'ignore',
  });
  const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: targetDir,
    encoding: 'utf8',
  });
  expect(status).not.toContain('.harness-hub');
});

test('loop run-start rejects reused run ids instead of reusing old evidence', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-reused-run-'));
  const runInput = path.join(targetDir, 'run.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-reused',
    loop: 'implementation-review',
    task: 'Reject run id reuse.',
    acceptanceCriteria: ['old evidence is not reused'],
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  const reused = await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json']);

  expect(reused.code).toBe(3);
  expect(reused.stderr).toContain('already exists');
});

test('loop agent-record blocks fresh locks and reaps stale locks', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-lock-reap-'));
  const runInput = loopTestInputPath(targetDir, 'run.json');
  const agentInput = loopTestInputPath(targetDir, 'agent.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-lock-reap',
    loop: 'implementation-review',
    task: 'Check lock freshness.',
    acceptanceCriteria: ['fresh locks block', 'stale locks can be reaped'],
  }, null, 2)}\n`);
  fs.writeFileSync(agentInput, `${JSON.stringify({
    runId: 'run-lock-reap',
    agentId: 'agent-a',
    host: 'codex',
    role: 'implementation-review',
    status: 'completed',
    readOnly: true,
    result: { summary: 'review passed' },
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  const lockDir = path.join(targetDir, '.harness-hub', 'state', 'runs', 'run-lock-reap', '.locks', 'agent-agent-a');
  fs.mkdirSync(lockDir, { recursive: true });
  fs.writeFileSync(path.join(lockDir, 'owner.json'), `${JSON.stringify({
    pid: 1,
    token: 'fresh-lock',
    acquiredAt: new Date().toISOString(),
  }, null, 2)}\n`);

  const freshLocked = await captureCli(['loop', 'agent-record', targetDir, '--input', agentInput, '--yes', '--json']);
  expect(freshLocked.code).toBe(3);
  expect(freshLocked.stderr).toContain('busy');

  const staleTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
  fs.utimesSync(lockDir, staleTime, staleTime);
  const staleReaped = await captureCli(['loop', 'agent-record', targetDir, '--input', agentInput, '--yes', '--json']);

  expect(staleReaped.code).toBe(0);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'runs', 'run-lock-reap', 'agents', 'agent-a', 'state.json'))).toBe(true);
  expect(fs.existsSync(lockDir)).toBe(false);
});

test('loop verify blocks missing review evidence and passes after integration record', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-'));
  initGitFixtureWithDirtyPaths(targetDir, ['src/feature.ts']);
  const runInput = loopTestInputPath(targetDir, 'run.json');
  const verifyInput = loopTestInputPath(targetDir, 'verify.json');
  const agentInput = loopTestInputPath(targetDir, 'agent.json');
  const integrationInput = loopTestInputPath(targetDir, 'integration.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-verify-smoke',
    loop: 'implementation-review',
    task: 'Verify required loop evidence.',
    acceptanceCriteria: ['missing review evidence is blocked', 'integration evidence passes'],
  }, null, 2)}\n`);
  fs.writeFileSync(verifyInput, `${JSON.stringify({
    runId: 'run-verify-smoke',
    changedPaths: ['src/feature.ts'],
    requiredLoops: [{
      loop: 'implementation-review',
      level: 'L1',
      reason: 'source path changed',
      paths: ['src/feature.ts'],
    }],
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  const missing = await captureCli(['loop', 'verify', targetDir, '--input', verifyInput, '--json']);
  expect(missing.code).toBe(3);
  expect(JSON.parse(missing.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'missing-integration',
  }));
  expect(JSON.parse(missing.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'missing-review-evidence',
  }));
  expect(JSON.parse(missing.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'missing-validation-evidence',
  }));

  fs.writeFileSync(agentInput, `${JSON.stringify({
    runId: 'run-verify-smoke',
    agentId: 'reviewer-1',
    host: 'codex',
    role: 'implementation-review',
    status: 'completed',
    readOnly: true,
    result: { summary: 'review passed' },
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'agent-record', targetDir, '--input', agentInput, '--yes', '--json'])).code).toBe(0);

  fs.writeFileSync(integrationInput, `${JSON.stringify({
    runId: 'run-verify-smoke',
    summary: 'Main agent accepted independent review evidence.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    agentIds: ['reviewer-1'],
    loops: ['implementation-review'],
    executorMode: 'subagent',
    validationStatus: 'pass',
    validationEvidence: ['bun test tests/harnessHub.test.ts'],
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationInput, '--yes', '--json'])).code).toBe(0);

  const verified = await captureCli(['loop', 'verify', targetDir, '--input', verifyInput, '--json']);
  expect(verified.code).toBe(0);
  expect(JSON.parse(verified.stdout)).toMatchObject({
    status: 'pass',
    findings: [],
  });
});

test('loop verify rejects weak L1 and L2 evidence that previously looked complete', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-negative-'));
  initGitFixtureWithDirtyPaths(targetDir, ['src/feature.ts', 'AGENTS.md']);
  const runInput = loopTestInputPath(targetDir, 'run.json');
  const verifyInput = loopTestInputPath(targetDir, 'verify.json');
  const integrationInput = loopTestInputPath(targetDir, 'integration.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-verify-negative',
    loop: 'workflow-review',
    task: 'Reject weak loop evidence.',
    acceptanceCriteria: ['weak L1 and L2 evidence is blocked'],
  }, null, 2)}\n`);
  fs.writeFileSync(verifyInput, `${JSON.stringify({
    runId: 'run-verify-negative',
    changedPaths: ['src/feature.ts', 'AGENTS.md'],
    requiredLoops: [
      {
        loop: 'implementation-review',
        level: 'L1',
        reason: 'source path changed',
        paths: ['src/feature.ts'],
      },
      {
        loop: 'workflow-review',
        level: 'L2',
        reason: 'workflow path changed',
        paths: ['AGENTS.md'],
      },
    ],
  }, null, 2)}\n`);
  fs.writeFileSync(integrationInput, `${JSON.stringify({
    runId: 'run-verify-negative',
    summary: 'Weak evidence should not pass.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: ['implementation-review', 'workflow-review'],
    executorMode: 'main-agent-self-review',
    fallbackReason: 'Self review is not enough for L1 or L2.',
    validationStatus: 'pass',
    validationEvidence: ['deterministic smoke'],
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationInput, '--yes', '--json'])).code).toBe(0);

  const result = await captureCli(['loop', 'verify', targetDir, '--input', verifyInput, '--json']);

  expect(result.code).toBe(3);
  const findings = JSON.parse(result.stdout).findings;
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'missing-review-evidence',
    loop: 'implementation-review',
  }));
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'missing-isolated-executor',
    loop: 'workflow-review',
  }));
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'missing-arbiter-evidence',
    loop: 'workflow-review',
  }));
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'missing-multi-lens-review',
    loop: 'workflow-review',
  }));
});

test('loop verify rejects stale or downgraded required loop input', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-stale-input-'));
  initGitFixtureWithDirtyPaths(targetDir, ['AGENTS.md']);
  const runInput = loopTestInputPath(targetDir, 'run.json');
  const verifyInput = loopTestInputPath(targetDir, 'verify.json');
  const integrationInput = loopTestInputPath(targetDir, 'integration.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-stale-input',
    loop: 'workflow-review',
    task: 'Reject stale required loop input.',
    acceptanceCriteria: ['required loops are derived from changed paths'],
  }, null, 2)}\n`);
  fs.writeFileSync(verifyInput, `${JSON.stringify({
    runId: 'run-stale-input',
    changedPaths: ['AGENTS.md'],
    requiredLoops: [{
      loop: 'workflow-review',
      level: 'L1',
      reason: 'caller attempted to downgrade',
      paths: ['README.md'],
    }],
  }, null, 2)}\n`);
  fs.writeFileSync(integrationInput, `${JSON.stringify({
    runId: 'run-stale-input',
    summary: 'Even a passing integration cannot downgrade required loops.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: ['workflow-review'],
    executorMode: 'deterministic-check',
    fallbackReason: 'caller-provided',
    validationStatus: 'pass',
    validationEvidence: ['deterministic smoke'],
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationInput, '--yes', '--json'])).code).toBe(0);

  const result = await captureCli(['loop', 'verify', targetDir, '--input', verifyInput, '--json']);

  expect(result.code).toBe(3);
  const findings = JSON.parse(result.stdout).findings;
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'downgraded-required-loop-input',
    loop: 'workflow-review',
  }));
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'stale-required-loop-paths',
    loop: 'workflow-review',
  }));
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'missing-required-loop-input',
    loop: 'docs-consistency',
  }));
});

test('loop verify derives dirty paths instead of trusting fabricated changedPaths input', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-fake-paths-'));
  initGitFixtureWithDirtyPaths(targetDir, ['AGENTS.md']);
  const runInput = loopTestInputPath(targetDir, 'run.json');
  const verifyInput = loopTestInputPath(targetDir, 'verify.json');
  const integrationInput = loopTestInputPath(targetDir, 'integration.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-fake-changed-paths',
    loop: 'docs-consistency',
    task: 'Reject fabricated changed paths.',
    acceptanceCriteria: ['dirty worktree paths are the source of truth'],
  }, null, 2)}\n`);
  fs.writeFileSync(verifyInput, `${JSON.stringify({
    runId: 'run-fake-changed-paths',
    changedPaths: ['README.md'],
    requiredLoops: [{
      loop: 'docs-consistency',
      level: 'L0',
      reason: 'caller claimed docs-only change',
      paths: ['README.md'],
    }],
  }, null, 2)}\n`);
  fs.writeFileSync(integrationInput, `${JSON.stringify({
    runId: 'run-fake-changed-paths',
    summary: 'Docs-only evidence should not hide the dirty workflow path.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: ['docs-consistency'],
    executorMode: 'deterministic-check',
    fallbackReason: 'caller-provided docs smoke',
    validationStatus: 'pass',
    validationEvidence: ['deterministic docs smoke'],
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationInput, '--yes', '--json'])).code).toBe(0);

  const result = await captureCli(['loop', 'verify', targetDir, '--input', verifyInput, '--json']);

  expect(result.code).toBe(3);
  const findings = JSON.parse(result.stdout).findings;
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'missing-required-loop-input',
    loop: 'workflow-review',
  }));
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'stale-required-loop-paths',
    loop: 'docs-consistency',
  }));
});

test('loop verify derives base-head requirements instead of trusting input changedPaths', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-base-head-'));
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), '# Old contract\n');
  initGitFixture(targetDir);
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), '# New contract\n');
  execFileSync('git', ['add', 'AGENTS.md'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'change agent contract'], { cwd: targetDir, stdio: 'ignore' });

  const runInput = loopTestInputPath(targetDir, 'run.json');
  const verifyInput = loopTestInputPath(targetDir, 'verify.json');
  const integrationInput = loopTestInputPath(targetDir, 'integration.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-base-head-precedence',
    loop: 'implementation-review',
    task: 'Reject stale verify input when base/head is provided.',
    acceptanceCriteria: ['commit range is the source of truth'],
  }, null, 2)}\n`);
  fs.writeFileSync(verifyInput, `${JSON.stringify({
    runId: 'run-base-head-precedence',
    changedPaths: ['src/feature.ts'],
    requiredLoops: [{
      loop: 'implementation-review',
      level: 'L1',
      reason: 'caller claimed source-only change',
      paths: ['src/feature.ts'],
    }],
  }, null, 2)}\n`);
  fs.writeFileSync(integrationInput, `${JSON.stringify({
    runId: 'run-base-head-precedence',
    summary: 'Source-only evidence should not hide the committed workflow change.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: ['implementation-review'],
    executorMode: 'deterministic-check',
    fallbackReason: 'caller-provided source smoke',
    validationStatus: 'pass',
    validationEvidence: ['deterministic source smoke'],
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationInput, '--yes', '--json'])).code).toBe(0);

  const result = await captureCli(['loop', 'verify', targetDir, '--input', verifyInput, '--base', 'HEAD~1', '--head', 'HEAD', '--json']);

  expect(result.code).toBe(3);
  const findings = JSON.parse(result.stdout).findings;
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'missing-required-loop-input',
    loop: 'workflow-review',
  }));
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'stale-required-loop-input',
    loop: 'implementation-review',
  }));
});

test('loop verify ignores untrusted base-head refs from verification input', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-fake-range-'));
  initGitFixtureWithDirtyPaths(targetDir, ['AGENTS.md']);
  const runInput = loopTestInputPath(targetDir, 'run.json');
  const verifyInput = loopTestInputPath(targetDir, 'verify.json');
  const integrationInput = loopTestInputPath(targetDir, 'integration.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-fake-range',
    loop: 'docs-consistency',
    task: 'Reject fabricated verification ranges.',
    acceptanceCriteria: ['only CLI base/head is authoritative'],
  }, null, 2)}\n`);
  fs.writeFileSync(verifyInput, `${JSON.stringify({
    runId: 'run-fake-range',
    baseRef: 'HEAD',
    headRef: 'HEAD',
    requiredLoops: [],
  }, null, 2)}\n`);
  fs.writeFileSync(integrationInput, `${JSON.stringify({
    runId: 'run-fake-range',
    summary: 'Empty-range evidence should not hide dirty workflow paths.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: [],
    executorMode: 'deterministic-check',
    fallbackReason: 'caller-provided empty range',
    validationStatus: 'pass',
    validationEvidence: ['deterministic empty-range smoke'],
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationInput, '--yes', '--json'])).code).toBe(0);

  const result = await captureCli(['loop', 'verify', targetDir, '--input', verifyInput, '--json']);

  expect(result.code).toBe(3);
  const findings = JSON.parse(result.stdout).findings;
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'missing-loop-integration',
    loop: 'workflow-review',
  }));
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'missing-isolated-executor',
    loop: 'workflow-review',
  }));
});

test('loop verify requires passing validation status and evidence together', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-validation-'));
  initGitFixtureWithDirtyPaths(targetDir, ['src/feature.ts']);
  const runInput = loopTestInputPath(targetDir, 'run.json');
  const verifyInput = loopTestInputPath(targetDir, 'verify.json');
  const integrationInput = loopTestInputPath(targetDir, 'integration.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-validation-hardening',
    loop: 'implementation-review',
    task: 'Reject weak validation evidence.',
    acceptanceCriteria: ['validation status and command evidence are both required'],
  }, null, 2)}\n`);
  fs.writeFileSync(verifyInput, `${JSON.stringify({
    runId: 'run-validation-hardening',
    changedPaths: ['src/feature.ts'],
    requiredLoops: [{
      loop: 'implementation-review',
      level: 'L1',
      reason: 'source path changed',
      paths: ['src/feature.ts'],
    }],
  }, null, 2)}\n`);
  fs.writeFileSync(integrationInput, `${JSON.stringify({
    runId: 'run-validation-hardening',
    summary: 'Skipped validation should not pass.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: ['implementation-review'],
    executorMode: 'deterministic-check',
    fallbackReason: 'No subagent available.',
    validationStatus: 'skipped',
    validationEvidence: ['claimed smoke'],
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationInput, '--yes', '--json'])).code).toBe(0);

  const result = await captureCli(['loop', 'verify', targetDir, '--input', verifyInput, '--json']);

  expect(result.code).toBe(3);
  expect(JSON.parse(result.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'blocked-validation-evidence',
    loop: 'implementation-review',
  }));
});

test('loop verify rejects agent evidence changed after integration', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-evidence-binding-'));
  initGitFixtureWithDirtyPaths(targetDir, ['src/feature.ts']);
  const runInput = loopTestInputPath(targetDir, 'run.json');
  const verifyInput = loopTestInputPath(targetDir, 'verify.json');
  const agentWeakInput = loopTestInputPath(targetDir, 'agent-weak.json');
  const agentStrongInput = loopTestInputPath(targetDir, 'agent-strong.json');
  const integrationInput = loopTestInputPath(targetDir, 'integration.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-agent-evidence-binding',
    loop: 'implementation-review',
    task: 'Bind integration to accepted agent evidence.',
    acceptanceCriteria: ['post-integration agent rewrites are rejected'],
  }, null, 2)}\n`);
  fs.writeFileSync(verifyInput, `${JSON.stringify({
    runId: 'run-agent-evidence-binding',
    changedPaths: ['src/feature.ts'],
    requiredLoops: [{
      loop: 'implementation-review',
      level: 'L1',
      reason: 'source path changed',
      paths: ['src/feature.ts'],
    }],
  }, null, 2)}\n`);
  fs.writeFileSync(agentWeakInput, `${JSON.stringify({
    runId: 'run-agent-evidence-binding',
    agentId: 'reviewer-a',
    host: 'codex',
    role: 'implementation-review',
    status: 'running',
    readOnly: true,
  }, null, 2)}\n`);
  fs.writeFileSync(agentStrongInput, `${JSON.stringify({
    runId: 'run-agent-evidence-binding',
    agentId: 'reviewer-a',
    host: 'codex',
    role: 'implementation-review',
    status: 'completed',
    readOnly: true,
    result: { summary: 'post-integration evidence should not be accepted' },
  }, null, 2)}\n`);
  fs.writeFileSync(integrationInput, `${JSON.stringify({
    runId: 'run-agent-evidence-binding',
    summary: 'Main agent integrated the original weak state.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: ['implementation-review'],
    executorMode: 'subagent',
    agentIds: ['reviewer-a'],
    validationStatus: 'pass',
    validationEvidence: ['bun test tests/harnessHub.test.ts'],
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  expect((await captureCli(['loop', 'agent-record', targetDir, '--input', agentWeakInput, '--yes', '--json'])).code).toBe(0);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationInput, '--yes', '--json'])).code).toBe(0);
  expect((await captureCli(['loop', 'agent-record', targetDir, '--input', agentStrongInput, '--yes', '--json'])).code).toBe(0);

  const result = await captureCli(['loop', 'verify', targetDir, '--input', verifyInput, '--json']);

  expect(result.code).toBe(3);
  const findings = JSON.parse(result.stdout).findings;
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'agent-evidence-changed',
  }));
  expect(findings).toContainEqual(expect.objectContaining({
    id: 'missing-review-evidence',
    loop: 'implementation-review',
  }));
});

test('loop verify reads agent state content and hash from one snapshot', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-agent-snapshot-'));
  initGitFixtureWithDirtyPaths(targetDir, ['src/feature.ts']);
  const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', 'run-agent-snapshot');
  const agentDir = path.join(runDir, 'agents', 'reviewer-a');
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify({
    runId: 'run-agent-snapshot',
    loop: 'implementation-review',
    task: 'Read agent state as a single snapshot.',
    acceptanceCriteria: ['state content and evidence hash come from the same bytes'],
    status: 'running',
  }, null, 2)}\n`);
  const weakState = `${JSON.stringify({
    schemaVersion: 1,
    runId: 'run-agent-snapshot',
    agentId: 'reviewer-a',
    host: 'codex',
    role: 'implementation-review',
    status: 'running',
    readOnly: true,
  }, null, 2)}\n`;
  const strongState = `${JSON.stringify({
    schemaVersion: 1,
    runId: 'run-agent-snapshot',
    agentId: 'reviewer-a',
    host: 'codex',
    role: 'implementation-review',
    status: 'completed',
    readOnly: true,
    result: { summary: 'unsealed strong evidence' },
  }, null, 2)}\n`;
  const statePath = path.join(agentDir, 'state.json');
  fs.writeFileSync(statePath, weakState);
  fs.writeFileSync(path.join(runDir, 'integration.json'), `${JSON.stringify({
    schemaVersion: 1,
    runId: 'run-agent-snapshot',
    summary: 'Integration sealed weak evidence.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: ['implementation-review'],
    executorMode: 'subagent',
    agentIds: ['reviewer-a'],
    acceptedAgentEvidence: [{
      agentId: 'reviewer-a',
      sha256: crypto.createHash('sha256').update(weakState).digest('hex'),
    }],
    validationStatus: 'pass',
    validationEvidence: ['deterministic snapshot smoke'],
  }, null, 2)}\n`);

  const mutableFs = fs as unknown as { readFileSync: typeof fs.readFileSync };
  const originalReadFileSync = mutableFs.readFileSync;
  let stateReads = 0;
  mutableFs.readFileSync = ((filePath: fs.PathOrFileDescriptor, options?: BufferEncoding | { encoding?: BufferEncoding | null; flag?: string } | null) => {
    if (path.resolve(String(filePath)) === statePath) {
      stateReads += 1;
      return Buffer.from(stateReads === 1 ? strongState : weakState);
    }
    return originalReadFileSync(filePath, options as never);
  }) as typeof fs.readFileSync;
  try {
    const result = verifyLoopEvidence(targetDir, {
      runId: 'run-agent-snapshot',
      requiredLoops: [{
        loop: 'implementation-review',
        level: 'L1',
        reason: 'source path changed',
        paths: ['src/feature.ts'],
      }],
    });

    expect(result.exitCode).toBe(3);
    expect(stateReads).toBe(1);
    expect(result.findings).toContainEqual(expect.objectContaining({
      id: 'agent-evidence-changed',
    }));
  } finally {
    mutableFs.readFileSync = originalReadFileSync;
  }
});

test('loop verify requires accepted agent evidence and full L2 multi-lens arbiter evidence', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-l2-'));
  initGitFixtureWithDirtyPaths(targetDir, ['AGENTS.md']);
  const runInput = loopTestInputPath(targetDir, 'run.json');
  const verifyWeakInput = loopTestInputPath(targetDir, 'verify-weak.json');
  const verifyStrongInput = loopTestInputPath(targetDir, 'verify-strong.json');
  const integrationWeakInput = loopTestInputPath(targetDir, 'integration-weak.json');
  const integrationStrongInput = loopTestInputPath(targetDir, 'integration-strong.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-l2-evidence',
    loop: 'workflow-review',
    task: 'Verify L2 evidence.',
    acceptanceCriteria: ['L2 needs multi-lens review and arbiter agents'],
  }, null, 2)}\n`);
  const verifyPayload = {
    runId: 'run-l2-evidence',
    changedPaths: ['AGENTS.md'],
    requiredLoops: [
      {
        loop: 'workflow-review',
        level: 'L2',
        reason: 'workflow path changed',
        paths: ['AGENTS.md'],
      },
      {
        loop: 'docs-consistency',
        level: 'L1',
        reason: 'documentation path changed',
        paths: ['AGENTS.md'],
      },
    ],
  };
  fs.writeFileSync(verifyWeakInput, `${JSON.stringify(verifyPayload, null, 2)}\n`);
  fs.writeFileSync(verifyStrongInput, `${JSON.stringify(verifyPayload, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);

  const unacceptedAgent = loopTestInputPath(targetDir, 'agent-unaccepted.json');
  fs.writeFileSync(unacceptedAgent, `${JSON.stringify({
    runId: 'run-l2-evidence',
    agentId: 'reviewer-unaccepted',
    host: 'codex',
    role: 'workflow-review',
    status: 'completed',
    readOnly: true,
    result: { summary: 'not accepted by integration' },
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'agent-record', targetDir, '--input', unacceptedAgent, '--yes', '--json'])).code).toBe(0);

  fs.writeFileSync(integrationWeakInput, `${JSON.stringify({
    runId: 'run-l2-evidence',
    summary: 'Weak evidence should not satisfy L2.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: ['workflow-review', 'docs-consistency'],
    executorMode: 'subagent',
    agentIds: [],
    arbiterVerdict: 'pass',
    arbiterEvidence: ['text-only arbiter evidence is not enough'],
    validationStatus: 'pass',
    validationEvidence: ['bun test tests/harnessHub.test.ts'],
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationWeakInput, '--yes', '--json'])).code).toBe(0);
  const weakResult = await captureCli(['loop', 'verify', targetDir, '--input', verifyWeakInput, '--json']);
  expect(weakResult.code).toBe(3);
  const weakFindings = JSON.parse(weakResult.stdout).findings;
  expect(weakFindings).toContainEqual(expect.objectContaining({
    id: 'missing-review-evidence',
    loop: 'workflow-review',
  }));
  expect(weakFindings).toContainEqual(expect.objectContaining({
    id: 'missing-arbiter-evidence',
    loop: 'workflow-review',
  }));

  for (const agent of [
    { agentId: 'reviewer-a', role: 'workflow-review', result: { summary: 'workflow review lens A passed' } },
    { agentId: 'reviewer-b', role: 'reviewer', result: { summary: 'workflow review lens B passed' } },
    { agentId: 'arbiter-a', role: 'workflow-arbiter', result: { summary: 'arbiter accepted the evidence' } },
  ]) {
    const agentPath = loopTestInputPath(targetDir, `${agent.agentId}.json`);
    fs.writeFileSync(agentPath, `${JSON.stringify({
      runId: 'run-l2-evidence',
      host: 'codex',
      status: 'completed',
      readOnly: true,
      ...agent,
    }, null, 2)}\n`);
    expect((await captureCli(['loop', 'agent-record', targetDir, '--input', agentPath, '--yes', '--json'])).code).toBe(0);
  }

  fs.writeFileSync(integrationStrongInput, `${JSON.stringify({
    runId: 'run-l2-evidence',
    summary: 'Main agent accepted two review lenses and one arbiter.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: ['workflow-review', 'docs-consistency'],
    executorMode: 'subagent',
    agentIds: ['reviewer-a', 'reviewer-b', 'arbiter-a'],
    validationStatus: 'pass',
    validationEvidence: ['bun test tests/harnessHub.test.ts'],
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationStrongInput, '--yes', '--json'])).code).toBe(0);

  const strongResult = await captureCli(['loop', 'verify', targetDir, '--input', verifyStrongInput, '--json']);
  expect(strongResult.code).toBe(0);
  expect(JSON.parse(strongResult.stdout)).toMatchObject({
    status: 'pass',
    findings: [],
  });
});

test('loop verify accepts explicit user-approved L2 downgrade with deterministic fallback', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verify-l2-downgrade-'));
  initGitFixtureWithDirtyPaths(targetDir, ['AGENTS.md']);
  const runInput = loopTestInputPath(targetDir, 'run.json');
  const verifyInput = loopTestInputPath(targetDir, 'verify.json');
  const integrationInput = loopTestInputPath(targetDir, 'integration.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-l2-downgrade',
    loop: 'workflow-review',
    task: 'Allow explicit user-approved L2 downgrade.',
    acceptanceCriteria: ['downgrade approval is recorded'],
  }, null, 2)}\n`);
  fs.writeFileSync(verifyInput, `${JSON.stringify({
    runId: 'run-l2-downgrade',
    changedPaths: ['AGENTS.md'],
    requiredLoops: [
      {
        loop: 'workflow-review',
        level: 'L2',
        reason: 'workflow path changed',
        paths: ['AGENTS.md'],
      },
      {
        loop: 'docs-consistency',
        level: 'L1',
        reason: 'documentation path changed',
        paths: ['AGENTS.md'],
      },
    ],
  }, null, 2)}\n`);
  fs.writeFileSync(integrationInput, `${JSON.stringify({
    runId: 'run-l2-downgrade',
    summary: 'User approved deterministic fallback for a host without subagent support.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    loops: ['workflow-review', 'docs-consistency'],
    executorMode: 'deterministic-check',
    fallbackReason: 'Host lacks subagent support; ran deterministic local review checks.',
    downgradeApproval: 'User explicitly approved downgrading L2 subagent evidence for this run.',
    validationStatus: 'pass',
    validationEvidence: ['bun test tests/harnessHub.test.ts'],
  }, null, 2)}\n`);

  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  expect((await captureCli(['loop', 'integrate', targetDir, '--input', integrationInput, '--yes', '--json'])).code).toBe(0);

  const result = await captureCli(['loop', 'verify', targetDir, '--input', verifyInput, '--json']);

  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    status: 'pass',
    findings: [],
  });
});

test('loop orchestration records run, agent state, leases, and integration under ignored state', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-orchestration-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  const runInput = path.join(targetDir, 'run.json');
  const agentInput = path.join(targetDir, 'agent.json');
  const leaseInput = path.join(targetDir, 'lease.json');
  const integrationInput = path.join(targetDir, 'integration.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    schemaVersion: 1,
    runId: 'run-orchestration-smoke',
    loop: 'implementation-review',
    stage: 'implementation',
    task: 'Prove loop orchestration state isolation.',
    acceptanceCriteria: ['run state is local and ignored', 'main agent integration is explicit'],
  }, null, 2)}\n`);

  const run = await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json']);
  expect(run.code).toBe(0);
  const runReport = JSON.parse(run.stdout);
  expect(runReport.recorded).toBe(true);
  expect(runReport.runId).toBe('run-orchestration-smoke');
  expect(runReport.runDir.replaceAll('\\', '/').endsWith('.harness-hub/state/runs/run-orchestration-smoke')).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'runs', 'run-orchestration-smoke', 'run.json'))).toBe(true);

  fs.writeFileSync(agentInput, `${JSON.stringify({
    schemaVersion: 1,
    runId: 'run-orchestration-smoke',
    agentId: 'agent-worker-1',
    host: 'codex',
    role: 'worker',
    status: 'completed',
    readOnly: false,
    ownedPaths: ['tests/fixtures/orchestration/a.txt'],
    result: { summary: 'fixture write completed' },
  }, null, 2)}\n`);
  const agent = await captureCli(['loop', 'agent-record', targetDir, '--input', agentInput, '--yes', '--json']);
  expect(agent.code).toBe(0);
  expect(JSON.parse(agent.stdout)).toMatchObject({
    action: 'agent-record',
    recorded: true,
    agentId: 'agent-worker-1',
    status: 'completed',
  });
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'runs', 'run-orchestration-smoke', 'agents', 'agent-worker-1', 'state.json'))).toBe(true);

  fs.writeFileSync(leaseInput, `${JSON.stringify({
    schemaVersion: 1,
    runId: 'run-orchestration-smoke',
    leaseId: 'lease-worker-1',
    agentId: 'agent-worker-1',
    ownedPaths: ['tests/fixtures/orchestration/a.txt'],
  }, null, 2)}\n`);
  const lease = await captureCli(['loop', 'lease-check', targetDir, '--input', leaseInput, '--yes', '--json']);
  expect(lease.code).toBe(0);
  expect(JSON.parse(lease.stdout)).toMatchObject({
    action: 'lease-check',
    recorded: true,
    status: 'pass',
    leaseId: 'lease-worker-1',
  });

  fs.writeFileSync(integrationInput, `${JSON.stringify({
    schemaVersion: 1,
    runId: 'run-orchestration-smoke',
    summary: 'Main agent accepted the worker output.',
    verdict: 'pass',
    mainAgentDecision: 'integrate',
    agentIds: ['agent-worker-1'],
  }, null, 2)}\n`);
  const integration = await captureCli(['loop', 'integrate', targetDir, '--input', integrationInput, '--yes', '--json']);
  expect(integration.code).toBe(0);
  const integrationReport = JSON.parse(integration.stdout);
  expect(integrationReport).toMatchObject({
    action: 'integrate',
    recorded: true,
    status: 'pass',
    runId: 'run-orchestration-smoke',
  });
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'runs', 'run-orchestration-smoke', 'integration.json'))).toBe(true);
  const runLedger = fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'loop-runs.jsonl'), 'utf8');
  expect(runLedger).toContain('"event":"loop_orchestration_integrated"');
});

test('loop orchestration lease rejects overlapping and dirty-scope writes', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-lease-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  const runInput = path.join(targetDir, 'run.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-lease-smoke',
    loop: 'implementation-review',
    task: 'Check write lease safety.',
    acceptanceCriteria: ['overlapping leases are blocked'],
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);

  const leaseA = path.join(targetDir, 'lease-a.json');
  fs.writeFileSync(leaseA, `${JSON.stringify({
    runId: 'run-lease-smoke',
    leaseId: 'lease-a',
    agentId: 'agent-a',
    ownedPaths: ['src/a.ts'],
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'lease-check', targetDir, '--input', leaseA, '--yes', '--json'])).code).toBe(0);

  const overlap = path.join(targetDir, 'lease-overlap.json');
  fs.writeFileSync(overlap, `${JSON.stringify({
    runId: 'run-lease-smoke',
    leaseId: 'lease-overlap',
    agentId: 'agent-b',
    ownedPaths: ['src'],
  }, null, 2)}\n`);
  const overlapResult = await captureCli(['loop', 'lease-check', targetDir, '--input', overlap, '--json']);
  expect(overlapResult.code).toBe(3);
  expect(JSON.parse(overlapResult.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'overlapping-lease',
  }));

  const dirtyScope = path.join(targetDir, 'lease-dirty.json');
  fs.writeFileSync(dirtyScope, `${JSON.stringify({
    runId: 'run-lease-smoke',
    leaseId: 'lease-dirty',
    agentId: 'agent-a',
    ownedPaths: ['src/a.ts'],
    changedPaths: ['src/b.ts'],
  }, null, 2)}\n`);
  const dirtyResult = await captureCli(['loop', 'lease-check', targetDir, '--input', dirtyScope, '--json']);
  expect(dirtyResult.code).toBe(3);
  expect(JSON.parse(dirtyResult.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'dirty-scope',
  }));
});

test('loop orchestration lease fails closed on corrupt leases and case-insensitive overlaps', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-lease-hardening-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  const runInput = path.join(targetDir, 'run.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-lease-hardening',
    loop: 'implementation-review',
    task: 'Check hardened lease safety.',
    acceptanceCriteria: ['corrupt lease state blocks', 'case-insensitive paths overlap'],
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);

  const leaseDir = path.join(targetDir, '.harness-hub', 'state', 'runs', 'run-lease-hardening', 'leases');
  fs.mkdirSync(leaseDir, { recursive: true });
  fs.writeFileSync(path.join(leaseDir, 'corrupt.json'), '{not-json');
  const blockedByCorrupt = path.join(targetDir, 'blocked-by-corrupt.json');
  fs.writeFileSync(blockedByCorrupt, `${JSON.stringify({
    runId: 'run-lease-hardening',
    leaseId: 'blocked-by-corrupt',
    agentId: 'agent-b',
    ownedPaths: ['src/b.ts'],
  }, null, 2)}\n`);
  const corruptResult = await captureCli(['loop', 'lease-check', targetDir, '--input', blockedByCorrupt, '--yes', '--json']);
  expect(corruptResult.code).toBe(3);
  expect(JSON.parse(corruptResult.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'invalid-lease-state',
  }));
  fs.rmSync(path.join(leaseDir, 'corrupt.json'), { force: true });

  fs.writeFileSync(path.join(leaseDir, 'invalid-path.json'), `${JSON.stringify({
    leaseId: 'lease-invalid-path',
    agentId: 'agent-invalid',
    status: 'active',
    ownedPaths: ['src/../src/a.ts'],
  }, null, 2)}\n`);
  const blockedByInvalidState = path.join(targetDir, 'blocked-by-invalid-state.json');
  fs.writeFileSync(blockedByInvalidState, `${JSON.stringify({
    runId: 'run-lease-hardening',
    leaseId: 'blocked-by-invalid-state',
    agentId: 'agent-invalid-request',
    ownedPaths: ['src/c.ts'],
  }, null, 2)}\n`);
  const invalidStateResult = await captureCli(['loop', 'lease-check', targetDir, '--input', blockedByInvalidState, '--yes', '--json']);
  expect(invalidStateResult.code).toBe(3);
  expect(JSON.parse(invalidStateResult.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'invalid-lease-state',
  }));
  fs.rmSync(path.join(leaseDir, 'invalid-path.json'), { force: true });

  const leaseA = path.join(targetDir, 'lease-src.json');
  fs.writeFileSync(leaseA, `${JSON.stringify({
    runId: 'run-lease-hardening',
    leaseId: 'lease-src',
    agentId: 'agent-a',
    ownedPaths: ['src'],
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'lease-check', targetDir, '--input', leaseA, '--yes', '--json'])).code).toBe(0);

  const reusedLeaseId = path.join(targetDir, 'lease-reuse.json');
  fs.writeFileSync(reusedLeaseId, `${JSON.stringify({
    runId: 'run-lease-hardening',
    leaseId: 'lease-src',
    agentId: 'agent-b',
    ownedPaths: ['docs'],
  }, null, 2)}\n`);
  const reusedLeaseResult = await captureCli(['loop', 'lease-check', targetDir, '--input', reusedLeaseId, '--yes', '--json']);
  expect(reusedLeaseResult.code).toBe(3);
  expect(JSON.parse(reusedLeaseResult.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'duplicate-active-lease',
  }));

  const caseOverlap = path.join(targetDir, 'lease-case-overlap.json');
  fs.writeFileSync(caseOverlap, `${JSON.stringify({
    runId: 'run-lease-hardening',
    leaseId: 'lease-case-overlap',
    agentId: 'agent-c',
    ownedPaths: ['SRC/file.ts'],
  }, null, 2)}\n`);
  const overlapResult = await captureCli(['loop', 'lease-check', targetDir, '--input', caseOverlap, '--json']);
  expect(overlapResult.code).toBe(3);
  expect(JSON.parse(overlapResult.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'overlapping-lease',
  }));
});

test('loop orchestration lease checks git staged and untracked dirty scope', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-git-lease-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Harness Test'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['add', '.'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: targetDir, stdio: 'ignore' });
  const runInput = path.join(targetDir, 'run.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-git-lease-smoke',
    loop: 'implementation-review',
    task: 'Check git dirty scope.',
    acceptanceCriteria: ['git status dirty scope is enforced'],
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);
  fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'src', 'b.ts'), 'export const b = 1;\n');

  const leaseInput = path.join(targetDir, 'lease-git.json');
  fs.writeFileSync(leaseInput, `${JSON.stringify({
    runId: 'run-git-lease-smoke',
    leaseId: 'lease-git',
    agentId: 'agent-git',
    ownedPaths: ['src/a.ts'],
    checkGitDiff: true,
  }, null, 2)}\n`);
  const untracked = await captureCli(['loop', 'lease-check', targetDir, '--input', leaseInput, '--json']);
  expect(untracked.code).toBe(3);
  expect(JSON.parse(untracked.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'dirty-scope',
    path: 'src/b.ts',
  }));

  execFileSync('git', ['add', 'src/b.ts'], { cwd: targetDir, stdio: 'ignore' });
  const staged = await captureCli(['loop', 'lease-check', targetDir, '--input', leaseInput, '--json']);
  expect(staged.code).toBe(3);
  expect(JSON.parse(staged.stdout).findings).toContainEqual(expect.objectContaining({
    id: 'dirty-scope',
    path: 'src/b.ts',
  }));
});

test('loop trace collection extracts Codex and Claude Code subagent evidence', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-trace-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  const runInput = path.join(targetDir, 'run.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-trace-smoke',
    loop: 'implementation-review',
    task: 'Collect host traces.',
    acceptanceCriteria: ['host trace is linked to agent state'],
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);

  const codexRoot = path.join(targetDir, 'codex-root');
  const codexSessionDir = path.join(codexRoot, 'sessions', '2026', '07', '02');
  fs.mkdirSync(codexSessionDir, { recursive: true });
  const codexTracePath = path.join(codexSessionDir, 'rollout-2026-07-02T15-59-16-agent-codex-1.jsonl');
  fs.writeFileSync(codexTracePath, [
    JSON.stringify({
      type: 'session_meta',
      payload: {
        id: 'agent-codex-1',
        parent_thread_id: 'parent-thread',
        thread_source: 'subagent',
        agent_role: 'explorer',
        agent_nickname: 'Tracer',
        source: { subagent: { thread_spawn: { agent_role: 'explorer', agent_nickname: 'Tracer' } } },
      },
    }),
    JSON.stringify({
      type: 'event_msg',
      payload: {
        type: 'task_complete',
        duration_ms: 1234,
        last_agent_message: 'codex done',
      },
    }),
  ].join('\n'));
  const codexInput = path.join(targetDir, 'codex-trace.json');
  fs.writeFileSync(codexInput, `${JSON.stringify({
    runId: 'run-trace-smoke',
    agentId: 'agent-codex-1',
    host: 'codex',
    codexRoot,
  }, null, 2)}\n`);
  const codexResult = await captureCli(['loop', 'collect-trace', targetDir, '--input', codexInput, '--yes', '--json']);
  expect(codexResult.code).toBe(0);
  expect(JSON.parse(codexResult.stdout)).toMatchObject({
    action: 'collect-trace',
    status: 'completed',
    trace: {
      source: 'codex-session-jsonl',
      parentThreadId: 'parent-thread',
      role: 'explorer',
      finalMessage: 'codex done',
    },
  });

  const claudeTracePath = path.join(targetDir, 'claude-trace.jsonl');
  fs.writeFileSync(claudeTracePath, [
    JSON.stringify({ type: 'system', subtype: 'task_started', subagent_type: 'reviewer', isSidechain: true, session_id: 'claude-session-1' }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'claude done' }] } }),
    JSON.stringify({ type: 'result', duration_ms: 4321, toolStats: { Read: 2 } }),
  ].join('\n'));
  const claudeInput = path.join(targetDir, 'claude-trace.json');
  fs.writeFileSync(claudeInput, `${JSON.stringify({
    runId: 'run-trace-smoke',
    agentId: 'agent-claude-1',
    host: 'claude-code',
    tracePath: claudeTracePath,
  }, null, 2)}\n`);
  const claudeResult = await captureCli(['loop', 'collect-trace', targetDir, '--input', claudeInput, '--yes', '--json']);
  expect(claudeResult.code).toBe(0);
  expect(JSON.parse(claudeResult.stdout)).toMatchObject({
    action: 'collect-trace',
    status: 'completed',
    trace: {
      source: 'claude-stream-json',
      sessionId: 'claude-session-1',
      role: 'reviewer',
      finalMessage: 'claude done',
    },
  });
});

test('loop trace collection rejects mismatched or non-subagent traces', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-trace-negative-'));
  applyHarnessInit(planHarnessInit({ targetDir }));
  const runInput = path.join(targetDir, 'run.json');
  fs.writeFileSync(runInput, `${JSON.stringify({
    runId: 'run-trace-negative',
    loop: 'implementation-review',
    task: 'Reject incorrect host traces.',
    acceptanceCriteria: ['trace belongs to the target subagent'],
  }, null, 2)}\n`);
  expect((await captureCli(['loop', 'run-start', targetDir, '--input', runInput, '--yes', '--json'])).code).toBe(0);

  const codexRoot = path.join(targetDir, 'codex-root');
  const codexSessionDir = path.join(codexRoot, 'sessions', '2026', '07', '02');
  fs.mkdirSync(codexSessionDir, { recursive: true });
  fs.writeFileSync(path.join(codexSessionDir, 'rollout-agent-codex-expected.jsonl'), [
    JSON.stringify({
      type: 'session_meta',
      payload: {
        id: 'agent-codex-other',
        thread_source: 'subagent',
        source: { subagent: { thread_spawn: { agent_role: 'explorer' } } },
      },
    }),
    JSON.stringify({ type: 'event_msg', payload: { type: 'task_complete', last_agent_message: 'wrong agent' } }),
  ].join('\n'));
  const codexInput = path.join(targetDir, 'codex-negative.json');
  fs.writeFileSync(codexInput, `${JSON.stringify({
    runId: 'run-trace-negative',
    agentId: 'agent-codex-expected',
    host: 'codex',
    codexRoot,
  }, null, 2)}\n`);
  const codexResult = await captureCli(['loop', 'collect-trace', targetDir, '--input', codexInput, '--json']);
  expect(codexResult.code).toBe(3);
  expect(codexResult.stderr).toContain('No Codex trace found');

  const claudeTracePath = path.join(targetDir, 'claude-main-session.jsonl');
  fs.writeFileSync(claudeTracePath, [
    JSON.stringify({ type: 'system', session_id: 'claude-main' }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'main session done' }] } }),
    JSON.stringify({ type: 'result', duration_ms: 1 }),
  ].join('\n'));
  const claudeInput = path.join(targetDir, 'claude-negative.json');
  fs.writeFileSync(claudeInput, `${JSON.stringify({
    runId: 'run-trace-negative',
    agentId: 'agent-claude-expected',
    host: 'claude-code',
    tracePath: claudeTracePath,
  }, null, 2)}\n`);
  const claudeResult = await captureCli(['loop', 'collect-trace', targetDir, '--input', claudeInput, '--json']);
  expect(claudeResult.code).toBe(3);
  expect(claudeResult.stderr).toContain('No Claude Code trace found');
});

test('activate-agents CLI requires confirmation and supports json output', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-agent-activate-cli-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));

  const blocked = await captureCli(['activate-agents', targetDir]);
  const dryRun = await captureCli(['activate-agents', targetDir, '--dry-run', '--json']);
  const confirmed = await captureCli(['activate-agents', targetDir, '--yes', '--json']);

  expect(blocked.code).toBe(2);
  expect(blocked.stderr).toContain('--yes');
  expect(dryRun.code).toBe(0);
  expect(JSON.parse(dryRun.stdout).dryRun).toBe(true);
  expect(confirmed.code).toBe(0);
  expect(JSON.parse(confirmed.stdout).synced.length).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'package-release-sniffer', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'package-release-sniffer', 'SKILL.md'))).toBe(true);
});

test('activate-codex remains a compatibility alias for agent activation', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-agent-activate-alias-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));

  const result = await captureCli(['activate-codex', targetDir, '--yes', '--json']);

  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).synced.length).toBeGreaterThan(0);
  expect(fs.existsSync(path.join(targetDir, '.codex', 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.claude', 'skills', 'workflow-router', 'SKILL.md'))).toBe(true);
});

test('status supports json, html stdout, and explicit output', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-status-cli-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  applyInstall(plan);
  const output = path.join(os.tmpdir(), `harness-hub-status-${Date.now()}.html`);

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
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-remove-confirm-'));
  const result = await captureCli(['remove', targetDir]);

  expect(result.code).toBe(2);
  expect(result.stdout).toContain('--yes');
});

test('update command supports dry-run json output', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-update-cli-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  applyInstall(plan);

  const result = await captureCli(['update', targetDir, '--dry-run', '--json']);

  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).updates).toEqual([]);
});

test('check reports cli package status and target status separately', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-current-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));

  const result = await checkHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    latestVersionResolver: async (packageName, registryBaseUrl) => ({
      ok: true,
      latestVersion: '1.0.1',
      registryUrl: `${registryBaseUrl}/${encodeURIComponent(packageName)}/latest`,
      reason: 'test registry response',
    }),
  });

  expect(result.exitCode).toBe(0);
  expect(result.cli.state).toBe('update-available');
  expect(result.cli.currentVersion).toBe('1.0.0');
  expect(result.cli.latestVersion).toBe('1.0.1');
  expect(result.cli.recommendedCommand).toContain('bun run build');
  expect(result.target.state).toBe('current');
  expect(result.target.current.length).toBeGreaterThan(0);
  expect(result.target.updates).toEqual([]);
});

test('check recommends project-local agent activation when installed skills are not visible to agent hosts', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-agent-activation-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));

  const beforeActivation = await checkHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });
  activateAgents({ targetDir });
  const afterActivation = await checkHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });

  expect(beforeActivation.target.state).toBe('current');
  expect(beforeActivation.target.recommendedCommand).toContain('activate-agents');
  expect(beforeActivation.target.message).toContain('agent skill activation is missing');
  expect(beforeActivation.target.evidence).toContain('.claude/skills/workflow-router/SKILL.md');
  expect(afterActivation.target.state).toBe('current');
  expect(afterActivation.target.recommendedCommand).toBe(null);
});

test('check reports external tool installation suggestions without side effects', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-external-tools-'));
  const before = snapshotDirectory(targetDir);

  const result = await checkHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    pathEnv: '',
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });

  const codegraph = result.externalTools.find((tool) => tool.id === 'codegraph');
  const headroom = result.externalTools.find((tool) => tool.id === 'headroom');

  expect(result.exitCode).toBe(0);
  expect(result.reason).toContain('External tools');
  expect(codegraph?.state).toBe('recommended');
  expect(codegraph?.recommendedCommands).toContain('npm install -g @colbymchenry/codegraph');
  expect(headroom?.state).toBe('recommended');
  expect(headroom?.recommendedCommands).toContain('pipx install --python python3.13 "headroom-ai[all]"');
  expect(snapshotDirectory(targetDir)).toEqual(before);
});

test('check detects explicit external tool host and target configuration evidence', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-external-config-'));
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-fake-bin-'));
  fs.mkdirSync(path.join(targetDir, '.codegraph'));
  writeFakePathCommand(binDir, 'codegraph');
  writeFakePathCommand(binDir, 'headroom');

  const result = await checkHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    pathEnv: binDir,
    env: {
      PATH: binDir,
      HEADROOM_BASE_URL: 'http://127.0.0.1:8787',
    },
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });

  const codegraph = result.externalTools.find((tool) => tool.id === 'codegraph');
  const headroom = result.externalTools.find((tool) => tool.id === 'headroom');

  expect(codegraph?.state).toBe('configured');
  expect(codegraph?.installed).toBe(true);
  expect(codegraph?.targetInitialized).toBe(true);
  expect(codegraph?.evidence).toContain('.codegraph');
  expect(headroom?.state).toBe('configured');
  expect(headroom?.installed).toBe(true);
  expect(headroom?.evidence).toContain('env:HEADROOM_BASE_URL');
});

test('check reports target managed component updates without applying them', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-target-update-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));
  makeLockComponentStale(targetDir, 'skill:grill-me');
  const before = fs.readFileSync(path.join(targetDir, '.harness-hub', 'lock.json'), 'utf8');

  const result = await checkHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });

  expect(result.exitCode).toBe(0);
  expect(result.cli.state).toBe('current');
  expect(result.target.state).toBe('update-available');
  expect(result.target.updates.map((row) => row.id)).toContain('skill:grill-me');
  expect(result.target.recommendedCommand).toContain('update');
  expect(result.target.recommendedCommand).toContain('--dry-run');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'lock.json'), 'utf8')).toBe(before);
});

test('check is non-blocking when registry is unavailable and target is not managed', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-unavailable-'));

  const result = await checkHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    latestVersionResolver: async () => {
      throw new Error('offline');
    },
  });

  expect(result.exitCode).toBe(0);
  expect(result.cli.state).toBe('unavailable');
  expect(result.cli.message).toContain('offline');
  expect(result.target.state).toBe('not-managed');
  expect(result.target.recommendedCommand).toContain('init-harness');
});

test('check detects legacy Codex aggregation and recommends standard harness migration', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-legacy-aggregation-'));
  const aggregationDir = path.join(targetDir, '.codex');
  fs.mkdirSync(aggregationDir, { recursive: true });
  fs.mkdirSync(path.join(targetDir, '.codex', 'skills', 'insight'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.codex', 'skills', 'insight', 'SKILL.md'), 'legacy insight');
  fs.mkdirSync(path.join(targetDir, '.codex', 'skills', 'workflow-router'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.codex', 'skills', 'workflow-router', 'SKILL.md'), 'legacy workflow router');
  fs.writeFileSync(path.join(aggregationDir, 'harness-hub-aggregation.json'), JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-06-26T03:32:48.496Z',
    source: {
      path: 'D:/harness-hub',
      commit: '8ac264bed8a06fc6bf954a88ad92330e13e63e03',
    },
  }));

  const result = await checkHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });

  expect(result.exitCode).toBe(0);
  expect(result.target.state).toBe('not-managed');
  expect(result.target.message).toContain('legacy Codex aggregation');
  expect(result.target.message).toContain('managed skills');
  expect(result.target.message).toContain('harness state');
  expect(result.target.message).toContain('context pack');
  expect(result.target.message).toContain('Loop policy assets');
  expect(result.target.message).toContain('Host-local-only skill cache examples');
  expect(result.target.message).toContain('Stale host cache examples');
  expect(result.target.message).toContain('init-harness --yes --force');
  expect(result.target.recommendedCommand).toContain('--target standard --dry-run --json');
  expect(result.target.evidence).toContain('.codex/harness-hub-aggregation.json');
  expect(result.target.evidence).toContain('sourceCommit:8ac264bed8a06fc6bf954a88ad92330e13e63e03');
  expect(result.target.evidence.some((item) => item.startsWith('missingStandard:'))).toBe(true);
  expect(result.target.evidence).toContain('hostLocalOnly:skills/insight/SKILL.md via .codex/skills/insight/SKILL.md');
  expect(result.target.evidence).toContain('staleHostCache:.codex/skills/workflow-router/references/agentic-loops.md');
});

test('check detects legacy targets that have old sentinels but miss other standard files', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-legacy-partial-'));
  fs.mkdirSync(path.join(targetDir, '.codex'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.codex', 'harness-hub-aggregation.json'), JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-06-26T03:32:48.496Z',
    source: {
      path: 'D:/harness-hub',
      commit: '8ac264bed8a06fc6bf954a88ad92330e13e63e03',
    },
  }));
  for (const relativePath of [
    'skills/workflow-router/SKILL.md',
    'skills/workflow-router/references/agentic-loops.md',
    'skills/workflow-router/scripts/agentic-loop-check.mjs',
    'skills/insight/SKILL.md',
    'skills/effective-interact/SKILL.md',
    'AGENTS.md',
    'CLAUDE.md',
    'evaluator-rubric.md',
    'quality-document.md',
    '.harness-hub/state/current-task.md',
    '.harness-hub/state/loop-runs.jsonl',
    '.harness-hub/context/wiki/index.md',
    '.harness-hub/loop/policies/interrupt-policy.md',
  ]) {
    const filePath = path.join(targetDir, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'legacy sentinel');
  }

  const result = await checkHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });

  expect(result.target.message).toContain('Missing current standard distribution areas');
  expect(result.target.message).not.toContain('did not find obvious missing files');
  expect(result.target.evidence.some((item) => item === 'missingStandard:feature_list.json')).toBe(true);
});

test('check bounds and sanitizes legacy aggregation metadata', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-legacy-sanitize-'));
  fs.mkdirSync(path.join(targetDir, '.codex'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.codex', 'harness-hub-aggregation.json'), JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-06-26T03:32:48.496Z\n\u001b[31m',
    source: {
      path: 'D:/harness-hub\nsecond-line',
      commit: '8ac264bed8a06fc6bf954a88ad92330e13e63e03\r\ntrailing',
    },
  }));

  const result = await checkHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });

  expect(result.target.message).not.toContain('\nsecond-line');
  expect(result.target.message).not.toContain('\u001b');
  expect(result.target.evidence).toContain('sourceCommit:8ac264bed8a06fc6bf954a88ad92330e13e63e03 trailing');

  const oversizedTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-legacy-oversized-'));
  fs.mkdirSync(path.join(oversizedTarget, '.codex'), { recursive: true });
  fs.writeFileSync(path.join(oversizedTarget, '.codex', 'harness-hub-aggregation.json'), 'x'.repeat(300 * 1024));
  const oversized = await checkHarnessHub({
    targetDir: oversizedTarget,
    currentVersion: '1.0.0',
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });

  expect(oversized.target.state).toBe('not-managed');
  expect(oversized.target.message).toContain('legacy Codex aggregation');
  expect(oversized.target.evidence.some((item) => item.startsWith('sourceCommit:'))).toBe(false);
});

test('check command emits split json and exits zero', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ version: '99.0.0' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
  try {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-check-cli-'));
    const result = await captureCli(['check', targetDir, '--json']);
    const report = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(report.cli.latestVersion).toBe('99.0.0');
    expect(report.cli.state).toBe('update-available');
    expect(report.target.state).toBe('not-managed');
    expect(report.externalTools.map((tool: { id: string }) => tool.id)).toEqual(['codegraph', 'headroom']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('self-check treats the Harness Hub source checkout as advisory when no target harness lock exists', async () => {
  const result = await selfCheckHarnessHub({
    targetDir: process.cwd(),
    currentVersion: '1.0.0',
    pathEnv: '',
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });

  expect(result.exitCode).toBe(0);
  expect(result.harnessValidation.state).toBe('skipped');
  expect(result.harnessValidation.attempted).toBe(false);
  expect(result.hardFailures).toEqual([]);
  expect(result.advisories.map((finding) => finding.id)).toContain('harness-validation.skipped');
});

test('self-check skips strict harness validation for uninitialized targets by default without writing files', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ version: '1.0.0' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
  try {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-self-check-uninitialized-'));
    const before = snapshotDirectory(targetDir);
    const result = await captureCli(['self-check', targetDir, '--json']);
    const report = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(report.exitCode).toBe(0);
    expect(report.check.target.state).toBe('not-managed');
    expect(report.harnessValidation.state).toBe('skipped');
    expect(report.harnessValidation.validation).toBeNull();
    expect(report.hardFailures).toEqual([]);
    expect(report.advisories.map((finding: { id: string }) => finding.id)).toEqual(expect.arrayContaining([
      'target.not-managed',
      'harness-validation.skipped',
    ]));
    expect(snapshotDirectory(targetDir)).toEqual(before);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('self-check surfaces legacy aggregation migration guidance as an advisory', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-self-check-legacy-aggregation-'));
  fs.mkdirSync(path.join(targetDir, '.codex'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, '.codex', 'skills', 'insight'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.codex', 'skills', 'insight', 'SKILL.md'), 'legacy insight');
  fs.mkdirSync(path.join(targetDir, '.codex', 'skills', 'workflow-router'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.codex', 'skills', 'workflow-router', 'SKILL.md'), 'legacy workflow router');
  fs.writeFileSync(path.join(targetDir, '.codex', 'harness-hub-aggregation.json'), JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-06-26T03:32:48.496Z',
    source: {
      path: 'D:/harness-hub',
      commit: '8ac264bed8a06fc6bf954a88ad92330e13e63e03',
    },
  }));

  const result = await selfCheckHarnessHub({
    targetDir,
    currentVersion: '1.0.0',
    latestVersionResolver: async () => ({
      ok: true,
      latestVersion: '1.0.0',
      registryUrl: 'https://registry.test/@jasonwen%2Fharness-hub/latest',
      reason: 'test registry response',
    }),
  });
  const notManaged = result.advisories.find((finding) => finding.id === 'target.not-managed');

  expect(result.exitCode).toBe(0);
  expect(notManaged?.message).toContain('legacy Codex aggregation');
  expect(notManaged?.message).toContain('managed skills');
  expect(notManaged?.message).toContain('context pack');
  expect(notManaged?.evidence).toContain('hostLocalOnly:skills/insight/SKILL.md via .codex/skills/insight/SKILL.md');
  expect(notManaged?.recommendedCommand).toContain('--target standard --dry-run --json');
});

test('self-check runs harness validation automatically for initialized harness targets', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ version: '1.0.0' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
  try {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-self-check-initialized-'));
    applyHarnessInit(planHarnessInit({ targetDir }));
    const result = await captureCli(['self-check', targetDir, '--json']);
    const report = JSON.parse(result.stdout);

    expect(result.code).toBe(0);
    expect(report.exitCode).toBe(0);
    expect(report.check.target.state).toBe('current');
    expect(report.harnessValidation.state).toBe('pass');
    expect(report.harnessValidation.attempted).toBe(true);
    expect(report.harnessValidation.initialized).toBe(true);
    expect(report.harnessValidation.validation.exitCode).toBe(0);
    expect(report.hardFailures).toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('self-check returns a hard failure when strict harness validation is requested for an uninitialized target', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ version: '1.0.0' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
  try {
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-self-check-strict-'));
    const result = await captureCli(['self-check', targetDir, '--validate-harness', '--json']);
    const report = JSON.parse(result.stdout);

    expect(result.code).toBe(1);
    expect(report.exitCode).toBe(1);
    expect(report.harnessValidation.state).toBe('fail');
    expect(report.harnessValidation.strict).toBe(true);
    expect(report.harnessValidation.validation.exitCode).toBe(3);
    expect(report.hardFailures.map((finding: { id: string }) => finding.id)).toContain('harness-validation.failed');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function initGitFixture(targetDir: string): void {
  execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Harness Test'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['add', '.'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: targetDir, stdio: 'ignore' });
}

function loopTestInputPath(targetDir: string, fileName: string): string {
  const inputDir = path.join(targetDir, '.harness-hub', 'state', 'test-inputs');
  fs.mkdirSync(inputDir, { recursive: true });
  return path.join(inputDir, fileName);
}

function writeDirtyPath(targetDir: string, relativePath: string, content = 'changed\n'): void {
  const filePath = path.join(targetDir, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function initGitFixtureWithDirtyPaths(targetDir: string, dirtyPaths: string[]): void {
  fs.writeFileSync(path.join(targetDir, '.baseline'), 'baseline\n');
  initGitFixture(targetDir);
  for (const dirtyPath of dirtyPaths) {
    writeDirtyPath(targetDir, dirtyPath);
  }
}

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

function writeFakePathCommand(binDir: string, name: string): void {
  fs.mkdirSync(binDir, { recursive: true });
  const shellPath = path.join(binDir, name);
  fs.writeFileSync(shellPath, '#!/bin/sh\nexit 0\n');
  fs.chmodSync(shellPath, 0o755);
  fs.writeFileSync(path.join(binDir, `${name}.CMD`), '@echo off\r\nexit /b 0\r\n');
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

function mutateLock(targetDir: string, mutate: (lock: HarnessHubLock) => void): void {
  const lockPath = path.join(targetDir, '.harness-hub', 'lock.json');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as HarnessHubLock;
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
  const skillDir = path.join(targetDir, 'skills', 'html-work-reports');
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), legacyContent);
  fs.writeFileSync(path.join(skillDir, 'asset.txt'), legacyAsset);
  fs.mkdirSync(path.join(targetDir, '.harness-hub'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'lock.json'), `${JSON.stringify({
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    hubVersion: '0.1.4',
    agents: ['standard'],
    components: [
      {
        id: 'skill:html-work-reports',
        version: '0.1.0',
        agent: 'standard',
        kind: 'skill',
        source: 'skills/html-work-reports',
        dest: 'skills/html-work-reports',
        files: [
          {
            path: 'skills/html-work-reports/SKILL.md',
            sha256: hashContent(legacyContent),
            size: Buffer.byteLength(legacyContent),
          },
          {
            path: 'skills/html-work-reports/asset.txt',
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
  const source = path.join(process.cwd(), 'skills', 'grill-me');
  const dest = path.join(targetDir, 'skills', 'grill-me');
  fs.cpSync(source, dest, { recursive: true });
  if (!options.exact) {
    fs.appendFileSync(path.join(dest, 'SKILL.md'), '\ndivergent');
  }
  fs.mkdirSync(path.join(targetDir, '.harness-hub'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'lock.json'), `${JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    hubVersion: '0.1.0',
    agents: ['standard'],
    components: [
      {
        id: 'skill:grill-me',
        version: readCapabilityIndex().components['skill:grill-me'].version,
        agent: 'standard',
        dest: 'skills/grill-me',
        status: 'installed',
      },
    ],
  }, null, 2)}\n`);
  return targetDir;
}
