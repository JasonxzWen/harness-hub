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
    'Assumptions',
    'Non-goals',
    'Allowed paths',
    'Forbidden paths',
    'Acceptance criteria',
    'Validation commands',
    'Parallel writes',
    'Handoff requirements',
  ],
};
const agentArchitectureMarkers = [
  'worktree_policy',
  'parallel_write_policy',
  'read_only_parallel_work',
  'single integration review point',
  'non-overlapping',
];

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

const architectureText = [
  'AGENTS.md',
  'tasks/current-task.md',
  'feature_list.json',
]
  .map((file) => {
    const filePath = path.join(root, file);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  })
  .join('\n');
const missingArchitectureMarkers = agentArchitectureMarkers.filter((marker) => !architectureText.includes(marker));
if (missingArchitectureMarkers.length > 0) {
  failures.push(`agent architecture boundary: missing markers ${missingArchitectureMarkers.join(', ')}`);
}

const skillsDir = path.join(root, 'skills');
if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
  const triggerIssues = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      continue;
    }
    const description = parseSkillDescription(fs.readFileSync(skillPath, 'utf8'));
    if (!description) {
      triggerIssues.push(`${entry.name}: missing description`);
      continue;
    }
    if (!/(load when|use when|when|asks|needs|requests|trigger)/i.test(description)) {
      triggerIssues.push(`${entry.name}: description lacks an activation condition`);
    }
    if (/(always use|every request|all requests|all tasks|any task|whenever possible)/i.test(description)) {
      triggerIssues.push(`${entry.name}: description uses broad activation wording`);
    }
  }
  if (triggerIssues.length > 0) {
    failures.push(`skill trigger hygiene: ${triggerIssues.slice(0, 8).join('; ')}${triggerIssues.length > 8 ? `; +${triggerIssues.length - 8} more` : ''}`);
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

function parseSkillDescription(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return null;
  }
  const descriptionMatch = match[1].match(/^description:\s*(.+)$/m);
  return descriptionMatch ? descriptionMatch[1].replace(/^['"]|['"]$/g, '').trim() : null;
}
