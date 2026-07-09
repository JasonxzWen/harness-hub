import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillPath = 'skills/grill-with-docs/SKILL.md';
const referencePath = 'skills/grill-with-docs/references/domain-modeling.md';
const skill = fs.readFileSync(skillPath, 'utf8');
const reference = fs.readFileSync(referencePath, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('grill-with-docs is adapted from Matt Pocock and routed narrowly', () => {
  const description = frontmatterValue('description');

  expect(description).toContain('grill-with-docs interview');
  expect(description).toContain('context wiki');
  expect(description).toContain('do not write wiki knowledge without human confirmation');
  expect(skill).toContain('mattpocock/skills skills/engineering/grill-with-docs');
  expect(skill).toContain('d574778f94cf620fcc8ce741584093bc650a61d3');
});

test('grill-with-docs maps documentation work to Harness Hub state and wiki rules', () => {
  expect(skill).toContain('instead of writing root `CONTEXT.md` or `docs/adr/` directly');
  expect(skill).toContain('.harness-hub/context/');
  expect(skill).toContain('.harness-hub/state/');
  expect(skill).toContain('Ask for confirmation before writing knowledge content');

  expect(reference).toContain('.harness-hub/context/wiki/concepts/');
  expect(reference).toContain('.harness-hub/context/wiki/contradictions.md');
  expect(reference).toContain('.harness-hub/context/wiki/update-log.md');
  expect(reference).toContain('If the target repository has no Harness Hub context pack, do not invent root `CONTEXT.md` or `docs/adr/` files');
});

test('grill-with-docs is part of the standard install surface', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, {
      kind: string;
      path: string;
      source: string;
      provides?: string[];
      overlapsWith?: string[];
      detects?: Array<{ path: string }>;
      risk?: string;
    }>;
  };
  const component = index.components['skill:grill-with-docs'];

  expect(component.kind).toBe('skill');
  expect(component.path).toBe('skills/grill-with-docs');
  expect(component.source).toBe('mattpocock-skills-adapted');
  expect(component.provides).toContain('documented-plan-pressure-testing');
  expect(component.provides).toContain('domain-model-interview');
  expect(component.provides).toContain('context-wiki-update-planning');
  expect(component.provides).toContain('adr-candidate-surfacing');
  expect(component.provides).toContain('code-doc-contradiction-capture');
  expect(component.overlapsWith).toContain('skill:grill-me');
  expect(component.overlapsWith).toContain('skill:product-capability');
  expect(component.overlapsWith).toContain('skill:doc-coauthoring');
  expect(component.detects).toContainEqual({ path: skillPath });
  expect(component.detects).toContainEqual({ path: referencePath });
  expect(component.risk).toBe('medium');
});
