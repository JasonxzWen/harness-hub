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
const checkModeStructureScript = `${skillDir}/scripts/check-mode-structure.mjs`;

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('effective-interact has a low-noise complex communication trigger description', () => {
  const description = frontmatterValue('description');

  expect(description.startsWith('Load when')).toBe(true);
  expect(description.split(/\s+/).length).toBeLessThanOrEqual(70);
  expect(description).toContain('agent pauses to report relatively complex information');
  expect(description).toContain('Chinese-first');
  expect(description).toContain('clear complex communication');
  expect(description).toContain('alignment');
  expect(description).toContain('multi-option choice');
  expect(description).toContain('status/incident');
  expect(description).toContain('long-task fact ledgers');
  expect(description).toContain('implementation plans');
  expect(description).toContain('maps');
  expect(description).toContain('explainers');
  expect(description).toContain('evidence');
  expect(description).toContain('risks');
  expect(description).toContain('validation');
  expect(description).toContain('reviews');
  expect(description).toContain('handoff');
  expect(description).toContain('plain text');
  expect(description).toContain('Markdown');
  expect(description).toContain('visual Markdown');
  expect(description).toContain('HTML');
  expect(description).toContain('decision cost');
  expect(description).toContain('do not load merely because answer is long');
  expect(description).toContain('trivial chat');
  expect(description).toContain('bundled apps');
});

test('effective-interact documents positive and negative trigger examples', () => {
  expect(skill).toContain('## Trigger Examples');
  expect(skill).toContain('复杂状态汇报');
  expect(skill).toContain('200 Chinese characters');
  expect(skill).toContain('changed skill/repo behavior');
  expect(skill).toContain('choose before you implement');
  expect(skill).toContain('HTML handoff');
  expect(skill).toContain('OpenSpec apply');
  expect(skill).toContain('implementation plan with milestones');
  expect(skill).toContain('validation gates');
  expect(skill).toContain('HTML architecture walkthrough');
  expect(skill).toContain('design-system reference');
  expect(skill).toContain('component variant matrix');
  expect(skill).toContain('incident timeline');
  expect(skill).toContain('review');
  expect(skill).toContain('JSON');
  expect(skill).toContain('side-by-side option gallery');
  expect(skill).toContain('temporary triage, feature-flag, or prompt editor that exports Markdown, JSON, or diff');
  expect(skill).toContain('Do not use this skill for:');
  expect(skill).toContain('approval gates such as');
  expect(skill).toContain('doing code implementation, bug fixes, or test runs');
  expect(skill).toContain('long but routine explanation');
  expect(skill).toContain('one-command status');
  expect(skill).toContain('slide decks; use `frontend-slides`');
});

test('effective-interact treats complex communication as the core job', () => {
  expect(skill).toContain('Default: load this skill whenever the agent is about to pause and report relatively complex information');
  expect(skill).toContain('does not have to wait for an owner workflow to select it');
  expect(skill).toContain('does not replace the owner workflow or decide substantive scope');
  expect(skill).toContain('Do not load merely because the answer may exceed roughly 200 Chinese characters');
  expect(skill).toContain('200 Chinese characters and 3 or more independent points are auxiliary signals');
  expect(skill).toContain('communication-worthiness check');
  expect(skill).toContain('visual-language check');
  expect(skill).toContain('think in visual language first');
  expect(skill).toContain('interaction time and information loss');
  expect(skill).toContain('Reader need');
  expect(skill).toContain('Decision frame');
  expect(skill).toContain('plain-brief');
  expect(skill).toContain('structured-markdown');
  expect(skill).toContain('visual-markdown');
  expect(skill).toContain('html-artifact');
  expect(skill).toContain('Unless you intentionally choose `plain-brief`, include at least one visible visual structure');
  expect(skill).toContain('HTML is an escalation path, not the default goal');
  expect(skill).toContain('material repo or skill behavior changes are the default HTML handoff exception');
});

test('effective-interact can shape communication before, during, or after implementation', () => {
  expect(skill).toContain('Use this skill before, during, or after implementation');
  expect(skill).toContain('planning options');
  expect(skill).toContain('PR writeups');
  expect(skill).toContain('prompt/config tuners');
  expect(skill).toContain('status or incident dashboards');
  expect(skill).toContain('material-change reports');
  expect(skill).toContain('interaction points, not only final handoffs');
  expect(skill).toContain('The user does not need to say "HTML"');
});

