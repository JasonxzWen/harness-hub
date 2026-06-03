import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'bun:test';

const scannedRoots = [
  'skills',
  'harness',
  'docs',
  'tests',
  'README.md',
  'README.zh-CN.md',
  'AGENTS.md',
  'capabilities/index.json',
];

const scannedExtensions = new Set([
  '.md',
  '.json',
  '.mjs',
  '.py',
  '.ts',
]);

const mojibakePattern = /\uFFFD|\u7487|\u93B6|\u7EC9|\u7F01|\u9428|\u9366|\u6D93|\u7459|\u20AC|\?{4,}/;
const corruptedMarkerPattern = /\b(?:Correct|Wrong)(?=\*\*|[A-Z])/;

function listScannedFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  const stat = fs.statSync(root);
  if (stat.isFile()) {
    return scannedExtensions.has(path.extname(root)) ? [root] : [];
  }

  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(root, entry.name);
    return entry.isDirectory() ? listScannedFiles(child) : listScannedFiles(child);
  });
}

function firstMatchingLine(content: string, pattern: RegExp): number {
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) => pattern.test(line));
  return index + 1;
}

test('skill-distributed text does not contain common mojibake markers', () => {
  const offenders: string[] = [];

  for (const file of scannedRoots.flatMap(listScannedFiles)) {
    const content = fs.readFileSync(file, 'utf8');
    if (mojibakePattern.test(content)) {
      offenders.push(`${file}:${firstMatchingLine(content, mojibakePattern)}`);
    }
  }

  expect(offenders).toEqual([]);
});

test('skill markdown does not contain corrupted checkmark labels', () => {
  const offenders: string[] = [];

  for (const file of listScannedFiles('skills').filter((entry) => entry.endsWith('.md'))) {
    const content = fs.readFileSync(file, 'utf8');
    if (corruptedMarkerPattern.test(content)) {
      offenders.push(`${file}:${firstMatchingLine(content, corruptedMarkerPattern)}`);
    }
  }

  expect(offenders).toEqual([]);
});
