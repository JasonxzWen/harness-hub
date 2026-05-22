import fs from 'node:fs';
import { expect, test } from 'bun:test';

const inventoryPath = 'docs/workflow-cleanup-inventory.md';

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

test('workflow cleanup inventory documents safe cleanup categories', () => {
  expect(fs.existsSync(inventoryPath)).toBe(true);
  const doc = read(inventoryPath);

  for (const heading of [
    '## Keep In Standard Install',
    '## Keep As Source References',
    '## Keep As Library Skills',
    '## Physical Cleanup Completed',
    '## Future Cleanup Requiring Approval',
    '## Forbidden Cleanup',
  ]) {
    expect(doc).toContain(heading);
  }
});

test('workflow cleanup inventory records approval and preserves safety gates', () => {
  const doc = read(inventoryPath);

  expect(doc).toContain('Physical deletion was approved by the user on 2026-05-21');
  expect(doc).toContain('lock-backed');
  expect(doc).toContain('explicit user approval');
  expect(doc).toContain('unmanaged files must not be deleted by name');
  expect(doc).toContain('source records were retained');
});

test('workflow cleanup inventory covers the noisy workflow sources', () => {
  const doc = read(inventoryPath);

  for (const phrase of [
    'OpenSpec',
    'Everything Claude Code',
    'Superpowers',
    'Matt Pocock',
    'standard install',
    'workflow-router',
  ]) {
    expect(doc).toContain(phrase);
  }
});
