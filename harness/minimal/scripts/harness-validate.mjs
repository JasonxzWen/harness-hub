#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'AGENTS.md',
  'feature_list.json',
  'progress.md',
  'session-handoff.md',
  'clean-state-checklist.md',
  'definition-of-done.md',
  'tasks/current-task.md',
  'scripts/harness-validate.mjs',
];
const forbiddenFiles = ['CLAUDE.md'];
const sizeLimits = {
  'AGENTS.md': 32 * 1024,
  'progress.md': 16 * 1024,
  'session-handoff.md': 16 * 1024,
  'tasks/current-task.md': 16 * 1024,
};
const requiredMarkers = {
  'AGENTS.md': ['Codex', 'worktree', 'session-handoff'],
  'tasks/current-task.md': [
    'Goal',
    'Allowed paths',
    'Forbidden paths',
    'Validation commands',
    'Parallel writes',
    'Handoff requirements',
  ],
};

const failures = [];

for (const file of requiredFiles) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push(`${file}: missing required harness file`);
  }
}

for (const file of forbiddenFiles) {
  if (fs.existsSync(path.join(root, file))) {
    failures.push(`${file}: non-Codex platform instruction file is present`);
  }
}

for (const [file, limit] of Object.entries(sizeLimits)) {
  const filePath = path.join(root, file);
  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    if (size > limit) {
      failures.push(`${file}: size ${size} exceeds limit ${limit}`);
    }
  }
}

for (const [file, markers] of Object.entries(requiredMarkers)) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const missing = markers.filter((marker) => !content.includes(marker));
  if (missing.length > 0) {
    failures.push(`${file}: missing markers ${missing.join(', ')}`);
  }
}

const featureStatePath = path.join(root, 'feature_list.json');
if (fs.existsSync(featureStatePath)) {
  try {
    const featureState = JSON.parse(fs.readFileSync(featureStatePath, 'utf8'));
    const missing = [];
    if (!isRecord(featureState) || !Array.isArray(featureState.features)) {
      missing.push('features array');
    }
    if (!isRecord(featureState) || !isRecord(featureState.parallel_write_policy)) {
      missing.push('parallel_write_policy object');
    }
    if (missing.length > 0) {
      failures.push(`feature_list.json: missing required structure ${missing.join(', ')}`);
    }
  } catch {
    failures.push('feature_list.json: must be valid JSON');
  }
}

if (failures.length > 0) {
  console.error('Harness validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(3);
}

console.log('Harness validation passed.');

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
