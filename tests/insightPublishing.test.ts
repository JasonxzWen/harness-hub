import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { expect, test } from 'bun:test';

import {
  buildInsightSite,
  createInsightPost,
  publishInsightPreflight,
  runCli,
  validateInsightSite,
  type InsightPostInput,
} from '../src/harnessHub';

function sampleInsightInput(): InsightPostInput {
  return {
    title: 'Codex self-improving loop and Harness Hub',
    date: '2026-05-28',
    summary: 'Codex self-improvement is useful only when external material becomes project-specific iteration evidence.',
    sources: [
      {
        id: 'openai-tax-agents',
        title: 'Building self-improving tax agents with Codex',
        url: 'https://openai.com/index/building-self-improving-tax-agents-with-codex/',
        type: 'blog',
        accessedAt: '2026-05-28',
        excerpt: 'Codex can turn production traces into bounded engineering tasks and eval-backed improvements.',
        notes: 'Used as product inspiration, not copied as article text.',
      },
    ],
    sourceClaims: [
      {
        id: 'claim-trace-to-eval',
        sourceId: 'openai-tax-agents',
        statement: 'Production traces can become structured evidence for iterative agent improvements.',
        kind: 'fact',
      },
    ],
    viewpoints: [
      {
        id: 'view-evidence-loop',
        statement: 'External reading should become evidence-backed iteration, not a detached summary.',
        sourceClaimIds: ['claim-trace-to-eval'],
      },
    ],
    integration: [
      'Harness Hub should keep source metadata, extracted viewpoints, project mapping, and acceptance evidence together.',
    ],
    projectMapping: [
      {
        area: 'effective-interact',
        impact: 'Use it as the first draft layer for public insight posts.',
        action: 'Generate a publishable HTML draft from a structured insight input.',
      },
    ],
    iterationRecord: {
      changed: ['Treat insight posts as durable project iteration records.'],
      confirmed: ['Do not turn source material into rewritten source summaries.'],
      open: ['Whether later automation can publish without manual approval.'],
      watch: ['Future Codex release notes that affect source/eval loops.'],
    },
    actionBoundary: {
      now: ['Add source-ledger and Pages preflight.'],
      observe: ['Watch generated post quality across several real sources.'],
      notNow: ['Do not build a broad CMS.'],
    },
    assumptions: [
      'The user will provide source URLs or source text before generation.',
    ],
  };
}

