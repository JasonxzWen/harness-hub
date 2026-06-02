import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'bun:test';

import {
  applyInstall,
  planInstall,
  readCapabilityIndex,
} from '../src/harnessHub';

type RouteResult = {
  schemaVersion: 1;
  state: string;
  owner: string | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  mutationAllowed: boolean;
  requiredGates: string[];
  nextGate: string;
  allowedHelperSkills: string[];
  effectiveInteract: 'required' | 'default-consider' | 'not-needed';
  mutates: boolean;
  clarification?: string;
};

const routeScript = 'skills/workflow-router/scripts/route-intent.mjs';
const workflowCheckScript = 'skills/workflow-router/scripts/workflow-check.mjs';
const skillActivationCheckScript = 'skills/workflow-router/scripts/skill-activation-check.mjs';
const ownerContractCheckScript = 'skills/workflow-router/scripts/owner-contract-check.mjs';
const helperContractCheckScript = 'skills/workflow-router/scripts/helper-contract-check.mjs';

async function classify(prompt: string): Promise<RouteResult> {
  const moduleUrl = pathToFileURL(path.resolve(routeScript)).href;
  const module = await import(`${moduleUrl}?t=${Date.now()}-${Math.random()}`);
  return module.classifyIntent(prompt) as RouteResult;
}