test('effective-interact defines communication and output-mode gates', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');

  expect(skill).toContain('## Default Load And Communication Gate');
  expect(skill).toContain('200 Chinese characters');
  expect(skill).toContain('auxiliary signal');
  expect(skill).toContain('3 or more independent points');
  expect(skill).toContain('primary trigger is the user decision need');
  expect(skill).toContain('Use the lightest mode that lowers decision cost');
  expect(skill).toContain('material repo/skill implementation');
  expect(skill).toContain('repo/module/skill explainers need capability');
  expect(skill).toContain('When repo or skill behavior materially changes, create a validated `html-artifact` handoff by default');
  expect(skill).toContain('2 or more comparable options');
  expect(skill).toContain('flow, state, timeline, map, call path, or architecture');
  expect(skill).toContain('user must choose, tune, sort, filter, copy, export, or inspect');
  expect(skill).toContain('source anchors, code, diff, citations, evidence, or validation');
  expect(skill).toContain('plain text would hide the main point');
  expect(skill).toContain('If no strong signal and no handoff obligation is present, answer in chat or Markdown');
  expect(patterns).toContain('Default Session Routing');
  expect(patterns).toContain('Visual Language First');
  expect(patterns).toContain('HTML handoff is a visual communication artifact, not Markdown wrapped in a browser');
  expect(patterns).toContain('reduce interaction time and information loss');
  expect(patterns).toContain('Do not draft a linear handoff first');
  expect(patterns).toContain('Output Mode Gate');
  expect(patterns).toContain('Material repo or skill behavior changed');
  expect(patterns).toContain('Strong signal');
  expect(patterns).toContain('Plain text or Markdown default');
  expect(patterns).toContain('default to a validated `implementation-handoff` or `conclusion-dashboard` HTML artifact');
  expect(patterns).toContain('Length is never sufficient by itself');
  expect(patterns).toContain('non-`plain-brief` outputs should not collapse back into linear prose');
  expect(skill).toContain('never because the topic is important');
});

test('effective-interact defines hard output-mode escalation criteria', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');

  expect(skill).toContain('## Mode Selection Hard Rules');
  expect(skill).toContain('Do not load for a long but routine answer');
  expect(skill).toContain('Use `html-artifact` only when a hard HTML condition is true');
  expect(skill).toContain('Any mode other than `plain-brief` must show at least one visible visual structure before handoff');
  expect(skill).toContain('material repo/skill behavior changed and handoff evidence matters');
  expect(skill).toContain('more than 5 source anchors');
  expect(skill).toContain('user must filter, sort, compare, copy, or export');
  expect(skill).toContain('repo capability/function/implementation map');
  expect(skill).toContain('visual style, component variant, design-system, illustration, prototype, or multi-option approval needs a browsable gallery');
  expect(skill).toContain('status/incident/editor surface needs drilldown or visible export');
  expect(skill).toContain('HTML handoff must be visualized');
  expect(skill).toContain('Avoid Markdown-in-HTML handoffs and decorative visuals');
  expect(skill).toContain('HTML escalation is forbidden when one compact Markdown table, one Mermaid diagram, or one short file list is enough, except for material repo/skill handoffs');
  expect(patterns).toContain('Hard HTML conditions');
  expect(patterns).toContain('Material repo or skill behavior changed and the final handoff needs changed areas');
  expect(patterns).toContain('Use the lower mode when in doubt');
});

test('effective-interact has reviewable low-noise mode decision cases', () => {
  const casesPath = `${skillDir}/assets/fixtures/communication-mode-cases.json`;
  expect(fs.existsSync(casesPath)).toBe(true);

  const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8')) as {
    cases: Array<{ id: string; shouldLoad: boolean; expectedMode: string | null; reason: string }>;
  };
  const ids = new Set(cases.cases.map((entry) => entry.id));
  const modes = new Set(cases.cases.map((entry) => entry.expectedMode).filter(Boolean));

  expect(cases.cases.some((entry) => entry.id.includes('routine-long') && !entry.shouldLoad)).toBe(true);
  expect(cases.cases.some((entry) => entry.id.includes('short-decision') && entry.shouldLoad)).toBe(true);
  expect(modes).toEqual(new Set(['plain-brief', 'structured-markdown', 'visual-markdown', 'html-artifact']));

  for (const entry of cases.cases) {
    expect(entry.reason.length).toBeGreaterThan(12);
    if (entry.shouldLoad) {
      expect(entry.expectedMode).not.toBeNull();
    } else {
      expect(entry.expectedMode).toBeNull();
    }
  }
});

