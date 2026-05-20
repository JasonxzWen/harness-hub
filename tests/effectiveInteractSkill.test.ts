import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'bun:test';

const skillPath = 'skills/effective-interact/SKILL.md';
const skill = fs.readFileSync(skillPath, 'utf8');
const skillDir = 'skills/effective-interact';
const createInteractionScript = `${skillDir}/scripts/create-interaction.mjs`;
const validateInteractionScript = `${skillDir}/scripts/validate-interaction.mjs`;

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('effective-interact has a broad default-consider trigger description', () => {
  const description = frontmatterValue('description');

  expect(description.startsWith('Load broadly')).toBe(true);
  expect(description.split(/\s+/).length).toBeLessThanOrEqual(70);
  expect(description).toContain('Chinese-first');
  expect(description).toContain('non-trivial sessions');
  expect(description).toContain('implementation/review progress');
  expect(description).toContain('research');
  expect(description).toContain('learning');
  expect(description).toContain('validation');
  expect(description).toContain('self-contained HTML artifact');
  expect(description).toContain('default-consider every session');
  expect(description).toContain('final reports after material repo changes');
  expect(description).toContain('handoff');
  expect(description).toContain('permission-only pauses');
  expect(description).toContain('trivial chat');
  expect(description).toContain('bundled apps');
});

test('effective-interact documents positive and negative trigger examples', () => {
  expect(skill).toContain('## Trigger Examples');
  expect(skill).toContain('implementation state');
  expect(skill).toContain('changed a skill or repo behavior');
  expect(skill).toContain('choose before you implement');
  expect(skill).toContain('OpenSpec apply');
  expect(skill).toContain('validation gates');
  expect(skill).toContain('HTML');
  expect(skill).toContain('review');
  expect(skill).toContain('JSON');
  expect(skill).toContain('side-by-side option gallery');
  expect(skill).toContain('temporary editor that exports Markdown, JSON, or diff');
  expect(skill).toContain('Do not use this skill for:');
  expect(skill).toContain('approval gates such as');
  expect(skill).toContain('HTML artifact around planning, implementation progress, review, status, material-change reporting, or handoff');
  expect(skill).toContain('slide decks; use `frontend-slides`');
});

test('effective-interact can replace Markdown before, during, or after implementation', () => {
  expect(skill).toContain('Default posture: consider this skill in every non-trivial session');
  expect(skill).toContain('Use this skill before, during, or after implementation');
  expect(skill).toContain('HTML artifact can replace or supplement a Markdown reply');
  expect(skill).toContain('planning options');
  expect(skill).toContain('prompt/config tuners');
  expect(skill).toContain('material-change reports');
  expect(skill).toContain('interaction points, not only final handoffs');
  expect(skill).toContain('The user does not need to say "HTML"');
});

test('effective-interact defines an HTML usefulness gate', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');

  expect(skill).toContain('## Default Load And HTML Usefulness Gate');
  expect(skill).toContain('HTML-worthiness check at planning, after material work, and before final handoff');
  expect(skill).toContain('Use HTML when at least one strong signal is present');
  expect(skill).toContain('material repo or skill implementation');
  expect(skill).toContain('2 or more comparable options');
  expect(skill).toContain('flow, state, timeline, map, call path, or architecture');
  expect(skill).toContain('user must choose, tune, sort, filter, copy, or export');
  expect(skill).toContain('source anchors, code, diff, citations, evidence, or validation');
  expect(skill).toContain('Markdown would hide the main point in long linear text');
  expect(skill).toContain('If no strong signal and no handoff obligation is present, answer in chat or Markdown');
  expect(patterns).toContain('Default Session Routing');
  expect(patterns).toContain('HTML Usefulness Gate');
  expect(patterns).toContain('Material repo or skill behavior changed');
  expect(patterns).toContain('Strong signal');
  expect(patterns).toContain('Markdown default');
  expect(patterns).toContain('Do not generate HTML just because the topic is important');
});

test('effective-interact codifies decision-first briefing quality', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');

  expect(skill).toContain('BLUF');
  expect(skill).toContain('SCQA');
  expect(skill).toContain('Top 3');
  expect(skill).toContain('\u4e8b\u5b9e / \u63a8\u65ad / \u5047\u8bbe');
  expect(skill).toContain('CTA');
  expect(skill).toContain('validator warnings as advisory');
  expect(patterns).toContain('Decision Briefing Contract');
  expect(patterns).toContain('Pyramid');
  expect(patterns).toContain('SCQA');
  expect(patterns).toContain('Information Architecture Contract');
  expect(patterns).toContain('PREP');
  expect(patterns).toContain('MECE');
  expect(patterns).toContain('LATCH');
  expect(patterns).toContain('DIKW');
  expect(patterns).toContain('OODA');
  expect(patterns).toContain('Cognitive load');
  expect(patterns).toContain('Information scent');
  expect(patterns).toContain('Information entropy');
  expect(patterns).toContain('fact / inference / assumption');
  expect(patterns).toContain('decision-brief-scan');
  expect(patterns).toContain('Warning Policy');
  expect(patterns).toContain('warning != required fix');
});

