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
  expectedOutputMode: 'plain-brief' | 'structured-markdown' | 'visual-markdown' | 'html-artifact' | null;
  mutates: boolean;
  clarification?: string;
};

const routeScript = 'skills/workflow-router/scripts/route-intent.mjs';
const workflowCheckScript = 'skills/workflow-router/scripts/workflow-check.mjs';
const advisoryCheckScript = 'skills/workflow-router/scripts/advisory-check.mjs';
const agenticLoopCheckScript = 'skills/workflow-router/scripts/agentic-loop-check.mjs';
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
    path.resolve(scriptPath),
    '--prompt',
    prompt,
    '--json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return JSON.parse(output) as RouteResult;
}

function makeTempDir(prefix = 'harness-hub-workflow-check-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeAlignedCurrentTask(targetDir: string) {
  const taskPath = path.join(targetDir, '.harness-hub', 'state', 'current-task.md');
  fs.mkdirSync(path.dirname(taskPath), { recursive: true });
  fs.writeFileSync(taskPath, [
    '# Current Task',
    '',
    '## Goal',
    '',
    'Implement settings validation.',
    '',
    '## Non-goals',
    '',
    '- Do not change unrelated settings.',
    '',
    '## Allowed paths',
    '',
    '- src/settings.ts',
    '- tests/settings.test.ts',
    '',
    '## Forbidden paths',
    '',
    '- production secrets',
    '',
    '## Target spec',
    '',
    '- Invalid settings return actionable errors.',
    '',
    '## Acceptance criteria',
    '',
    '- Invalid settings fail validation.',
    '- Valid settings pass validation.',
    '',
    '## Test matrix',
    '',
    '| Priority | Test type | Behavior or boundary | Command or method | Expected RED | Expected GREEN | Evidence |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    '| P0 | Unit | settings validation | bun test ./tests/settings.test.ts | failing validation case | passing validation case | pending |',
    '',
  ].join('\n'));
  return taskPath;
}

function runWorkflowCheck(scriptPath: string, args: string[]): {
  route: RouteResult;
  advisory: {
    ok: boolean;
    warnings: Array<{ id: string }>;
    mutates: boolean;
    expectedOutputMode: 'plain-brief' | 'structured-markdown' | 'visual-markdown' | 'html-artifact' | null;
    htmlRequired: boolean;
    handoffWaived: boolean;
    handoffWaiver: string | null;
  };
  ownerContract: { ok: boolean; warnings: Array<{ id: string; owner?: string }> };
  mutates: boolean;
  dispatchesSubagents: boolean;
} {
  const output = execFileSync(process.execPath, [path.resolve(scriptPath), ...args, '--json'], {
    cwd: makeTempDir(),
    encoding: 'utf8',
  });
  return JSON.parse(output) as {
    route: RouteResult;
    advisory: {
      ok: boolean;
      warnings: Array<{ id: string }>;
      mutates: boolean;
      expectedOutputMode: 'plain-brief' | 'structured-markdown' | 'visual-markdown' | 'html-artifact' | null;
      htmlRequired: boolean;
      handoffWaived: boolean;
      handoffWaiver: string | null;
    };
    ownerContract: { ok: boolean; warnings: Array<{ id: string; owner?: string }> };
    mutates: boolean;
    dispatchesSubagents: boolean;
  };
}

function runWorkflowCheckBatch(scriptPath: string, cases: Array<{ id?: string; prompt: string; args?: string[] }>): {
  schemaVersion: 1;
  mutates: boolean;
  dispatchesSubagents: boolean;
  results: Array<{
    id: string | null;
    index: number;
    result: ReturnType<typeof runWorkflowCheck>;
  }>;
} {
  const batchDir = makeTempDir('harness-hub-workflow-check-batch-');
  const batchPath = path.join(batchDir, 'cases.json');
  fs.writeFileSync(batchPath, `${JSON.stringify(cases, null, 2)}\n`);
  const output = execFileSync(process.execPath, [path.resolve(scriptPath), '--batch-json', batchPath, '--json'], {
    cwd: makeTempDir(),
    encoding: 'utf8',
  });
  return JSON.parse(output) as {
    schemaVersion: 1;
    mutates: boolean;
    dispatchesSubagents: boolean;
    results: Array<{
      id: string | null;
      index: number;
      result: ReturnType<typeof runWorkflowCheck>;
    }>;
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
  expect(result.allowedHelperSkills).toContain('agent-interaction-audit');
  expect(result.nextGate).toContain('Gather review evidence');
});

