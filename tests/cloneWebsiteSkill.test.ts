import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skill = fs.readFileSync('skills/clone-website/SKILL.md', 'utf8');
const safety = fs.readFileSync('skills/clone-website/references/safety-and-permissions.md', 'utf8');
const extraction = fs.readFileSync('skills/clone-website/references/extraction-checklist.md', 'utf8');
const routing = fs.readFileSync('docs/skill-routing.md', 'utf8');
const sourceProjects = fs.readFileSync('docs/source-projects.md', 'utf8');

test('clone-website skill is explicit, source-recorded, and safety-gated', () => {
  expect(skill).toContain('name: clone-website');
  expect(skill).toContain('upstream_commit: "c9b4fea5b257370af339abedad727c8903490dac"');
  expect(skill).toContain('authorized');
  expect(skill).toContain('browser automation');
  expect(skill).toContain('harness/website-cloner');
  expect(skill).toContain('Read `references/safety-and-permissions.md`');
  expect(safety).toContain('Phishing');
  expect(safety).toContain('Do not preserve analytics');
  expect(extraction).toContain('Desktop screenshot');
  expect(extraction).toContain('Interaction Sweep');
});

test('clone-website routing has narrow overlap boundaries', () => {
  const boundary = '`clone-website` loads only when the user explicitly asks to clone, reverse-engineer, or rebuild an authorized website; it does not load for generic redesign, visual inspiration, scraping, phishing, impersonation, or third-party brand copying.';

  expect(routing).toContain(boundary);
  expect(routing).toContain('ordinary visual inspiration or production UI creation remains `frontend-design` or `design-taste-frontend`');
  expect(sourceProjects).toContain('JCodesMore/ai-website-cloner-template');
  expect(sourceProjects).toContain('explicit-only `clone-website`');
});
