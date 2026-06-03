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
  };
  advisory: {
    ok: boolean;
    mutates: boolean;
    warnings: Array<{ id: string }>;
  };
  ownerContract: {
    ok: boolean;
    warnings: Array<{ id: string }>;
  };
  mutates: boolean;
  dispatchesSubagents: boolean;
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

test('installed workflow router routes a user-perspective intent matrix without mutation or subagent dispatch', () => {
  const targetDir = installIntoTemp('harness-hub-user-workflow-smoke-');
  const workflowCheckScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'workflow-check.mjs');
  const cases = [
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
    expect(result.route.mutates).toBe(false);
    expect(result.mutates).toBe(false);
    expect(result.advisory.mutates).toBe(false);
    expect(result.dispatchesSubagents).toBe(false);
    expect(result.advisory.warnings.map((warning) => warning.id)).toEqual(entry.warnings);
  }
});

test('installed workflow check has a passing gate path for every owner state', () => {
  const targetDir = installIntoTemp('harness-hub-owner-pass-smoke-');
  const workflowCheckScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'workflow-check.mjs');
  const cases = [
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
      prompt: 'Continue converging Harness Hub skill quality and trigger boundaries; add executable smoke coverage.',
      state: 'harness-hub-maintenance',
      owner: 'hub-maintenance-workflow',
      args: ['--has-scope', '--has-spec', '--has-acceptance', '--has-plan'],
    },
    {
      prompt: 'Finish the accepted work: run validation, clean artifacts, and write the handoff.',
      state: 'delivery',
      owner: 'delivery-workflow',
      args: ['--has-validation', '--has-handoff', '--material-changes'],
    },
  ];

  for (const entry of cases) {
    const result = runWorkflowCheck(workflowCheckScript, entry.prompt, entry.args, targetDir);

    expect(result.route.state).toBe(entry.state);
    expect(result.route.owner).toBe(entry.owner);
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
  expect(caseSmoke.summary.excludedTopLevelWorkflowSkillCount).toBe(7);
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
    'hub-maintenance-workflow',
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