test('effective-interact ships skill-local routing evals for trigger and HTML timing', () => {
  const evalsPath = `${skillDir}/evals/routing-cases.json`;
  expect(fs.existsSync(evalsPath)).toBe(true);

  const evals = JSON.parse(fs.readFileSync(evalsPath, 'utf8')) as {
    version: number;
    cases: Array<{
      id: string;
      kind: 'positive' | 'negative' | 'forbidden-load';
      prompt: string;
      shouldLoad: boolean;
      expectedMode: string | null;
      expectedSkill: string | null;
      htmlEscalation: boolean;
      expectedArtifactShape?: string;
      rationale: string;
    }>;
  };
  const ids = new Set(evals.cases.map((entry) => entry.id));
  const kinds = new Set(evals.cases.map((entry) => entry.kind));
  const modes = new Set(evals.cases.map((entry) => entry.expectedMode).filter(Boolean));

  expect(evals.version).toBe(1);
  expect(kinds).toEqual(new Set(['positive', 'negative', 'forbidden-load']));
  expect(modes).toEqual(new Set(['plain-brief', 'structured-markdown', 'visual-markdown', 'html-artifact']));
  expect(ids.has('positive-multi-option-approval-html')).toBe(true);
  expect(ids.has('positive-visual-style-approval-html')).toBe(true);
  expect(ids.has('positive-milestone-dependency-html')).toBe(true);
  expect(ids.has('positive-module-dependency-html')).toBe(true);
  expect(ids.has('positive-repo-capability-implementation-map-html')).toBe(true);
  expect(ids.has('positive-skill-structure-tree-html')).toBe(true);
  expect(ids.has('positive-code-approach-comparison-html')).toBe(true);
  expect(ids.has('positive-implementation-plan-html')).toBe(true);
  expect(ids.has('positive-pr-writeup-html')).toBe(true);
  expect(ids.has('positive-code-understanding-map-html')).toBe(true);
  expect(ids.has('positive-design-system-reference-html')).toBe(true);
  expect(ids.has('positive-component-variant-matrix-html')).toBe(true);
  expect(ids.has('positive-prototype-animation-approval-html')).toBe(true);
  expect(ids.has('positive-prototype-interaction-approval-html')).toBe(true);
  expect(ids.has('positive-illustration-gallery-html')).toBe(true);
  expect(ids.has('positive-annotated-flowchart-html')).toBe(true);
  expect(ids.has('positive-research-feature-explainer-html')).toBe(true);
  expect(ids.has('positive-research-concept-explainer-html')).toBe(true);
  expect(ids.has('positive-status-dashboard-html')).toBe(true);
  expect(ids.has('positive-long-task-session-ledger-html')).toBe(true);
  expect(ids.has('positive-incident-report-html')).toBe(true);
  expect(ids.has('positive-triage-board-editor-html')).toBe(true);
  expect(ids.has('positive-feature-flag-editor-html')).toBe(true);
  expect(ids.has('positive-prompt-tuner-editor-html')).toBe(true);
  expect(ids.has('negative-production-ui-visual-design')).toBe(true);
  expect(ids.has('negative-slide-deck-milestones')).toBe(true);
  expect(ids.has('negative-throwaway-prototype-build')).toBe(true);
  expect(ids.has('forbidden-routine-long-explanation')).toBe(true);
  expect(ids.has('forbidden-permission-only-pause')).toBe(true);
  expect(ids.has('forbidden-short-status-ledger')).toBe(true);

  for (const entry of evals.cases) {
    expect(entry.prompt.trim().length).toBeGreaterThan(8);
    expect(entry.rationale.trim().length).toBeGreaterThan(12);
    if (entry.shouldLoad) {
      expect(entry.expectedSkill).toBe('effective-interact');
      expect(entry.expectedMode).not.toBeNull();
    } else {
      expect(entry.expectedMode).toBeNull();
    }
    if (entry.htmlEscalation) {
      expect(entry.expectedMode).toBe('html-artifact');
      expect(entry.expectedArtifactShape).toBeTruthy();
    }
  }
});

test('effective-interact codifies decision-first briefing quality', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');

  expect(skill).toContain('First-Principles Communication Contract');
  expect(skill).toContain('goal, audience, constraints, facts, inferences, assumptions, tradeoffs, and next action');
  expect(skill).toContain('Handoff obligation exists only when');
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
  expect(patterns).toContain('First-principles communication');
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

test('effective-interact codifies long-task session fact ledgers', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');
  const schemaPath = `${skillDir}/references/session-ledger-schema.json`;
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const skillGitignore = fs.readFileSync(`${skillDir}/.gitignore`, 'utf8');
  const evals = JSON.parse(fs.readFileSync(`${skillDir}/evals/routing-cases.json`, 'utf8')) as {
    cases: Array<{ id: string }>;
  };
  const ids = new Set(evals.cases.map((entry) => entry.id));

  expect(skill).toContain('Long Task Fact Ledger');
  expect(skill).toContain('artifacts/session-ledgers/<task-slug>.jsonl');
  expect(skill).toContain('tool-result summaries');
  expect(skill).toContain('Never record secrets');
  expect(patterns).toContain('Long Task Session Ledger');
  expect(patterns).toContain('references/session-ledger-schema.json');
  expect(patterns).toContain('Do not record secrets');
  expect(patterns).toContain('Summarize tool output');
  expect(patterns).toContain('If the skill directory is unavailable or unwritable');
  expect(schema.additionalProperties).toBe(false);
  expect(schema.required).toEqual(['ts', 'kind', 'summary']);
  expect(schema.properties.kind.enum).toEqual(expect.arrayContaining([
    'checkpoint',
    'tool-result',
    'decision',
    'assumption',
    'risk',
    'blocker',
    'verification',
    'handoff-source',
  ]));
  expect(schema.properties.source.additionalProperties).toBe(false);
  expect(skillGitignore).toContain('artifacts/');
  expect(ids.has('positive-long-task-session-ledger-html')).toBe(true);
  expect(ids.has('forbidden-short-status-ledger')).toBe(true);
});

