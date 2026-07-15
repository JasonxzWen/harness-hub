import fs from 'node:fs';
import { expect, test } from 'bun:test';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

test('browser guidance waits for user-visible behavior instead of network idleness', () => {
  const webapp = read('skills/webapp-testing/SKILL.md');
  const webappExampleBodies = [
    'skills/webapp-testing/examples/element_discovery.py',
    'skills/webapp-testing/examples/console_logging.py',
    'skills/webapp-testing/examples/static_html_automation.py',
  ].map(read);
  const webappExamples = webappExampleBodies.join('\n');
  const e2e = read('skills/e2e-testing/SKILL.md');

  expect(`${webapp}\n${webappExamples}`).not.toMatch(/networkidle|wait_for_timeout/i);
  for (const example of webappExampleBodies) {
    expect(example).toContain('# Modified by Harness Hub:');
  }
  expect(webapp).toContain('existing browser runner');
  expect(webapp).toContain('user-visible state');
  expect(webapp).toContain('role or label');

  expect(e2e).not.toMatch(/networkidle|waitForResponse/i);
  expect(e2e).not.toMatch(/## Test Report Template|## Wallet \/ Web3 Testing|name: E2E Tests/);
  expect(e2e).toContain('existing E2E runner');
  expect(e2e).toContain('New projects default to Playwright');
  expect(e2e).toContain('risk-based');
  expect(e2e).toContain('One test should prove one user outcome');
  expect(e2e).toContain("getByLabel('Search items')");
  expect(e2e).toContain("import { defineConfig, devices } from '@playwright/test'");
  expect(e2e).toContain("baseURL: process.env.BASE_URL ?? 'http://localhost:3000'");
  expect(e2e).toContain('retries: process.env.CI ? 2 : 0');
  expect(e2e).toContain('Do not run payment, wallet, or other critical flows against production');
});

test('frontend data guidance reuses the project data layer without mutation-prone examples', () => {
  const patterns = read('skills/frontend-patterns/SKILL.md');

  expect(patterns).not.toContain('export function DataLoader');
  expect(patterns).not.toContain('export function useQuery');
  expect(patterns).not.toContain('return markets.sort(');
  expect(patterns).toContain("project's existing data layer");
  expect(patterns).toContain('cancellation and stale responses');
  expect(patterns).toContain('return [...markets].sort(');
});

test('frontend visual guidance treats distinctive design as contextual intent', () => {
  const design = read('skills/frontend-design/SKILL.md');

  for (const absolute of [
    'BOLD aesthetic',
    'Pick an extreme',
    'UNFORGETTABLE',
    'NEVER use generic',
    'NEVER converge',
    "Don't hold back",
  ]) {
    expect(design).not.toContain(absolute);
  }
  expect(design).toContain('context-appropriate aesthetic direction');
  expect(design).toContain('intentionality, not novelty or intensity');
  expect(design).toContain('existing design system');
  expect(design).toContain('not automatic failures');
});

test('standalone web artifacts are verified before they are shared', () => {
  const builder = read('skills/web-artifacts-builder/SKILL.md');

  expect(builder).not.toMatch(/completely optional|Test later, after presenting|\(Optional\)/i);
  expect(builder).toContain('Before sharing the artifact');
  expect(builder).toContain('critical interaction');
  expect(builder).toContain('console errors');
  expect(builder).toContain('risk-based');
});

test('product UI review is an evidence-backed report-only atom', () => {
  const skillPath = 'skills/product-ui-review/SKILL.md';
  const lensPath = 'skills/product-ui-review/references/review-lenses.md';
  const filesExist = fs.existsSync(skillPath) && fs.existsSync(lensPath);

  expect(filesExist).toBe(true);
  if (!filesExist) return;

  const review = read(skillPath);
  const lenses = read(lensPath);
  const capabilities = JSON.parse(read('capabilities/index.json'));

  expect(review).toContain('existing Web product');
  expect(review).toContain('Report only');
  expect(review).toContain('Observed');
  expect(review).toContain('Inferred');
  expect(review).toContain('Impact');
  expect(review).toContain('Confidence');
  expect(review).toContain('Recommendation');
  expect(review).toContain('Verification');
  expect(review).toContain('Not run — <specific observable check>');
  expect(review).not.toMatch(/weighted score|\b\d+\s*\/\s*\d+\b|fixed workflow/i);
  expect(lenses).toContain('Style match is not a finding');
  expect(lenses).toContain('Task model');
  expect(lenses).toContain('Accessibility');
  expect(lenses).toContain('Unintentional default');
  expect(lenses).toContain('Intentional use');
  for (const pattern of ['Gradient', 'Badge', 'Serif', 'Terminal']) {
    expect(lenses).toContain(pattern);
  }
  expect(capabilities.components['skill:product-ui-review']).toEqual({
    kind: 'skill',
    path: 'skills/product-ui-review',
    distribution: 'target-distributed',
  });
  expect(fs.existsSync('skills/product-ui-review/scripts')).toBe(false);
  expect(fs.existsSync('skills/product-ui-review/assets')).toBe(false);
});

test('product UI review routing and evaluated source boundaries are recorded', () => {
  const designTaste = read('skills/design-taste-frontend/SKILL.md');
  const routing = read('docs/skill-routing.md');
  const readme = read('README.md');
  const sources = read('docs/source-projects.md');

  expect(designTaste).toContain('Existing product experience review routes to `product-ui-review`');
  expect(routing).toContain('| Existing Web product experience diagnosis | `product-ui-review` |');
  expect(readme).toContain('`product-ui-review`');

  for (const [source, revision] of [
    ['emilkowalski/skills', '7bb7061b5cf7de15ea1aeaf00fbd9e6592a20fce'],
    ['Trystan-SA/claude-design-system-prompt', '3c3ddb07d7aa3fef051d83608596470c95cfd8fe'],
    ['yetone/kill-ai-slop', 'e2456514416e40f133432baf364a2353900267a7'],
  ]) {
    expect(sources).toContain(source);
    expect(sources).toContain(revision);
  }
  expect(sources).toContain('No source body is distributed');
  expect(sources).toMatch(/`emilkowalski\/skills`[^\n]+\| MIT \|/);
  expect(sources).toMatch(/`Trystan-SA\/claude-design-system-prompt`[^\n]+\| Repository MIT;/);
  expect(sources).toMatch(/`yetone\/kill-ai-slop`[^\n]+\| No repository license found/);
  expect(sources).toContain('active provenance safety boundary');
});

test('frontend requests stay owned by narrow atomic skills', () => {
  const owners: Record<string, string> = {
    'product-ui-review': read('skills/product-ui-review/SKILL.md'),
    'design-taste-frontend': read('skills/design-taste-frontend/SKILL.md'),
    'code-review': read('skills/code-review/SKILL.md'),
    'web-design-guidelines': read('skills/web-design-guidelines/SKILL.md'),
    'effective-interact': read('skills/effective-interact/SKILL.md'),
    'frontend-design': read('skills/frontend-design/SKILL.md'),
  };
  const cases = [
    { request: '评审现有交易 dashboard，只报告体验问题', owner: 'product-ui-review', marker: 'dashboard' },
    { request: '分析 multi-step 审批与失败恢复', owner: 'product-ui-review', marker: 'multi-step' },
    { request: '为营销 landing page 校准视觉方向', owner: 'design-taste-frontend', marker: 'landing pages' },
    { request: '审查当前 PR 的标准与规格符合度', owner: 'code-review', marker: 'Standards and Spec' },
    { request: '按最新 Web 规范检查 TSX', owner: 'web-design-guidelines', marker: 'compliance review' },
    { request: '把已有 findings 做成结构化报告', owner: 'effective-interact', marker: 'reviews' },
    { request: '实现已确认的 dashboard 改进', owner: 'frontend-design', marker: 'product UI' },
  ];

  for (const routeCase of cases) {
    if (!owners[routeCase.owner]?.includes(routeCase.marker)) {
      throw new Error(`Expected ${routeCase.owner} to own "${routeCase.request}"`);
    }
  }
});
