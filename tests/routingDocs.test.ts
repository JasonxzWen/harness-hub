import fs from 'node:fs';
import { expect, test } from 'bun:test';

const routing = fs.readFileSync('docs/skill-routing.md', 'utf8');
const capabilityMap = fs.readFileSync('docs/capability-map.md', 'utf8');

test('routing docs delegate orchestration to the native Host and expose atomic skills', () => {
  expect(routing).toContain('Claude Code or Codex is the only main-Agent runtime');
  expect(routing).toContain('Select the narrowest atomic Skill that adds domain value');
  expect(routing).toContain('no Router or owner Workflow runs first');
  expect(routing).toContain('| YAGNI, minimum change, entity-count, subtraction review | `ponytail` |');
  expect(routing).toContain('| Complex communication and important handoff | `effective-interact` |');
  expect(routing).toContain('| Failed, long, high-cost, tool-abnormal, or explicit retrospective | `agent-interaction-audit` |');
  expect(routing).toContain('| Read-only internet retrieval through an existing Agent Reach install | `agent-reach` |');
  expect(routing).toContain('| Blocking/high-impact structured decision on Codex | `decision-ui` |');
  expect(routing).toContain('The native main Agent triggers it for complex delivery, comparisons, and important handoffs');
  expect(routing).toContain('reports missing duration/token/cost evidence as `unknown`');
  expect(routing).not.toContain('report-loop');
  expect(routing).not.toContain('requirements-loop');
  expect(routing).not.toContain('workflow-router');
  expect(routing).not.toContain('hub-maintenance-workflow');
  expect(routing).not.toContain('harness-quality-check');
});

test('capability map documents a versionless full-distribution surface', () => {
  expect(capabilityMap).toContain('versionless classification');
  expect(capabilityMap).toContain('Every current canonical skill is `target-distributed`');
  expect(capabilityMap).toContain('.claude/skills/<name>/');
  expect(capabilityMap).toContain('.agents/skills/<name>/');
  expect(capabilityMap).toContain('no named packs, optional levels, partial install sets, component versions');
});
