import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

import {
  applyDevBootstrap,
  getStatus,
  planDevBootstrap,
  readCapabilityIndex,
  readLock,
  runCli,
  validateHarness,
} from '../src/harnessHub';

const REQUIRED_HARNESS_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
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
  'clean-state-checklist.md',
  'definition-of-done.md',
  'evaluator-rubric.md',
  'quality-document.md',
  'scripts/harness-validate.mjs',
] as const;

const FORBIDDEN_TARGET_ROOT_ARTIFACTS = [
  '.claude-plugin',
  'openspec',
  'README.md',
  'README.zh-CN.md',
  'BOOTSTRAP-TARGET.md',
  'CHANGELOG.md',
  'package.json',
  'docs',
  'config',
  'capabilities',
  'harness',
  'src',
  'tests',
  'site',
] as const;

test('dev bootstrap dry run plans skills plus agent harness without writing files', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-plan-'));

  const plan = planDevBootstrap({ targetDir, agents: ['standard'] });
  const cli = await captureCli(['init-harness', targetDir, '--target', 'standard', '--dry-run', '--json']);

  expect(plan.install.items.some((item) => item.componentId === 'skill:workflow-router')).toBe(true);
  expect(plan.harnessFiles.map((file) => file.relativePath).sort()).toEqual([...REQUIRED_HARNESS_FILES].sort());
  expect(plan.harnessFiles.every((file) => file.exists === false)).toBe(true);
  expect(plan.blockers).toEqual([]);
  expect(cli.code).toBe(0);
  const dryRun = JSON.parse(cli.stdout);
  const plannedHarnessFiles = dryRun.harnessFiles.map((file: { relativePath: string }) => file.relativePath);
  expect(plannedHarnessFiles.sort()).toEqual([...REQUIRED_HARNESS_FILES].sort());
  for (const relativePath of FORBIDDEN_TARGET_ROOT_ARTIFACTS) {
    expect(plannedHarnessFiles).not.toContain(relativePath);
  }
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(false);
});

