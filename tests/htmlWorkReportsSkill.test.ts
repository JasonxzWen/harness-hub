import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from 'bun:test';

const skillPath = '.agents/skills/html-work-reports/SKILL.md';
const skill = fs.readFileSync(skillPath, 'utf8');
const skillDir = '.agents/skills/html-work-reports';
const createReportScript = `${skillDir}/scripts/create-report.mjs`;
const validateReportScript = `${skillDir}/scripts/validate-html-report.mjs`;

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('html-work-reports has a narrow trigger description', () => {
  const description = frontmatterValue('description');

  expect(description.startsWith('Load when')).toBe(true);
  expect(description.split(/\s+/).length).toBeLessThanOrEqual(50);
  expect(description).toContain('Chinese-first');
  expect(description).toContain('complete conclusion');
  expect(description).toContain('self-contained HTML report');
  expect(description).toContain('review');
  expect(description).toContain('architecture walkthrough');
  expect(description).toContain('lightweight export editor');
  expect(description).toContain('permission pauses');
  expect(description).toContain('simple chat answers');
  expect(description).toContain('bundled web apps');
});

test('html-work-reports documents positive and negative trigger examples', () => {
  expect(skill).toContain('## Trigger Examples');
  expect(skill).toContain('completed implementation summary');
  expect(skill).toContain('HTML');
  expect(skill).toContain('review');
  expect(skill).toContain('JSON');
  expect(skill).toContain('Do not use this skill for:');
  expect(skill).toContain('approval gates such as');
  expect(skill).toContain('work is still in progress');
  expect(skill).toContain('slide decks; use `frontend-slides`');
});

test('html-work-reports keeps detailed patterns in references', () => {
  expect(skill).toContain('references/html-report-patterns.md');
  expect(skill).toContain('UTF-8');
  expect(skill).toContain('连续问号乱码');
  expect(skill).toContain('不要外显 Source fallback');
  expect(skill.length).toBeLessThan(6000);
});

test('html-work-reports ships reusable template and component assets', () => {
  const templates = [
    'assets/templates/implementation-handoff.html',
    'assets/templates/conclusion-dashboard.html',
    'assets/templates/review-findings.html',
    'assets/templates/research-explainer.html',
    'assets/templates/decision-matrix.html',
  ];

  for (const template of templates) {
    const content = fs.readFileSync(`${skillDir}/${template}`, 'utf8');

    expect(content).toContain('Use case:');
    expect(content).toContain('<style>');
    expect(content).toContain('<script>');
    expect(content).toContain('prefers-reduced-motion');
  }

  const css = fs.readFileSync(`${skillDir}/assets/components/report-ui.css`, 'utf8');
  const js = fs.readFileSync(`${skillDir}/assets/components/report-ui.js`, 'utf8');
  const richCss = fs.readFileSync(`${skillDir}/assets/components/rich-render-runtime.css`, 'utf8');
  const richJs = fs.readFileSync(`${skillDir}/assets/components/rich-render-runtime.js`, 'utf8');
  const patterns = fs.readFileSync(`${skillDir}/references/html-report-patterns.md`, 'utf8');

  expect(css).toContain('blur');
  expect(css).toContain(':focus-visible');
  expect(css).toContain('prefers-reduced-motion');
  expect(js).toContain('data-filter-target');
  expect(js).toContain('data-tab-group');
  expect(js).toContain('data-copy-from');
  expect(richCss).toContain('rendered-markdown');
  expect(richCss).toContain('rich-status');
  expect(richJs).toContain('marked');
  expect(richJs).toContain('DOMPurify');
  expect(richJs).toContain('mermaid.render');
  expect(richJs).toContain('highlightElement');
  expect(patterns).toContain('marked@18.0.3');
  expect(patterns).toContain('mermaid@11.15.0');
  expect(patterns).toContain('@highlightjs/cdn-assets@11.11.1');
  expect(patterns).toContain('DOMPurify');
});

