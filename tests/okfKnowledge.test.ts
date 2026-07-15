import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

const OKF_VALIDATOR = path.resolve('scripts/okf-validate.mjs');

function markdownFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) return markdownFiles(entryPath);
    return entry.isFile() && entry.name.endsWith('.md') ? [entryPath] : [];
  }).sort();
}

function frontmatterType(content: string): string | null {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!frontmatter) return null;
  const value = frontmatter.match(/^type:\s*(.+?)\s*$/m)?.[1] || '';
  return value.replace(/^['"]|['"]$/g, '').trim() || null;
}

function markdownLinkTargets(content: string): string[] {
  return [...content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1].trim());
}

const ruleDocs = [
  ...markdownFiles('docs'),
  path.join('harness', 'agent-hooks', 'README.md'),
];
const knowledgeDocs = markdownFiles('knowledge');

test('current rule and knowledge documents have parseable non-empty OKF types', () => {
  expect(ruleDocs.length).toBeGreaterThan(0);
  expect(knowledgeDocs.length).toBeGreaterThan(0);

  for (const filePath of [...ruleDocs, ...knowledgeDocs]) {
    expect(frontmatterType(fs.readFileSync(filePath, 'utf8')), `${filePath} must declare a non-empty frontmatter type`).not.toBeNull();
  }
});

test('current rule and knowledge documents have no broken local Markdown links', () => {
  for (const filePath of [...ruleDocs, ...knowledgeDocs]) {
    const content = fs.readFileSync(filePath, 'utf8');

    for (const rawTarget of markdownLinkTargets(content)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(rawTarget)) continue;

      const withoutTitle = rawTarget.replace(/\s+["'][^"']*["']\s*$/, '');
      const withoutFragment = withoutTitle.split('#', 1)[0].split('?', 1)[0];
      const unwrapped = withoutFragment.replace(/^<|>$/g, '');
      const decoded = decodeURIComponent(unwrapped);
      expect(path.isAbsolute(decoded), `${filePath} must not use an absolute local link: ${rawTarget}`).toBe(false);

      const resolved = path.resolve(path.dirname(filePath), decoded);
      expect(fs.existsSync(resolved), `${filePath} has a broken local link: ${rawTarget}`).toBe(true);
    }
  }
});

test('knowledge index covers every concept and the log records updates with sources', () => {
  const conceptFiles = knowledgeDocs
    .map((filePath) => path.basename(filePath))
    .filter((name) => !['index.md', 'log.md'].includes(name))
    .sort();
  const index = fs.readFileSync(path.join('knowledge', 'index.md'), 'utf8');
  const indexedConcepts = markdownLinkTargets(index)
    .map((target) => target.split('#', 1)[0])
    .filter((target) => target && !target.includes('/') && !['index.md', 'log.md'].includes(target))
    .sort();

  expect(indexedConcepts).toEqual(conceptFiles);

  const log = fs.readFileSync(path.join('knowledge', 'log.md'), 'utf8');
  expect(log).toMatch(/^## \d{4}-\d{2}-\d{2}\s*$/m);
  expect(log).toMatch(/^- \S.+$/m);
  expect(log).toContain('## Sources');
  expect(markdownLinkTargets(log).length).toBeGreaterThan(0);
});

test('current rule and knowledge documents contain no retired lifecycle or Hub-only routing semantics', () => {
  const retiredPatterns = [
    /\b(?:npm|npx)\b/i,
    /\bharness-hub\s+(?:install|update|remove|status|check|analyze|init-harness|activate-agents|validate-harness|migrate-lock)\b/i,
    /\bharness-hub\s+loop\s+(?:required|verify)\b/i,
    /\b(?:hub-maintenance-workflow|harness-quality-check)\b/i,
    /\.harness-hub\/context\b/i,
    /\b--target\s+standard\b/i,
    /\b(?:source-skill-inventory|workflow-source-dossier|standard-target-boundary|npm-publishing)\.md\b/i,
  ];

  for (const filePath of [...ruleDocs, ...knowledgeDocs]) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of retiredPatterns) {
      expect(content, `${filePath} still contains retired semantics matched by ${pattern}`).not.toMatch(pattern);
    }
  }
});

