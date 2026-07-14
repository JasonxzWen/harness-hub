import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skill = fs.readFileSync('skills/clone-website/SKILL.md', 'utf8');
const safety = fs.readFileSync('skills/clone-website/references/safety-and-permissions.md', 'utf8');
const extraction = fs.readFileSync('skills/clone-website/references/extraction-checklist.md', 'utf8');
const sourceProjects = fs.readFileSync('docs/source-projects.md', 'utf8');

test('clone-website skill is explicit, source-recorded, and safety-gated', () => {
  expect(skill).toContain('name: clone-website');
  expect(skill).toContain('upstream_commit: "c9b4fea5b257370af339abedad727c8903490dac"');
  expect(skill).toContain('authorized');
  expect(skill).toContain('browser automation');
  expect(skill).toContain('assets/website-cloner');
  expect(skill).toContain('Read `references/safety-and-permissions.md`');
  expect(safety).toContain('Phishing');
  expect(safety).toContain('Do not preserve analytics');
  expect(extraction).toContain('Desktop screenshot');
  expect(extraction).toContain('Interaction Sweep');
});

test('clone-website routing has narrow overlap boundaries', () => {
  expect(skill).toContain('explicitly asks to clone, reverse-engineer, or rebuild a website they own or are authorized to reproduce');
  expect(skill).toContain('do not load for generic redesign, inspiration, scraping, phishing, impersonation, or copying third-party brands');
  expect(skill).toContain('Do not copy logos, trademarks, proprietary images, tracking scripts, forms, accounts, or backend behavior');
  expect(sourceProjects).toContain('JCodesMore/ai-website-cloner-template');
  expect(sourceProjects).toContain('explicit-only `clone-website`');
});
