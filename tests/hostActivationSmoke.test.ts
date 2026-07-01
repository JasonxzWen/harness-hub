import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

import {
  applyInstall,
  planInstall,
} from '../src/harnessHub';

function route(scriptPath: string, prompt: string, cwd = process.cwd()): { state: string; owner: string | null; mutates: boolean } {
  const output = execFileSync(process.execPath, [scriptPath, '--prompt', prompt, '--json'], {
    cwd,
    encoding: 'utf8',
  });
  return JSON.parse(output) as { state: string; owner: string | null; mutates: boolean };
}

function workflowCheck(scriptPath: string, prompt: string, cwd = process.cwd()): {
  route: { state: string; owner: string | null; mutates: boolean };
  advisory: { ok: boolean; warnings: Array<{ id: string }> };
  mutates: boolean;
  dispatchesSubagents: boolean;
} {
  const output = execFileSync(process.execPath, [scriptPath, '--prompt', prompt, '--json'], {
    cwd,
    encoding: 'utf8',
  });
  return JSON.parse(output) as {
    route: { state: string; owner: string | null; mutates: boolean };
    advisory: { ok: boolean; warnings: Array<{ id: string }> };
    mutates: boolean;
    dispatchesSubagents: boolean;
  };
}

test('root host instructions activate the executable workflow router before owner workflows', () => {
  const agents = fs.readFileSync('AGENTS.md', 'utf8');
  const readme = fs.readFileSync('README.md', 'utf8');

  expect(agents).toContain('node skills/workflow-router/scripts/workflow-check.mjs --prompt "<request>" --json');
  expect(agents).toContain('thin, executable `workflow-router`');
  expect(agents.indexOf('workflow-router')).toBeLessThan(agents.indexOf('sdd-workflow'));
  expect(readme).toContain('Human-facing workflow detail lives in [Development Workflow](docs/development-workflow.md)');
  expect(agents).toContain('workflow-check.mjs');
});

test('standard install exposes the router script for target-repo host activation', () => {
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-host-activation-'));
  const result = applyInstall(planInstall({ targetDir, agents: ['standard'] }));
  const routerSkill = path.join(targetDir, 'skills', 'workflow-router', 'SKILL.md');
  const routerScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'route-intent.mjs');
  const workflowCheckScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'workflow-check.mjs');
  const activationCheckScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'skill-activation-check.mjs');
  const ownerContractScript = path.join(targetDir, 'skills', 'workflow-router', 'scripts', 'owner-contract-check.mjs');
  const hubMaintenanceSkill = path.join(targetDir, 'skills', 'hub-maintenance-workflow', 'SKILL.md');

  expect(result.installed.length).toBeGreaterThan(0);
  expect(fs.existsSync(routerSkill)).toBe(true);
  expect(fs.existsSync(routerScript)).toBe(true);
  expect(fs.existsSync(workflowCheckScript)).toBe(true);
  expect(fs.existsSync(activationCheckScript)).toBe(true);
  expect(fs.existsSync(ownerContractScript)).toBe(true);
  expect(fs.existsSync(path.join(targetDir, 'AGENTS.md'))).toBe(false);
  expect(fs.existsSync(path.join(targetDir, 'harness'))).toBe(false);

  const routerSkillBody = fs.readFileSync(routerSkill, 'utf8');
  expect(routerSkillBody).toContain('Load when a non-trivial request needs intent recognition');
  expect(routerSkillBody).toContain('Select exactly one owner');
  expect(routerSkillBody).toContain('scripts/workflow-check.mjs');
  expect(routerSkillBody).toContain('scripts/skill-activation-check.mjs');
  expect(routerSkillBody).toContain('scripts/owner-contract-check.mjs');
  expect(routerSkillBody).toContain('dispatch subagents');

  for (const owner of [
    'answer-workflow',
    'sdd-workflow',
    'diagnosis-workflow',
    'review-workflow',
    'delivery-workflow',
  ]) {
    const ownerBody = fs.readFileSync(path.join(targetDir, 'skills', owner, 'SKILL.md'), 'utf8');

    expect(ownerBody).toContain('description: Load when workflow-router selects');
  }
  expect(fs.existsSync(hubMaintenanceSkill)).toBe(false);

  const review = route(routerScript, 'Review these skill boundaries and do not change files yet.', targetDir);
  const change = route(routerScript, 'Implement the accepted settings validation change with tests.', targetDir);
  const preflight = workflowCheck(
    workflowCheckScript,
    'Remove install profiles and make Harness Hub default to full install with overwrite smoke coverage.',
    targetDir,
  );

  expect(review).toMatchObject({ state: 'review', owner: 'review-workflow', mutates: false });
  expect(change).toMatchObject({ state: 'sdd-change', owner: 'sdd-workflow', mutates: false });
  expect(preflight.route).toMatchObject({ state: 'harness-hub-maintenance', owner: 'hub-maintenance-workflow' });
  expect(preflight.advisory.warnings.map((warning) => warning.id)).toEqual([
    'missing-scope',
    'missing-spec',
    'missing-acceptance',
    'missing-plan',
  ]);
  expect(preflight.mutates).toBe(false);
  expect(preflight.dispatchesSubagents).toBe(false);
});
