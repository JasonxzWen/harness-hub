import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

type ArtifactPolicy = {
  version: number;
  categories: {
    publishAndGit: string[];
    publishOnlyGenerated: string[];
    gitOnly: string[];
    ignoredLocal: string[];
  };
  npm: {
    files: string[];
    requiredExcludes: string[];
    forbidden: string[];
  };
  git: {
    ignored: string[];
  };
};

type PackageManifest = {
  files?: string[];
  scripts?: Record<string, string>;
};

const root = process.cwd();
const errors: string[] = [];

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8')) as T;
}

function normalizeList(values: string[]): string[] {
  return values.map((value) => value.replaceAll('\\', '/'));
}

function isSameOrderedList(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function hasForbiddenNpmEntry(files: string[], forbidden: string): string | undefined {
  if (forbidden.endsWith('/')) {
    return files.find((entry) => entry === forbidden || entry.startsWith(forbidden));
  }
  return files.find((entry) => entry === forbidden);
}

function pathMatchesEntry(file: string, entry: string): boolean {
  if (entry.endsWith('/')) {
    return file.startsWith(entry);
  }
  return file === entry;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    errors.push(message);
  }
}

const policy = readJson<ArtifactPolicy>('config/artifact-policy.json');
const packageJson = readJson<PackageManifest>('package.json');
const packageFiles = normalizeList(packageJson.files ?? []);
const policyFiles = normalizeList(policy.npm.files);

assert(policy.version === 1, 'config/artifact-policy.json version must be 1.');
assert(isSameOrderedList(packageFiles, policyFiles), 'package.json files must exactly match config/artifact-policy.json npm.files.');
assert(
  packageJson.scripts?.validate?.includes('bun run validate:artifact-policy') === true,
  'package.json scripts.validate must run validate:artifact-policy.'
);

for (const entry of policy.categories.publishAndGit) {
  assert(policyFiles.includes(entry), `publishAndGit entry is missing from npm.files: ${entry}`);
}

for (const entry of policy.categories.publishOnlyGenerated) {
  assert(policyFiles.includes(entry), `publishOnlyGenerated entry is missing from npm.files: ${entry}`);
  assert(policy.git.ignored.includes(entry), `publishOnlyGenerated entry must be git ignored: ${entry}`);
}

for (const entry of policy.npm.requiredExcludes) {
  assert(entry.startsWith('!'), `npm.requiredExcludes entry must be a package files negation: ${entry}`);
  assert(policyFiles.includes(entry), `npm.files is missing required exclude pattern: ${entry}`);
}

for (const forbidden of policy.npm.forbidden) {
  const match = hasForbiddenNpmEntry(packageFiles, forbidden);
  assert(match === undefined, `npm.files must not include forbidden path ${forbidden}; matched ${match}.`);
}

assert(!packageFiles.includes('openspec/'), 'npm.files must not include the whole openspec/ tree.');

const changesDir = path.join(root, 'openspec', 'changes');
if (fs.existsSync(changesDir)) {
  for (const entry of fs.readdirSync(changesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'archive') {
      continue;
    }
    const activeChangePath = `openspec/changes/${entry.name}/`;
    const match = packageFiles.find((file) => file === activeChangePath || file.startsWith(activeChangePath));
    assert(match === undefined, `active OpenSpec change must stay Git-only and out of npm.files: ${activeChangePath}`);
  }
}

const gitignorePatterns = new Set(
  fs.readFileSync(path.join(root, '.gitignore'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
);

for (const ignored of policy.git.ignored) {
  assert(gitignorePatterns.has(ignored), `.gitignore is missing policy ignore pattern: ${ignored}`);
}

if (fs.existsSync(path.join(root, '.git'))) {
  const forbiddenTrackedEntries = normalizeList([
    ...policy.categories.publishOnlyGenerated,
    ...policy.categories.ignoredLocal,
  ]);
  const trackedFiles = execFileSync('git', ['ls-files'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => file.replaceAll('\\', '/'));

  for (const file of trackedFiles.filter((trackedFile) => fs.existsSync(path.join(root, trackedFile)))) {
    const match = forbiddenTrackedEntries.find((entry) => pathMatchesEntry(file, entry));
    assert(match === undefined, `git must not track ignored/generated artifact path ${file}; matched ${match}.`);
  }
}

if (errors.length > 0) {
  console.error('Artifact policy validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Artifact policy validation passed.');