test('effective-interact codifies HTML effectiveness patterns without stealing adjacent skills', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');
  const routingDocs = fs.readFileSync('docs/skill-routing.md', 'utf8');

  expect(skill).toContain('HTML makes a user communication point more effective than Markdown');
  expect(skill).toContain('compare them side by side');
  expect(skill).toContain('show spatial structure');
  expect(skill).toContain('collect a user decision through a local export');
  expect(skill).toContain('slide decks; use `frontend-slides`');
  expect(patterns).toContain('Case-Derived Patterns');
  expect(patterns).toContain('option-gallery');
  expect(patterns).toContain('module-map');
  expect(patterns).toContain('flow-drilldown');
  expect(patterns).toContain('pr-writeup');
  expect(patterns).toContain('explorable-explainer');
  expect(patterns).toContain('disposable-export-editor');
  expect(patterns).toContain('Every editor-like artifact must end with an export path');
  expect(routingDocs).toContain('option comparison');
  expect(routingDocs).toContain('lightweight export editor');
  expect(routingDocs).toContain('default-considered skill for non-trivial sessions');
  expect(routingDocs).toContain('material repo or skill change reports');
  expect(routingDocs).toContain('frontend-slides` remains the deck lane');
});

test('effective-interact keeps detailed patterns in references', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');

  expect(skill).toContain('references/interaction-patterns.md');
  expect(skill).toContain('UTF-8');
  expect(skill).toContain('\u8fde\u7eed\u95ee\u53f7\u4e71\u7801');
  expect(skill).toContain('\u4e0d\u8981\u5916\u663e Source fallback');
  expect(patterns).toContain('Interaction Workflow');
  expect(patterns).toContain('Pattern Selection');
  expect(patterns).toContain('Do not build credential or token tools');
  expect(patterns).not.toContain('Current Limits To Correct');
  expect(patterns).not.toContain('Source Inspiration');
  expect(patterns).not.toContain('previous versions failed');
  expect(patterns).not.toContain('Related third-party skills');
  expect(patterns).not.toContain('localStorage');
  expect(skill.length).toBeLessThan(9000);
});

test('effective-interact ships reusable template and component assets', () => {
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

  const css = fs.readFileSync(`${skillDir}/assets/components/interaction-ui.css`, 'utf8');
  const js = fs.readFileSync(`${skillDir}/assets/components/interaction-ui.js`, 'utf8');
  const richCss = fs.readFileSync(`${skillDir}/assets/components/rich-render-runtime.css`, 'utf8');
  const richJs = fs.readFileSync(`${skillDir}/assets/components/rich-render-runtime.js`, 'utf8');
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');

  expect(css).toContain('blur');
  expect(css).toContain(':focus-visible');
  expect(css).toContain('prefers-reduced-motion');
  expect(css).toContain('report-data-table');
  expect(css).toContain('table-row-highlight');
  expect(css).toContain('table-column-highlight');
  expect(css).toContain('table-cell-highlight');
  expect(css).toContain('text-highlight');
  expect(css).toContain('mark.text-highlight');
  expect(css).toContain('.supplemental-panel');
  expect(css).toContain('.claim-card-header');
  expect(css).toContain('.claim-card-title');
  expect(css).toContain('scroll-margin-top');
  expect(css).toContain('.panel:target');
  expect(css).toContain('.section-focus');
  expect(css).toContain('--code-font');
  expect(css).toContain('Cascadia Code');
  expect(css).toContain('.panel > .toolbar[role="tablist"]');
  expect(css).toContain('.report-nav a + a');
  expect(css).toContain('.hljs-title.function_');
  expect(css).toContain('.hljs-attribute');
  expect(js).toContain('data-filter-target');
  expect(js).toContain('data-tab-group');
  expect(js).toContain('data-copy-from');
  expect(js).toContain('fallbackCopyText');
  expect(js).toContain('data-copy-state');
  expect(js).toContain('data-report-data-table');
  expect(js).toContain('applyDataTableHighlight');
  expect(js).toContain('highlightTargetSection');
  expect(js).toContain('hashchange');
  expect(js).toContain('report-top');
  expect(richCss).toContain('rendered-markdown');
  expect(richCss).toContain('rich-status');
  expect(richJs).toContain('marked');
  expect(richJs).toContain('DOMPurify');
  expect(richJs).toContain('mermaid.render');
  expect(richJs).toContain('highlightElement');
  expect(richJs).toContain('fallbackHighlightCode');
  expect(patterns).toContain('marked@18.0.3');
  expect(patterns).toContain('mermaid@11.15.0');
  expect(patterns).toContain('@highlightjs/cdn-assets@11.11.1');
  expect(patterns).toContain('DOMPurify');
  expect(patterns).toContain('Browser-required validation fails when any Mermaid section is not `ready` with an SVG');
});

