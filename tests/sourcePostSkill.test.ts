import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

const skillDir = 'skills/source-post';
const skill = fs.readFileSync(`${skillDir}/SKILL.md`, 'utf8');
const workflow = fs.readFileSync(`${skillDir}/references/workflow.md`, 'utf8');
const checklist = fs.readFileSync(`${skillDir}/assets/source-post-checklist.md`, 'utf8');
const validator = fs.readFileSync(`${skillDir}/scripts/validate-source-post.mjs`, 'utf8');

test('source-post enforces reader-first article flow', () => {
  expect(skill).toContain('Define the reader job before drafting');
  expect(skill).toContain('Write the reader-facing blog before the evidence apparatus');
  expect(skill).toContain('Source metadata, copyright limits, and evidence ledgers must not be the lead');
  expect(skill).toContain('A reader should be able to answer these in 60 seconds');
  expect(skill).toContain('Do not turn article sections into repeated `summary-cards` or `data-table` blocks');
});

test('source-post requires explicit effectiveness and redundancy reflection', () => {
  expect(skill).toContain('what was already changed, what may be redundant');
  expect(skill).toContain('include direct labels: `effective`, `redundant risk`, and `next optimization`');
  expect(workflow).toContain('Which changes already happened because of the source?');
  expect(workflow).toContain('Were those changes effective for this repo?');
  expect(workflow).toContain('Which parts are redundant or overbuilt?');
  expect(workflow).toContain('What should be optimized or removed next?');
});

test('source-post checklist catches overbuilt report-shaped posts', () => {
  expect(checklist).toContain('Reader job is explicit');
  expect(checklist).toContain('Reader-facing article layer appears before evidence ledger');
  expect(checklist).toContain('Tables are used only for comparable rows');
  expect(checklist).toContain('60-second reader test passes');
});

test('source-post is explicitly target-distributed', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, {
      kind?: string;
      path?: string;
      distribution?: string;
    }>;
  };
  const component = index.components['skill:source-post'];

  expect(component).toEqual({
    kind: 'skill',
    path: 'skills/source-post',
    distribution: 'target-distributed',
  });
});

test('source-post validator accepts reader-first generated source-post shape', () => {
  const postDir = fs.mkdtempSync(path.join(os.tmpdir(), 'source-post-validator-'));
  fs.writeFileSync(path.join(postDir, 'index.html'), [
    '<!doctype html><html><head><meta charset="utf-8"></head><body>',
    '<h1>60-second reading conclusion</h1>',
    '<h2>source structure</h2><p>A source-backed taxonomy.</p>',
    '<h2>local iteration</h2><p>The project iteration is explicit.</p>',
    '<h2>Reflection</h2><p>What was effective, redundant, and the next optimization.</p>',
    '</body></html>',
  ].join('\n'));
  fs.writeFileSync(path.join(postDir, 'post.json'), JSON.stringify({
    sources: [{ id: 'source-1', url: 'https://example.com/source', excerpt: 'Short attributed excerpt.' }],
  }, null, 2));
  fs.writeFileSync(path.join(postDir, 'source-ledger.json'), JSON.stringify({
    sources: [{ id: 'source-1', url: 'https://example.com/source', excerpt: 'Short attributed excerpt.' }],
  }, null, 2));

  const result = spawnSync(process.execPath, [
    `${skillDir}/scripts/validate-source-post.mjs`,
    postDir,
    '--json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
  });

  expect(result.status, result.stderr || result.stdout).toBe(0);
  const output = JSON.parse(result.stdout) as {
    checks: Array<{ code: string; state: string }>;
    reason: string;
  };
  const states = Object.fromEntries(output.checks.map((check) => [check.code, check.state]));

  expect(output.reason).toContain('Source post validation passed');
  expect(states['reader-entry']).toBe('pass');
  expect(states['source-structure']).toBe('pass');
  expect(states['project-iteration']).toBe('pass');
  expect(states['reflection']).toBe('pass');
  expect(states['raw-internal-shape']).toBe('pass');
});

test('source-post validator is not locked to one canonical article template', () => {
  expect(validator).not.toContain('trustworthy-third-party-evaluations-foundations');
  expect(validator).not.toContain('data-source-post');
  expect(validator).toContain('source-coverage');
  expect(validator).toContain('reader-before-evidence');
});