test('confirmed dev bootstrap writes minimal agent harness and managed ownership', async () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-apply-'));

  const result = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });

  expect(result.exitCode).toBe(0);
  expect(result.installed.length).toBeGreaterThan(0);
  for (const relativePath of REQUIRED_HARNESS_FILES) {
    expect(fs.existsSync(path.join(targetDir, relativePath))).toBe(true);
  }
  expectForbiddenTargetRootArtifactsAbsent(targetDir);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'openspec-explore', 'SKILL.md'))).toBe(true);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('Codex');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('Claude Code');
  expect(fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8')).toBe(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8'));
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('do not copy `.claude-plugin/`, root `openspec/`, `docs/`, `config/`, `package.json`');
  expectInstalledTargetFilesDoNotContain(targetDir, [
    'docs/agentic-loop-catalog.md',
    'docs/host-adapters/',
  ]);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'insight', 'SKILL.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'skills', 'hub-maintenance-workflow', 'SKILL.md'))).toBe(false);
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', '.gitignore'), 'utf8')).toContain('state/');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', '.gitignore'), 'utf8')).toContain('reports/');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('Allowed paths');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('Checkpoint policy');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('Spec updates');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('Decision log');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('Parallel writes');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('Agentic loops');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('skills/workflow-router/references/agentic-loops.md');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('docs-consistency');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('process-retro');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('active agent task');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).not.toContain('active Codex goal');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).not.toContain('source record / eval case');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('maxIterations');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('Stop condition');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('P0');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('P1');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('P2');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('Web browser acceptance');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'utf8')).toContain('agent-run browser');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'decisions.md'), 'utf8')).toContain('Rationale');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'utf8')).toContain('Validation Records');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'utf8')).toContain('Passed');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'utf8')).toContain('Web browser acceptance');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'utf8')).toContain('PR Status');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'utf8')).toContain('Agentic Loop Records');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'utf8')).toContain('Stop condition');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'utf8')).toContain('Finish Closeout');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'utf8')).toContain('Insight Recommendations');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'utf8')).toContain('Failed');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'utf8')).toContain('Web browser acceptance');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'utf8')).toContain('PR Status');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'utf8')).toContain('Agentic Loop Records');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'utf8')).toContain('Stop condition');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'utf8')).toContain('Finish Closeout');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'utf8')).toContain('Insight Recommendations');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('Initialization Gate');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('Loop Control Plane');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('LLM Wiki');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('Interrupt Policy');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('checkpoint commit');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('P0/P1/P2');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('agent-run browser');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('PR status');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('agentic loops');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('project rule, validation case, documentation, automation check, or follow-up task');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).not.toContain('whether this workflow should become a skill, source record, eval case');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('delegated-agent');
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('Arbiters are read-only');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('feature_state_policy');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('validation_priority_policy');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('web_acceptance_policy');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('pr_closeout_policy');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('finish_closeout_policy');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('agentic_loop_policy');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('docs-consistency');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('maxIterations');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('stopCondition');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('loop_control_policy');
  expect(fs.readFileSync(path.join(targetDir, 'feature_list.json'), 'utf8')).toContain('context_engineering_policy');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'context', 'AGENTS.md'), 'utf8')).toContain('No Redundant Facts');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'context', 'llm-wiki-schema.md'), 'utf8')).toContain('Stable Knowledge Boundary');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'context', 'wiki', 'index.md'), 'utf8')).toContain('LLM Wiki Index');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'context', 'wiki', 'update-log.md'), 'utf8')).toContain('Human confirmation');
  expect(JSON.parse(fs.readFileSync(path.join(targetDir, '.harness-hub', 'context', 'wiki', '.obsidian', 'app.json'), 'utf8')).alwaysUpdateLinks).toBe(true);
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'loop', 'policies', 'interrupt-policy.md'), 'utf8')).toContain('Continue By Default');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'loop', 'policies', 'action-audit-schema.md'), 'utf8')).toContain('interrupt-decisions.jsonl');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'loop', 'evals', 'interrupt-policy', 'good-cases.jsonl'), 'utf8')).toContain('"expectedDecision":"continue"');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'loop', 'evals', 'interrupt-policy', 'bad-cases.jsonl'), 'utf8')).toContain('"expectedDecision":"interrupt"');
  expect(fs.readFileSync(path.join(targetDir, '.harness-hub', 'state', 'interrupt-decisions.jsonl'), 'utf8')).toContain('"ledger":"interrupt-decisions"');
  expect(fs.readFileSync(path.join(targetDir, 'evaluator-rubric.md'), 'utf8')).toContain('Runtime reliability');
  expect(fs.readFileSync(path.join(targetDir, 'evaluator-rubric.md'), 'utf8')).toContain('Browser acceptance');
  expect(fs.readFileSync(path.join(targetDir, 'evaluator-rubric.md'), 'utf8')).toContain('Agentic loops');
  expect(fs.readFileSync(path.join(targetDir, 'evaluator-rubric.md'), 'utf8')).toContain('Finish closeout');
  expect(fs.readFileSync(path.join(targetDir, 'evaluator-rubric.md'), 'utf8')).toContain('Insight recommendations');
  expect(fs.readFileSync(path.join(targetDir, 'quality-document.md'), 'utf8')).toContain('Quality Snapshot');

  const lock = readLock(targetDir);
  if (!lock || lock.data.schemaVersion !== 2) {
    throw new Error('expected schema version 2 lock');
  }
  const harness = lock.data.components.find((component) => component.id === 'harness:minimal');
  expect(harness?.kind).toBe('harness-template');
  expect(harness?.dest).toBe('.');
  expect(harness?.files.map((file) => file.path).sort()).toEqual([...REQUIRED_HARNESS_FILES].sort());

  const status = getStatus({ targetDir, index: readCapabilityIndex() });
  expect(status.current.some((row) => row.id === 'harness:minimal')).toBe(true);
  expect(status.modified).toEqual([]);

  const validation = validateHarness(targetDir);
  expect(validation.exitCode).toBe(0);
  expect(validation.checks.every((check) => check.state === 'pass')).toBe(true);
  expect(validation.assessment.overall).toBeGreaterThanOrEqual(80);
  expect(validation.assessment.subsystems.instructions.score).toBeGreaterThanOrEqual(4);
  expect(validation.assessment.project.verificationCommands).toContain('node scripts/harness-validate.mjs');
  expect(validation.benchmark.score).toBeGreaterThanOrEqual(90);
  expect(validation.checks.some((check) => check.code === 'qa-boundary' && check.state === 'pass')).toBe(true);
  expect(validation.checks.some((check) => check.code === 'agent-architecture' && check.state === 'pass')).toBe(true);
  expect(validation.checks.some((check) => check.code === 'trigger-hygiene' && check.state === 'pass')).toBe(true);

  const cliValidation = await captureCli(['validate-harness', targetDir, '--json']);
  expect(cliValidation.code).toBe(0);
  const cliValidationJson = JSON.parse(cliValidation.stdout);
  expect(cliValidationJson.reason).toBe('Harness validation passed.');
  expect(cliValidationJson.assessment.bottleneck).toBeDefined();
  expect(cliValidationJson.benchmark.checks.length).toBeGreaterThan(0);
  const htmlValidation = await captureCli(['validate-harness', targetDir, '--html']);
  expect(htmlValidation.code).toBe(0);
  expect(htmlValidation.stdout).toContain('assessment.overall');
  expect(htmlValidation.stdout).toContain('benchmark.structural');
  const scriptOutput = execFileSync(process.execPath, ['scripts/harness-validate.mjs'], {
    cwd: targetDir,
    encoding: 'utf8',
  });
  expect(scriptOutput).toContain('Harness validation passed.');
});