test('effective-interact emphasizes source-linked code evidence, diffs, and rendered diagrams', () => {
  const css = fs.readFileSync(`${skillDir}/assets/components/interaction-ui.css`, 'utf8');
  const js = fs.readFileSync(`${skillDir}/assets/components/interaction-ui.js`, 'utf8');
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');
  const reviewTemplate = fs.readFileSync(`${skillDir}/assets/templates/review-findings.html`, 'utf8');
  const schema = JSON.parse(fs.readFileSync(`${skillDir}/references/interaction-input-schema.json`, 'utf8'));

  expect(skill).toContain('source file link');
  expect(skill).toContain('line number');
  expect(skill).toContain('diff');
  expect(skill).toContain('Mermaid');
  expect(patterns).toContain('source-linked code evidence');
  expect(patterns).toContain('diff');
  expect(patterns).toContain('Mermaid');
  expect(patterns).toContain('Rich Content Opportunity');
  expect(skill).toContain('Mermaid must render to SVG before handoff');
  expect(skill).toContain('return-to-overview');
  expect(skill).toContain('\u5f53\u5185\u5bb9\u5929\u7136\u662f\u6d41\u7a0b\u3001\u8def\u7531\u3001\u8c03\u7528\u94fe\u3001\u547d\u4ee4\u3001\u914d\u7f6e\u3001\u4ee3\u7801\u6216\u8865\u4e01\u8bc1\u636e\u65f6');
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

test('effective-interact preserves the single-file static interaction boundary', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');

  expect(skill).toContain('static UTF-8 Chinese `.html`');
  expect(skill).toContain('inlineable HTML/CSS and vanilla JS');
  expect(skill).toContain('build step');
  expect(patterns).toContain('Static Component Boundary');
  expect(patterns).toContain('single-file static HTML contract');
  expect(patterns).toContain('vanilla JS only');
  expect(patterns).toContain('one static HTML file');
});

test('effective-interact does not reference external component libraries', () => {
  const searchedFiles = [
    skillPath,
    `${skillDir}/references/interaction-patterns.md`,
    `${skillDir}/assets/components/interaction-ui.css`,
    `${skillDir}/assets/components/interaction-ui.js`,
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

test('effective-interact ships generator, validator, schema, and fixtures', () => {
  const expectedFiles = [
    createInteractionScript,
    validateInteractionScript,
    `${skillDir}/references/interaction-input-schema.json`,
    `${skillDir}/.gitignore`,
    `${skillDir}/assets/fixtures/pre-rendered-report.json`,
    `${skillDir}/assets/fixtures/runtime-report.json`,
    `${skillDir}/assets/fixtures/runtime-cdn-stress-report.json`,
    `${skillDir}/assets/fixtures/table-component-report.json`,
    `${skillDir}/assets/fixtures/option-gallery-report.json`,
    `${skillDir}/assets/fixtures/disposable-export-editor-report.json`,
  ];

  for (const file of expectedFiles) {
    expect(fs.existsSync(file)).toBe(true);
  }

  const schema = JSON.parse(fs.readFileSync(`${skillDir}/references/interaction-input-schema.json`, 'utf8'));
  expect(schema.required).toEqual(['title', 'summary', 'status', 'sections']);
  expect(schema.required).not.toContain('evidence');
  expect(schema.properties.template.enum).toEqual(
    expect.arrayContaining(['implementation-handoff', 'review-findings', 'research-explainer', 'decision-matrix']),
  );
  expect(schema.properties.showRuntimeDependencies.type).toBe('boolean');
  expect(schema.properties.sections.items.properties.type.enum).toContain('diff');
  expect(schema.properties.sections.items.properties.type.enum).toContain('data-table');
  expect(schema.properties.sections.items.properties.columns.type).toBe('array');
  expect(schema.properties.sections.items.properties.rows.type).toBe('array');
  expect(schema.properties.renderMode.enum).toEqual(['runtime-cdn', 'pre-rendered', 'fallback-only', 'runtime']);
  expect(schema.properties.renderMode.default).toBe('runtime-cdn');
  expect(schema.properties.sections.items.properties.group.type).toBe('string');
  expect(schema.properties.sections.items.properties.priority.type).toBe('integer');
  expect(schema.properties.sections.items.properties.summary.type).toBe('string');
  expect(schema.properties.sections.items.properties.status.enum).toContain('degraded');

  const validator = fs.readFileSync(validateInteractionScript, 'utf8');
  expect(validator).toContain('copiedAfterKeyboard');
  expect(validator).toContain('navTargetFocused');
  expect(validator).toContain('did not render ready SVG');
  expect(validator).toContain('runtime failed for');

  const generator = fs.readFileSync(createInteractionScript, 'utf8');
  const skillGitignore = fs.readFileSync(`${skillDir}/.gitignore`, 'utf8');
  expect(generator).toContain('path.join(skillDir, "artifacts")');
  expect(generator).toContain('Default outDir is skills/effective-interact/artifacts/');
  expect(skill).toContain('skills/effective-interact/artifacts/');
  expect(skill).toContain('omit `--out-dir` for ignored skill-local intermediate artifacts');
  expect(skillGitignore).toContain('artifacts/');
});

test('effective-interact reference patterns stay navigable for long documents', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');

  expect(patterns).toContain('## Table of Contents');
  expect(patterns).toContain('- [Generator Contract](#generator-contract)');
  expect(patterns).toContain('- [Validation Contract](#validation-contract)');
});

test('effective-interact validator avoids exec-style scanner false positives', () => {
  const validator = fs.readFileSync(validateInteractionScript, 'utf8');

  expect(validator).not.toContain('.exec(');
  expect(validator).not.toContain('new Function');
  expect(validator).not.toContain('eval(');
});

test('effective-interact generator defaults to ignored skill-local outputs', () => {
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/option-gallery-report.json`,
    '--slug',
    'default-output-smoke',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const normalizedOutput = payload.outputPath.replaceAll('\\', '/');

  expect(normalizedOutput).toContain('skills/effective-interact/artifacts/default-output-smoke.html');
  expect(fs.existsSync(payload.outputPath)).toBe(true);
  fs.rmSync(payload.outputPath, { force: true });
});

test('effective-interact option-gallery fixture renders a compare-first report', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-option-gallery-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/option-gallery-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'option-gallery',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-template="decision-matrix"');
  expect(html).toContain('data-section-type="decision-matrix"');
  expect(html).toContain('Compare-first');
  expect(html).toContain('Option gallery');
  expect(html).toContain('side-by-side');
  expect(html).toContain('data-report-data-table');
  expect(html).toContain('data-copy-from="#next-action-list"');

  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    payload.outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status, validation.stderr).toBe(0);
  expect(JSON.parse(validation.stdout).ok).toBe(true);
});

test('effective-interact disposable export editor fixture renders visible export paths', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-disposable-editor-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/disposable-export-editor-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'disposable-export-editor',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-template="research-explainer"');
  expect(html).toContain('Disposable export editor');
  expect(html).toContain('Visible export only');
  expect(html).toContain('Markdown export');
  expect(html).toContain('JSON export');
  expect(html).toContain('diff export');
  expect(html).toContain('no network writes');
  expect(html).toContain('no repo writes');
  expect(html).toContain('data-section-type="tabs"');
  expect(html).toContain('data-section-type="code"');
  expect(html).toContain('data-section-type="diff"');
  expect(html).toContain('data-copy-from="#next-action-list"');
  expect(html).not.toContain('localStorage');
  expect(html).not.toContain('fetch(');

  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    payload.outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status, validation.stderr).toBe(0);
  expect(JSON.parse(validation.stdout).ok).toBe(true);
});

test('effective-interact schema keeps decision-quality fields optional', () => {
  const schema = JSON.parse(fs.readFileSync(`${skillDir}/references/interaction-input-schema.json`, 'utf8'));

  expect(schema.required).toEqual(['title', 'summary', 'status', 'sections']);
  expect(schema.required).not.toContain('intent');
  expect(schema.required).not.toContain('claims');
  expect(schema.properties.intent.properties.audience.type).toBe('string');
  expect(schema.properties.intent.properties.primaryQuestion.type).toBe('string');
  expect(schema.properties.intent.properties.decision.type).toBe('string');
  expect(schema.properties.intent.properties.timeBudget.type).toBe('string');
  expect(schema.properties.intent.properties.artifactKind.enum).toEqual(expect.arrayContaining(['handoff', 'review', 'status', 'research', 'decision', 'explainer', 'editor']));
  expect(schema.properties.intent.properties.successCriteria.items.type).toBe('string');
  expect(schema.properties.claims.items.properties.evidenceIds.items.type).toBe('string');
  expect(schema.properties.claims.items.properties.kind.enum).toEqual(expect.arrayContaining(['conclusion', 'risk', 'metric', 'trend', 'recommendation', 'assumption']));
  expect(schema.properties.evidence.items.properties.id.type).toBe('string');
  expect(schema.properties.evidence.items.properties.sourceUrl.type).toBe('string');
  expect(schema.properties.evidence.items.properties.filePath.type).toBe('string');
  expect(schema.properties.evidence.items.properties.line.minimum).toBe(1);
  expect(schema.properties.evidence.items.properties.trustLevel.enum).toEqual(['trusted-generated', 'mixed-trust', 'untrusted']);

  const section = schema.properties.sections.items.properties;
  expect(section.type.enum).toContain('chart');
  expect(section.trustLevel.enum).toEqual(['trusted-generated', 'mixed-trust', 'untrusted']);
  expect(section.chart.properties.type.enum).toEqual(['bar', 'line', 'sparkline', 'bullet', 'slope', 'matrix']);
  expect(section.chart.required).toEqual(['type', 'title', 'takeaway', 'data', 'encoding', 'source', 'altText', 'tableFallback']);
});

test('effective-interact generator renders intent, claims, and accessible charts', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-decision-quality-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/chart-accessibility-stress-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'chart-accessibility-stress',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-report-intent');
  expect(html).toContain('data-primary-question=');
  expect(html).toContain('data-time-budget="3m"');
  expect(html).toContain('data-claim-id="claim-chart-contract"');
  expect(html).toContain('data-claim-kind="conclusion"');
  expect(html).toContain('href="#evidence-chart-fixture"');
  expect(html).toContain('data-evidence-id="evidence-chart-fixture"');
  expect(html).toContain('data-trust-level="mixed-trust"');
  expect(html).toContain('data-chart-section');
  expect(html).toContain('data-chart-type="bar"');
  expect(html).toContain('data-chart-alt=');
  expect(html).toContain('data-chart-source');
  expect(html).toContain('data-chart-table-fallback');
  expect(html).toContain('<figcaption');
  expect(html).not.toContain('<canvas');
  expect(html).not.toContain('javascript:');
  expect(html).not.toContain('onerror=');

  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    payload.outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status, validation.stderr).toBe(0);
  const validationPayload = JSON.parse(validation.stdout);
  expect(validationPayload.ok).toBe(true);
  expect(validationPayload.checks).toEqual(expect.arrayContaining([
    'intent-metadata',
    'claims-traceable',
    'chart-accessibility',
    'runtime-audit',
    'safe-sinks',
  ]));
});

test('effective-interact trigger retrofit report keeps first screen compact and non-redundant', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-trigger-retro-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/trigger-scope-retro-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'trigger-retro',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const html = fs.readFileSync(JSON.parse(result.stdout).outputPath, 'utf8');

  expect(html).toContain('class="hero-brief"');
  expect(html).toContain('class="hero-decision-grid"');
  expect(html).toContain('class="hero-stat-grid"');
  expect(html).toContain('class="hero-criteria-list"');
  expect(html).toContain('缺口在触发合同');
  expect(html).toContain('class="report-nav-title">速览</div>');
  expect(html).toContain('class="panel supplemental-panel" id="claims"');
  expect(html).toContain('class="claim-card-header"');
  expect(html).toContain('class="claim-card-title"');
  expect(html).toContain('data-copy-from="#next-action-list"');
  expect(html).toContain('data-render-mode="runtime-cdn"');
  expect(html).toContain('data-section-type="mermaid"');
  expect(html).toContain('data-rich-mermaid-target');
  expect(html).toContain('data-section-type="code"');
  expect(html).toContain('data-rich-code');
  expect(html).toContain('language-yaml');
  const navHtml = html.match(/<nav[\s\S]*?<\/nav>/)?.[0] || '';
  const navLabels = [...navHtml.matchAll(/<span>([^<]+)<\/span>/g)].map((match) => match[1]);
  expect(navLabels).toEqual(['总览', '触发合同修复', '触发决策链路', '触发描述证据', '验收信号', '边界不变', '关键判断', '证据', '验证', '下一步']);
  expect(html).not.toContain('class="lede-grid"');
  expect(html).not.toContain('<h2>结论</h2>');
  expect(html).not.toContain('<h2>Claims</h2>');
  expect(html).not.toContain('<div class="meta">结论</div><strong>结论：');
  expect(html).not.toContain('<p class="meta">验证</p>\n      <h2>验证</h2>');
  expect(html).not.toContain('<p class="meta">下一步</p>\n      <h2>下一步</h2>');
});

test('effective-interact validator rejects navigation order mismatches', async () => {
  const validateModule = await import(pathToFileURL(path.resolve(validateInteractionScript)).href);
  const html = `<!doctype html>
<html lang="zh-CN" data-html-work-report data-render-mode="pre-rendered" data-runtime-state="not-runtime">
<head><meta charset="utf-8"><title>Navigation order fixture</title><style>@media (prefers-reduced-motion: reduce) { * { transition: none; } }</style></head>
<body>
  <main>
    <header class="report-hero" data-report-intent data-primary-question="Does nav follow body?" data-time-budget="30s"><h1>Navigation order fixture</h1><p><strong>Conclusion exists.</strong></p></header>
    <nav data-report-nav><div class="report-nav-group"><a data-nav-link href="#second">Second</a><a data-nav-link href="#first">First</a></div></nav>
    <div class="report-section-stack">
      <section id="first" data-section-type="summary" data-section-group="summary" data-render-state="ready"><h2>First</h2><p>First section.</p></section>
      <section id="second" data-section-type="summary" data-section-group="summary" data-render-state="ready"><h2>Second</h2><p>Second section.</p></section>
    </div>
  </main>
</body></html>`;

  const result = validateModule.validateStatic(html);
  expect(result.ok).toBe(false);
  expect(result.issues.some((issue: string) => issue.startsWith('navigation-order:'))).toBe(true);
});

test('effective-interact degrades unsupported charts and keeps untrusted content inert', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-unsupported-chart-'));
  const inputPath = path.join(tmpDir, 'unsupported-chart.json');
  fs.writeFileSync(inputPath, JSON.stringify({
    title: 'Unsupported chart fallback',
    summary: 'Unsupported charts should become an auditable table, not active content.',
    status: 'review',
    renderMode: 'pre-rendered',
    sections: [
      {
        type: 'markdown',
        title: 'Untrusted note',
        trustLevel: 'untrusted',
        content: '[bad](javascript:alert(1)) <img src=x onerror=alert(1)> <script>alert(1)</script>'
      },
      {
        type: 'chart',
        title: 'Pie request',
        chart: {
          type: 'pie',
          title: 'Unsupported pie',
          takeaway: 'Fallback table is the only output.',
          data: [{ label: 'A', value: 1 }],
          encoding: { label: 'label', value: 'value' },
          source: { label: 'Fixture' },
          altText: 'Unsupported pie chart request.',
          tableFallback: {
            columns: ['label', 'value'],
            rows: [{ label: 'A', value: 1 }]
          }
        }
      }
    ]
  }), 'utf8');

  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    inputPath,
    '--out-dir',
    tmpDir,
    '--slug',
    'unsupported-chart',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const html = fs.readFileSync(JSON.parse(result.stdout).outputPath, 'utf8');
  expect(html).toContain('data-chart-degraded="unsupported-chart-type"');
  expect(html).toContain('data-chart-table-fallback');
  expect(html).toContain('data-trust-level="untrusted"');
  expect(html).not.toContain('<canvas');
  expect(html).not.toContain('javascript:');
  expect(html).not.toContain('onerror=');
  expect(html).not.toContain('<script>alert');
});

test('effective-interact validator identifies unsupported important claims and chart defects', async () => {
  const validateModule = await import(pathToFileURL(path.resolve(validateInteractionScript)).href);
  const html = `<!doctype html>
<html lang="zh-CN" data-html-work-report data-render-mode="pre-rendered" data-template="decision-matrix" data-runtime-state="not-runtime">
<head><meta charset="utf-8"><title>Bad report</title><style>@media (prefers-reduced-motion: reduce) { * { transition: none; } }</style></head>
<body>
  <main class="report-shell">
    <header class="report-hero" data-report-region="hero" data-report-intent data-primary-question="Should we ship?">
      <h1 class="report-title">Bad report</h1>
      <article><strong>Conclusion exists.</strong></article>
    </header>
    <div class="report-layout">
      <nav data-report-nav><div class="report-nav-group"><a data-nav-link href="#claim">Claim</a></div></nav>
      <div class="report-section-stack">
        <section id="claim" data-section-type="claims" data-section-group="summary" data-section-status="ready" data-claim-id="claim-risk" data-claim-kind="risk">
          <h2>Risk claim</h2><p>Important unsupported claim.</p>
        </section>
        <section id="chart" data-section-type="chart" data-section-group="main" data-section-status="ready" data-chart-section data-chart-type="bar">
          <h2>Chart</h2><figure><div data-chart-visual></div></figure>
        </section>
      </div>
    </div>
  </main>
</body>
</html>`;

  const result = validateModule.validateStatic(html);

  expect(result.ok).toBe(false);
  expect(result.issues).toEqual(expect.arrayContaining([
    expect.stringContaining('claim claim-risk lacks evidence'),
    expect.stringContaining('chart chart lacks alt text'),
    expect.stringContaining('chart chart lacks table fallback'),
    expect.stringContaining('chart chart lacks source metadata'),
  ]));
});

test('effective-interact data-table component renders hoverable row and column highlights', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-table-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/table-component-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'table-component-fixture',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-section-type="data-table"');
  expect(html).toContain('data-table-section');
  expect(html).toContain('class="report-data-table"');
  expect(html).toContain('data-report-data-table');
  expect(html).toContain('data-table-cell');
  expect(html).toContain('data-table-row=');
  expect(html).toContain('data-table-column=');
  expect(html).toContain('table-row-highlight');
  expect(html).toContain('table-column-highlight');
  expect(html).toContain('table-cell-highlight');
  expect(html).toContain('transform: scale(1.045)');
  expect(html).toContain('applyDataTableHighlight');
  expect(html).toContain('<strong>Table-first</strong>');
  expect(html).toContain('<em>short phrases</em>');
  expect(html).toContain('<mark class="text-highlight">visual anchor</mark>');
  expect(html).toContain('<strong>Risk</strong>');
  expect(html).toContain('<mark class="text-highlight">row + column</mark>');
  expect(html).not.toMatch(/\?{4,}/);

  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    payload.outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status, validation.stderr).toBe(0);
  const validationPayload = JSON.parse(validation.stdout);
  expect(validationPayload.ok).toBe(true);
  expect(validationPayload.checks).toEqual(expect.arrayContaining([
    'data-table-rendered',
    'data-table-hover',
  ]));
});

test('effective-interact validator emits non-blocking readability warnings', async () => {
  const validateModule = await import(pathToFileURL(path.resolve(validateInteractionScript)).href);
  const longParagraph = 'This paragraph intentionally keeps many words in one block so the readability validator can warn that the report should be split into a shorter conclusion, bullets, table rows, or progressive disclosure instead of one dense paragraph.';
  const longBullet = 'This bullet intentionally combines a risk, an action, supporting context, and validation status into one item so the validator can recommend one judgment or action per bullet.';
  const longCell = 'This table cell intentionally reads like a sentence with multiple clauses instead of a short phrase, so the validator can warn that table cells should stay concise.';
  const html = `<!doctype html>
<html lang="zh-CN" data-html-work-report data-render-mode="pre-rendered">
<head><meta charset="utf-8"><title>Readability fixture</title><style>@media (prefers-reduced-motion: reduce) { * { transition: none; } }</style></head>
<body>
  <main>
    <header class="report-hero" data-report-intent data-primary-question="Is this readable?" data-time-budget="30s"><h1>Readability fixture</h1><p>Conclusion exists.</p></header>
    <nav data-report-nav><div class="report-nav-group"><a data-nav-link href="#summary">Summary</a></div></nav>
    <section id="summary" data-section-type="markdown" data-section-group="summary" data-render-state="ready" data-source-fallback>
      <div class="rendered-markdown">
        <p>${longParagraph}</p>
        <ul><li>${longBullet}</li></ul>
        <table><thead><tr><th>Status</th></tr></thead><tbody><tr><td>${longCell}</td></tr></tbody></table>
      </div>
      <template data-rich-source data-source-fallback>source</template>
    </section>
  </main>
</body>
</html>`;

  const result = validateModule.validateStatic(html);

  expect(result.ok).toBe(true);
  expect(result.warnings).toEqual(expect.arrayContaining([
    expect.stringContaining('paragraph too long'),
    expect.stringContaining('bullet too long'),
    expect.stringContaining('table cell too long'),
    expect.stringContaining('missing visual anchors'),
  ]));
});

test('effective-interact validator warns on weak decision brief structure', async () => {
  const validateModule = await import(pathToFileURL(path.resolve(validateInteractionScript)).href);
  const html = `<!doctype html>
<html lang="zh-CN" data-html-work-report data-render-mode="pre-rendered" data-status="complete">
<head><meta charset="utf-8"><title>Weak brief fixture</title><style>@media (prefers-reduced-motion: reduce) { * { transition: none; } }</style></head>
<body>
  <main>
    <header class="report-hero" data-report-intent data-primary-question="What changed?" data-time-budget="30s">
      <h1>Weak brief fixture</h1>
      <p class="hero-summary-text">This update includes background, implementation notes, observations, context, and several possible interpretations before it eventually reaches the answer.</p>
    </header>
    <nav data-report-nav><div class="report-nav-group"><a data-nav-link href="#claims">Claims</a></div></nav>
    <section id="claims" data-section-type="claims" data-section-group="claims" data-render-state="ready">
      <article data-claim-id="c1" data-claim-kind="conclusion" data-claim-confidence="high" data-claim-evidence><h2>Claim 1</h2></article>
      <article data-claim-id="c2" data-claim-kind="risk" data-claim-confidence="high" data-claim-evidence><h2>Claim 2</h2></article>
      <article data-claim-id="c3" data-claim-kind="recommendation" data-claim-confidence="high" data-claim-evidence><h2>Claim 3</h2></article>
      <article data-claim-id="c4" data-claim-kind="metric" data-claim-confidence="high" data-claim-evidence><h2>Claim 4</h2></article>
    </section>
  </main>
</body>
</html>`;

  const result = validateModule.validateStatic(html);

  expect(result.ok).toBe(true);
  expect(result.checks).toContain('decision-brief-scan');
  expect(result.warnings).toEqual(expect.arrayContaining([
    expect.stringContaining('advisory: decision brief: lead with BLUF'),
    expect.stringContaining('advisory: decision brief: keep top-level claims to 3 or fewer'),
    expect.stringContaining('advisory: decision brief: add a next action or CTA'),
  ]));
});

test('effective-interact validator warns when rich rendering opportunities stay as prose', async () => {
  const validateModule = await import(pathToFileURL(path.resolve(validateInteractionScript)).href);
  const html = `<!doctype html>
<html lang="zh-CN" data-html-work-report data-render-mode="pre-rendered">
<head><meta charset="utf-8"><title>Rich opportunity fixture</title><style>@media (prefers-reduced-motion: reduce) { * { transition: none; } }</style></head>
<body>
  <main>
    <header class="report-hero" data-report-intent data-primary-question="Should this report use rich rendering?" data-time-budget="30s"><h1>Rich opportunity fixture</h1><p><strong>Conclusion exists.</strong></p></header>
    <nav data-report-nav><div class="report-nav-group"><a data-nav-link href="#summary">Summary</a><a data-nav-link href="#evidence">Evidence</a></div></nav>
    <section id="summary" data-section-type="summary" data-section-group="summary" data-render-state="ready">
      <h2>Summary</h2>
      <p><strong>Flow evidence:</strong> the trigger routing path moves from completed OpenSpec work to the effective-interact handoff and then to browser validation.</p>
    </section>
    <section id="evidence" data-section-type="evidence" data-section-group="evidence" data-render-state="ready">
      <h2>Evidence</h2>
      <article data-evidence data-evidence-kind="file" data-file-path="skills/effective-interact/SKILL.md" data-line="3">skills/effective-interact/SKILL.md:3</article>
    </section>
  </main>
</body>
</html>`;

  const result = validateModule.validateStatic(html);

  expect(result.ok).toBe(true);
  expect(result.checks).toContain('rich-content-opportunity-scan');
  expect(result.warnings).toEqual(expect.arrayContaining([
    expect.stringContaining('advisory: rich content opportunity: consider Mermaid'),
    expect.stringContaining('advisory: rich content opportunity: consider code or diff'),
  ]));
});

test('effective-interact stress fixture covers runtime-cdn quality risks', () => {
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
  expect(JSON.stringify(fixture)).not.toMatch(/(^|[^A-Za-z])[A-Za-z]:[\\/]/);
});

test('effective-interact generator creates a self-contained pre-rendered report', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
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

test('effective-interact static fallback highlighter keeps inserted spans intact', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-code-'));
  const inputPath = path.join(tmpDir, 'input.json');
  fs.writeFileSync(inputPath, JSON.stringify({
    title: 'Code highlight smoke',
    summary: 'Status: code fallback stays valid.',
    status: 'complete',
    renderMode: 'pre-rendered',
    sections: [
      {
        type: 'code',
        title: 'Class and function tokens',
        language: 'typescript',
        filePath: 'src/example.ts',
        startLine: 1,
        content: 'class Foo {\n  value: number = 1;\n}\nfunction run() { return true; }',
      },
    ],
  }), 'utf8');

  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    inputPath,
    '--out-dir',
    tmpDir,
    '--slug',
    'code-highlight-smoke',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const html = fs.readFileSync(JSON.parse(result.stdout).outputPath, 'utf8');

  expect(html).not.toContain('<span <span');
  expect(html).not.toContain('class=<span');
  expect(html).toContain('hljs-title class_');
  expect(html).toContain('hljs-title function_');
  expect(html).toContain('hljs-type');
  expect(html).toContain('hljs-attr');
});

test('effective-interact sanitizes Mermaid fallback diagnostics', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-mermaid-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/pre-rendered-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'browser-mermaid-fallback',
    '--json',
    '--browser-mermaid',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-mermaid-renderer="fallback"');
  expect(html).toContain('Playwright unavailable');
  expect(html).not.toContain(process.cwd());
  expect(html).not.toMatch(/[A-Za-z]:[\\/](?:Users|skill-hub|code-agent-harness)[^<\s]*/);
  expect(html).not.toMatch(/file:\/\/\//i);
  expect(html).not.toMatch(/\b(?:gho|ghp|github_pat)_[A-Za-z0-9_]+/);
});

test('effective-interact sanitizes generator and validator diagnostics', async () => {
  const createModule = await import(pathToFileURL(path.resolve(createInteractionScript)).href);
  const validateModule = await import(pathToFileURL(path.resolve(validateInteractionScript)).href);
  const raw = [
    'file:///C:/Users/Admin/secret/report.html',
    'C:\\Users\\Admin\\token\\report.html',
    '/home/admin/private/report.html',
    '<script>alert(1)</script>',
    'javascript:alert(1)',
    'onerror=alert(1)',
    'ghp_abcdefghijklmnopqrstuvwxyz1234567890',
  ].join(' ');

  for (const sanitize of [createModule.sanitizeDiagnosticMessage, validateModule.sanitizeDiagnosticMessage]) {
    const cleaned = sanitize(raw);

    expect(cleaned).toContain('[local-file]');
    expect(cleaned).toContain('[local-path]');
    expect(cleaned).toContain('[token]');
    expect(cleaned).toContain('blocked-protocol:');
    expect(cleaned).not.toContain('C:\\Users');
    expect(cleaned).not.toContain('/home/admin');
    expect(cleaned).not.toContain('file:///');
    expect(cleaned).not.toContain('<script>');
    expect(cleaned).not.toContain('onerror=');
    expect(cleaned).not.toContain('ghp_');
    expect(cleaned).not.toContain('javascript:');
    expect(cleaned.length).toBeLessThanOrEqual(220);
  }
});

test('effective-interact runtime-cdn mode declares pinned dependencies and source fallbacks', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-runtime-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
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

test('effective-interact keeps optional modules out of concise reports', () => {
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
        content: '- 导航按正文阅读顺序排列。\n- 没有明确需要时，不展示代码、图表、证据、验证或下一步。'
      }
    ]
  }), 'utf8');

  const result = spawnSync(process.execPath, [
    createInteractionScript,
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
  expect(nav).toContain('data-nav-order="dom"');
  expect(nav).toContain('阅读顺序');
  expect(nav).toContain('结论');
  expect(nav).toContain('data-nav-group-name="summary"');
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
    validateInteractionScript,
    outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status, validation.stderr).toBe(0);
  expect(JSON.parse(validation.stdout).ok).toBe(true);
});

test('effective-interact defaults to runtime-cdn and maps legacy runtime alias', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-default-mode-'));
  const base = JSON.parse(fs.readFileSync(`${skillDir}/assets/fixtures/runtime-report.json`, 'utf8'));
  delete base.renderMode;
  const defaultInput = path.join(tmpDir, 'default.json');
  fs.writeFileSync(defaultInput, JSON.stringify(base), 'utf8');

  const defaultResult = spawnSync(process.execPath, [
    createInteractionScript,
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
    createInteractionScript,
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

test('effective-interact emits Chinese UTF-8 output and rejects mojibake', () => {
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
    createInteractionScript,
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
  expect(html).toContain('速览');
  expect(html).toContain('结论');
  expect(html).not.toContain('生成时间');
  expect(html).not.toMatch(/\?{4,}/);
  expect(html).not.toContain('\uFFFD');

  const badPath = path.join(tmpDir, 'bad.html');
  fs.writeFileSync(badPath, html.replace('中文汇报质量检查', 'HTML ' + '??' + '???' + ' 质量检查'), 'utf8');
  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    badPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status).toBe(1);
  const payload = JSON.parse(validation.stdout);
  expect(payload.ok).toBe(false);
  expect(payload.issues.join('\n')).toContain('mojibake');
});

test('effective-interact keeps code rows compact without generated blank rows', () => {
  const createInteraction = fs.readFileSync(createInteractionScript, 'utf8');
  const runtime = fs.readFileSync(`${skillDir}/assets/components/rich-render-runtime.js`, 'utf8');
  const css = fs.readFileSync(`${skillDir}/assets/components/interaction-ui.css`, 'utf8');

  expect(createInteraction).toContain('highlighted.join("")');
  expect(createInteraction).toContain('}).join("");');
  expect(runtime).toContain('}).join("");');
  expect(css).toContain('font: 500 13px/1.35 var(--code-font)');
  expect(css).toContain('line-height: 1.35');
});

test('effective-interact validator checks structure and reports degraded browser coverage', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-validate-'));
  const generated = spawnSync(process.execPath, [
    createInteractionScript,
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
    validateInteractionScript,
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

test('effective-interact showcase remains a rich feature fixture', () => {
  const showcase = fs.readFileSync('reports/effective-interact-feature-showcase.html', 'utf8');

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