test('effective-interact codifies output-mode escalation without stealing adjacent skills', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');
  const routingDocs = fs.readFileSync('docs/skill-routing.md', 'utf8');

  expect(skill).toContain('HTML when browser navigation, visualization, or local interaction lowers decision cost');
  expect(skill).toContain('have tradeoffs');
  expect(skill).toContain('needs spatial structure');
  expect(skill).toContain('user must choose, tune, sort, filter, copy, export, or inspect');
  expect(skill).toContain('slide decks; use `frontend-slides`');
  expect(patterns).toContain('Plain-Text And Markdown Patterns');
  expect(patterns).toContain('Case-Derived Patterns');
  expect(patterns).toContain('approach-comparison');
  expect(patterns).toContain('visual-style-board');
  expect(patterns).toContain('implementation-plan');
  expect(patterns).toContain('review-findings');
  expect(patterns).toContain('module-map');
  expect(patterns).toContain('repo-capability-map');
  expect(patterns).toContain('flow-drilldown');
  expect(patterns).toContain('pr-writeup');
  expect(patterns).toContain('explorable-explainer');
  expect(patterns).toContain('status-dashboard');
  expect(patterns).toContain('incident-report');
  expect(patterns).toContain('disposable-export-editor');
  expect(patterns).toContain('Every editor-like artifact must end with an export path');
  expect(routingDocs).toContain('complex communication and alignment');
  expect(routingDocs).toContain('option comparison');
  expect(routingDocs).toContain('lightweight export editor');
  expect(routingDocs).toContain('default reporting layer when the agent is about to pause on relatively complex information');
  expect(routingDocs).toContain('material repo or skill behavior changes, default to a validated HTML handoff');
  expect(routingDocs).toContain('any output other than `plain-brief` should expose at least one visible visual structure');
  expect(routingDocs).toContain('frontend-slides` remains the deck lane');
});

test('effective-interact keeps detailed patterns in references', () => {
  const patterns = fs.readFileSync(`${skillDir}/references/interaction-patterns.md`, 'utf8');

  expect(skill).toContain('references/interaction-patterns.md');
  expect(skill).toContain('references/html-effectiveness-patterns.md');
  expect(skill).toContain('UTF-8');
  expect(skill).toContain('\u8fde\u7eed\u95ee\u53f7\u4e71\u7801');
  expect(skill).toContain('\u4e0d\u8981\u5916\u663e Source fallback');
  expect(patterns).toContain('Interaction Workflow');
  expect(patterns).toContain('Pattern Selection');
  expect(patterns).toContain('docs/harness-vocabulary.md');
  expect(patterns).toContain('local-original');
  expect(patterns).toContain('Do not build credential or token tools');
  expect(patterns).toContain('visual-structure gate for HTML reports that still read like linear prose');
  expect(patterns).not.toContain('Current Limits To Correct');
  expect(patterns).not.toContain('Source Inspiration');
  expect(patterns).not.toContain('previous versions failed');
  expect(patterns).not.toContain('Related third-party skills');
  expect(patterns).not.toContain('localStorage');
  expect(skill.length).toBeLessThan(9000);
});

test('effective-interact generalizes HTML effectiveness source cases without overfitting', () => {
  const sourcePatternsPath = `${skillDir}/references/html-effectiveness-patterns.md`;
  expect(fs.existsSync(sourcePatternsPath)).toBe(true);

  const sourcePatterns = fs.readFileSync(sourcePatternsPath, 'utf8');
  const expectedFamilies = [
    'Code approach exploration',
    'Visual direction exploration',
    'Implementation plan',
    'PR review',
    'PR writeup',
    'Code understanding',
    'Design system reference',
    'Component variant matrix',
    'Prototype animation approval',
    'Prototype interaction approval',
    'SVG illustration options',
    'Annotated flowchart',
    'Feature research explainer',
    'Concept research explainer',
    'Engineering status report',
    'Incident report',
    'Triage board editor',
    'Feature flag editor',
    'Prompt tuner editor',
  ];

  for (const family of expectedFamilies) {
    expect(sourcePatterns).toContain(family);
  }

  expect(sourcePatterns).toContain('Anti-Overfit Rules');
  expect(sourcePatterns).toContain('Trigger on reader need');
  expect(sourcePatterns).toContain('glossary-like sources');
  expect(sourcePatterns).toContain('local-original definitions');
  expect(sourcePatterns).toContain('adjacent-term contrasts');
  expect(sourcePatterns).toContain('Warm neutral base');
  expect(sourcePatterns).toContain('Clay accent');
  expect(sourcePatterns).toContain('Taste-Derived Aesthetic Preflight');
  expect(sourcePatterns).toContain('AI-purple');
  expect(sourcePatterns).toContain('default card grid');
  expect(sourcePatterns).toContain('Layout diversity check');
  expect(skill).toContain('references/html-aesthetic-preflight.md');
  expect(sourcePatterns).toContain('Template Mapping');
  expect(sourcePatterns).toContain('vocabulary boundary');
  expect(sourcePatterns).toContain('HTML Escalation Checklist');
  expect(sourcePatterns).toContain('Stay in chat or Markdown');
});