test('workflow-router treats broad repo implementation explainers as read-only HTML questions', async () => {
  const result = await classify('描述本仓库的能力、结构、功能、实现');

  expect(result.state).toBe('question');
  expect(result.owner).toBe('answer-workflow');
  expect(result.mutationAllowed).toBe(false);
  expect(result.effectiveInteract).toBe('required');
  expect(result.expectedOutputMode).toBe('html-artifact');
  expect(result.mutates).toBe(false);
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
    expect(Object.prototype.hasOwnProperty.call(result, 'expectedOutputMode')).toBe(true);
  }
});

test('workflow-check CLI matches routing fixtures and stays side-effect free', () => {
  const fixture = JSON.parse(fs.readFileSync('tests/fixtures/workflow-router-cases.json', 'utf8')) as {
    cases: Array<{
      id: string;
      prompt: string;
      expectedState: string;
      expectedOwner: string | null;
      mutationAllowed: boolean;
      requiredGates: string[];
    }>;
  };
  const batch = runWorkflowCheckBatch(workflowCheckScript, fixture.cases.map((entry) => ({
    id: entry.id,
    prompt: entry.prompt,
  })));

  expect(batch.schemaVersion).toBe(1);
  expect(batch.results.length).toBe(fixture.cases.length);
  expect(batch.mutates).toBe(false);
  expect(batch.dispatchesSubagents).toBe(false);

  for (const [index, entry] of fixture.cases.entries()) {
    const result = batch.results[index].result;

    expect(batch.results[index].id).toBe(entry.id);
    expect(batch.results[index].index).toBe(index);
    expect(result.route.state).toBe(entry.expectedState);
    expect(result.route.owner).toBe(entry.expectedOwner);
    expect(result.route.mutationAllowed).toBe(entry.mutationAllowed);
    expect(result.route.requiredGates).toEqual(entry.requiredGates);
    expect(Object.prototype.hasOwnProperty.call(result.route, 'expectedOutputMode')).toBe(true);
    expect(result.mutates).toBe(false);
    expect(result.dispatchesSubagents).toBe(false);
    expect(result.advisory.mutates).toBe(false);
  }
}, 20000);

test('workflow check can hydrate advisory gates from an explicit current-task path', () => {
  const targetDir = makeTempDir('harness-hub-workflow-current-task-');
  const currentTaskPath = writeAlignedCurrentTask(targetDir);
  const result = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Implement the accepted settings validation change with tests.',
    '--phase',
    'pre-implementation',
    '--current-task',
    currentTaskPath,
  ]);

  expect(result.route.state).toBe('sdd-change');
  expect(result.advisory.ok).toBe(true);
  expect(result.advisory.warnings).toEqual([]);
  expect(result.mutates).toBe(false);
});