test('dev bootstrap keeps worktree-local state ignored by git', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-gitignore-'));
  execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });

  const result = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), 'local progress\n');
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'), 'local task\n');
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'state', 'decisions.md'), 'local decisions\n');
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), 'local handoff\n');

  const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: targetDir,
    encoding: 'utf8',
  });

  expect(result.exitCode).toBe(0);
  expect(status).toContain('.harness-hub/.gitignore');
  expect(status).toContain('.harness-hub/lock.json');
  expect(status).not.toContain('.harness-hub/state/');
  expect(status).not.toContain('.harness-hub/reports/');
});

test('dev bootstrap preserves existing worktree-local state', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-preserve-state-'));
  execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  const progressPath = path.join(targetDir, '.harness-hub', 'state', 'progress.md');
  const decisionsPath = path.join(targetDir, '.harness-hub', 'state', 'decisions.md');
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  const progressContent = [
    '# Progress',
    '',
    '## Current State',
    '',
    '- Existing local progress.',
    '',
    '## Recent Validation',
    '',
    '## Validation Records',
    '',
    '| Command | Status | Exit code | Passed | Failed | Evidence | Commit |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| existing | pass | 0 | n/a | 0 | existing output | abc123 |',
    '',
    '## Runtime Signals',
    '',
    '| Signal | Status | Evidence | Follow-up |',
    '| --- | --- | --- | --- |',
    '| Standard startup path | pass | existing startup | none |',
    '',
    '## Web browser acceptance',
    '',
    '| URL | Scenario | Viewport | Status | Console/network | Evidence |',
    '| --- | --- | --- | --- | --- | --- |',
    '| Not required. | n/a | n/a | skipped | n/a | existing skip reason |',
    '',
    '## PR Status',
    '',
    '| PR | Head | Mergeability | CI/check runs | Conflicts | Branch protection | Action taken | Blocker |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| Not created. | n/a | skipped | skipped | n/a | n/a | none | none |',
    '',
    '## Agentic Loop Records',
    '',
    '| Loop | Status | Producer | Verifier | Arbiter | Evidence | Main Agent Decision | Follow-up |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| Not required. | skipped | n/a | n/a | n/a | Existing state predates material loop work. | n/a | none |',
    '',
    '## Finish Closeout',
    '',
    '| Check | Status | Evidence | Follow-up |',
    '| --- | --- | --- | --- |',
    '| Final independent review | skipped | Existing state predates material work. | none |',
    '| Technical debt / drift review | skipped | Existing state predates material work. | none |',
    '| PR / merge readiness | not applicable | No PR yet. | none |',
    '',
    '## Insight Recommendations',
    '',
    '| Area | Recommendation | Evidence | Disposition |',
    '| --- | --- | --- | --- |',
    '| Tool calling | Not run. | Existing state. | skipped |',
    '| AI infrastructure | Not run. | Existing state. | skipped |',
    '| Skill or workflow extraction | Not run. | Existing state. | skipped |',
    '',
    '## Review Feedback To Rules',
    '',
    '- Nothing recorded yet.',
    '',
    '## Blockers',
    '',
    '- None recorded.',
    '',
    '## Next',
    '',
    '- Continue.',
    '',
  ].join('\n');
  fs.writeFileSync(progressPath, progressContent);
  const decisionsContent = [
    '# Decisions',
    '',
    '## Active Decisions',
    '',
    '- Decision: keep local decision state',
    '- Rationale: preserve existing local state',
    '- Status: accepted',
    '- Follow-up: none',
    '',
    '## Resolved Decisions',
    '',
    '- None recorded.',
    '',
  ].join('\n');
  fs.writeFileSync(decisionsPath, decisionsContent);

  const result = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });

  expect(result.exitCode).toBe(0);
  expect(fs.readFileSync(progressPath, 'utf8')).toBe(progressContent);
  expect(fs.readFileSync(decisionsPath, 'utf8')).toBe(decisionsContent);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'current-task.md'))).toBe(true);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'))).toBe(true);
});