test('effective-interact ships reusable template and component assets', () => {
  const templates = [
    'assets/templates/implementation-handoff.html',
    'assets/templates/conclusion-dashboard.html',
    'assets/templates/review-findings.html',
    'assets/templates/research-explainer.html',
    'assets/templates/decision-matrix.html',
    'assets/templates/implementation-plan.html',
    'assets/templates/visual-exploration.html',
    'assets/templates/editor-workbench.html',
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
  expect(css).toContain('--bg: #faf9f5');
  expect(css).toContain('--accent: #d97757');
  expect(css).toContain('--ok: #788c5d');
  expect(css).toContain('--panel-soft: #f0eee6');
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
  expect(css).toContain('.swatch-chip');
  expect(css).toContain('.mini-metrics');
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
  expect(skill).toContain('must render to SVG before handoff');
  expect(skill).toContain('return-to-overview');
  expect(skill).toContain('\u6d41\u7a0b\u3001\u8def\u7531\u3001\u8c03\u7528\u94fe\u3001\u547d\u4ee4\u3001\u914d\u7f6e\u3001\u4ee3\u7801\u6216\u8865\u4e01\u8bc1\u636e\u4f18\u5148\u7528 Mermaid');
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
    checkModeStructureScript,
    `${skillDir}/references/interaction-input-schema.json`,
    `${skillDir}/references/html-effectiveness-patterns.md`,
    `${skillDir}/references/html-aesthetic-preflight.md`,
    `${skillDir}/references/session-ledger-schema.json`,
    `${skillDir}/.gitignore`,
    `${skillDir}/assets/fixtures/pre-rendered-report.json`,
    `${skillDir}/assets/fixtures/runtime-report.json`,
    `${skillDir}/assets/fixtures/runtime-cdn-stress-report.json`,
    `${skillDir}/assets/fixtures/table-component-report.json`,
    `${skillDir}/assets/fixtures/option-gallery-report.json`,
    `${skillDir}/assets/fixtures/disposable-export-editor-report.json`,
    `${skillDir}/assets/fixtures/communication-mode-cases.json`,
    `${skillDir}/assets/fixtures/mode-structure-cases.json`,
    `${skillDir}/assets/fixtures/skill-structure-map-report.json`,
    `${skillDir}/assets/fixtures/html-effectiveness-pattern-library-report.json`,
    `${skillDir}/assets/fixtures/harness-vocabulary-explainer-report.json`,
    `${skillDir}/assets/fixtures/session-ledger-report.json`,
    `${skillDir}/evals/routing-cases.json`,
  ];

  for (const file of expectedFiles) {
    expect(fs.existsSync(file)).toBe(true);
  }

  const schema = JSON.parse(fs.readFileSync(`${skillDir}/references/interaction-input-schema.json`, 'utf8'));
  expect(schema.required).toEqual(['title', 'summary', 'status', 'sections']);
  expect(schema.required).not.toContain('evidence');
  expect(schema.properties.template.enum).toEqual(
    expect.arrayContaining(['implementation-handoff', 'review-findings', 'research-explainer', 'decision-matrix', 'implementation-plan', 'visual-exploration', 'editor-workbench']),
  );
  expect(schema.properties.showRuntimeDependencies.type).toBe('boolean');
  expect(schema.properties.sections.items.properties.type.enum).toContain('diff');
  expect(schema.properties.sections.items.properties.type.enum).toContain('data-table');
  expect(schema.properties.sections.items.properties.columns.type).toBe('array');
  expect(schema.properties.sections.items.properties.rows.type).toBe('array');
  expect(schema.properties.renderMode.enum).toEqual(['runtime-cdn', 'pre-rendered', 'fallback-only', 'runtime']);
  expect(schema.properties.renderMode.default).toBe('pre-rendered');
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
  const rootGitignore = fs.readFileSync('.gitignore', 'utf8');
  expect(generator).toContain('path.join(skillDir, "artifacts")');
  expect(generator).toContain('Default outDir is ignored skills/effective-interact/artifacts/');
  expect(generator).toContain('Use --out-dir only for another gitignored directory');
  expect(skill).toContain('skills/effective-interact/artifacts/');
  expect(skill).toContain('omit `--out-dir` so HTML lands in ignored skill-local artifacts');
  expect(skill).toContain('If overriding, choose only a gitignored directory');
  expect(skill).not.toContain('--out-dir reports');
  expect(skillGitignore).toContain('artifacts/');
  expect(rootGitignore).toContain('reports/');
  expect(rootGitignore).toContain('skills/effective-interact/artifacts/');
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

test('effective-interact structure fixture renders a navigable tree report', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'effective-interact-structure-map-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/skill-structure-map-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'structure-map',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('effective-interact 结构地图');
  expect(html).toContain('目录树和职责流');
  expect(html).toContain('data-section-type="mermaid"');
  expect(html).toContain('data-section-type="data-table"');
  expect(html).toContain('SKILL.md');
  expect(html).toContain('evals/routing-cases.json');
  expect(html).toContain('scripts/create-interaction.mjs');
  expect(html).toContain('scripts/validate-interaction.mjs');

  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    payload.outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status, validation.stderr).toBe(0);
  expect(JSON.parse(validation.stdout).ok).toBe(true);
});

