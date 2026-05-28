#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'AGENTS.md',
  'feature_list.json',
  'progress.md',
  'session-handoff.md',
  'scripts/harness-validate.mjs',
];

const root = process.cwd();
const missing = requiredFiles.filter((relativePath) => !fs.existsSync(path.join(root, relativePath)));

if (missing.length > 0) {
  console.error(`Harness validation failed. Missing: ${missing.join(', ')}`);
  process.exitCode = 3;
} else {
  console.log('Harness validation passed.');
}