test('workflow-router executable classifier handles Chinese user intent', async () => {
  const review = await classify('\u4e25\u683c\u5ba1\u67e5\u8fd9\u4e9b skill \u7684\u8fb9\u754c\u548c\u89e6\u53d1\u573a\u666f\uff0c\u4e0d\u8981\u6539\u6587\u4ef6\u3002');
  const change = await classify('\u628a profile \u5b89\u88c5\u8303\u5f0f\u53bb\u6389\uff0c\u6539\u6210\u9ed8\u8ba4\u5168\u91cf\u5b89\u88c5\u5e76\u8865\u6d4b\u8bd5\u3002');
  const maintenance = await classify('\u79fb\u9664\u6240\u6709 profile\uff0c\u9ed8\u8ba4\u5168\u91cf\u5b89\u88c5\u5e76\u8986\u76d6\u540c\u540d skill\uff0c\u540c\u65f6\u9a8c\u8bc1 intent classifier \u548c host activation smoke\u3002');
  const pureChineseMaintenance = await classify('\u7ee7\u7eed\u6536\u655b\u6280\u80fd\u8d28\u91cf\u548c\u89e6\u53d1\u8fb9\u754c\uff0c\u8865\u9f50\u53ef\u6267\u884c\u95e8\u7981\u3002');
  const pureChineseDelivery = await classify('\u6536\u5c3e\uff1a\u8fd0\u884c\u9a8c\u8bc1\u3001\u6e05\u7406\u4ea7\u7269\u5e76\u4ea4\u4ed8\u603b\u7ed3\u3002');
  const prCloseoutDelivery = await classify('\u63d0 PR \u540e\u68c0\u67e5\u5408\u5e76\u72b6\u6001\u548c CI \u72b6\u6001\uff0c\u6709\u51b2\u7a81\u5c31\u5904\u7406\u3002');
  const summaryWithReflectionQuestion = await classify('\u603b\u7ed3\u6587\u672c\u5e76\u53cd\u601d\u662f\u5426\u9700\u8981\u636e\u6b64\u4f18\u5316\u672c\u9879\u76ee');
  const bareSummaryQuestion = await classify('\u603b\u7ed3\u4e00\u4e0b\u8fd9\u6bb5\u6750\u6599');
  const handoffSummaryDelivery = await classify('\u4ea4\u4ed8\u603b\u7ed3\u4e00\u4e0b\u672c\u6b21\u6539\u52a8');
  const validationSummaryDelivery = await classify('\u9a8c\u8bc1\u603b\u7ed3\u548c\u5269\u4f59\u98ce\u9669');
  const skillExplainerQuestion = await classify('讲讲 insight 和 effective-interact 的作用，我怀疑这两个 skill 没有起效');
  const insightMaintenance = await classify('修复 insight 没有给出会话洞察和改进建议的问题');
  const insightEnhancement = await classify('\u5b8c\u5584 insight skill\uff0c\u73b0\u5728\u7684\u529f\u80fd\u6709\u54ea\u4e9b\uff1f');
  const effectiveInteractDesignRefresh = await classify('把 effective-interact 的报告模板改成 DESIGN.md 和组件优先，并复刻 html-effectiveness 的字体、排版、配色和组件间距。');

  expect(review.state).toBe('review');
  expect(review.owner).toBe('review-workflow');
  expect(review.mutationAllowed).toBe(false);
  expect(change.state).toBe('harness-hub-maintenance');
  expect(change.owner).toBe('hub-maintenance-workflow');
  expect(change.requiredGates).toContain('write-spec-and-acceptance');
  expect(maintenance.state).toBe('harness-hub-maintenance');
  expect(maintenance.owner).toBe('hub-maintenance-workflow');
  expect(maintenance.expectedOutputMode).toBe('html-artifact');
  expect(pureChineseMaintenance.state).toBe('harness-hub-maintenance');
  expect(pureChineseMaintenance.owner).toBe('hub-maintenance-workflow');
  expect(pureChineseMaintenance.expectedOutputMode).toBe('html-artifact');
  expect(pureChineseDelivery.state).toBe('delivery');
  expect(pureChineseDelivery.owner).toBe('delivery-workflow');
  expect(prCloseoutDelivery.state).toBe('delivery');
  expect(prCloseoutDelivery.owner).toBe('delivery-workflow');
  expect(summaryWithReflectionQuestion.state).toBe('question');
  expect(summaryWithReflectionQuestion.owner).toBe('answer-workflow');
  expect(bareSummaryQuestion.state).toBe('question');
  expect(bareSummaryQuestion.owner).toBe('answer-workflow');
  expect(handoffSummaryDelivery.state).toBe('delivery');
  expect(handoffSummaryDelivery.owner).toBe('delivery-workflow');
  expect(validationSummaryDelivery.state).toBe('delivery');
  expect(validationSummaryDelivery.owner).toBe('delivery-workflow');
  expect(skillExplainerQuestion.state).toBe('question');
  expect(skillExplainerQuestion.owner).toBe('answer-workflow');
  expect(insightMaintenance.state).toBe('harness-hub-maintenance');
  expect(insightMaintenance.owner).toBe('hub-maintenance-workflow');
  expect(insightEnhancement.state).toBe('harness-hub-maintenance');
  expect(insightEnhancement.owner).toBe('hub-maintenance-workflow');
  expect(effectiveInteractDesignRefresh.state).toBe('harness-hub-maintenance');
  expect(effectiveInteractDesignRefresh.owner).toBe('hub-maintenance-workflow');
  expect(effectiveInteractDesignRefresh.expectedOutputMode).toBe('html-artifact');
});

test('workflow-router routes effective-interact trigger hardening into maintenance', async () => {
  const result = await classify('\u5e0c\u671b\u628a ponytail \u5438\u6536\u5230 effective-interact\uff0c\u5206\u6790\u5386\u53f2\u4f1a\u8bdd\u7684\u89e6\u53d1\u9891\u7387\uff0c\u73b0\u5728\u611f\u89c9\u4e0d\u89e6\u53d1\uff0ctrigger \u4e0d\u591f\u786c');

  expect(result.state).toBe('harness-hub-maintenance');
  expect(result.owner).toBe('hub-maintenance-workflow');
  expect(result.expectedOutputMode).toBe('html-artifact');
  expect(result.mutationAllowed).toBe(true);
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
  expect(result.ownerContract.ok).toBe(true);
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
  expect(result.route.expectedOutputMode).toBe('html-artifact');
  expect(result.route.mutationAllowed).toBe(true);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
});

test('workflow check preserves explicit hub-maintenance workflow despite repair wording', () => {
  const result = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    '继续走 hub-maintenance-workflow 修：恢复重大 repo/skill 变更默认 HTML handoff，并补中文 HTML 汇报触发。',
    '--phase',
    'pre-implementation',
  ]);

  expect(result.route.state).toBe('harness-hub-maintenance');
  expect(result.route.owner).toBe('hub-maintenance-workflow');
  expect(result.route.expectedOutputMode).toBe('html-artifact');
  expect(result.advisory.expectedOutputMode).toBe('html-artifact');
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

