import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

import {
  applyInstall,
  planInstall,
} from '../src/harnessHub';

type WorkflowCheckResult = {
  route: {
    state: string;
    owner: string | null;
    mutationAllowed: boolean;
    mutates: boolean;
    expectedOutputMode: string | null;
  };
  advisory: {
    ok: boolean;
    mutates: boolean;
    expectedOutputMode?: string | null;
    htmlRequired?: boolean;
    warnings: Array<{ id: string }>;
  };
  ownerContract: {
    ok: boolean;
    warnings: Array<{ id: string }>;
  };
  mutates: boolean;
  dispatchesSubagents: boolean;
};

type ExpectedOutputMode = 'plain-brief' | 'structured-markdown' | 'visual-markdown' | 'html-artifact' | null;

type WorkflowSmokeCase = {
  prompt: string;
  state: string;
  owner: string | null;
  expectedOutputMode?: ExpectedOutputMode;
  warnings?: string[];
  args?: string[];
};

type RoutingCase = {
  id: string;
  skill: string;
  kind: 'positive' | 'negative' | 'forbidden-load';
  prompt: string;
  expectedSkill: string | null;
};

type ActivationCheckResult = {
  schemaVersion: 1;
  selectedSkill: string | null;
  mutates: boolean;
  dispatchesSubagents: boolean;
  metadataSkillCount: number;
};

type ActivationCasesResult = {
  schemaVersion: 1;
  ok: boolean;
  mutates: boolean;
  dispatchesSubagents: boolean;
  metadataSkillCount: number;
  summary: {
    caseCount: number;
    passedCount: number;
    failedCount: number;
    coveredSkillCount: number;
    uncoveredSkillCount: number;
    boundaryCoveredSkillCount: number;
    boundaryUncoveredSkillCount: number;
    excludedTopLevelWorkflowSkillCount: number;
  };
  coveredSkills: string[];
  uncoveredSkills: string[];
  boundaryCoveredSkills: string[];
  boundaryUncoveredSkills: string[];
  excludedTopLevelWorkflowSkills: string[];
  cases: Array<{
    id: string;
    expectedSkill: string | null;
    selectedSkill: string | null;
    passed: boolean;
  }>;
};

type ModeStructureCasesResult = {
  schemaVersion: 1;
  ok: boolean;
  mutates: boolean;
  dispatchesSubagents: boolean;
  summary: {
    caseCount: number;
    passedCount: number;
    failedCount: number;
    warnedCount: number;
  };
  cases: Array<{
    id: string;
    mode: string;
    shouldWarn: boolean;
    warned: boolean;
    detectedStructures: string[];
    warnings: string[];
    missingStructures: string[];
    passed: boolean;
  }>;
};

function installIntoTemp(prefix: string): string {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));

  applyInstall(planInstall({ targetDir, agents: ['standard'] }));

  return targetDir;
}

function runWorkflowCheck(scriptPath: string, prompt: string, extraArgs: string[] = [], cwd = process.cwd()): WorkflowCheckResult {
  const output = execFileSync(process.execPath, [scriptPath, '--prompt', prompt, ...extraArgs, '--json'], {
    cwd,
    encoding: 'utf8',
  });

  return JSON.parse(output) as WorkflowCheckResult;
}

function runActivationCheck(scriptPath: string, prompt: string): ActivationCheckResult {
  const output = execFileSync(process.execPath, [scriptPath, '--prompt', prompt, '--json'], {
    encoding: 'utf8',
  });

  return JSON.parse(output) as ActivationCheckResult;
}

function runActivationCases(scriptPath: string, casesFile: string): ActivationCasesResult {
  const output = execFileSync(process.execPath, [scriptPath, '--cases-file', casesFile, '--json'], {
    encoding: 'utf8',
  });

  return JSON.parse(output) as ActivationCasesResult;
}

function tryRunActivationCases(scriptPath: string, casesFile: string): ActivationCasesResult {
  try {
    return runActivationCases(scriptPath, casesFile);
  } catch (error) {
    const output = (error as { stdout?: string | Buffer }).stdout?.toString() || '';

    return JSON.parse(output) as ActivationCasesResult;
  }
}