test('effective-interact HTML effectiveness fixture renders source-derived patterns', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'effective-interact-html-effectiveness-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/html-effectiveness-pattern-library-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'html-effectiveness-patterns',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-template="visual-exploration"');
  expect(html).toContain('HTML effectiveness 范例吸收地图');
  expect(html).toContain('approach-comparison');
  expect(html).toContain('visual-style-board');
  expect(html).toContain('implementation-plan');
  expect(html).toContain('incident-report');
  expect(html).toContain('prompt-tuner-editor');
  expect(html).toContain('swatch-chip');
  expect(html).toContain('#D97757');
  expect(html).toContain('data-report-data-table');

  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    payload.outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status, validation.stderr).toBe(0);
  expect(JSON.parse(validation.stdout).ok).toBe(true);
});

test('effective-interact harness vocabulary fixture renders concept boundaries without copied glossary text', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'effective-interact-harness-vocabulary-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/harness-vocabulary-explainer-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'harness-vocabulary',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-template="research-explainer"');
  expect(html).toContain('Harness vocabulary explainer');
  expect(html).toContain('Definition');
  expect(html).toContain('Adjacent concept');
  expect(html).toContain('Avoid / use instead');
  expect(html).toContain('Usage scenario');
  expect(html).toContain('Acceptance boundary');
  expect(html).toContain('docs/harness-vocabulary.md');
  expect(html).toContain('reference-only');
  expect(html).toContain('local-original definitions');
  expect(html).toContain('data-section-type="tabs"');

  const fixture = JSON.parse(fs.readFileSync(`${skillDir}/assets/fixtures/harness-vocabulary-explainer-report.json`, 'utf8'));
  const sourceRegistryRefs = [
    ...fixture.sections.flatMap((section: any) => section.items || []),
    ...fixture.evidence,
  ].filter((item: any) => item.filePath === 'docs/source-projects.md');
  expect(sourceRegistryRefs.length).toBeGreaterThanOrEqual(2);
  for (const item of sourceRegistryRefs) {
    const sourceLine = fs.readFileSync(item.filePath, 'utf8').split(/\r?\n/)[item.line - 1] || '';
    expect(sourceLine).toContain('mattpocock/dictionary-of-ai-coding');
    expect(sourceLine).toContain('Reference-only');
  }

  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    payload.outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status, validation.stderr).toBe(0);
  expect(JSON.parse(validation.stdout).ok).toBe(true);
});

test('effective-interact session ledger fixture renders preserved task facts', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'effective-interact-session-ledger-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/session-ledger-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'session-ledger',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-template="conclusion-dashboard"');
  expect(html).toContain('Long-task session ledger');
  expect(html).toContain('artifacts/session-ledgers');
  expect(html).toContain('tool-result');
  expect(html).toContain('checkpoint');
  expect(html).toContain('Never store secrets');
  expect(html).toContain('data-section-type="timeline"');
  expect(html).toContain('data-section-type="data-table"');
  expect(html).toContain('data-evidence-id="ledger-schema"');

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
  expect(html).toContain('按决策成本触发');
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