test('insight post generation writes JSON source, source ledger, effective-interact input, and public HTML', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-insight-post-'));

  const result = createInsightPost(sampleInsightInput(), { repoRoot });

  expect(result.slug).toBe('2026-05-28-codex-self-improving-loop-and-harness-hub');
  expect(result.validation.exitCode).toBe(0);
  expect(fs.existsSync(result.postJsonPath)).toBe(true);
  expect(fs.existsSync(result.sourceLedgerPath)).toBe(true);
  expect(fs.existsSync(result.effectiveInteractInputPath)).toBe(true);
  expect(fs.existsSync(result.effectiveInteractSummaryPath)).toBe(true);
  expect(fs.existsSync(result.htmlPath)).toBe(true);
  expect(result.htmlPath.replaceAll(path.sep, '/')).toContain('site/insights/posts/2026-05-28-codex-self-improving-loop-and-harness-hub/index.html');

  const post = JSON.parse(fs.readFileSync(result.postJsonPath, 'utf8')) as InsightPostInput;
  expect(post.sourceClaims[0]?.kind).toBe('fact');
  expect(post.viewpoints[0]?.sourceClaimIds).toEqual(['claim-trace-to-eval']);

  const adapter = JSON.parse(fs.readFileSync(result.effectiveInteractInputPath, 'utf8')) as {
    template: string;
    renderMode: string;
    sections: Array<{ title: string; type: string; rows?: unknown[]; cards?: unknown[]; items?: unknown[]; tabs?: unknown[] }>;
    evidence: Array<{ id?: string; sourceUrl?: string }>;
  };
  expect(adapter.template).toBe('research-explainer');
  expect(adapter.renderMode).toBe('pre-rendered');
  expect(adapter.sections.map((section) => section.title)).toEqual(expect.arrayContaining([
    '先读这三点',
    '阅读路径',
    '授权与发布边界',
    '术语地图',
    '项目映射',
    'Harness Hub 已做的迭代',
    '读者可怎么用',
    '来源声明',
  ]));
  expect(adapter.sections.some((section) => section.type === 'summary-cards' && Boolean(section.cards?.length))).toBe(true);
  expect(adapter.sections.some((section) => section.type === 'data-table' && section.title === '阅读路径' && Boolean(section.rows?.length))).toBe(true);
  expect(adapter.sections.some((section) => section.type === 'timeline' && Boolean(section.items?.length))).toBe(true);
  expect(adapter.sections.some((section) => section.type === 'tabs' && Boolean(section.tabs?.length))).toBe(true);
  expect(adapter.evidence.some((item) => item.id === 'openai-tax-agents' && item.sourceUrl?.startsWith('https://'))).toBe(true);

  const html = fs.readFileSync(result.htmlPath, 'utf8');
  expect(html).toContain('<meta charset="utf-8">');
  expect(html).toContain('data-insight-blog');
  expect(html).toContain('原仓库导读');
  expect(html).toContain('本地变更');
  expect(html).toContain('反思结论');
  expect(html).toContain('effective-interact-summary.html');
  expect(html).not.toContain('data-html-work-report');
  expect(html).not.toContain('effective-interact create-interaction.mjs');

  const summaryHtml = fs.readFileSync(result.effectiveInteractSummaryPath, 'utf8');
  expect(summaryHtml).toContain('effective-interact create-interaction.mjs');

  const interactionValidation = execFileSync(process.execPath, [
    path.join(process.cwd(), 'skills', 'effective-interact', 'scripts', 'validate-interaction.mjs'),
    result.effectiveInteractSummaryPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(JSON.parse(interactionValidation).ok).toBe(true);
});

test('insight validation blocks missing fact/inference separation, unsafe links, and oversized source excerpts', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-insight-invalid-'));
  const invalid = {
    ...sampleInsightInput(),
    sources: [
      {
        ...sampleInsightInput().sources[0]!,
        url: 'javascript:alert(1)',
        excerpt: 'word '.repeat(260),
      },
    ],
    sourceClaims: [],
    viewpoints: [],
  };

  const result = createInsightPost(invalid, { repoRoot, writeInvalid: true });

  expect(result.validation.exitCode).toBe(3);
  expect(result.validation.checks.some((check) => check.code === 'source-link' && check.state === 'fail')).toBe(true);
  expect(result.validation.checks.some((check) => check.code === 'source-size' && check.state === 'fail')).toBe(true);
  expect(result.validation.checks.some((check) => check.code === 'fact-inference-separation' && check.state === 'fail')).toBe(true);
  expect(fs.existsSync(result.htmlPath)).toBe(false);
});

test('insight site build writes public index files and validation keeps local artifacts separate', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-insight-site-'));
  createInsightPost(sampleInsightInput(), { repoRoot });

  const build = buildInsightSite({ repoRoot });
  const validation = validateInsightSite({ repoRoot });

  expect(build.exitCode).toBe(0);
  expect(fs.existsSync(path.join(repoRoot, 'site', 'index.html'))).toBe(true);
  expect(fs.existsSync(path.join(repoRoot, 'site', 'insights', 'index.html'))).toBe(true);
  expect(fs.existsSync(path.join(repoRoot, 'site', 'insights', 'index.json'))).toBe(true);
  expect(validation.exitCode).toBe(0);
  expect(validation.checks.every((check) => check.state === 'pass')).toBe(true);
  expect(snapshotPaths(path.join(repoRoot, 'site')).some((entry) => entry.includes('.harness-hub/reports'))).toBe(false);
});

test('publish preflight checks workflow, Pages output, source metadata, links, and worktree state', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-insight-preflight-'));
  fs.mkdirSync(path.join(repoRoot, '.github', 'workflows'), { recursive: true });
  fs.copyFileSync(
    path.join(process.cwd(), '.github', 'workflows', 'publish-insights.yml'),
    path.join(repoRoot, '.github', 'workflows', 'publish-insights.yml'),
  );
  createInsightPost(sampleInsightInput(), { repoRoot });
  buildInsightSite({ repoRoot });
  execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: repoRoot });
  execFileSync('git', ['add', '.'], { cwd: repoRoot });
  execFileSync('git', ['commit', '-m', 'site'], { cwd: repoRoot, stdio: 'ignore' });

  const clean = publishInsightPreflight({ repoRoot });
  expect(clean.exitCode).toBe(0);
  expect(clean.checks.every((check) => check.state === 'pass')).toBe(true);

  fs.writeFileSync(path.join(repoRoot, 'site', 'dirty.txt'), 'dirty');
  const dirty = publishInsightPreflight({ repoRoot });
  expect(dirty.exitCode).toBe(3);
  expect(dirty.checks.some((check) => check.code === 'worktree' && check.state === 'fail')).toBe(true);
});

