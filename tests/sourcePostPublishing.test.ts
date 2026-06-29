import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { expect, test } from 'bun:test';

import {
  buildSourcePostSite,
  createSourcePost,
  publishSourcePostPreflight,
  runCli,
  validateSourcePostSite,
  type SourcePostInput,
} from '../src/harnessHub';

function sampleSourcePostInput(): SourcePostInput {
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
        impact: 'Use it as the first draft layer for public source posts.',
        action: 'Generate a publishable HTML draft from a structured source-post input.',
      },
    ],
    iterationRecord: {
      changed: ['Treat source posts as durable project iteration records.'],
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

test('source post generation writes JSON source, source ledger, effective-interact input, and public HTML', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-post-'));

  const result = createSourcePost(sampleSourcePostInput(), { repoRoot });

  expect(result.slug).toBe('2026-05-28-codex-self-improving-loop-and-harness-hub');
  expect(result.validation.exitCode).toBe(0);
  expect(fs.existsSync(result.postJsonPath)).toBe(true);
  expect(fs.existsSync(result.sourceLedgerPath)).toBe(true);
  expect(fs.existsSync(result.effectiveInteractInputPath)).toBe(true);
  expect(fs.existsSync(result.effectiveInteractSummaryPath)).toBe(true);
  expect(fs.existsSync(result.htmlPath)).toBe(true);
  expect(result.htmlPath.replaceAll(path.sep, '/')).toContain('site/source-posts/posts/2026-05-28-codex-self-improving-loop-and-harness-hub/index.html');

  const post = JSON.parse(fs.readFileSync(result.postJsonPath, 'utf8')) as SourcePostInput;
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
  expect(html).toContain('data-source-post');
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

test('source-post validation blocks missing fact/inference separation, unsafe links, and oversized source excerpts', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-invalid-'));
  const invalid = {
    ...sampleSourcePostInput(),
    sources: [
      {
        ...sampleSourcePostInput().sources[0]!,
        url: 'javascript:alert(1)',
        excerpt: 'word '.repeat(260),
      },
    ],
    sourceClaims: [],
    viewpoints: [],
  };

  const result = createSourcePost(invalid, { repoRoot, writeInvalid: true });

  expect(result.validation.exitCode).toBe(3);
  expect(result.validation.checks.some((check) => check.code === 'source-link' && check.state === 'fail')).toBe(true);
  expect(result.validation.checks.some((check) => check.code === 'source-size' && check.state === 'fail')).toBe(true);
  expect(result.validation.checks.some((check) => check.code === 'fact-inference-separation' && check.state === 'fail')).toBe(true);
  expect(fs.existsSync(result.htmlPath)).toBe(false);
});

test('source-post site build writes public index files and validation keeps local artifacts separate', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-site-'));
  createSourcePost(sampleSourcePostInput(), { repoRoot });

  const build = buildSourcePostSite({ repoRoot });
  const validation = validateSourcePostSite({ repoRoot });

  expect(build.exitCode).toBe(0);
  const homePath = path.join(repoRoot, 'site', 'index.html');
  expect(fs.existsSync(homePath)).toBe(true);
  expect(fs.existsSync(path.join(repoRoot, 'site', 'source-posts', 'index.html'))).toBe(true);
  expect(fs.existsSync(path.join(repoRoot, 'site', 'source-posts', 'index.json'))).toBe(true);
  const homeHtml = fs.readFileSync(homePath, 'utf8');
  expect(homeHtml).toContain('首次理解');
  expect(homeHtml).toContain('安全起步');
  expect(homeHtml).toContain('init-harness');
  expect(homeHtml).toContain('github.com/JasonxzWen/harness-hub/blob/main/README.zh-CN.md');
  expect(validation.exitCode).toBe(0);
  expect(validation.checks.every((check) => check.state === 'pass')).toBe(true);
  expect(snapshotPaths(path.join(repoRoot, 'site')).some((entry) => entry.includes('.harness-hub/reports'))).toBe(false);
});

test('publish preflight checks workflow, Pages output, source metadata, links, and worktree state', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-preflight-'));
  fs.mkdirSync(path.join(repoRoot, '.github', 'workflows'), { recursive: true });
  fs.copyFileSync(
    path.join(process.cwd(), '.github', 'workflows', 'publish-source-posts.yml'),
    path.join(repoRoot, '.github', 'workflows', 'publish-source-posts.yml'),
  );
  createSourcePost(sampleSourcePostInput(), { repoRoot });
  buildSourcePostSite({ repoRoot });
  execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: repoRoot });
  execFileSync('git', ['add', '.'], { cwd: repoRoot });
  execFileSync('git', ['commit', '-m', 'site'], { cwd: repoRoot, stdio: 'ignore' });

  const clean = publishSourcePostPreflight({ repoRoot });
  expect(clean.exitCode).toBe(0);
  expect(clean.checks.every((check) => check.state === 'pass')).toBe(true);

  fs.writeFileSync(path.join(repoRoot, 'site', 'dirty.txt'), 'dirty');
  const dirty = publishSourcePostPreflight({ repoRoot });
  expect(dirty.exitCode).toBe(3);
  expect(dirty.checks.some((check) => check.code === 'worktree' && check.state === 'fail')).toBe(true);
});

