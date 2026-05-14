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
  expect(richJs).toContain('mermaid.run');
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

test('html-work-reports preserves the static self-contained report boundary', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/html-report-patterns.md`, 'utf8');

  expect(skill).toContain('self-contained static `.html`');
  expect(skill).toContain('inlineable HTML/CSS and vanilla JS');
  expect(skill).toContain('build step');
  expect(patterns).toContain('Static Component Boundary');
  expect(patterns).toContain('self-contained static HTML contract');
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
  ];

  for (const file of expectedFiles) {
    expect(fs.existsSync(file)).toBe(true);
  }

  const schema = JSON.parse(fs.readFileSync(`${skillDir}/references/report-input-schema.json`, 'utf8'));
  expect(schema.required).toEqual(expect.arrayContaining(['title', 'summary', 'status', 'sections', 'evidence']));
  expect(schema.properties.template.enum).toEqual(
    expect.arrayContaining(['implementation-handoff', 'review-findings', 'research-explainer', 'decision-matrix']),
  );
  expect(schema.properties.sections.items.properties.type.enum).toContain('diff');
  expect(schema.properties.renderMode.enum).toEqual(['pre-rendered', 'runtime']);
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

test('html-work-reports runtime mode declares pinned dependencies and source fallbacks', () => {
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

  expect(html).toContain('data-render-mode="runtime"');
  expect(html).toContain('marked@18.0.3');
  expect(html).toContain('DOMPurify@3.4.2');
  expect(html).toContain('mermaid@11.15.0');
  expect(html).toContain('@highlightjs/cdn-assets@11.11.1');
  expect(html).toContain('data-rich-markdown');
  expect(html).toContain('data-rich-mermaid');
  expect(html).toContain('data-source-fallback');
  expect(html).toContain('data-evidence-kind=');
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
  expect(showcase).toContain('rendered-markdown');
  expect(showcase).toContain('mermaid');
  expect(showcase).toContain('hljs');
  expect(showcase).toContain('data-filter-target');
  expect(showcase).toContain('data-tab-group');
  expect(showcase).toContain('data-copy-from');
  expect(showcase).toContain('focus-field');
});