test('dev bootstrap blocks existing harness files unless force is explicit', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-conflict-'));
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), 'local instructions\n');
  const before = fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8');

  const blocked = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });

  expect(blocked.exitCode).toBe(3);
  expect(blocked.blockers.some((blocker) => blocker.code === 'existing-file' && blocker.path === 'AGENTS.md')).toBe(true);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toBe(before);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(false);

  const forced = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true, force: true });

  expect(forced.exitCode).toBe(0);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toContain('Claude Code');
});

test('dev bootstrap rechecks existing harness files before writing', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-stale-conflict-'));
  const plan = planDevBootstrap({ targetDir, agents: ['standard'] });
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), 'local instructions after planning\n');
  const before = fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8');

  const blocked = applyDevBootstrap(plan, { yes: true });

  expect(blocked.exitCode).toBe(3);
  expect(blocked.blockers.some((blocker) => blocker.code === 'existing-file' && blocker.path === 'AGENTS.md')).toBe(true);
  expect(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8')).toBe(before);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(false);
});

test('dev bootstrap blocks dirty git worktrees before writing managed files', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-dirty-'));
  execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  fs.writeFileSync(path.join(targetDir, 'dirty.txt'), 'untracked local work\n');

  const result = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });

  expect(result.exitCode).toBe(3);
  expect(result.blockers.some((blocker) => blocker.code === 'dirty-worktree' && blocker.path === 'dirty.txt')).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(false);
});

test('dev bootstrap rechecks dirty git worktrees before writing', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-stale-dirty-'));
  execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  const plan = planDevBootstrap({ targetDir, agents: ['standard'] });
  fs.writeFileSync(path.join(targetDir, 'dirty.txt'), 'untracked local work after planning\n');

  const result = applyDevBootstrap(plan, { yes: true });

  expect(result.exitCode).toBe(3);
  expect(result.blockers.some((blocker) => blocker.code === 'dirty-worktree' && blocker.path === 'dirty.txt')).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, '.harness-hub', 'lock.json'))).toBe(false);
});

test('dev bootstrap treats existing Claude instructions as managed harness conflict unless forced', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-platform-file-'));
  fs.writeFileSync(path.join(targetDir, 'CLAUDE.md'), 'platform-specific instructions\n');

  const blocked = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });

  expect(blocked.exitCode).toBe(3);
  expect(blocked.blockers.some((blocker) => (
    blocker.code === 'existing-file'
    && blocker.path === 'CLAUDE.md'
  ))).toBe(true);
  expect(fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8')).toBe('platform-specific instructions\n');

  const forced = applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true, force: true });

  expect(forced.exitCode).toBe(0);
  expect(fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8')).toBe(fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8'));
});