test('publish preflight blocks non-git targets even when Pages output exists', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-nogit-'));
  fs.mkdirSync(path.join(repoRoot, '.github', 'workflows'), { recursive: true });
  fs.copyFileSync(
    path.join(process.cwd(), '.github', 'workflows', 'publish-source-posts.yml'),
    path.join(repoRoot, '.github', 'workflows', 'publish-source-posts.yml'),
  );
  buildSourcePostSite({ repoRoot });

  const preflight = publishSourcePostPreflight({ repoRoot });

  expect(preflight.exitCode).toBe(3);
  expect(preflight.checks.some((check) => check.code === 'branch' && check.state === 'fail')).toBe(true);
});

test('source-post generation returns structured validation for malformed array fields', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-malformed-array-'));
  const malformed = {
    ...sampleSourcePostInput(),
    sources: {},
  } as unknown as SourcePostInput;

  const result = createSourcePost(malformed, { repoRoot });

  expect(result.validation.exitCode).toBe(3);
  expect(result.validation.checks.some((check) => check.code === 'required-field' && check.state === 'fail')).toBe(true);
  expect(fs.existsSync(result.htmlPath)).toBe(false);
});

test('source-post CLI accepts UTF-8 BOM JSON input', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-bom-'));
  const inputPath = path.join(repoRoot, 'input.json');
  fs.writeFileSync(inputPath, `\uFEFF${JSON.stringify(sampleSourcePostInput(), null, 2)}`, 'utf8');

  const generated = await captureCli(['source-post', 'generate', repoRoot, '--input', inputPath, '--json']);

  expect(generated.code).toBe(0);
  expect(JSON.parse(generated.stdout).slug).toBe('2026-05-28-codex-self-improving-loop-and-harness-hub');
});

test('source-post site build reports malformed post JSON through validation', () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-bad-post-'));
  const postDir = path.join(repoRoot, 'site', 'source-posts', 'posts', 'bad-post');
  fs.mkdirSync(postDir, { recursive: true });
  fs.writeFileSync(path.join(postDir, 'post.json'), '{ bad json', 'utf8');

  const build = buildSourcePostSite({ repoRoot });

  expect(build.exitCode).toBe(3);
  expect(build.validation.checks.some((check) => (
    check.code === 'post-file'
    && check.path.endsWith('site/source-posts/posts/bad-post/post.json')
    && check.state === 'fail'
  ))).toBe(true);
});

test('source-post CLI supports generate, build, validate, and publish dry-run json output', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-cli-'));
  fs.mkdirSync(path.join(repoRoot, '.github', 'workflows'), { recursive: true });
  fs.copyFileSync(
    path.join(process.cwd(), '.github', 'workflows', 'publish-source-posts.yml'),
    path.join(repoRoot, '.github', 'workflows', 'publish-source-posts.yml'),
  );
  const inputPath = path.join(repoRoot, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(sampleSourcePostInput(), null, 2), 'utf8');

  const generated = await captureCli(['source-post', 'generate', repoRoot, '--input', inputPath, '--json']);
  const built = await captureCli(['source-post', 'build', repoRoot, '--json']);
  const validated = await captureCli(['source-post', 'validate', repoRoot, '--json']);
  execFileSync('git', ['init'], { cwd: repoRoot, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoRoot });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: repoRoot });
  execFileSync('git', ['add', '.'], { cwd: repoRoot });
  execFileSync('git', ['commit', '-m', 'site'], { cwd: repoRoot, stdio: 'ignore' });
  const preflight = await captureCli(['source-post', 'publish', repoRoot, '--dry-run', '--allow-dirty', '--json']);

  expect(generated.code).toBe(0);
  expect(JSON.parse(generated.stdout).slug).toBe('2026-05-28-codex-self-improving-loop-and-harness-hub');
  expect(built.code).toBe(0);
  expect(validated.code).toBe(0);
  expect(preflight.code).toBe(0);
  expect(JSON.parse(preflight.stdout).mode).toBe('dry-run');
});

test('old insight public publishing CLI commands are not supported', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-old-insight-cli-'));
  const inputPath = path.join(repoRoot, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(sampleSourcePostInput(), null, 2), 'utf8');

  const generated = await captureCli(['insight', 'generate', repoRoot, '--input', inputPath, '--json']);
  const built = await captureCli(['insight', 'build', repoRoot, '--json']);
  const validated = await captureCli(['insight', 'validate', repoRoot, '--json']);
  const published = await captureCli(['insight', 'publish', repoRoot, '--dry-run', '--json']);

  for (const result of [generated, built, validated, published]) {
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Public publishing moved to "harness-hub source-post ..."');
    expect(result.stderr).toContain('reserved for private collaboration audits');
  }
});

test('old flat source-post CLI commands are not supported', async () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-source-post-old-cli-'));
  const inputPath = path.join(repoRoot, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify(sampleSourcePostInput(), null, 2), 'utf8');

  const generated = await captureCli(['source-post-generate', repoRoot, '--input', inputPath, '--json']);
  const built = await captureCli(['source-post-build', repoRoot, '--json']);
  const validated = await captureCli(['source-post-validate', repoRoot, '--json']);
  const published = await captureCli(['source-post-publish', repoRoot, '--dry-run', '--json']);

  for (const result of [generated, built, validated, published]) {
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Unknown command');
  }
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