test('html-work-reports emphasizes source-linked code evidence, diffs, and rendered diagrams', () => {
  const css = fs.readFileSync(`${skillDir}/assets/components/report-ui.css`, 'utf8');
  const js = fs.readFileSync(`${skillDir}/assets/components/report-ui.js`, 'utf8');
  const patterns = fs.readFileSync(`${skillDir}/references/html-report-patterns.md`, 'utf8');
  const reviewTemplate = fs.readFileSync(`${skillDir}/assets/templates/review-findings.html`, 'utf8');
  const schema = JSON.parse(fs.readFileSync(`${skillDir}/references/report-input-schema.json`, 'utf8'));

  expect(skill).toContain('source file link');
  expect(skill).toContain('line number');
  expect(skill).toContain('diff');
  expect(skill).toContain('Mermaid');
  expect(patterns).toContain('source-linked code evidence');
  expect(patterns).toContain('diff');
  expect(patterns).toContain('Mermaid');
  expect(schema.properties.sections.items.properties.type.enum).toContain('diff');
  expect(css).toContain('evidence-spotlight');
  expect(css).toContain('source-link');
  expect(css).toContain('diff-panel');
  expect(css).toContain('diff-added');
  expect(css).toContain('diff-removed');
  expect(css).toContain('mermaid-evidence');
  expect(js).toContain('data-evidence-spotlight');
  expect(reviewTemplate).toContain('data-source-link');
  expect(reviewTemplate).toContain('data-section-type="diff"');
});

test('html-work-reports preserves the single-file static report boundary', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/html-report-patterns.md`, 'utf8');

  expect(skill).toContain('single static `.html`');
  expect(skill).toContain('inlineable HTML/CSS and vanilla JS');
  expect(skill).toContain('build step');
  expect(patterns).toContain('Static Component Boundary');
  expect(patterns).toContain('single-file static HTML contract');
  expect(patterns).toContain('vanilla JS only');
  expect(patterns).toContain('single report file');
});

test('html-work-reports does not reference external component libraries', () => {
  const searchedFiles = [
    skillPath,
    `${skillDir}/references/html-report-patterns.md`,
    `${skillDir}/assets/components/report-ui.css`,
    `${skillDir}/assets/components/report-ui.js`,
    `${skillDir}/assets/templates/implementation-handoff.html`,
    `${skillDir}/assets/templates/review-findings.html`,
  ];
  const forbiddenTerms = ['react' + ' bits', 'react' + 'bits', 'react-' + 'bits'];

  for (const file of searchedFiles) {
    const content = fs.readFileSync(file, 'utf8').toLowerCase();
    for (const term of forbiddenTerms) {
      expect(content).not.toContain(term);
    }
  }
});

test('html-work-reports ships generator, validator, schema, and fixtures', () => {
  const expectedFiles = [
    createReportScript,
    validateReportScript,
    `${skillDir}/references/report-input-schema.json`,
    `${skillDir}/assets/fixtures/pre-rendered-report.json`,
    `${skillDir}/assets/fixtures/runtime-report.json`,
    `${skillDir}/assets/fixtures/runtime-cdn-stress-report.json`,
  ];

  for (const file of expectedFiles) {
    expect(fs.existsSync(file)).toBe(true);
  }

  const schema = JSON.parse(fs.readFileSync(`${skillDir}/references/report-input-schema.json`, 'utf8'));
  expect(schema.required).toEqual(['title', 'summary', 'status', 'sections']);
  expect(schema.required).not.toContain('evidence');
  expect(schema.properties.template.enum).toEqual(
    expect.arrayContaining(['implementation-handoff', 'review-findings', 'research-explainer', 'decision-matrix']),
  );
  expect(schema.properties.showRuntimeDependencies.type).toBe('boolean');
  expect(schema.properties.sections.items.properties.type.enum).toContain('diff');
  expect(schema.properties.renderMode.enum).toEqual(['runtime-cdn', 'pre-rendered', 'fallback-only', 'runtime']);
  expect(schema.properties.renderMode.default).toBe('runtime-cdn');
  expect(schema.properties.sections.items.properties.group.type).toBe('string');
  expect(schema.properties.sections.items.properties.priority.type).toBe('integer');
  expect(schema.properties.sections.items.properties.summary.type).toBe('string');
  expect(schema.properties.sections.items.properties.status.enum).toContain('degraded');
});

test('html-work-reports stress fixture covers runtime-cdn quality risks', () => {
  const fixture = JSON.parse(fs.readFileSync(`${skillDir}/assets/fixtures/runtime-cdn-stress-report.json`, 'utf8'));

  expect(fixture.renderMode).toBe('runtime-cdn');
  expect(fixture.sections.length).toBeGreaterThanOrEqual(20);
  const groups = fixture.sections.map((section: any) => section.group);
  expect(groups).toEqual(expect.arrayContaining(['overview', 'diagrams', 'code', 'evidence', 'verification', 'actions']));
  expect(fixture.sections.filter((section: any) => section.type === 'mermaid').map((section: any) => section.content).join('\n')).toContain('sequenceDiagram');
  expect(fixture.sections.filter((section: any) => section.type === 'mermaid').map((section: any) => section.content).join('\n')).toContain('classDiagram');
  expect(fixture.sections.some((section: any) => section.type === 'code' && section.language === 'typescript')).toBe(true);
  expect(fixture.sections.some((section: any) => section.type === 'code' && section.language === 'json')).toBe(true);
  expect(fixture.sections.some((section: any) => section.type === 'diff')).toBe(true);
  expect(fixture.sections.some((section: any) => section.type === 'filterable-cards')).toBe(true);
  expect(fixture.sections.some((section: any) => section.type === 'tabs')).toBe(true);
});

test('html-work-reports generator creates a self-contained pre-rendered report', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-'));
  const result = spawnSync(process.execPath, [
    createReportScript,
    '--input',
    `${skillDir}/assets/fixtures/pre-rendered-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'pre-rendered-fixture',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-html-work-report');
  expect(html).toContain('data-render-mode="pre-rendered"');
  expect(html).toContain('data-template="implementation-handoff"');
  expect(html).toContain('data-report-nav');
  expect(html).toContain('report-nav-group');
  expect(html).toContain('data-section-group=');
  expect(html).toContain('class="rendered-markdown"');
  expect(html).toContain('<table>');
  expect(html).toContain('<ul>');
  expect(html).toContain('data-section-type="mermaid"');
  expect(html).toContain('<svg');
  expect(html).toContain('data-mermaid-source');
  expect(html).toContain('class="hljs');
  expect(html).toContain('data-file-path=');
  expect(html).toContain('data-source-link');
  expect(html).toContain('data-line="505"');
  expect(html).toContain('data-section-type="diff"');
  expect(html).toContain('diff-added');
  expect(html).toContain('diff-removed');
  expect(html).toContain('data-evidence-kind="file"');
  expect(html).toContain('data-verification-status=');
  expect(html).not.toContain('https://cdn.jsdelivr.net');
  expect(html).not.toContain('javascript:');
  expect(html).not.toContain('onerror=');
  expect(html).not.toContain('<script>alert');
});