test('harness validation reports current-state files that exceed size limits', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-size-'));
  applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });
  fs.appendFileSync(path.join(targetDir, '.harness-hub', 'state', 'session-handoff.md'), `\n${'x'.repeat(20_000)}\n`);

  const validation = validateHarness(targetDir);

  expect(validation.exitCode).toBe(3);
  expect(validation.checks.some((check) => (
    check.state === 'fail'
    && check.code === 'file-size'
    && check.path === '.harness-hub/state/session-handoff.md'
  ))).toBe(true);
});

test('harness validation rejects malformed feature state JSON', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-feature-json-'));
  applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });
  fs.writeFileSync(path.join(targetDir, 'feature_list.json'), '{"features":[],"parallel_write_policy":');

  const validation = validateHarness(targetDir);

  expect(validation.exitCode).toBe(3);
  expect(validation.checks.some((check) => (
    check.state === 'fail'
    && check.code === 'structured-content'
    && check.path === 'feature_list.json'
  ))).toBe(true);

  let failed = false;
  try {
    execFileSync(process.execPath, ['scripts/harness-validate.mjs'], {
      cwd: targetDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    failed = true;
    expect((error as { status?: number }).status).toBe(3);
    expect(String((error as { stderr?: Buffer | string }).stderr)).toContain('feature_list.json');
  }
  expect(failed).toBe(true);
});

test('harness validation requires durable validation records and feature evidence policy', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-records-'));
  applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });
  fs.writeFileSync(path.join(targetDir, '.harness-hub', 'state', 'progress.md'), [
    '# Progress',
    '',
    '## Current State',
    '',
    '- No validation ledger.',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(targetDir, 'feature_list.json'), `${JSON.stringify({
    schema_version: 1,
    features: [
      {
        id: 'demo',
        status: 'passing',
      },
    ],
    parallel_write_policy: {},
  }, null, 2)}\n`);

  const validation = validateHarness(targetDir);

  expect(validation.exitCode).toBe(3);
  expect(validation.checks.some((check) => (
    check.state === 'fail'
    && check.code === 'required-content'
    && check.path === '.harness-hub/state/progress.md'
  ))).toBe(true);
  expect(validation.checks.some((check) => (
    check.state === 'fail'
    && check.code === 'structured-content'
    && check.path === 'feature_list.json'
    && check.reason.includes('feature_state_policy object')
    && check.reason.includes('validation_priority_policy object')
    && check.reason.includes('web_acceptance_policy object')
    && check.reason.includes('pr_closeout_policy object')
    && check.reason.includes('finish_closeout_policy object')
    && check.reason.includes('agentic_loop_policy object')
    && check.reason.includes('loop_control_policy object')
    && check.reason.includes('valid feature records features[0]')
  ))).toBe(true);
});

test('harness validation audits broad or missing skill triggers', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-harness-trigger-hygiene-'));
  applyDevBootstrap(planDevBootstrap({ targetDir, agents: ['standard'] }), { yes: true });
  const noisySkillDir = path.join(targetDir, 'skills', 'noisy-skill');
  fs.mkdirSync(noisySkillDir, { recursive: true });
  fs.writeFileSync(path.join(noisySkillDir, 'SKILL.md'), [
    '---',
    'name: noisy-skill',
    'description: Always use for every request.',
    '---',
    '',
    '# Noisy Skill',
    '',
  ].join('\n'));

  const validation = validateHarness(targetDir);

  expect(validation.exitCode).toBe(3);
  expect(validation.checks.some((check) => (
    check.state === 'fail'
    && check.code === 'trigger-hygiene'
    && check.reason.includes('broad activation')
  ))).toBe(true);
});

function expectForbiddenTargetRootArtifactsAbsent(targetDir: string): void {
  for (const relativePath of FORBIDDEN_TARGET_ROOT_ARTIFACTS) {
    expect(fs.existsSync(path.join(targetDir, relativePath))).toBe(false);
  }
}

function expectInstalledTargetFilesDoNotContain(targetDir: string, forbiddenPhrases: string[]): void {
  for (const filePath of listFiles(targetDir)) {
    const relativePath = path.relative(targetDir, filePath).replaceAll(path.sep, '/');
    if (relativePath.startsWith('.git/')) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    for (const phrase of forbiddenPhrases) {
      expect(content, `${relativePath} must not reference source-only ${phrase}`).not.toContain(phrase);
    }
  }
}

function listFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
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
