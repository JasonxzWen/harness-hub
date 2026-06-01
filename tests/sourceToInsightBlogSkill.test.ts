import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillDir = 'skills/source-to-insight-blog';
const skill = fs.readFileSync(`${skillDir}/SKILL.md`, 'utf8');
const workflow = fs.readFileSync(`${skillDir}/references/workflow.md`, 'utf8');
const checklist = fs.readFileSync(`${skillDir}/assets/source-blog-checklist.md`, 'utf8');
const validator = fs.readFileSync(`${skillDir}/scripts/validate-source-blog.mjs`, 'utf8');

test('source-to-insight-blog enforces reader-first article flow', () => {
  expect(skill).toContain('Define the reader job before drafting');
  expect(skill).toContain('Write the reader-facing blog before the evidence apparatus');
  expect(skill).toContain('Source metadata, copyright limits, and evidence ledgers must not be the lead');
  expect(skill).toContain('A reader should be able to answer these in 60 seconds');
  expect(skill).toContain('Do not turn article sections into repeated `summary-cards` or `data-table` blocks');
});

test('source-to-insight-blog requires explicit effectiveness and redundancy reflection', () => {
  expect(skill).toContain('what was already changed, what may be redundant');
  expect(skill).toContain('include direct labels: `effective`, `redundant risk`, and `next optimization`');
  expect(workflow).toContain('Which changes already happened because of the source?');
  expect(workflow).toContain('Were those changes effective for this repo?');
  expect(workflow).toContain('Which parts are redundant or overbuilt?');
  expect(workflow).toContain('What should be optimized or removed next?');
});

test('source-to-insight-blog checklist catches overbuilt report-shaped posts', () => {
  expect(checklist).toContain('Reader job is explicit');
  expect(checklist).toContain('Reader-facing article layer appears before evidence ledger');
  expect(checklist).toContain('Tables are used only for comparable rows');
  expect(checklist).toContain('60-second reader test passes');
});

test('source-to-insight-blog capability records reader-first recommendation', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, {
      version?: string;
      recommendation?: string;
    }>;
  };
  const component = index.components['skill:source-to-insight-blog'];

  expect(component.version).toBe('0.1.1');
  expect(component.recommendation).toContain('reader-first article flow');
  expect(component.recommendation).toContain('source ledgers');
});

test('source-to-insight-blog validator accepts reader-first generated insight shape', () => {
  const result = spawnSync(process.execPath, [
    `${skillDir}/scripts/validate-source-blog.mjs`,
    'site/insights/posts/2026-06-01-ai-coding-dictionary-harness-vocabulary',
    '--json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
  });

  expect(result.status, result.stderr).toBe(0);
  const output = JSON.parse(result.stdout) as {
    checks: Array<{ code: string; state: string }>;
    reason: string;
  };
  const states = Object.fromEntries(output.checks.map((check) => [check.code, check.state]));

  expect(output.reason).toContain('Source blog validation passed');
  expect(states['reader-entry']).toBe('pass');
  expect(states['source-structure']).toBe('pass');
  expect(states['project-iteration']).toBe('pass');
  expect(states['reflection']).toBe('pass');
  expect(states['raw-internal-shape']).toBe('pass');
});

test('source-to-insight-blog validator is not locked to one canonical article template', () => {
  expect(validator).not.toContain('trustworthy-third-party-evaluations-foundations');
  expect(validator).not.toContain('data-source-to-insight-blog');
  expect(validator).toContain('source-coverage');
  expect(validator).toContain('reader-before-evidence');
});
