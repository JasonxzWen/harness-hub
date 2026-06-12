import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from 'bun:test';

const skillPath = 'skills/harness-quality-check/SKILL.md';
const skill = fs.readFileSync(skillPath, 'utf8');
const fixturePath = 'skills/harness-quality-check/assets/fixtures/advisory-html-report.json';
const createInteractionScript = 'skills/effective-interact/scripts/create-interaction.mjs';
const validateInteractionScript = 'skills/effective-interact/scripts/validate-interaction.mjs';

test('harness-quality-check documents goal A advisory report orchestration', () => {
  expect(skill).toContain('compose existing Harness Hub checks into an advisory HTML quality/readiness report');
  expect(skill).toContain('advisory-only');
  expect(skill).toContain('harness-hub self-check <target> --json');
  expect(skill).toContain('harness-hub analyze <target> --agent-readiness --harness --json');
  expect(skill).toContain('harness-hub validate-harness <target> --json');
  expect(skill).toContain('bun ./scripts/skill-quality-inventory.ts --json');
  expect(skill).toContain('Produce an HTML report');
  expect(skill).toContain('effective-interact');
  expect(skill).toContain('no remote writes, schedules, commits, pushes, or enforcement changes were performed');
});

test('harness-quality-check fixture renders valid advisory HTML report smoke', () => {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as {
    title: string;
    template: string;
    renderMode: string;
    sections: Array<{ title: string; type: string }>;
  };
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-quality-check-'));

  expect(fixture.title).toBe('Harness quality check advisory report');
  expect(fixture.template).toBe('review-findings');
  expect(fixture.renderMode).toBe('pre-rendered');
  expect(fixture.sections.map((section) => section.title)).toEqual(expect.arrayContaining([
    'Scope and boundary',
    'Command evidence coverage',
    'Advisory findings',
    'Coverage gaps',
    'Next actions',
  ]));

  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    fixturePath,
    '--out-dir',
    tmpDir,
    '--slug',
    'harness-quality-check-smoke',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout) as { outputPath: string; renderMode: string; template: string };
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(payload.renderMode).toBe('pre-rendered');
  expect(payload.template).toBe('review-findings');
  expect(html).toContain('data-html-work-report');
  expect(html).toContain('Harness quality check advisory report');
  expect(html).toContain('Scope: Harness Hub source checkout and target repository');
  expect(html).toContain('Advisory-only');
  expect(html).toContain('Command evidence coverage');
  expect(html).toContain('harness-hub self-check');
  expect(html).toContain('harness-hub analyze');
  expect(html).toContain('harness-hub validate-harness');
  expect(html).toContain('skill-quality-inventory');
  expect(html).toContain('Advisory findings');
  expect(html).toContain('Coverage gaps');
  expect(html).toContain('Next actions');
  expect(html).toContain('Review high and medium advisory findings');
  expect(html).toContain('No remote writes, schedules, hooks, commits, pushes, or enforcement changes');
  expect(html).toContain('No remote side effects');
  expect(html).toContain('simulated command summaries');
  expect(html).toContain('Keep enforcement separate');

  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    payload.outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });

  expect(validation.status, validation.stderr).toBe(0);
  const validationPayload = JSON.parse(validation.stdout) as { ok: boolean; checks: string[] };

  expect(validationPayload.ok).toBe(true);
  expect(validationPayload.checks).toEqual(expect.arrayContaining([
    'report-root',
    'render-mode',
    'grouped-navigation',
    'section-groups',
    'utf8-mojibake-free',
    'evidence-present',
    'verification-present',
    'interactive-controls',
  ]));
});