test('effective-interact validator warns when a report stays linear without visible structure', async () => {
  const validateModule = await import(pathToFileURL(path.resolve(validateInteractionScript)).href);
  const html = `<!doctype html>
<html lang="zh-CN" data-html-work-report data-render-mode="pre-rendered">
<head><meta charset="utf-8"><title>Linear report fixture</title><style>@media (prefers-reduced-motion: reduce) { * { transition: none; } }</style></head>
<body>
  <main>
    <header class="report-hero" data-report-intent data-primary-question="Is this still linear?" data-time-budget="30s"><h1>Linear report fixture</h1><p><strong>Conclusion exists.</strong></p></header>
    <nav data-report-nav><div class="report-nav-group"><a data-nav-link href="#summary">Summary</a></div></nav>
    <section id="summary" data-section-type="summary" data-section-group="summary" data-render-state="ready">
      <h2>Summary</h2>
      <p>This report only uses prose paragraphs to describe the update, the evidence, the tradeoff, and the next step without any visible structure that helps the reader compare or scan.</p>
      <p>The effective-interact skill loaded, but the artifact still behaves like a linear memo.</p>
    </section>
  </main>
</body>
</html>`;

  const result = validateModule.validateStatic(html);

  expect(result.ok).toBe(true);
  expect(result.checks).toContain('visual-structure-gate-scan');
  expect(result.warnings).toEqual(expect.arrayContaining([
    expect.stringContaining('advisory: visual structure gate'),
  ]));
});

test('effective-interact mode structure checker enforces non-html shape expectations', async () => {
  const modeStructureModule = await import(pathToFileURL(path.resolve(checkModeStructureScript)).href);
  const fixture = JSON.parse(fs.readFileSync(`${skillDir}/assets/fixtures/mode-structure-cases.json`, 'utf8')) as {
    cases: Array<{
      id: string;
      mode: 'plain-brief' | 'structured-markdown' | 'visual-markdown';
      content: string;
      shouldWarn: boolean;
      expectedStructures: string[];
    }>;
  };

  for (const entry of fixture.cases) {
    const result = modeStructureModule.checkModeStructure({ mode: entry.mode, content: entry.content });
    expect(result.ok).toBe(true);
    expect(result.warnings.length > 0).toBe(entry.shouldWarn);
    for (const expectedStructure of entry.expectedStructures) {
      expect(result.detectedStructures).toContain(expectedStructure);
    }
  }
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
  expect(result.checks).toContain('visual-structure-gate-scan');
  expect(result.checks).toContain('rich-content-opportunity-scan');
  expect(result.warnings).toEqual(expect.arrayContaining([
    expect.stringContaining('advisory: rich content opportunity: consider code or diff'),
    expect.stringContaining('advisory: rich content opportunity: consider Mermaid'),
  ]));
});

test('effective-interact validator accepts structured flow sections without forcing Mermaid', async () => {
  const validateModule = await import(pathToFileURL(path.resolve(validateInteractionScript)).href);
  const html = `<!doctype html>
<html lang="zh-CN" data-html-work-report data-render-mode="pre-rendered">
<head><meta charset="utf-8"><title>Structured flow fixture</title><style>@media (prefers-reduced-motion: reduce) { * { transition: none; } }</style></head>
<body>
  <main>
    <header class="report-hero" data-report-intent data-primary-question="Is the flow readable?" data-time-budget="30s"><h1>Structured flow fixture</h1><p><strong>Conclusion exists.</strong></p></header>
    <nav data-report-nav><div class="report-nav-group"><a data-nav-link href="#flow">Flow</a></div></nav>
    <section id="flow" data-section-type="timeline" data-section-group="evidence" data-render-state="ready">
      <h2>Flow</h2>
      <ol><li><strong>workflow-check:</strong> route the request.</li><li><strong>validation:</strong> verify the handoff path.</li></ol>
    </section>
  </main>
</body>
</html>`;

  const result = validateModule.validateStatic(html);

  expect(result.ok).toBe(true);
  expect(result.warnings).not.toEqual(expect.arrayContaining([
    expect.stringContaining('advisory: visual structure gate'),
  ]));
  expect(result.warnings).not.toEqual(expect.arrayContaining([
    expect.stringContaining('advisory: rich content opportunity: consider Mermaid'),
  ]));
});