function runRoute(scriptPath: string, prompt: string): RouteResult {
  const output = execFileSync(process.execPath, [
    scriptPath,
    '--prompt',
    prompt,
    '--json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return JSON.parse(output) as RouteResult;
}

function runWorkflowCheck(scriptPath: string, args: string[]): {
  route: RouteResult;
  advisory: { ok: boolean; warnings: Array<{ id: string }>; mutates: boolean };
  ownerContract: { ok: boolean; warnings: Array<{ id: string; owner?: string }> };
  mutates: boolean;
  dispatchesSubagents: boolean;
} {
  const output = execFileSync(process.execPath, [scriptPath, ...args, '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return JSON.parse(output) as {
    route: RouteResult;
    advisory: { ok: boolean; warnings: Array<{ id: string }>; mutates: boolean };
    ownerContract: { ok: boolean; warnings: Array<{ id: string; owner?: string }> };
    mutates: boolean;
    dispatchesSubagents: boolean;
  };
}

test('workflow-router has an executable side-effect-free classifier', async () => {
  const result = await classify('Review this workflow-router plan and tell me what is risky, but do not change files yet.');

  expect(result.schemaVersion).toBe(1);
  expect(result.state).toBe('review');
  expect(result.owner).toBe('review-workflow');
  expect(result.mutationAllowed).toBe(false);
  expect(result.mutates).toBe(false);
  expect(result.requiredGates).toEqual(['gather-required-material', 'deliver-report']);
  expect(result.nextGate).toContain('Gather review evidence');
});

test('workflow-router executable classifier matches routing fixture owners', async () => {
  const fixture = JSON.parse(fs.readFileSync('tests/fixtures/workflow-router-cases.json', 'utf8')) as {
    cases: Array<{
      prompt: string;
      expectedState: string;
      expectedOwner: string | null;
      mutationAllowed: boolean;
      requiredGates: string[];
    }>;
  };

  for (const entry of fixture.cases) {
    const result = await classify(entry.prompt);

    expect(result.state).toBe(entry.expectedState);
    expect(result.owner).toBe(entry.expectedOwner);
    expect(result.mutationAllowed).toBe(entry.mutationAllowed);
    expect(result.requiredGates).toEqual(entry.requiredGates);
  }
});

test('workflow-router executable classifier handles Chinese user intent', async () => {
  const review = await classify('\u4e25\u683c\u5ba1\u67e5\u8fd9\u4e9b skill \u7684\u8fb9\u754c\u548c\u89e6\u53d1\u573a\u666f\uff0c\u4e0d\u8981\u6539\u6587\u4ef6\u3002');
  const change = await classify('\u628a profile \u5b89\u88c5\u8303\u5f0f\u53bb\u6389\uff0c\u6539\u6210\u9ed8\u8ba4\u5168\u91cf\u5b89\u88c5\u5e76\u8865\u6d4b\u8bd5\u3002');
  const maintenance = await classify('\u79fb\u9664\u6240\u6709 profile\uff0c\u9ed8\u8ba4\u5168\u91cf\u5b89\u88c5\u5e76\u8986\u76d6\u540c\u540d skill\uff0c\u540c\u65f6\u9a8c\u8bc1 intent classifier \u548c host activation smoke\u3002');
  const pureChineseMaintenance = await classify('\u7ee7\u7eed\u6536\u655b\u6280\u80fd\u8d28\u91cf\u548c\u89e6\u53d1\u8fb9\u754c\uff0c\u8865\u9f50\u53ef\u6267\u884c\u95e8\u7981\u3002');
  const pureChineseDelivery = await classify('\u6536\u5c3e\uff1a\u8fd0\u884c\u9a8c\u8bc1\u3001\u6e05\u7406\u4ea7\u7269\u5e76\u4ea4\u4ed8\u603b\u7ed3\u3002');
  const prCloseoutDelivery = await classify('\u63d0 PR \u540e\u68c0\u67e5\u5408\u5e76\u72b6\u6001\u548c CI \u72b6\u6001\uff0c\u6709\u51b2\u7a81\u5c31\u5904\u7406\u3002');

  expect(review.state).toBe('review');
  expect(review.owner).toBe('review-workflow');
  expect(review.mutationAllowed).toBe(false);
  expect(change.state).toBe('harness-hub-maintenance');
  expect(change.owner).toBe('hub-maintenance-workflow');
  expect(change.requiredGates).toContain('write-spec-and-acceptance');
  expect(maintenance.state).toBe('harness-hub-maintenance');
  expect(maintenance.owner).toBe('hub-maintenance-workflow');
  expect(pureChineseMaintenance.state).toBe('harness-hub-maintenance');
  expect(pureChineseMaintenance.owner).toBe('hub-maintenance-workflow');
  expect(pureChineseDelivery.state).toBe('delivery');
  expect(pureChineseDelivery.owner).toBe('delivery-workflow');
  expect(prCloseoutDelivery.state).toBe('delivery');
  expect(prCloseoutDelivery.owner).toBe('delivery-workflow');
});

test('workflow-router modules can be imported without CLI argv', () => {
  const routeImport = execFileSync(process.execPath, [
    '--input-type=module',
    '-e',
    `import { classifyIntent } from './${routeScript.replaceAll('\\', '/')}'; console.log(classifyIntent('Where is the routing spec?').state);`,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();
  const checkImport = execFileSync(process.execPath, [
    '--input-type=module',
    '-e',
    `import { checkWorkflow } from './${workflowCheckScript.replaceAll('\\', '/')}'; console.log(checkWorkflow({ prompt: 'Review this and do not change files.' }).route.state);`,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();

  expect(routeImport).toBe('question');
  expect(checkImport).toBe('review');
});

test('installed workflow-router script runs in a target repo smoke', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-router-smoke-'));
  const plan = planInstall({ targetDir, agents: ['standard'] });
  applyInstall(plan);
  const installedScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'route-intent.mjs');

  expect(fs.existsSync(installedScript)).toBe(true);

  const result = runRoute(installedScript, 'The workflow-router contract test fails; reproduce it and fix the cause.');

  expect(result.state).toBe('diagnosis');
  expect(result.owner).toBe('diagnosis-workflow');
  expect(result.mutates).toBe(false);
});

test('workflow check composes routing with owner gate warnings', () => {
  const result = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Implement the accepted settings validation change with tests.',
    '--phase',
    'pre-implementation',
  ]);

  expect(result.route.state).toBe('sdd-change');
  expect(result.route.owner).toBe('sdd-workflow');
  expect(result.advisory.ok).toBe(false);
  expect(result.advisory.warnings.map((warning) => warning.id)).toEqual([
    'missing-scope',
    'missing-spec',
    'missing-acceptance',
    'missing-plan',
  ]);
  expect(result.ownerContract.ok).toBe(true);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
});

test('workflow check routes Harness Hub install policy requests into maintenance gates', () => {
  const result = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Remove install profiles and make Harness Hub default to full install with overwrite smoke coverage.',
    '--phase',
    'pre-implementation',
  ]);

  expect(result.route.state).toBe('harness-hub-maintenance');
  expect(result.route.owner).toBe('hub-maintenance-workflow');
  expect(result.advisory.warnings.map((warning) => warning.id)).toEqual([
    'missing-scope',
    'missing-spec',
    'missing-acceptance',
    'missing-plan',
  ]);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
});

test('workflow check routes explicit Harness Hub repair discovered during review into maintenance gates', () => {
  const result = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Continue auditing Harness Hub: fix npm package artifacts and verify the real package contents.',
    '--phase',
    'pre-implementation',
  ]);

  expect(result.route.state).toBe('harness-hub-maintenance');
  expect(result.route.owner).toBe('hub-maintenance-workflow');
  expect(result.route.mutationAllowed).toBe(true);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
});

test('workflow check routes Chinese Harness Hub quality convergence into maintenance gates', () => {
  const result = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    '继续收敛 Harness Hub 的 skill 质量和触发边界，补齐可执行门禁。',
    '--phase',
    'pre-implementation',
  ]);

  expect(result.route.state).toBe('harness-hub-maintenance');
  expect(result.route.owner).toBe('hub-maintenance-workflow');
  expect(result.route.confidence).toBe('high');
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
});

test('workflow check routes user-perspective activation smoke upgrades into maintenance gates', () => {
  const result = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    '继续自顶向下审查 Harness Hub：把用户视角 skill activation smoke 从测试内逻辑提升为安装后可执行脚本，并验证无自动 subagent 调度。',
    '--phase',
    'pre-implementation',
  ]);

  expect(result.route.state).toBe('harness-hub-maintenance');
  expect(result.route.owner).toBe('hub-maintenance-workflow');
  expect(result.route.confidence).toBe('high');
  expect(result.advisory.warnings.map((warning) => warning.id)).toEqual([
    'missing-scope',
    'missing-spec',
    'missing-acceptance',
    'missing-plan',
  ]);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
});

