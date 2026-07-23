import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'bun:test';

function read(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

const capabilities = JSON.parse(read('capabilities/index.json')) as {
  components: Record<string, { kind: string; path: string; distribution: string }>;
};

test('frontend-slides keeps the current licensed fixed-stage core without publish machinery', () => {
  const skillDir = 'skills/frontend-slides';
  const skill = read(`${skillDir}/SKILL.md`);
  const viewport = read(`${skillDir}/viewport-base.css`);
  const presets = read(`${skillDir}/STYLE_PRESETS.md`);
  const motion = read(`${skillDir}/animation-patterns.md`);
  const license = read(`${skillDir}/LICENSE.txt`);

  expect(skill).toContain('zarazhangrui/frontend-slides');
  expect(skill).toContain('9906a34d640d2111f724544cbc50f7f130569ae1');
  expect(skill).toContain('fixed 1920×1080 stage');
  expect(skill).toContain('viewport-base.css');
  expect(skill).toContain('separate user-authorized action');
  expect(viewport).toContain('width: 1920px');
  expect(viewport).toContain('height: 1080px');
  expect(presets).toContain('For mandatory base styles, see [viewport-base.css](viewport-base.css)');
  expect(presets).toContain('Common Defaults To Challenge');
  expect(presets).toContain('prompts to verify intent, not universal bans');
  expect(motion).toContain('prefers-reduced-motion');
  expect(license).toContain('Copyright (c) 2025 Zara Zhang');
  expect(skill).not.toMatch(/Vercel|npx|pip install|deploy\.sh|export-pdf/i);
  expect(fs.existsSync(`${skillDir}/scripts`)).toBe(false);
  expect(fs.existsSync(`${skillDir}/bold-template-pack`)).toBe(false);
});

test('codebase-to-course is an independent source-backed course atom', () => {
  const skill = read('skills/codebase-to-course/SKILL.md');

  expect(skill).toContain('source: "local-original"');
  expect(skill).toContain('zarazhangrui/codebase-to-course@ff8837ecf8e9f6ce9874ffa42e42633394a52a00');
  expect(skill).toContain('no upstream Skill body or assets are copied');
  expect(skill).toContain('repository-relative file and line or symbol anchor');
  expect(skill).toContain('one self-contained `codebase-course.html`');
  expect(skill).toContain('`quick-learn`');
  expect(skill).toContain('`code-review`');
  expect(skill).toContain('`source-post`');
  expect(skill).toContain('`frontend-slides`');
  expect(skill).not.toMatch(/vibe coder|Phase 2\.5|Group Chat Animation|references\/styles\.css/i);
  expect(fs.readdirSync('skills/codebase-to-course')).toEqual(['SKILL.md']);
});

test('beautiful-feishu-whiteboard preserves palettes but removes setup and fixed write commands', () => {
  const skillDir = 'skills/beautiful-feishu-whiteboard';
  const skill = read(`${skillDir}/SKILL.md`);
  const rules = read(`${skillDir}/RULES.md`);
  const catalog = read(`${skillDir}/CATALOG.md`);
  const license = read(`${skillDir}/LICENSE.txt`);
  const templateDirs = fs.readdirSync(`${skillDir}/templates`, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  expect(skill).toContain('zarazhangrui/beautiful-feishu-whiteboard');
  expect(skill).toContain('6989843b355ac92ebbd4f66166189a001e61e9b5');
  expect(skill).toContain('35 curated palette systems');
  expect(skill).toContain('already available');
  expect(skill).toContain('smallest new document needed for that board');
  expect(rules).toContain('rg -n');
  expect(rules).toContain('stored/live data');
  expect(catalog).toContain('The 35 styles');
  expect(templateDirs).toHaveLength(35);
  for (const template of templateDirs) {
    expect(fs.existsSync(path.join(skillDir, 'templates', template, 'design.md')), template).toBe(true);
  }
  expect(license).toContain('Copyright (c) 2026 Zara Zhang');
  expect(`${skill}\n${rules}`).not.toMatch(/npm install|npx\s+-y|lark-cli|auth login|config init/i);
  expect(fs.existsSync(`${skillDir}/scripts`)).toBe(false);
  expect(fs.existsSync(`${skillDir}/assets`)).toBe(false);
});

test('the three capabilities are classified and their routing and source boundaries are durable', () => {
  for (const name of ['frontend-slides', 'codebase-to-course', 'beautiful-feishu-whiteboard']) {
    expect(capabilities.components[`skill:${name}`]).toEqual({
      kind: 'skill',
      path: `skills/${name}`,
      distribution: 'target-distributed',
    });
  }

  const sources = read('docs/source-projects.md');
  const routing = read('docs/skill-routing.md');
  const readme = read('README.md');
  const readmeZh = read('README.zh-CN.md');

  for (const [source, revision] of [
    ['zarazhangrui/frontend-slides', '9906a34d640d2111f724544cbc50f7f130569ae1'],
    ['zarazhangrui/codebase-to-course', 'ff8837ecf8e9f6ce9874ffa42e42633394a52a00'],
    ['zarazhangrui/beautiful-feishu-whiteboard', '6989843b355ac92ebbd4f66166189a001e61e9b5'],
  ]) {
    expect(sources).toContain(source);
    expect(sources).toContain(revision);
  }

  expect(sources).toContain('No repository license found at the evaluated revision');
  expect(sources).toContain('No upstream Skill body');
  expect(routing).toContain('| Browser-based HTML presentation or PPT/PPTX-to-web deck | `frontend-slides` |');
  expect(routing).toContain('| Source-backed interactive HTML course about a codebase | `codebase-to-course` |');
  expect(routing).toContain('| Polished editable Feishu/Lark whiteboard or visual explainer | `beautiful-feishu-whiteboard` |');
  for (const name of ['frontend-slides', 'codebase-to-course', 'beautiful-feishu-whiteboard']) {
    expect(readme).toContain(name);
    expect(readmeZh).toContain(name);
  }
});