test('publish preflight blocks non-git targets even when Pages output exists', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-insight-nogit-'));
  fs.mkdirSync(path.join(repoRoot, '.github', 'workflows'), { recursive: true });
  fs.copyFileSync(
    path.join(process.cwd(), '.github', 'workflows', 'publish-insights.yml'),
    path.join(repoRoot, '.github', 'workflows', 'publish-insights.yml'),
  );
  buildInsightSite({ repoRoot });

  const preflight = publishInsightPreflight({ repoRoot });

  expect(preflight.exitCode).toBe(3);
  expect(preflight.checks.some((check) => check.code === 'branch' && check.state === 'fail')).toBe(true);
});

test('insight generation returns structured validation for malformed array fields', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-insight-malformed-array-'));
  const malformed = {
    ...sampleInsightInput(),
    sources: {},
  } as unknown as InsightPostInput;

  const result = createInsightPost(malformed, { repoRoot });

  expect(result.validation.exitCode).toBe(3);
  expect(result.validation.checks.some((check) => check.code === 'required-field' && check.state === 'fail')).toBe(true);
  expect(fs.existsSync(result.htmlPath)).toBe(false);
});

test('insight CLI accepts UTF-8 BOM JSON input', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-insight-bom-'));
  const inputPath = path.join(repoRoot, 'input.json');
  fs.writeFileSync(inputPath, `\uFEFF${JSON.stringify(sampleInsightInput(), null, 2)}`, 'utf8');

  const generated = await captureCli(['insight-generate', repoRoot, '--input', inputPath, '--json']);

  expect(generated.code).toBe(0);
  expect(JSON.parse(generated.stdout).slug).toBe('2026-05-28-codex-self-improving-loop-and-harness-hub');
});

test('insight site build reports malformed post JSON through validation', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-insight-bad-post-'));
  const postDir = path.join(repoRoot, 'site', 'insights', 'posts', 'bad-post');
  fs.mkdirSync(postDir, { recursive: true });
  fs.writeFileSync(path.join(postDir, 'post.json'), '{ bad json', 'utf8');

  const build = buildInsightSite({ repoRoot });

  expect(build.exitCode).toBe(3);
  expect(build.validation.checks.some((check) => (
    check.code === 'post-file'
    && check.path.endsWith('site/insights/posts/bad-post/post.json')
    && check.state === 'fail'
  ))).toBe(true);
});

test('insight CLI supports generate, build, validate, and publish dry-run json output', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-insight-cli-'));
  fs.mkdirSync(path.join(repoRoot, '.github', 'workflows'), { recursive: true });
  fs.copyFileSync(
    path.join(process.cwd(), '.github', 'workflows', 'publish-insights.yml'),
    path.join(repoRoot, '.github', 'workflows', 'publish-insights.yml'),
  );
  const inputPath = path.join(repoRoot, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(sampleInsightInput(), null, 2), 'utf8');

  const generated = await captureCli(['insight-generate', repoRoot, '--input', inputPath, '--json']);
  const built = await captureCli(['insight-build', repoRoot, '--json']);
  const validated = await captureCli(['insight-validate', repoRoot, '--json']);
  execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: repoRoot });
  execFileSync('git', ['add', '.'], { cwd: repoRoot });
  execFileSync('git', ['commit', '-m', 'site'], { cwd: repoRoot, stdio: 'ignore' });
  const preflight = await captureCli(['insight-publish', repoRoot, '--dry-run', '--allow-dirty', '--json']);

  expect(generated.code).toBe(0);
  expect(JSON.parse(generated.stdout).slug).toBe('2026-05-28-codex-self-improving-loop-and-harness-hub');
  expect(built.code).toBe(0);
  expect(validated.code).toBe(0);
  expect(preflight.code).toBe(0);
  expect(JSON.parse(preflight.stdout).mode).toBe('dry-run');
});

function snapshotPaths(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    const relativePath = path.relative(root, fullPath).replaceAll(path.sep, '/');
    if (entry.isDirectory()) {
      entries.push(...snapshotPaths(fullPath).map((child) => `${relativePath}/${child}`));
    } else {
      entries.push(relativePath);
    }
  }
  return entries;
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
