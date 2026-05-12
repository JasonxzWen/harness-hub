import fs from 'node:fs';
import { expect, test } from 'bun:test';

type RoutingCase = {
  id: string;
  skill: string;
  kind: 'positive' | 'negative' | 'forbidden-load';
  prompt: string;
  expectedSkill: string | null;
  docsBoundary: string;
};

const requiredHighOverlapSkills = [
  'diagnose',
  'agent-introspection-debugging',
  'prototype',
  'frontend-design',
  'html-work-reports',
  'compound-code-review',
  'security-review',
  'verification-loop',
];
const optionalDemoSkills = ['feynman-learning-coach'];
const allowedFixtureSkills = [...requiredHighOverlapSkills, ...optionalDemoSkills];

function readFixture(): { version: number; cases: RoutingCase[] } {
  return JSON.parse(fs.readFileSync('tests/fixtures/skill-routing-cases.json', 'utf8'));
}

test('routing fixture has a strict schema and unique case ids', () => {
  const fixture = readFixture();
  const ids = new Set<string>();

  expect(fixture.version).toBe(1);
  expect(Array.isArray(fixture.cases)).toBe(true);

  for (const entry of fixture.cases) {
    expect(entry.id).toMatch(/^[a-z0-9-]+$/);
    expect(ids.has(entry.id)).toBe(false);
    ids.add(entry.id);
    expect(allowedFixtureSkills).toContain(entry.skill);
    expect(['positive', 'negative', 'forbidden-load']).toContain(entry.kind);
    expect(entry.prompt.trim().length).toBeGreaterThan(12);
    expect(entry.docsBoundary.trim().length).toBeGreaterThan(12);

    if (entry.kind === 'positive') {
      expect(entry.expectedSkill).toBe(entry.skill);
    } else {
      expect(entry.expectedSkill).not.toBe(entry.skill);
    }
  }
});

test('routing fixture covers each required high-overlap skill with all case kinds', () => {
  const fixture = readFixture();

  for (const skill of requiredHighOverlapSkills) {
    const kinds = new Set(fixture.cases.filter((entry) => entry.skill === skill).map((entry) => entry.kind));

    expect(kinds.has('positive')).toBe(true);
    expect(kinds.has('negative')).toBe(true);
    expect(kinds.has('forbidden-load')).toBe(true);
  }
});

test('routing fixture boundaries are reflected in docs and capability overlaps', () => {
  const fixture = readFixture();
  const routingDocs = fs.readFileSync('docs/skill-routing.md', 'utf8');
  const capabilityIndex = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { overlapsWith?: string[] }>;
  };

  for (const entry of fixture.cases) {
    expect(routingDocs).toContain(entry.docsBoundary);

    if (entry.kind === 'negative' && entry.expectedSkill) {
      const component = capabilityIndex.components[`skill:${entry.skill}`];
      const expectedComponent = capabilityIndex.components[`skill:${entry.expectedSkill}`];
      const outgoing = component?.overlapsWith || [];
      const incoming = expectedComponent?.overlapsWith || [];

      expect(outgoing.includes(`skill:${entry.expectedSkill}`) || incoming.includes(`skill:${entry.skill}`)).toBe(
        true,
      );
    }
  }
});
