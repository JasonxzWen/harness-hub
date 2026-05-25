import fs from 'node:fs';
import { expect, test } from 'bun:test';

type Component = {
  kind: string;
  path: string;
  routing?: string;
  overlapsWith?: string[];
};

function readIndex(): { components: Record<string, Component> } {
  return JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as { components: Record<string, Component> };
}

test('every installable skill has user-intent routing text with a concrete boundary', () => {
  const index = readIndex();

  for (const [id, component] of Object.entries(index.components)) {
    if (component.kind !== 'skill') {
      continue;
    }

    const routing = component.routing || '';
    expect(routing, `${id} missing routing`).toMatch(/^(Use|Load when)\b/);
    expect(routing.length, `${id} routing is too short`).toBeGreaterThanOrEqual(70);

    if ((component.overlapsWith || []).length > 0) {
      expect(
        /\b(use|only|not|before|after|under|explicitly|ordinary|broader|narrower)\b/i.test(routing),
        `${id} routing lacks an overlap boundary`,
      ).toBe(true);
    }
  }
});

test('all installable skills are represented in routing docs or declared helper-only', () => {
  const index = readIndex();
  const routingDocs = fs.readFileSync('docs/skill-routing.md', 'utf8');
  const helperOnlySkills = new Set([
    'coding-standards',
  ]);

  for (const [id, component] of Object.entries(index.components)) {
    if (component.kind !== 'skill') {
      continue;
    }
    const skillName = id.replace('skill:', '');

    expect(
      routingDocs.includes(`\`${skillName}\``) || helperOnlySkills.has(skillName),
      `${skillName} is not represented in routing docs`,
    ).toBe(true);
  }
});
