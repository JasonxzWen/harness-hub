import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skillDir = 'skills/stop-slop';
const skill = fs.readFileSync(`${skillDir}/SKILL.md`, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('stop-slop keeps upstream standard structure with local narrow routing metadata', () => {
  expect(fs.existsSync(`${skillDir}/SKILL.md`)).toBe(true);
  expect(fs.existsSync(`${skillDir}/references/phrases.md`)).toBe(true);
  expect(fs.existsSync(`${skillDir}/references/structures.md`)).toBe(true);
  expect(fs.existsSync(`${skillDir}/references/examples.md`)).toBe(true);

  expect(frontmatterValue('name')).toBe('stop-slop');
  const description = frontmatterValue('description');
  expect(description.startsWith('Load when')).toBe(true);
  expect(description).toContain('English prose');
  expect(description).toContain('AI-writing tells');
  expect(description).toContain('do not load for code explanation');
  expect(description).toContain('Chinese output');
  expect(description).toContain('technical specs');
  expect(description).toContain('routine status reports');
  expect(frontmatterValue('source')).toBe('https://github.com/hardikpandya/stop-slop');
  expect(frontmatterValue('upstream_commit')).toBe('8da1f030185bdfe8471220585162991eaeb970e9');
  expect(frontmatterValue('license')).toBe('MIT');
});

test('stop-slop retains the upstream strong prose-editing rules and references', () => {
  const phrases = fs.readFileSync(`${skillDir}/references/phrases.md`, 'utf8');
  const structures = fs.readFileSync(`${skillDir}/references/structures.md`, 'utf8');
  const examples = fs.readFileSync(`${skillDir}/references/examples.md`, 'utf8');

  expect(skill).toContain('Any adverbs? Kill them.');
  expect(skill).toContain('Sentence starts with a Wh- word? Restructure it.');
  expect(skill).toContain('Em-dash anywhere? Remove it.');
  expect(phrases).toContain('Throat-Clearing Openers');
  expect(phrases).toContain('Adverbs');
  expect(structures).toContain('Binary Contrasts');
  expect(structures).toContain('Passive Voice');
  expect(examples).toContain('Before/After Examples');
});

test('stop-slop is installable with explicit prose-only boundaries', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, {
      kind: string;
      path: string;
      source: string;
      provides?: string[];
      overlapsWith?: string[];
      routing?: string;
      recommendation?: string;
      risk?: string;
    }>;
  };
  const component = index.components['skill:stop-slop'];
  const routingDocs = fs.readFileSync('docs/skill-routing.md', 'utf8');

  expect(component.kind).toBe('skill');
  expect(component.path).toBe('skills/stop-slop');
  expect(component.source).toBe('hardikpandya/stop-slop');
  expect(component.risk).toBe('medium');
  expect(component.provides).toEqual(expect.arrayContaining([
    'english-prose-ai-tell-cleanup',
    'draft-prose-style-editing',
    'strong-style-prose-review',
  ]));
  expect(component.overlapsWith).toEqual(expect.arrayContaining([
    'skill:doc-coauthoring',
    'skill:internal-comms',
    'skill:answer-workflow',
  ]));
  expect(component.routing).toContain('English prose');
  expect(component.routing).toContain('do not use for code explanations');
  expect(component.recommendation).toContain('strong style-editing rules');
  expect(routingDocs).toContain('`stop-slop` loads only for English prose AI-tell cleanup');
  expect(routingDocs).toContain('not a default rule for code explanations, Chinese output, technical specs, status reports, or ordinary documentation');
});