test('workflow check warns when material delivery lacks closeout evidence or required HTML handoff', () => {
  const missing = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Finish the accepted work: run validation and produce the handoff.',
    '--phase',
    'pre-delivery',
    '--material-changes',
    '--has-validation',
  ]);
  const missingCloseout = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Finish the accepted work: run validation and produce the handoff.',
    '--phase',
    'pre-delivery',
    '--material-changes',
    '--has-validation',
    '--has-html-handoff',
  ]);
  const present = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Finish the accepted work: run validation and produce the handoff.',
    '--phase',
    'pre-delivery',
    '--material-changes',
    '--has-validation',
    '--has-html-handoff',
    '--has-closeout-review',
    '--has-pr-readiness',
    '--has-agent-interaction-audit',
    '--has-acceptance-arbiter',
    '--has-final-review-arbiter',
  ]);

  expect(missing.advisory.expectedOutputMode).toBe('html-artifact');
  expect(missing.advisory.warnings.map((warning) => warning.id)).toEqual([
    'missing-closeout-review',
    'missing-pr-readiness',
    'missing-agent-interaction-audit',
    'missing-acceptance-arbiter',
    'missing-final-review-arbiter',
    'missing-effective-interact-html-handoff',
  ]);
  expect(missingCloseout.advisory.warnings.map((warning) => warning.id)).toEqual([
    'missing-closeout-review',
    'missing-pr-readiness',
    'missing-agent-interaction-audit',
    'missing-acceptance-arbiter',
    'missing-final-review-arbiter',
  ]);
  expect(present.advisory.ok).toBe(true);
  expect(present.advisory.warnings).toEqual([]);
});

test('workflow check accepts explicit HTML handoff waiver for material delivery', () => {
  const result = runWorkflowCheck(workflowCheckScript, [
    '--prompt',
    'Finish the accepted work: run validation and produce the handoff.',
    '--phase',
    'pre-delivery',
    '--material-changes',
    '--has-validation',
    '--has-closeout-review',
    '--has-pr-readiness',
    '--has-agent-interaction-audit',
    '--has-acceptance-arbiter',
    '--has-final-review-arbiter',
    '--html-handoff-waiver',
    'Tiny release-only change; no browser handoff needed.',
  ]);

  expect(result.route.state).toBe('delivery');
  expect(result.advisory.ok).toBe(true);
  expect(result.advisory.expectedOutputMode).toBe('html-artifact');
  expect(result.advisory.htmlRequired).toBe(true);
  expect(result.advisory.handoffWaived).toBe(true);
  expect(result.advisory.warnings).toEqual([]);
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

  expect(component.version).toBe('0.14.1');
  expect(component.provides).toContain('executable-intent-classifier');
  expect(component.provides).toContain('workflow-gate-preflight');
  expect(component.provides).toContain('executable-skill-activation-smoke');
  expect(component.provides).toContain('skill-activation-case-evaluation');
  expect(component.provides).toContain('helper-activation-coverage-report');
  expect(component.provides).toContain('helper-activation-boundary-coverage');
  expect(component.provides).toContain('owner-helper-activation-separation');
  expect(component.provides).toContain('helper-side-effect-contract');
  expect(component.provides).toContain('explicit-read-only-mutation-guard');
  expect(component.provides).toContain('expected-output-mode-routing');
  expect(component.provides).toContain('html-handoff-advisory-gate');
  expect(component.provides).toContain('html-handoff-waiver-gate');
  expect(component.provides).toContain('finish-closeout-advisory-evidence');
  expect(component.provides).toContain('agentic-loop-evidence-check');
  expect(component.provides).toContain('agentic-loop-advisory-evidence');
  expect(component.provides).toContain('visual-language-report-activation');
  expect(component.provides).toContain('owner-workflow-structure-contract');
  expect(component.provides).toContain('executable-owner-contract-smoke');
  expect(component.provides).toContain('finish-closeout-gate-routing');
  expect(component.detects.map((entry) => entry.path)).toContain(routeScript);
  expect(component.detects.map((entry) => entry.path)).toContain(workflowCheckScript);
  expect(component.detects.map((entry) => entry.path)).toContain(advisoryCheckScript);
  expect(component.detects.map((entry) => entry.path)).toContain(agenticLoopCheckScript);
  expect(component.detects.map((entry) => entry.path)).toContain(skillActivationCheckScript);
  expect(component.detects.map((entry) => entry.path)).toContain(ownerContractCheckScript);
  expect(component.detects.map((entry) => entry.path)).toContain(helperContractCheckScript);
});
