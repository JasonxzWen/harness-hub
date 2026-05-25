import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

import {
  applyInstall,
  planInstall,
  readCapabilityIndex,
} from '../src/skillHub';

type HelperContractResult = {
  ok: boolean;
  mutates: boolean;
  dispatchesSubagents: boolean;
  helperSkillCount: number;
  checkedHelperCount: number;
  checkedHelpers: string[];
  excludedTopLevelWorkflowSkills: string[];
  warnings: Array<{ id: string; skill: string }>;
};

function runHelperContract(args: string[] = []): HelperContractResult {
  const output = execFileSync(process.execPath, [
    'skills/workflow-router/scripts/helper-contract-check.mjs',
    ...args,
    '--json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return JSON.parse(output) as HelperContractResult;
}

test('helper contract check validates high-risk helpers without mutation or subagent dispatch', () => {
  const result = runHelperContract();
  const index = readCapabilityIndex();
  const topLevel = new Set([
    'answer-workflow',
    'delivery-workflow',
    'diagnosis-workflow',
    'hub-maintenance-workflow',
    'review-workflow',
    'sdd-workflow',
    'workflow-router',
  ]);
  const expectedHelperCount = Object.entries(index.components)
    .filter(([id, component]) => component.kind === 'skill' && !topLevel.has(id.replace('skill:', '')))
    .length;

  expect(result.ok).toBe(true);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
  expect(result.helperSkillCount).toBe(expectedHelperCount);
  expect(result.checkedHelpers).toEqual(['compound-code-review', 'e2e-testing']);
  expect(result.checkedHelperCount).toBe(result.checkedHelpers.length);
  expect(result.excludedTopLevelWorkflowSkills).toEqual([
    'answer-workflow',
    'delivery-workflow',
    'diagnosis-workflow',
    'hub-maintenance-workflow',
    'review-workflow',
    'sdd-workflow',
    'workflow-router',
  ]);
  expect(result.warnings).toEqual([]);
});

test('helper contract check fails when a high-risk helper loses side-effect boundaries', () => {
  const skillsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-helper-contract-weak-'));
  const helperDir = path.join(skillsRoot, 'compound-code-review');
  fs.mkdirSync(helperDir, { recursive: true });
  fs.writeFileSync(
    path.join(helperDir, 'SKILL.md'),
    [
      '---',
      'name: compound-code-review',
      'description: Load when deep code review is needed.',
      '---',
      '',
      '# Compound Code Review',
      '',
      'Review the code.',
    ].join('\n'),
  );

  let result: HelperContractResult | null = null;
  try {
    runHelperContract(['--skills-root', skillsRoot]);
  } catch (error) {
    const output = (error as { stdout?: Buffer }).stdout?.toString('utf8') || '';
    result = JSON.parse(output) as HelperContractResult;
  }

  expect(result).not.toBeNull();
  expect(result?.ok).toBe(false);
  expect(result?.mutates).toBe(false);
  expect(result?.dispatchesSubagents).toBe(false);
  expect(result?.warnings.map((warning) => warning.id)).toContain('helper-contract-missing-phrase');
  expect(result?.warnings.every((warning) => warning.skill === 'compound-code-review')).toBe(true);
});

test('standard install exposes helper contract check in the target repo', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-helper-contract-install-'));
  applyInstall(planInstall({ targetDir, agents: ['standard'] }));
  const installedScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'helper-contract-check.mjs');

  expect(fs.existsSync(installedScript)).toBe(true);

  const output = execFileSync(process.execPath, [installedScript, '--json'], {
    cwd: targetDir,
    encoding: 'utf8',
  });
  const result = JSON.parse(output) as HelperContractResult;

  expect(result.ok).toBe(true);
  expect(result.mutates).toBe(false);
  expect(result.dispatchesSubagents).toBe(false);
});