function runModeStructureCases(scriptPath: string, casesFile: string): ModeStructureCasesResult {
  const output = execFileSync(process.execPath, [scriptPath, '--cases-file', casesFile, '--json'], {
    encoding: 'utf8',
  });

  return JSON.parse(output) as ModeStructureCasesResult;
}

test('installed workflow router routes a user-perspective intent matrix without mutation or subagent dispatch', () => {
  const targetDir = installIntoTemp('harness-hub-user-workflow-smoke-');
  const workflowCheckScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'workflow-check.mjs');
  const cases: WorkflowSmokeCase[] = [
    {
      prompt: 'Where does install overwrite behavior come from? Explain the evidence first; do not change files.',
      state: 'question',
      owner: 'answer-workflow',
      warnings: [],
    },
    {
      prompt: 'Continue converging Harness Hub skill quality and trigger boundaries; add executable smoke coverage.',
      state: 'harness-hub-maintenance',
      owner: 'hub-maintenance-workflow',
      expectedOutputMode: 'html-artifact',
      warnings: ['missing-scope', 'missing-spec', 'missing-acceptance', 'missing-plan'],
    },
    {
      prompt: 'The test command fails; reproduce the root cause and fix it.',
      state: 'diagnosis',
      owner: 'diagnosis-workflow',
      warnings: ['missing-reproduction', 'missing-evidence'],
    },
    {
      prompt: 'Strictly review this PR for implementation risks and missing tests; do not change files.',
      state: 'review',
      owner: 'review-workflow',
      warnings: [],
    },
    {
      prompt: 'Finish the accepted work: run validation, clean artifacts, and write the handoff.',
      state: 'delivery',
      owner: 'delivery-workflow',
      warnings: ['missing-validation'],
    },
    {
      prompt: 'Implement a new settings validation feature with acceptance criteria and tests.',
      state: 'sdd-change',
      owner: 'sdd-workflow',
      warnings: ['missing-scope', 'missing-spec', 'missing-acceptance', 'missing-plan'],
    },
    {
      prompt: "Let's do the workflow-router thing next.",
      state: 'clarify',
      owner: null,
      warnings: [],
    },
  ];

  for (const entry of cases) {
    const result = runWorkflowCheck(workflowCheckScript, entry.prompt, [], targetDir);

    expect(result.route.state).toBe(entry.state);
    expect(result.route.owner).toBe(entry.owner);
    if (entry.expectedOutputMode !== undefined) {
      expect(result.route.expectedOutputMode).toBe(entry.expectedOutputMode);
    }
    expect(result.route.mutates).toBe(false);
    expect(result.mutates).toBe(false);
    expect(result.advisory.mutates).toBe(false);
    expect(result.dispatchesSubagents).toBe(false);
    expect(result.advisory.warnings.map((warning) => warning.id)).toEqual(entry.warnings ?? []);
  }
});

test('installed workflow check has a passing gate path for every owner state', () => {
  const targetDir = installIntoTemp('harness-hub-owner-pass-smoke-');
  const workflowCheckScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'workflow-check.mjs');
  const cases: WorkflowSmokeCase[] = [
    {
      prompt: 'Where does install overwrite behavior come from? Explain the evidence first; do not change files.',
      state: 'question',
      owner: 'answer-workflow',
      args: [],
    },
    {
      prompt: 'Strictly review this PR for implementation risks and missing tests; do not change files.',
      state: 'review',
      owner: 'review-workflow',
      args: [],
    },
    {
      prompt: 'The test command fails; reproduce the root cause and fix it.',
      state: 'diagnosis',
      owner: 'diagnosis-workflow',
      args: ['--has-reproduction', '--has-evidence'],
    },
    {
      prompt: 'Implement a new settings validation feature with acceptance criteria and tests.',
      state: 'sdd-change',
      owner: 'sdd-workflow',
      args: ['--has-scope', '--has-spec', '--has-acceptance', '--has-plan'],
    },
    {
      prompt: 'Finish the accepted work: run validation, clean artifacts, and write the handoff.',
      state: 'delivery',
      owner: 'delivery-workflow',
      args: ['--has-validation', '--has-html-handoff', '--has-closeout-review', '--has-pr-readiness', '--has-insight', '--has-acceptance-arbiter', '--has-final-review-arbiter', '--material-changes'],
    },
  ];

  for (const entry of cases) {
    const result = runWorkflowCheck(workflowCheckScript, entry.prompt, entry.args ?? [], targetDir);

    expect(result.route.state).toBe(entry.state);
    expect(result.route.owner).toBe(entry.owner);
    if (entry.expectedOutputMode !== undefined) {
      expect(result.route.expectedOutputMode).toBe(entry.expectedOutputMode);
    }
    expect(result.advisory.ok).toBe(true);
    expect(result.advisory.warnings).toEqual([]);
    expect(result.ownerContract.ok).toBe(true);
    expect(result.ownerContract.warnings).toEqual([]);
    expect(result.mutates).toBe(false);
    expect(result.dispatchesSubagents).toBe(false);
  }
});