test('html-work-reports runtime-cdn mode declares pinned dependencies and source fallbacks', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-runtime-'));
  const result = spawnSync(process.execPath, [
    createReportScript,
    '--input',
    `${skillDir}/assets/fixtures/runtime-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'runtime-fixture',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-render-mode="runtime-cdn"');
  expect(html).toContain('Marked@18.0.3');
  expect(html).toContain('DOMPurify@3.4.2');
  expect(html).toContain('Mermaid@11.15.0');
  expect(html).toContain('@highlightjs/cdn-assets@11.11.1');
  expect(html).toContain('data-runtime-dependencies');
  expect(html).toContain('data-runtime-dependency-url=');
  expect(html).toContain('data-render-state="pending"');
  expect(html).toContain('data-rich-markdown');
  expect(html).toContain('data-rich-mermaid-target');
  expect(html).toContain('data-source-fallback');
  expect(html).toContain('data-rich-source');
  expect(html).toContain('data-evidence-kind=');
  expect(html).not.toContain('Source fallback');
  expect(html).not.toContain('Code source');
  expect(html).not.toContain('Markdown pending');
  expect(html).not.toContain('Code pending');
});

test('html-work-reports keeps optional modules out of concise reports', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-concise-'));
  const inputPath = path.join(tmpDir, 'concise.json');
  fs.writeFileSync(inputPath, JSON.stringify({
    title: '简洁中文汇报',
    summary: '只讲结论，不强塞图表、代码、证据或行动清单。',
    status: 'complete',
    renderMode: 'runtime-cdn',
    sections: [
      {
        type: 'markdown',
        title: '结论',
        group: 'summary',
        status: 'ready',
        content: '- 默认目录按内容分组。\n- 没有明确需要时，不展示代码、图表、证据、验证或下一步。'
      }
    ]
  }), 'utf8');

  const result = spawnSync(process.execPath, [
    createReportScript,
    '--input',
    inputPath,
    '--out-dir',
    tmpDir,
    '--slug',
    'concise',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const outputPath = JSON.parse(result.stdout).outputPath;
  const html = fs.readFileSync(outputPath, 'utf8');
  const nav = html.match(/<nav[\s\S]*?<\/nav>/)?.[0] || '';

  expect(html).toContain('简洁中文汇报');
  expect(nav).toContain('摘要');
  expect(nav).not.toContain('图表');
  expect(nav).not.toContain('代码');
  expect(nav).not.toContain('证据');
  expect(nav).not.toContain('验证');
  expect(nav).not.toContain('下一步');
  expect(html).not.toContain('id="evidence"');
  expect(html).not.toContain('id="verification"');
  expect(html).not.toContain('id="next-actions"');
  expect(html).not.toContain('data-section-type="code"');
  expect(html).not.toContain('data-section-type="mermaid"');
  expect(html).toContain('data-runtime-dependencies');
  expect(html).toContain('id="runtime-dependencies" data-runtime-dependencies');
  expect(html).toContain('hidden aria-hidden="true"');
  expect(html).not.toMatch(/\?{4,}/);

  const validation = spawnSync(process.execPath, [
    validateReportScript,
    outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status, validation.stderr).toBe(0);
  expect(JSON.parse(validation.stdout).ok).toBe(true);
});

test('html-work-reports defaults to runtime-cdn and maps legacy runtime alias', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-default-mode-'));
  const base = JSON.parse(fs.readFileSync(`${skillDir}/assets/fixtures/runtime-report.json`, 'utf8'));
  delete base.renderMode;
  const defaultInput = path.join(tmpDir, 'default.json');
  fs.writeFileSync(defaultInput, JSON.stringify(base), 'utf8');

  const defaultResult = spawnSync(process.execPath, [
    createReportScript,
    '--input',
    defaultInput,
    '--out-dir',
    tmpDir,
    '--slug',
    'default-runtime-cdn',
    '--json',
  ], { encoding: 'utf8' });
  expect(defaultResult.status, defaultResult.stderr).toBe(0);
  expect(JSON.parse(defaultResult.stdout).renderMode).toBe('runtime-cdn');

  base.renderMode = 'runtime';
  const legacyInput = path.join(tmpDir, 'legacy.json');
  fs.writeFileSync(legacyInput, JSON.stringify(base), 'utf8');
  const legacyResult = spawnSync(process.execPath, [
    createReportScript,
    '--input',
    legacyInput,
    '--out-dir',
    tmpDir,
    '--slug',
    'legacy-runtime',
    '--json',
  ], { encoding: 'utf8' });
  expect(legacyResult.status, legacyResult.stderr).toBe(0);
  const payload = JSON.parse(legacyResult.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');
  expect(payload.renderMode).toBe('runtime-cdn');
  expect(html).toContain('data-render-compatibility="legacy-runtime-alias"');
});

test('html-work-reports emits Chinese UTF-8 output and rejects mojibake', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-cn-'));
  const inputPath = path.join(tmpDir, 'cn-report.json');
  const input = {
    title: '中文汇报质量检查',
    summary: '必须保持 UTF-8 中文，不允许出现连续问号乱码。',
    status: 'complete',
    renderMode: 'runtime-cdn',
    sections: [
      {
        type: 'markdown',
        title: '结论',
        group: 'overview',
        status: 'ready',
        content: '## 结论\n\n中文内容必须正常渲染，不能退化成连续半角问号。'
      },
      {
        type: 'code',
        title: '短代码',
        group: 'code',
        status: 'ready',
        language: 'javascript',
        filePath: 'demo.js',
        startLine: 1,
        content: 'const message = "中文";\nconsole.log(message);'
      }
    ],
    evidence: [{ kind: 'verification', label: '编码', value: 'UTF-8', status: 'pass' }]
  };
  fs.writeFileSync(inputPath, JSON.stringify(input, null, 2), 'utf8');

  const result = spawnSync(process.execPath, [
    createReportScript,
    '--input',
    inputPath,
    '--out-dir',
    tmpDir,
    '--slug',
    'cn-report',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const html = fs.readFileSync(JSON.parse(result.stdout).outputPath, 'utf8');
  expect(html).toContain('<html lang="zh-CN"');
  expect(html).toContain('中文汇报质量检查');
  expect(html).toContain('目录');
  expect(html).toContain('结论');
  expect(html).not.toContain('生成时间');
  expect(html).not.toMatch(/\?{4,}/);
  expect(html).not.toContain('\uFFFD');

  const badPath = path.join(tmpDir, 'bad.html');
  fs.writeFileSync(badPath, html.replace('中文汇报质量检查', 'HTML ' + '??' + '???' + ' 质量检查'), 'utf8');
  const validation = spawnSync(process.execPath, [
    validateReportScript,
    badPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status).toBe(1);
  const payload = JSON.parse(validation.stdout);
  expect(payload.ok).toBe(false);
  expect(payload.issues.join('\n')).toContain('mojibake');
});

test('html-work-reports keeps code rows compact without generated blank rows', () => {
  const createReport = fs.readFileSync(createReportScript, 'utf8');
  const runtime = fs.readFileSync(`${skillDir}/assets/components/rich-render-runtime.js`, 'utf8');
  const css = fs.readFileSync(`${skillDir}/assets/components/report-ui.css`, 'utf8');

  expect(createReport).toContain('highlighted.join("")');
  expect(createReport).toContain('}).join("");');
  expect(runtime).toContain('}).join("");');
  expect(css).toContain('font: 500 13px/1.28');
  expect(css).toContain('line-height: 1.28');
});

test('html-work-reports validator checks structure and reports degraded browser coverage', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-validate-'));
  const generated = spawnSync(process.execPath, [
    createReportScript,
    '--input',
    `${skillDir}/assets/fixtures/pre-rendered-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'validated-fixture',
    '--json',
  ], { encoding: 'utf8' });
  expect(generated.status, generated.stderr).toBe(0);

  const outputPath = JSON.parse(generated.stdout).outputPath;
  const validation = spawnSync(process.execPath, [
    validateReportScript,
    outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });

  expect(validation.status, validation.stderr).toBe(0);
  const payload = JSON.parse(validation.stdout);
  expect(payload.ok).toBe(true);
  expect(payload.checks).toEqual(expect.arrayContaining([
    'report-root',
    'render-mode',
    'grouped-navigation',
    'section-groups',
    'utf8-mojibake-free',
    'source-fallbacks',
    'render-states',
    'markdown-rendered',
    'mermaid-rendered',
    'code-highlighted',
    'source-linked-code-evidence',
    'diff-rendered',
    'evidence-present',
    'verification-present',
    'interactive-controls',
  ]));
  expect(payload.browser.status).toBe('degraded');
  expect(payload.browser.reason).toContain('skipped');
});

test('html-work-reports showcase remains a rich feature fixture', () => {
  const showcase = fs.readFileSync('reports/html-work-reports-feature-showcase.html', 'utf8');

  expect(showcase).toContain('data-html-work-report');
  expect(showcase).toContain('data-render-mode="runtime-cdn"');
  expect(showcase).toContain('data-report-nav');
  expect(showcase).toContain('report-nav-group');
  expect(showcase).toContain('rendered-markdown');
  expect(showcase).toContain('mermaid');
  expect(showcase).toContain('hljs');
  expect(showcase).toContain('data-filter-target');
  expect(showcase).toContain('data-tab-group');
  expect(showcase).toContain('data-copy-from');
  expect(showcase).toContain('focus-field');
});
