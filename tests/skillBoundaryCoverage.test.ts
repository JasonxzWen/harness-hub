import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'bun:test';

type Component = {
  kind: string;
  path: string;
  distribution: string;
  [key: string]: unknown;
};

const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
  components: Record<string, Component>;
  [key: string]: unknown;
};

function frontmatterValue(markdown: string, key: string): string {
  return markdown.replace(/^\uFEFF/, '').match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)`, 'm'))?.[1]?.trim() ?? '';
}

test('capability index is versionless classification, not a second routing registry', () => {
  expect(Object.keys(index)).toEqual(['components']);

  for (const [id, component] of Object.entries(index.components)) {
    expect(id).toMatch(/^skill:[a-z0-9][a-z0-9-]*$/);
    expect(Object.keys(component).sort()).toEqual(
      id === 'skill:decision-ui'
        ? ['distribution', 'host', 'kind', 'path']
        : ['distribution', 'kind', 'path'],
    );
    expect(component).toMatchObject({
      kind: 'skill',
      path: `skills/${id.slice('skill:'.length)}`,
      distribution: 'target-distributed',
    });
    expect(component.host).toBe(id === 'skill:decision-ui' ? 'codex' : undefined);
  }
});

test('every canonical skill has one indexed standard-layout source', () => {
  const canonical = fs.readdirSync('skills', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(`skills/${entry.name}/SKILL.md`))
    .map((entry) => entry.name)
    .sort();
  const indexed = Object.keys(index.components).map((id) => id.slice('skill:'.length)).sort();

  expect(indexed).toEqual(canonical);
  for (const name of canonical) {
    const skill = fs.readFileSync(`skills/${name}/SKILL.md`, 'utf8');
    expect(frontmatterValue(skill, 'name'), `${name} has no canonical frontmatter name`).toBe(name);
    expect(frontmatterValue(skill, 'description'), `${name} has no routing description`).not.toBe('');
  }
});

test('canonical skill references to local spokes resolve inside that skill', () => {
  const localReference = /(?:references|scripts|assets|rules)\/[A-Za-z0-9._/-]+\.[A-Za-z0-9]+/g;
  for (const component of Object.values(index.components)) {
    const skill = fs.readFileSync(path.join(component.path, 'SKILL.md'), 'utf8');
    for (const reference of new Set(skill.match(localReference) ?? [])) {
      expect(fs.existsSync(path.join(component.path, reference)), `${component.path}/SKILL.md -> ${reference}`).toBe(true);
    }
  }
});