test('installed skill metadata selects high-overlap helper skills from user prompts', () => {
  const targetDir = installIntoTemp('harness-hub-user-skill-smoke-');
  const activationCheckScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'skill-activation-check.mjs');
  const casesFile = path.resolve('tests/fixtures/skill-routing-cases.json');
  const fixture = JSON.parse(fs.readFileSync('tests/fixtures/skill-routing-cases.json', 'utf8')) as {
    cases: RoutingCase[];
  };

  expect(fs.existsSync(activationCheckScript)).toBe(true);

  const cliSmoke = runActivationCheck(
    activationCheckScript,
    'Create a one-file effective interaction for this PR review with collapsible findings and copyable action items.',
  );
  expect(cliSmoke.selectedSkill).toBe('effective-interact');
  expect(cliSmoke.mutates).toBe(false);
  expect(cliSmoke.dispatchesSubagents).toBe(false);

  const pauseReportSmoke = runActivationCheck(
    activationCheckScript,
    'Agent要停下来汇报：这次 Harness Hub 路由改动涉及 .codex、触发边界、测试结果和风险，信息相对复杂，请用结构化中文说明。',
  );
  expect(pauseReportSmoke.selectedSkill).toBe('effective-interact');
  expect(pauseReportSmoke.mutates).toBe(false);
  expect(pauseReportSmoke.dispatchesSubagents).toBe(false);

  const chineseHtmlReportSmoke = runActivationCheck(
    activationCheckScript,
    '请生成 HTML 汇报：这次改动涉及多个 skill、路由边界、验证结果和风险。',
  );
  expect(chineseHtmlReportSmoke.selectedSkill).toBe('effective-interact');
  expect(chineseHtmlReportSmoke.mutates).toBe(false);
  expect(chineseHtmlReportSmoke.dispatchesSubagents).toBe(false);

  const visualLanguageReportSmoke = runActivationCheck(
    activationCheckScript,
    '这次汇报请先用可视化语言组织内容，减少人机交互时间开销和信息损失，不要只是把 Markdown 包成 HTML。',
  );
  expect(visualLanguageReportSmoke.selectedSkill).toBe('effective-interact');
  expect(visualLanguageReportSmoke.mutates).toBe(false);
  expect(visualLanguageReportSmoke.dispatchesSubagents).toBe(false);

  const invisibleEffectiveInteractSmoke = runActivationCheck(
    activationCheckScript,
    'effective-interact 有他没他完全一样，我没有看到主动 HTML 汇报，也没有更好的结构化文本汇报。',
  );
  expect(invisibleEffectiveInteractSmoke.selectedSkill).toBe('effective-interact');
  expect(invisibleEffectiveInteractSmoke.mutates).toBe(false);
  expect(invisibleEffectiveInteractSmoke.dispatchesSubagents).toBe(false);

  const notEffectiveInteractSmoke = runActivationCheck(
    activationCheckScript,
    '讲讲 insight 和 effective-interact 的作用，我怀疑这两个 skill 没有起效。',
  );
  expect(notEffectiveInteractSmoke.selectedSkill).toBe('effective-interact');
  expect(notEffectiveInteractSmoke.mutates).toBe(false);
  expect(notEffectiveInteractSmoke.dispatchesSubagents).toBe(false);

  const insightRecommendationSmoke = runActivationCheck(
    activationCheckScript,
    '其他仓库追踪 insight 后仍然没有给出分析会话后的洞察和改进建议。',
  );
  expect(insightRecommendationSmoke.selectedSkill).toBe('insight');
  expect(insightRecommendationSmoke.mutates).toBe(false);
  expect(insightRecommendationSmoke.dispatchesSubagents).toBe(false);

  const unnamedInsightAuditSmoke = runActivationCheck(
    activationCheckScript,
    '给我分析最近几十个 harness-hub 会话，输出哪些地方应该调用但没调用、哪些触发后过程和结果不对，以及改进建议。',
  );
  expect(unnamedInsightAuditSmoke.selectedSkill).toBe('insight');
  expect(unnamedInsightAuditSmoke.mutates).toBe(false);
  expect(unnamedInsightAuditSmoke.dispatchesSubagents).toBe(false);

  const versionSniffSmoke = runActivationCheck(
    activationCheckScript,
    '版本嗅探：找出今天 npm 和 PyPI 新发布的 AI agent 包。',
  );
  expect(versionSniffSmoke.selectedSkill).toBe('package-release-sniffer');
  expect(versionSniffSmoke.mutates).toBe(false);
  expect(versionSniffSmoke.dispatchesSubagents).toBe(false);

  const repoCapabilityMapSmoke = runActivationCheck(
    activationCheckScript,
    '描述本仓库的能力、结构、功能、实现',
  );
  expect(repoCapabilityMapSmoke.selectedSkill).toBe('effective-interact');
  expect(repoCapabilityMapSmoke.mutates).toBe(false);
  expect(repoCapabilityMapSmoke.dispatchesSubagents).toBe(false);

  const explorationPlanningSmoke = runActivationCheck(
    activationCheckScript,
    'Use Exploration & Planning to compare three implementation approaches with snippets, risks, acceptance gates, and a recommended path.',
  );
  expect(explorationPlanningSmoke.selectedSkill).toBe('effective-interact');
  expect(explorationPlanningSmoke.mutates).toBe(false);
  expect(explorationPlanningSmoke.dispatchesSubagents).toBe(false);

  const codeUnderstandingSmoke = runActivationCheck(
    activationCheckScript,
    'Create a Code Review & Understanding artifact: file tour, module map, call path, source anchors, snippets, and gotchas.',
  );
  expect(codeUnderstandingSmoke.selectedSkill).toBe('effective-interact');
  expect(codeUnderstandingSmoke.mutates).toBe(false);
  expect(codeUnderstandingSmoke.dispatchesSubagents).toBe(false);

  const designApprovalSmoke = runActivationCheck(
    activationCheckScript,
    '给我做一个 Design 方向可视化审批板，比较组件变体、视觉方向和风险，不要直接实现生产 UI。',
  );
  expect(designApprovalSmoke.selectedSkill).toBe('effective-interact');
  expect(designApprovalSmoke.mutates).toBe(false);
  expect(designApprovalSmoke.dispatchesSubagents).toBe(false);

  const statusDashboardSmoke = runActivationCheck(
    activationCheckScript,
    'Create a weekly engineering status dashboard with progress, risks, owners, validation, and next actions.',
  );
  expect(statusDashboardSmoke.selectedSkill).toBe('effective-interact');
  expect(statusDashboardSmoke.mutates).toBe(false);
  expect(statusDashboardSmoke.dispatchesSubagents).toBe(false);

  const featureFlagEditorSmoke = runActivationCheck(
    activationCheckScript,
    'Create a local feature flag editor with toggles, warnings, JSON preview, and diff export; do not write config files.',
  );
  expect(featureFlagEditorSmoke.selectedSkill).toBe('effective-interact');
  expect(featureFlagEditorSmoke.mutates).toBe(false);
  expect(featureFlagEditorSmoke.dispatchesSubagents).toBe(false);

  const ownerPromptSmoke = runActivationCheck(
    activationCheckScript,
    'Where does this repository reference Matt Pocock skills, and what behavior do those references currently drive?',
  );
  expect(ownerPromptSmoke.selectedSkill).toBe(null);
  expect(ownerPromptSmoke.mutates).toBe(false);
  expect(ownerPromptSmoke.dispatchesSubagents).toBe(false);

  const caseSmoke = runActivationCases(activationCheckScript, casesFile);
  expect(caseSmoke.schemaVersion).toBe(1);
  expect(caseSmoke.ok).toBe(true);
  expect(caseSmoke.mutates).toBe(false);
  expect(caseSmoke.dispatchesSubagents).toBe(false);
  expect(caseSmoke.metadataSkillCount).toBeGreaterThan(30);
  expect(caseSmoke.summary.caseCount).toBe(fixture.cases.length);
  expect(caseSmoke.summary.passedCount).toBe(fixture.cases.length);
  expect(caseSmoke.summary.failedCount).toBe(0);
  expect(caseSmoke.summary.coveredSkillCount).toBe(new Set(fixture.cases.map((entry) => entry.skill)).size);
  expect(caseSmoke.summary.coveredSkillCount).toBeGreaterThan(30);
  expect(caseSmoke.summary.uncoveredSkillCount).toBe(0);
  expect(caseSmoke.summary.boundaryCoveredSkillCount).toBe(caseSmoke.summary.coveredSkillCount);
  expect(caseSmoke.summary.boundaryUncoveredSkillCount).toBe(0);
  expect(caseSmoke.summary.excludedTopLevelWorkflowSkillCount).toBe(6);
  expect(caseSmoke.coveredSkills).toContain('documentation-lookup');
  expect(caseSmoke.coveredSkills).toContain('webapp-testing');
  expect(caseSmoke.uncoveredSkills).not.toContain('documentation-lookup');
  expect(caseSmoke.uncoveredSkills).toEqual([]);
  expect(caseSmoke.boundaryCoveredSkills).toEqual(caseSmoke.coveredSkills);
  expect(caseSmoke.boundaryUncoveredSkills).toEqual([]);
  expect(caseSmoke.excludedTopLevelWorkflowSkills).toEqual([
    'answer-workflow',
    'delivery-workflow',
    'diagnosis-workflow',
    'review-workflow',
    'sdd-workflow',
    'workflow-router',
  ]);
  expect(caseSmoke.cases.every((entry) => entry.passed)).toBe(true);
});