test('Harness Hub keeps an independent source-traceable OKF wiki in the source repository', () => {
  const conceptCount = knowledgeDocs.filter((filePath) => !['index.md', 'log.md'].includes(path.basename(filePath))).length;
  const result = spawnSync(process.execPath, [OKF_VALIDATOR, process.cwd(), '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toMatchObject({ status: 0, stderr: '' });
  expect(JSON.parse(result.stdout)).toMatchObject({
    ok: true,
    status: 'pass',
    knowledgeRoot: path.resolve('knowledge'),
    conceptCount,
    findings: [],
  });
});

test('OKF validator accepts a source-traceable Google OKF v0.1 project wiki', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-okf-valid-'));
  const knowledgeDir = path.join(root, 'knowledge');

  try {
    fs.mkdirSync(knowledgeDir);
    fs.writeFileSync(path.join(root, 'README.md'), '# Synthetic project\n');
    fs.writeFileSync(path.join(knowledgeDir, 'index.md'), `---
type: index
okf_version: "0.1"
---
# Project knowledge

- [Project](project.md)
- [Update log](log.md)
`);
    fs.writeFileSync(path.join(knowledgeDir, 'log.md'), `---
type: log
---
# Knowledge update log

## 2026-07-13

- Initialized the project wiki from current repository evidence.
`);
    fs.writeFileSync(path.join(knowledgeDir, 'project.md'), `---
type: project
title: Synthetic project
---
# Synthetic project

This repository is a deterministic test fixture.

## Sources

- [README](../README.md)
`);

    const result = spawnSync(process.execPath, [OKF_VALIDATOR, root, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toMatchObject({ status: 0, stderr: '' });
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: 1,
      ok: true,
      status: 'pass',
      targetDir: root,
      knowledgeRoot: knowledgeDir,
      fileCount: 3,
      conceptCount: 1,
      sourceCount: 1,
      findings: [],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('OKF validator rejects duplicate canonical concept content', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-okf-duplicate-'));
  const knowledgeDir = path.join(root, 'knowledge');

  try {
    fs.mkdirSync(knowledgeDir);
    fs.writeFileSync(path.join(root, 'README.md'), '# Synthetic project\n');
    fs.writeFileSync(path.join(knowledgeDir, 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n# Knowledge\n\n- [Project](project.md)\n- [Duplicate](duplicate.md)\n- [Log](log.md)\n');
    fs.writeFileSync(path.join(knowledgeDir, 'log.md'), '---\ntype: log\n---\n# Log\n\n## 2026-07-14\n\n- Initialized.\n');
    const duplicatedBody = 'This stable project fact must have one canonical owner page.';
    fs.writeFileSync(path.join(knowledgeDir, 'project.md'), `---\ntype: project\n---\n# Project\n\n${duplicatedBody}\n\n## Sources\n\n- [README](../README.md)\n`);
    fs.writeFileSync(path.join(knowledgeDir, 'duplicate.md'), `---\ntype: concept\n---\n# Duplicate\n\n${duplicatedBody}\n\n## Sources\n\n- [README](../README.md)\n`);

    const result = spawnSync(process.execPath, [OKF_VALIDATOR, root, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'duplicate-concept-content', path: 'project.md' }),
      expect.objectContaining({ id: 'duplicate-concept-content', path: 'duplicate.md' }),
    ]));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('OKF validator rejects short exact source-project knowledge reuse', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-okf-short-leak-'));
  const targetDir = path.join(root, 'target');
  const knowledgeDir = path.join(targetDir, 'knowledge');
  const forbiddenDir = path.join(root, 'forbidden');
  const privateBody = 'SECRET-XYZ-917 private cadence.';

  try {
    fs.mkdirSync(knowledgeDir, { recursive: true });
    fs.mkdirSync(forbiddenDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic project\n');
    fs.writeFileSync(path.join(forbiddenDir, 'private.md'), `---\ntype: concept\n---\n# Private\n\n${privateBody}\n`);
    fs.writeFileSync(path.join(knowledgeDir, 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n# Knowledge\n\n- [Project](project.md)\n- [Log](log.md)\n');
    fs.writeFileSync(path.join(knowledgeDir, 'log.md'), '---\ntype: log\n---\n# Log\n\n## 2026-07-14\n\n- Initialized.\n');
    fs.writeFileSync(path.join(knowledgeDir, 'project.md'), `---\ntype: project\n---\n# Project\n\n${privateBody}\n\n## Sources\n\n- [README](../README.md)\n`);

    const result = spawnSync(process.execPath, [
      OKF_VALIDATOR,
      targetDir,
      '--forbid-tree',
      forbiddenDir,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'forbidden-tree-copy', path: 'project.md' }),
    ]));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('OKF validator rejects a source link that escapes through a junction or symlink', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-okf-linked-source-'));
  const targetDir = path.join(root, 'target');
  const outsideDir = path.join(root, 'outside');
  const knowledgeDir = path.join(targetDir, 'knowledge');

  try {
    fs.mkdirSync(knowledgeDir, { recursive: true });
    fs.mkdirSync(outsideDir);
    fs.writeFileSync(path.join(outsideDir, 'secret.txt'), 'outside target\n');
    fs.symlinkSync(outsideDir, path.join(targetDir, 'linked-source'), process.platform === 'win32' ? 'junction' : 'dir');
    fs.writeFileSync(path.join(knowledgeDir, 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n# Project knowledge\n\n- [Project](project.md)\n- [Log](log.md)\n');
    fs.writeFileSync(path.join(knowledgeDir, 'log.md'), '---\ntype: log\n---\n# Log\n\n## 2026-07-14\n\n- Initialized.\n');
    fs.writeFileSync(path.join(knowledgeDir, 'project.md'), '---\ntype: project\n---\n# Project\n\n## Sources\n\n- [Secret](../linked-source/secret.txt)\n');

    const result = spawnSync(process.execPath, [OKF_VALIDATOR, targetDir, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'link-escapes-target', path: 'project.md' }),
    ]));
    expect(report.sources).not.toContain('linked-source/secret.txt');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('OKF validator rejects missing type, broken links, missing sources, and missing update records', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-okf-invalid-'));
  const knowledgeDir = path.join(root, 'knowledge');

  try {
    fs.mkdirSync(knowledgeDir);
    fs.writeFileSync(path.join(knowledgeDir, 'index.md'), `---
type: index
okf_version: "0.1"
---
# Broken knowledge

- [Missing](missing.md)
- [Project](project.md)
`);
    fs.writeFileSync(path.join(knowledgeDir, 'log.md'), `---
type: log
---
# Empty log
`);
    fs.writeFileSync(path.join(knowledgeDir, 'project.md'), '# Missing frontmatter and sources\n');

    const result = spawnSync(process.execPath, [OKF_VALIDATOR, root, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ ok: false, status: 'blocked' });
    expect(report.findings.map((finding: { id: string }) => finding.id).sort()).toEqual(expect.arrayContaining([
      'broken-link',
      'missing-frontmatter',
      'missing-source-section',
      'missing-update-record',
    ]));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
