import fs from 'node:fs';
import { expect, test } from 'bun:test';

function read(name: string): string {
  return fs.readFileSync(`skills/${name}/SKILL.md`, 'utf8');
}

const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
  components: Record<string, { kind: string; path: string; distribution: string }>;
};

test('the native development surface exposes the direct names and no renamed legacy entries', () => {
  for (const name of ['tdd', 'verification', 'code-review', 'codebase-design', 'to-tickets']) {
    expect(index.components[`skill:${name}`]).toEqual({
      kind: 'skill',
      path: `skills/${name}`,
      distribution: 'target-distributed',
    });
  }
  for (const name of ['tdd-workflow', 'verification-loop', 'compound-code-review', 'coding-standards']) {
    expect(index.components[`skill:${name}`]).toBeUndefined();
    expect(fs.existsSync(`skills/${name}`)).toBe(false);
  }
});

test('product-capability synthesizes a local executable spec without remote publication', () => {
  const skill = read('product-capability');
  expect(skill).toContain('accepted source facts');
  expect(skill).toContain('test seams');
  expect(skill).toContain('OUT OF SCOPE');
  expect(skill).toContain('Do not publish an issue, apply a label, or mutate a remote tracker');
  for (const stale of ['project-flow-ops', 'workspace-surface-audit', 'api-connector-builder', 'dashboard-builder']) {
    expect(skill).not.toContain(stale);
  }
});

test('to-tickets creates project-owned tracer bullets without inventing a task subsystem', () => {
  const skill = read('to-tickets');
  expect(skill).toContain('vertical tracer-bullet');
  expect(skill).toContain('blocking edges');
  expect(skill).toContain('current frontier');
  expect(skill).toContain('existing project task, issue, or plan convention');
  expect(skill).toContain('`.harness-hub/state/current-task.md`');
  expect(skill).toContain('Do not create `.harness-hub/tasks/`');
  expect(skill).toContain('Remote publication requires explicit authorization');
});

test('codebase-design replaces generic coding rules with focused module design', () => {
  const skill = read('codebase-design');
  expect(skill).toContain('deep module');
  expect(skill).toContain('deletion test');
  expect(skill).toContain('One adapter means a hypothetical seam; two adapters make it real');
  expect(skill).toContain('Use `ponytail`');
  expect(skill).not.toContain('ALWAYS use spread');
  expect(skill).not.toContain('improve-codebase-architecture');
});

test('verification discovers project gates and has no timer, slash command, or hook lifecycle', () => {
  const skill = read('verification');
  expect(skill).toContain('Discover the project\'s actual gates');
  expect(skill).toContain('Deterministic failures cannot be waived');
  expect(skill).toContain('unavailable or unknown');
  expect(skill).not.toMatch(/80%|every 15 minutes|\/verify|PostToolUse|npm run build/);
});

test('target contract requires one Grill pass and keeps native Subagents bounded', () => {
  const target = fs.readFileSync('harness/target/AGENTS.md', 'utf8');
  const grillRule = 'Run one `grill-me` alignment pass for every repository mutation task';
  expect(target).toContain('Run one `grill-me` alignment pass for every repository mutation task');
  expect(target).toContain('A fully aligned task exits with zero user questions');
  expect(target).toContain('use `grill-with-docs`, which reuses the same decision graph');
  expect(target).toContain('Skills may request bounded, independent, read-only native Subagents');
  expect(target).toContain('Do not create a Harness Hub Agent fallback');
  expect(target.indexOf(grillRule)).toBeLessThan(target.indexOf('For non-trivial mutation work:'));

  const sourceContract = fs.readFileSync('AGENTS.md', 'utf8');
  const governance = fs.readFileSync('knowledge/skill-governance.md', 'utf8');
  expect(sourceContract).not.toContain('A Skill is an optional prompt capability');
  expect(governance).not.toContain('They remain optional capabilities');
});

test('current Matt Pocock adaptations distribute the MIT notice', () => {
  for (const name of ['grill-me', 'grill-with-docs', 'diagnose', 'prototype', 'tdd', 'handoff', 'product-capability', 'to-tickets', 'codebase-design', 'code-review']) {
    const licensePath = `skills/${name}/LICENSE.txt`;
    expect(fs.existsSync(licensePath), licensePath).toBe(true);
    expect(fs.readFileSync(licensePath, 'utf8')).toContain('Copyright (c) 2026 Matt Pocock');
  }
});

test('skill-creator absorbs completion and pruning discipline without another Skill', () => {
  const skill = read('skill-creator');
  expect(skill).toContain('completion criterion');
  expect(skill).toContain('leading word');
  expect(skill).toContain('context load');
  expect(skill).toContain('no-op');
  expect(skill).toContain('e9fcdf95b402d360f90f1db8d776d5dd450f9234');
  expect(fs.existsSync('skills/writing-great-skills')).toBe(false);
});