test('installed skill activation check fails when helper boundary prompts are missing', () => {
  const targetDir = installIntoTemp('harness-hub-user-skill-boundary-smoke-');
  const activationCheckScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'skill-activation-check.mjs');
  const casesFile = path.join(os.tmpdir(), `harness-hub-weak-activation-${Date.now()}.json`);
  fs.writeFileSync(casesFile, JSON.stringify({
    version: 1,
    cases: [
      {
        id: 'documentation-lookup-positive-only',
        skill: 'documentation-lookup',
        kind: 'positive',
        prompt: 'Fetch the latest official Next.js App Router docs before answering this API behavior question.',
        expectedSkill: 'documentation-lookup',
      },
    ],
  }, null, 2));

  const result = tryRunActivationCases(activationCheckScript, casesFile);

  expect(result.ok).toBe(false);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
  expect(result.summary.failedCount).toBe(0);
  expect(result.summary.boundaryUncoveredSkillCount).toBeGreaterThan(0);
  expect(result.boundaryUncoveredSkills).toContain('documentation-lookup');
});

test('installed effective-interact mode structure checker enforces non-html output shapes', () => {
  const targetDir = installIntoTemp('harness-hub-effective-interact-mode-shape-');
  const scriptPath = path.join(targetDir, 'skills', 'effective-interact', 'scripts', 'check-mode-structure.mjs');
  const casesFile = path.join(targetDir, 'skills', 'effective-interact', 'assets', 'fixtures', 'mode-structure-cases.json');
  const fixture = JSON.parse(fs.readFileSync(path.resolve('skills/effective-interact/assets/fixtures/mode-structure-cases.json'), 'utf8')) as {
    cases: Array<{ id: string }>;
  };

  expect(fs.existsSync(scriptPath)).toBe(true);
  expect(fs.existsSync(casesFile)).toBe(true);

  const result = runModeStructureCases(scriptPath, casesFile);

  expect(result.schemaVersion).toBe(1);
  expect(result.ok).toBe(true);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
  expect(result.summary.caseCount).toBe(fixture.cases.length);
  expect(result.summary.passedCount).toBe(fixture.cases.length);
  expect(result.summary.failedCount).toBe(0);
  expect(result.summary.warnedCount).toBeGreaterThan(0);
  expect(result.cases.some((entry) => entry.id === 'structured-markdown-linear-paragraphs' && entry.warned)).toBe(true);
  expect(result.cases.some((entry) => entry.id === 'visual-markdown-mermaid' && !entry.warned && entry.detectedStructures.includes('mermaid'))).toBe(true);
  expect(result.cases.every((entry) => entry.passed)).toBe(true);
});