test('effective-interact validator warns when runtime rich rendering remains pending without browser verification', async () => {
  const validateModule = await import(pathToFileURL(path.resolve(validateInteractionScript)).href);
  const html = `<!doctype html>
<html lang="zh-CN" data-html-work-report data-render-mode="runtime-cdn">
<head><meta charset="utf-8"><title>Runtime pending fixture</title><style>@media (prefers-reduced-motion: reduce) { * { transition: none; } }</style></head>
<body>
  <main>
    <header class="report-hero" data-report-intent data-primary-question="Did runtime rendering settle?" data-time-budget="30s"><h1>Runtime pending fixture</h1><p><strong>Conclusion exists.</strong></p></header>
    <nav data-report-nav><div class="report-nav-group"><a data-nav-link href="#summary">Summary</a></div></nav>
    <section id="summary" data-section-type="markdown" data-section-group="overview" data-rich-section data-rich-kind="markdown" data-render-state="pending">
      <h2>Summary</h2>
      <div data-rich-markdown></div>
      <pre data-source-fallback hidden><code data-rich-source>## Pending</code></pre>
    </section>
    <div data-runtime-dependencies hidden>
      <span data-runtime-dependency-url="https://cdn.jsdelivr.net/npm/marked@18.0.3">Marked@18.0.3</span>
      <span data-runtime-dependency-url="https://cdn.jsdelivr.net/npm/dompurify@3.4.2">DOMPurify@3.4.2</span>
      <span data-runtime-dependency-url="https://cdn.jsdelivr.net/npm/mermaid@11.15.0">Mermaid@11.15.0</span>
      <span data-runtime-dependency-url="https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1">@highlightjs/cdn-assets@11.11.1</span>
    </div>
  </main>
</body>
</html>`;

  const result = validateModule.validateStatic(html);

  expect(result.ok).toBe(true);
  expect(result.warnings).toEqual(expect.arrayContaining([
    expect.stringContaining('advisory: runtime rich render pending'),
  ]));
});

test('effective-interact validator emits taste-derived aesthetic preflight warnings', async () => {
  const validateModule = await import(pathToFileURL(path.resolve(validateInteractionScript)).href);
  const html = `<!doctype html>
<html lang="zh-CN" data-html-work-report data-render-mode="pre-rendered">
<head><meta charset="utf-8"><title>Aesthetic fixture</title><style>
  :root { --accent: #a855f7; }
  @media (prefers-reduced-motion: reduce) { * { transition: none; animation: none; } }
</style></head>
<body>
  <main>
    <header class="report-hero" data-report-intent data-primary-question="Does this look templated?" data-time-budget="30s"><h1>Aesthetic fixture</h1><p><strong>Conclusion exists.</strong></p></header>
    <nav data-report-nav><div class="report-nav-group"><a data-nav-link href="#summary">Summary</a></div></nav>
    <section id="summary" class="default-card" data-section-type="summary" data-section-group="summary" data-render-state="ready">
      <h2>Summary</h2>
      <p><strong>Report:</strong> this card grid uses an AI-purple accent.</p>
    </section>
  </main>
</body>
</html>`;

  const result = validateModule.validateStatic(html);

  expect(result.ok).toBe(true);
  expect(result.checks).toContain('aesthetic-preflight-scan');
  expect(result.warnings).toEqual(expect.arrayContaining([
    expect.stringContaining('advisory: aesthetic preflight: avoid AI-purple'),
    expect.stringContaining('advisory: aesthetic preflight: audit default-card grids'),
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
  ], {
    encoding: 'utf8',
    env: { ...process.env, EFFECTIVE_INTERACT_DISABLE_BROWSER_MERMAID: '1' },
  });

  expect(result.status, result.stderr).toBe(0);
  const payload = JSON.parse(result.stdout);
  const html = fs.readFileSync(payload.outputPath, 'utf8');

  expect(html).toContain('data-mermaid-renderer="fallback"');
  expect(html).toContain('data-render-state="degraded"');
  expect(html).toContain('Playwright unavailable');
  expect(html).not.toContain(process.cwd());
  expect(html).not.toMatch(/[A-Za-z]:[\\/](?:Users|harness-hub|code-agent-harness)[^<\s]*/);
  expect(html).not.toMatch(/file:\/\/\//i);
  expect(html).not.toMatch(/\b(?:gho|ghp|github_pat)_[A-Za-z0-9_]+/);

  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    payload.outputPath,
    '--json',
    '--skip-browser',
  ], { encoding: 'utf8' });
  expect(validation.status, validation.stderr).toBe(0);
  expect(JSON.parse(validation.stdout).warnings).toEqual(expect.arrayContaining([
    expect.stringContaining('advisory: mermaid fallback'),
  ]));
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

test('effective-interact defaults to pre-rendered and maps legacy runtime alias', () => {
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
    'default-pre-rendered',
    '--json',
  ], { encoding: 'utf8' });
  expect(defaultResult.status, defaultResult.stderr).toBe(0);
  expect(JSON.parse(defaultResult.stdout).renderMode).toBe('pre-rendered');

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

test('effective-interact showcase remains a rich generated fixture without tracked reports', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-work-report-showcase-'));
  const result = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    `${skillDir}/assets/fixtures/runtime-cdn-stress-report.json`,
    '--out-dir',
    tmpDir,
    '--slug',
    'feature-showcase',
    '--json',
  ], { encoding: 'utf8' });

  expect(result.status, result.stderr).toBe(0);
  const showcase = fs.readFileSync(JSON.parse(result.stdout).outputPath, 'utf8');

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