test('workflow check routes Harness Hub gate regression wording into maintenance gates', () => {
  const result = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    '继续从用户视角审查 Harness Hub：验证 workflow owner 门禁不会在错误阶段给假绿灯，并补可执行回归。',
    '--phase',
    'pre-implementation',
  ]);

  expect(result.route.state).toBe('harness-hub-maintenance');
  expect(result.route.owner).toBe('hub-maintenance-workflow');
  expect(result.advisory.warnings.map((warning) => warning.id)).toEqual([
    'missing-scope',
    'missing-spec',
    'missing-acceptance',
    'missing-plan',
  ]);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
});

test('workflow check warns when an explicit phase does not match the selected owner', () => {
  const result = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Finish the accepted workflow-router docs work: run validation, clean local artifacts if needed, and produce a final HTML handoff.',
    '--phase',
    'pre-implementation',
    '--has-validation',
  ]);

  expect(result.route.state).toBe('delivery');
  expect(result.route.owner).toBe('delivery-workflow');
  expect(result.advisory.ok).toBe(false);
  expect(result.advisory.warnings.map((warning) => warning.id)).toEqual([
    'phase-state-mismatch',
  ]);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
});

test('workflow check only warns on read-only owners when mutation is explicitly planned', () => {
  const readOnly = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Review these skill boundaries and do not change files yet.',
  ]);
  const mutationAttempt = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Review these skill boundaries and do not change files yet.',
    '--will-mutate',
  ]);

  expect(readOnly.route.state).toBe('review');
  expect(readOnly.advisory.ok).toBe(true);
  expect(readOnly.advisory.warnings).toEqual([]);
  expect(mutationAttempt.route.state).toBe('review');
  expect(mutationAttempt.advisory.ok).toBe(false);
  expect(mutationAttempt.advisory.warnings.map((warning) => warning.id)).toEqual(['read-only-owner-mutation']);
});

test('installed workflow check runs in a target repo smoke', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-workflow-check-smoke-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));
  const installedScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'workflow-check.mjs');

  expect(fs.existsSync(installedScript)).toBe(true);

  const result = runWorkflowCheck(installedScript, [
    '--prompt',
    'Review these skill boundaries and do not change files yet.',
  ]);

  expect(result.route.state).toBe('review');
  expect(result.route.owner).toBe('review-workflow');
  expect(result.advisory.ok).toBe(true);
  expect(result.advisory.warnings).toEqual([]);
  expect(result.ownerContract.ok).toBe(true);
  expect(result.mutates).toBe(false);
});

test('installed workflow check warns when the selected owner skill is missing', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-owner-contract-smoke-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));
  fs.rmSync(path.join(targetDir, 'skills', 'sdd-workflow'), { recursive: true, force: true });
  const installedScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'workflow-check.mjs');

  const result = runWorkflowCheck(installedScript, [
    '--prompt',
    'Implement a new settings validation feature with acceptance criteria and tests.',
    '--phase',
    'pre-implementation',
    '--has-scope',
    '--has-spec',
    '--has-acceptance',
    '--has-plan',
  ]);

  expect(result.route.state).toBe('sdd-change');
  expect(result.advisory.ok).toBe(true);
  expect(result.ownerContract.ok).toBe(false);
  expect(result.ownerContract.warnings.map((warning) => warning.id)).toEqual(['owner-skill-missing']);
  expect(result.ownerContract.warnings[0].owner).toBe('sdd-workflow');
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
});

test('workflow-router executable classifier is tracked as an installable capability', () => {
  const component = readCapabilityIndex().components['skill:workflow-router'];

  expect(component.version).toBe('0.12.0');
  expect(component.provides).toContain('executable-intent-classifier');
  expect(component.provides).toContain('workflow-gate-preflight');
  expect(component.provides).toContain('executable-skill-activation-smoke');
  expect(component.provides).toContain('skill-activation-case-evaluation');
  expect(component.provides).toContain('helper-activation-coverage-report');
  expect(component.provides).toContain('helper-activation-boundary-coverage');
  expect(component.provides).toContain('owner-helper-activation-separation');
  expect(component.provides).toContain('helper-side-effect-contract');
  expect(component.provides).toContain('explicit-read-only-mutation-guard');
  expect(component.provides).toContain('owner-workflow-structure-contract');
  expect(component.provides).toContain('executable-owner-contract-smoke');
  expect(component.detects.map((entry) => entry.path)).toContain(routeScript);
  expect(component.detects.map((entry) => entry.path)).toContain(workflowCheckScript);
  expect(component.detects.map((entry) => entry.path)).toContain(skillActivationCheckScript);
  expect(component.detects.map((entry) => entry.path)).toContain(ownerContractCheckScript);
  expect(component.detects.map((entry) => entry.path)).toContain(helperContractCheckScript);
});
