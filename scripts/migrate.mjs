#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runExecutableLoop } from '../skills/workflow-router/scripts/loop-runtime.mjs';
import { validateOkf } from '../skills/workflow-router/scripts/okf-validate.mjs';

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function preflightTarget(targetDir, hosts = [], knownRoot = null) {
  const resolvedTarget = path.resolve(targetDir);
  const root = knownRoot ?? runGit(resolvedTarget, ['rev-parse', '--show-toplevel'], 'E_TARGET_GIT');
  runGit(resolvedTarget, ['rev-parse', '--verify', 'HEAD'], 'E_TARGET_HEAD');
  assertStandaloneGitCheckout(root, 'target');
  assertManagedPathsSafe(root, hosts);
  const status = runGit(resolvedTarget, ['status', '--porcelain=v1', '--untracked-files=all'], 'E_TARGET_GIT');

  if (status !== '') {
    throw migrationError('E_TARGET_DIRTY', 'Target must be a clean Git worktree.');
  }

  const knowledgeRoot = path.join(root, 'knowledge');
  const knowledgeSnapshot = snapshotDirectory(knowledgeRoot);
  if (knowledgeSnapshot !== null) {
    assertValidOkf(root);
    const untrackedKnowledge = knowledgeSnapshot
      .map((entry) => `knowledge/${entry.path}`)
      .filter((relativePath) => !isGitTracked(root, relativePath));
    if (untrackedKnowledge.length > 0) {
      throw migrationError(
        'E_KNOWLEDGE_UNTRACKED',
        `Existing project knowledge must be Git-tracked for byte-safe rollback: ${untrackedKnowledge.join(', ')}`,
        'preflight',
      );
    }
  }

  const ignoredExclusions = ignoredSnapshotExclusions(hosts);
  return {
    head: runGit(resolvedTarget, ['rev-parse', 'HEAD'], 'E_TARGET_HEAD'),
    gitControlSnapshot: snapshotGitControlPlane(root, 'E_TARGET_GIT'),
    ignoredExclusions,
    ignoredSnapshot: snapshotIgnoredPaths(root, ignoredExclusions),
    knowledgeSnapshot,
    root,
  };
}

export function parseMigrationArgs(argv) {
  const target = argv[0];
  const seen = new Set();
  let host;
  let selectedPrimary;
  let force = false;
  let confirmed = false;
  const invalidInput = () => migrationError(
    'E_INPUT',
    'Use migrate <target> --host claude|codex|both --yes [--primary claude|codex] [--force].',
    'input',
    2,
  );

  if (!target || target.startsWith('--')) {
    throw invalidInput();
  }
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!['--host', '--primary', '--yes', '--force'].includes(argument) || seen.has(argument)) {
      throw invalidInput();
    }
    seen.add(argument);
    if (argument === '--yes') {
      confirmed = true;
      continue;
    }
    if (argument === '--force') {
      force = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw invalidInput();
    }
    index += 1;
    if (argument === '--host') host = value;
    if (argument === '--primary') selectedPrimary = value;
  }

  if (!['claude', 'codex', 'both'].includes(host) || !confirmed) {
    throw invalidInput();
  }
  if (host === 'both' && !['claude', 'codex'].includes(selectedPrimary)) {
    throw invalidInput();
  }
  if (host !== 'both' && selectedPrimary) {
    throw invalidInput();
  }
  return {
    target,
    force,
    host,
    primaryHost: host === 'both' ? selectedPrimary : host,
  };
}

export function runMigration(argv) {
  const request = parseMigrationArgs(argv);
  const hosts = request.host === 'both'
    ? [request.primaryHost, request.primaryHost === 'claude' ? 'codex' : 'claude']
    : [request.host];
  const targetRoot = fs.realpathSync.native(runGit(path.resolve(request.target), ['rev-parse', '--show-toplevel'], 'E_TARGET_GIT'));
  const sourceRoot = fs.realpathSync.native(runGit(SOURCE_ROOT, ['rev-parse', '--show-toplevel'], 'E_SOURCE_GIT'));
  if (pathsOverlap(sourceRoot, targetRoot)) {
    throw migrationError('E_INPUT', 'Harness Hub source and target repositories must not overlap.', 'input', 2);
  }
  const target = preflightTarget(targetRoot, hosts, targetRoot);
  const source = preflightSource(sourceRoot, sourceRoot);
  const skillDistribution = readSkillDistribution(source.root);
  const previousManifest = readMigrationManifest(target.root);
  const currentManagedPaths = takeoverManagedPaths(hosts, skillDistribution.distributedSkills);
  target.projectSourceFiles = projectSourceFilesAtHead(
    target.root,
    target.head,
    [...currentManagedPaths, ...manifestManagedRoots(previousManifest), 'knowledge', '.harness-hub'],
  );
  const staleManagedPaths = manifestManagedRoots(previousManifest)
    .filter((managedPath) => !currentManagedPaths.includes(managedPath));
  target.staleManagedPaths = staleManagedPaths;
  target.ignoredExclusions = [...new Set([...target.ignoredExclusions, ...staleManagedPaths])];
  target.ignoredSnapshot = snapshotIgnoredPaths(target.root, target.ignoredExclusions);
  target.hostSkillExtras = snapshotHostSkillExtras(
    target.root,
    hosts,
    skillDistribution.distributedSkills,
    previousManifest,
  );
  const rollbackPaths = rollbackManagedPaths(hosts);
  const managedSnapshot = snapshotRestorablePaths(
    target.root,
    [
      ...rollbackPaths,
      ...staleManagedPaths.filter((managedPath) => !rollbackPaths.some((rollbackPath) => (
        managedPath === rollbackPath || managedPath.startsWith(`${rollbackPath}/`)
      ))),
    ],
  );
  const loopRuns = [];

  try {
    prepareManagedPaths(
      target.root,
      hosts,
      request.force,
      skillDistribution.distributedSkills,
      previousManifest,
      staleManagedPaths,
    );
    loopRuns.push(runMigrationSlice({
      host: hosts[0],
      role: 'primary',
      source,
      target,
      distributedSkills: skillDistribution.distributedSkills,
      validatedHosts: [hosts[0]],
      validateKnowledge: target.knowledgeSnapshot !== null,
    }));
    if (target.knowledgeSnapshot === null) {
      loopRuns.push(runKnowledgeInitSlice({
        host: hosts[0],
        source,
        target,
        validatedHosts: [hosts[0]],
      }));
    }
    if (hosts.length === 2) {
      const protectedSnapshot = snapshotPaths(target.root, protectedFromSecondary(request.primaryHost));
      loopRuns.push(runMigrationSlice({
        host: hosts[1],
        role: 'secondary',
        source,
        target,
        distributedSkills: skillDistribution.distributedSkills,
        validatedHosts: hosts,
        validateKnowledge: true,
        protectedSnapshot,
      }));
    }
    writeManifest(source, target.root, hosts, request.primaryHost, skillDistribution.distributedSkills);
  } catch (error) {
    const failedRunId = error && typeof error === 'object' ? error.runId : null;
    const closedRuns = [...new Set([
      ...loopRuns.map((run) => run.runId),
      failedRunId,
    ].filter((runId) => typeof runId === 'string'))]
      .map((runId) => captureClosedRun(target.root, runId))
      .filter(Boolean);
    const runtimeIgnoreWasMissing = managedSnapshot.some((item) => item.path === '.harness-hub/.gitignore'
      && item.entries.length === 1 && item.entries[0].type === 'missing');
    const restoreClosedRunEvidence = () => {
      for (const closedRun of closedRuns) {
        restoreRestorablePaths(target.root, closedRun.snapshot);
      }
      if (closedRuns.length > 0 && runtimeIgnoreWasMissing) {
        fs.mkdirSync(path.join(target.root, '.harness-hub'), { recursive: true });
        fs.writeFileSync(path.join(target.root, '.harness-hub', '.gitignore'), 'state/\n.gitignore\n');
      }
    };
    try {
      rollbackTarget(target, managedSnapshot);
      rollbackSource(source);
      restoreClosedRunEvidence();
    } catch {
      let evidenceRestored = false;
      try {
        restoreClosedRunEvidence();
        evidenceRestored = true;
      } catch {
        // The rollback failure remains authoritative; report whether evidence also survived.
      }
      const rollbackError = Object.assign(
        migrationError('E_ROLLBACK', 'Git could not restore the target after migration failed.', 'rollback'),
        {
          rolledBack: false,
          evidenceRestored,
          originalError: {
            code: error && typeof error === 'object' && typeof error.code === 'string' ? error.code : 'E_INTERNAL',
            message: error instanceof Error ? error.message : String(error),
            ...(typeof failedRunId === 'string' ? { runId: failedRunId } : {}),
          },
          ...(evidenceRestored && closedRuns.length > 0
            ? { runIds: closedRuns.map((closedRun) => closedRun.runId) }
            : {}),
        },
      );
      throw rollbackError;
    }
    if (error && typeof error === 'object') {
      error.rolledBack = true;
      if (closedRuns.length > 0) error.runIds = closedRuns.map((closedRun) => closedRun.runId);
    }
    throw error;
  }

  return {
    ok: true,
    host: request.host,
    primaryHost: request.primaryHost,
    sourceCommit: source.head,
    targetHead: target.head,
    loopRuns,
  };
}

function pathsOverlap(left, right) {
  const leftToRight = path.relative(left, right);
  const rightToLeft = path.relative(right, left);
  const isInside = (relativePath) => relativePath === ''
    || (!path.isAbsolute(relativePath) && relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`));
  return isInside(leftToRight) || isInside(rightToLeft);
}

function readSkillDistribution(sourceRoot) {
  let components;
  try {
    components = JSON.parse(requireFile(path.join(sourceRoot, 'capabilities', 'index.json'))).components;
  } catch {
    throw validationError('Capability skill index must be valid JSON.');
  }
  if (!components || typeof components !== 'object' || Array.isArray(components)) {
    throw validationError('Capability skill index must contain a components object.');
  }
  const trackedSkillFiles = gitTrackedFiles(sourceRoot, 'skills');
  const canonicalNames = trackedSkillFiles
    .filter((relativePath) => /^[^/]+\/SKILL\.md$/.test(relativePath))
    .map((relativePath) => relativePath.split('/')[0])
    .sort();
  const distributedSkills = [];
  const indexedNames = [];
  for (const [id, component] of Object.entries(components)) {
    if (component.kind !== 'skill') continue;
    const name = id.startsWith('skill:') ? id.slice('skill:'.length) : '';
    const canonicalPath = `skills/${name}`;
    const componentPath = typeof component.path === 'string' ? component.path.replaceAll('\\', '/') : '';
    if (!name || componentPath !== canonicalPath) {
      throw validationError(`Skill '${id}' must use canonical path '${canonicalPath}'.`);
    }
    if (!['target-distributed', 'hub-internal'].includes(component.distribution)) {
      throw validationError(`Skill '${component.path}' has no distribution classification.`);
    }
    if (indexedNames.includes(name)) {
      throw validationError(`Capability skill index contains duplicate skill '${name}'.`);
    }
    const skillRoot = path.join(sourceRoot, componentPath);
    const skillStat = fs.lstatSync(skillRoot, { throwIfNoEntry: false });
    if (!skillStat?.isDirectory() || skillStat.isSymbolicLink()
      || !fs.statSync(path.join(skillRoot, 'SKILL.md'), { throwIfNoEntry: false })?.isFile()) {
      throw validationError(`Canonical skill '${componentPath}' must be a real directory containing SKILL.md.`);
    }
    const skillPrefix = `${name}/`;
    const files = trackedSkillFiles
      .filter((relativePath) => relativePath.startsWith(skillPrefix))
      .map((relativePath) => relativePath.slice(skillPrefix.length));
    if (!files.includes('SKILL.md')) {
      throw validationError(`Canonical skill '${componentPath}' must contain a Git-tracked SKILL.md.`);
    }
    assertTrackedFilesNoLinks(sourceRoot, skillRoot, files);
    indexedNames.push(name);
    if (component.distribution === 'target-distributed') {
      distributedSkills.push({ name, path: componentPath, files });
    }
  }
  const sortedIndexedNames = indexedNames.sort();
  if (JSON.stringify(sortedIndexedNames) !== JSON.stringify(canonicalNames)) {
    const missing = canonicalNames.filter((name) => !sortedIndexedNames.includes(name));
    const unknown = sortedIndexedNames.filter((name) => !canonicalNames.includes(name));
    throw validationError(
      `Capability skill index must exactly match canonical skill directories. Missing: ${missing.join(', ') || 'none'}. Unknown: ${unknown.join(', ') || 'none'}.`,
    );
  }
  const sortedDistribution = distributedSkills.sort((left, right) => left.name.localeCompare(right.name));
  assertDistributionBytesMatchHead(sourceRoot, sortedDistribution);
  return { distributedSkills: sortedDistribution };
}

function assertDistributionBytesMatchHead(sourceRoot, distributedSkills) {
  const relativePaths = [
    'capabilities/index.json',
    ...distributedSkills.flatMap((skill) => skill.files.map((file) => `${skill.path}/${file}`)),
    'harness/agent-hooks/claude/settings.json',
    'harness/agent-hooks/codex/hooks.json',
    'harness/target/AGENTS.md',
  ].sort();
  const treeOutput = runGit(
    sourceRoot,
    ['ls-tree', '-r', '-z', 'HEAD', '--', 'capabilities/index.json', 'skills', 'harness/agent-hooks', 'harness/target/AGENTS.md'],
    'E_VALIDATE',
  );
  const blobIds = new Map();
  for (const entry of treeOutput.split('\0').filter(Boolean)) {
    const match = entry.match(/^(\d+) blob ([a-f0-9]+)\t(.+)$/s);
    if (!match || match[1] === '120000') {
      throw validationError('Distribution source HEAD tree contains an unsupported entry.');
    }
    blobIds.set(match[3].replaceAll('\\', '/'), match[2]);
  }
  const objectFormat = runGit(sourceRoot, ['rev-parse', '--show-object-format'], 'E_VALIDATE');
  if (!['sha1', 'sha256'].includes(objectFormat)) {
    throw validationError(`Unsupported Git object format '${objectFormat}'.`);
  }
  for (const relativePath of relativePaths) {
    assertPathHasNoLinks(sourceRoot, relativePath);
    const bytes = fs.readFileSync(path.join(sourceRoot, relativePath));
    const actualBlobId = crypto.createHash(objectFormat)
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest('hex');
    if (blobIds.get(relativePath) !== actualBlobId) {
      throw validationError(`Distribution source '${relativePath}' does not match its Git HEAD blob byte-for-byte.`);
    }
  }
}

function gitTrackedFiles(sourceRoot, relativeRoot) {
  const result = spawnSync('git', ['ls-files', '-z', '--', relativeRoot], {
    cwd: sourceRoot,
    encoding: 'buffer',
  });
  if (result.status !== 0) {
    throw validationError(`Could not enumerate Git-tracked files under '${relativeRoot}'.`);
  }
  const prefix = `${relativeRoot.replaceAll('\\', '/')}/`;
  return result.stdout.toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((trackedPath) => trackedPath.replaceAll('\\', '/'))
    .filter((trackedPath) => trackedPath.startsWith(prefix))
    .map((trackedPath) => trackedPath.slice(prefix.length))
    .sort();
}

function assertTrackedFilesNoLinks(sourceRoot, skillRoot, files) {
  for (const relativePath of files) {
    let current = skillRoot;
    const segments = relativePath.split('/');
    for (const [index, segment] of segments.entries()) {
      current = path.join(current, segment);
      const stat = fs.lstatSync(current, { throwIfNoEntry: false });
      if (!stat || stat.isSymbolicLink()) {
        throw validationError(
          `Git-tracked skill path '${path.relative(sourceRoot, current).replaceAll('\\', '/')}' must not be missing, a symbolic link, or a junction.`,
        );
      }
      if (index < segments.length - 1 && !stat.isDirectory()) {
        throw validationError(`Git-tracked skill path '${relativePath}' has a non-directory ancestor.`);
      }
      if (index === segments.length - 1 && !stat.isFile()) {
        throw validationError(`Git-tracked skill path '${relativePath}' must be a regular file.`);
      }
    }
  }
}

function snapshotHostSkillExtras(targetRoot, hosts, distributedSkills, previousManifest) {
  const current = distributedSkills.map((skill) => skill.name);
  return Object.fromEntries(hosts.map((host) => {
    const expected = new Set([...current, ...manifestOwnedSkillNames(previousManifest, host)]);
    const skillRoot = host === 'claude' ? '.claude/skills' : '.agents/skills';
    const absoluteRoot = path.join(targetRoot, skillRoot);
    const stat = fs.lstatSync(absoluteRoot, { throwIfNoEntry: false });
    if (stat && !stat.isDirectory()) {
      throw migrationError('E_COLLISION', `Host skill root '${skillRoot}' must be a directory.`, 'preflight');
    }
    const names = stat
      ? fs.readdirSync(absoluteRoot).filter((name) => !expected.has(name)).sort()
      : [];
    const paths = names.map((name) => `${skillRoot}/${name}`);
    return [host, { names, snapshot: snapshotRestorablePaths(targetRoot, paths) }];
  }));
}

function hostSkillExtrasMatch(targetRoot, host, expectedSkillNames, baseline) {
  try {
    const skillRoot = host === 'claude' ? '.claude/skills' : '.agents/skills';
    const expected = new Set(expectedSkillNames);
    const names = fs.readdirSync(path.join(targetRoot, skillRoot))
      .filter((name) => !expected.has(name))
      .sort();
    return JSON.stringify(names) === JSON.stringify(baseline.names)
      && restorablePathsMatch(targetRoot, baseline.snapshot);
  } catch {
    return false;
  }
}

function validateMigrationOutput(sourceRoot, target, hosts, options = {}) {
  const targetRoot = target.root;
  assertManagedPathsSafe(targetRoot, hosts, target.staleManagedPaths);
  const targetContract = requireFile(path.join(targetRoot, 'AGENTS.md'));
  const sourceContract = requireFile(path.join(sourceRoot, 'harness', 'target', 'AGENTS.md'));
  if (targetContract !== sourceContract) {
    throw validationError('AGENTS.md must match the repository target contract byte-for-byte.');
  }
  if (requireFile(path.join(targetRoot, '.harness-hub', '.gitignore')) !== 'state/\n.gitignore\n') {
    throw validationError('.harness-hub/.gitignore must ignore only runtime state and itself.');
  }
  const claudeEntry = requireFile(path.join(targetRoot, 'CLAUDE.md'));
  if (claudeEntry !== '@AGENTS.md\n') {
    throw validationError('CLAUDE.md must contain only @AGENTS.md.');
  }

  let knowledgeValidation = null;
  if (options.validateKnowledge !== false) {
    knowledgeValidation = assertValidOkf(
      targetRoot,
      target.knowledgeSnapshot === null && fs.statSync(path.join(sourceRoot, 'knowledge'), { throwIfNoEntry: false })?.isDirectory()
        ? path.join(sourceRoot, 'knowledge')
        : null,
    );
  }
  if (target.knowledgeSnapshot !== null
    && JSON.stringify(snapshotDirectory(path.join(targetRoot, 'knowledge'))) !== JSON.stringify(target.knowledgeSnapshot)) {
    throw validationError('Existing project knowledge must not change.');
  }
  const { distributedSkills } = readSkillDistribution(sourceRoot);

  const expectedSkillNames = distributedSkills.map((skill) => skill.name).sort();
  for (const host of hosts) {
    const skillRoot = path.join(targetRoot, host === 'claude' ? '.claude/skills' : '.agents/skills');
    for (const skill of distributedSkills) {
      compareDirectories(path.join(sourceRoot, skill.path), path.join(skillRoot, skill.name), skill.files);
    }
    const extraSnapshot = target.hostSkillExtras?.[host];
    if (!extraSnapshot || !hostSkillExtrasMatch(targetRoot, host, expectedSkillNames, extraSnapshot)) {
      throw validationError(`${host} target-owned Host skill entries must remain unchanged.`);
    }
    const configPath = path.join(targetRoot, host === 'claude' ? '.claude/settings.json' : '.codex/hooks.json');
    JSON.parse(requireFile(configPath));
    const sourceConfigPath = path.join(
      sourceRoot,
      'harness',
      'agent-hooks',
      host === 'claude' ? 'claude/settings.json' : 'codex/hooks.json',
    );
    if (!fs.readFileSync(configPath).equals(fs.readFileSync(sourceConfigPath))) {
      throw validationError(`${host} hook configuration must match the repository source byte-for-byte.`);
    }
  }

  validateChangedPaths(targetRoot, hosts, target.staleManagedPaths);
  return { knowledge: knowledgeValidation };
}

function assertValidOkf(targetRoot, forbidTree = null) {
  const report = validateOkf({
    targetDir: targetRoot,
    knowledgeRoot: 'knowledge',
    ...(forbidTree ? { forbidTree } : {}),
  });
  if (!report.ok) {
    const finding = report.findings[0];
    throw validationError(`Project knowledge is not valid Google OKF v0.1: ${finding.id} at '${finding.path}': ${finding.message}`);
  }
  return report;
}

function validateChangedPaths(targetRoot, hosts, staleManagedPaths = []) {
  const allowed = [
    'AGENTS.md',
    'CLAUDE.md',
    'knowledge',
    '.harness-hub/.gitignore',
    '.harness-hub/manifest.json',
    ...hosts.flatMap(hostManagedPaths),
    ...staleManagedPaths,
  ];
  const status = runGit(targetRoot, ['status', '--porcelain=v1', '--untracked-files=all'], 'E_VALIDATE');
  for (const line of status.split(/\r?\n/).filter(Boolean)) {
    const relativePath = line.slice(3).replaceAll('\\', '/').replace(/^"|"$/g, '');
    if (!allowed.some((entry) => relativePath === entry || relativePath.startsWith(`${entry}/`))) {
      throw validationError(`Migration changed product path '${relativePath}'.`);
    }
  }
}

function readMigrationManifest(targetRoot) {
  const manifestPath = path.join(targetRoot, '.harness-hub', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)) throw new Error('invalid schema');
    const seen = new Set();
    for (const file of manifest.files) {
      const relativePath = typeof file?.path === 'string' ? file.path : '';
      if (!relativePath
        || relativePath.includes('\\')
        || path.posix.isAbsolute(relativePath)
        || relativePath.split('/').includes('..')
        || !/^[a-f0-9]{64}$/.test(file?.sha256 || '')
        || !manifestManagedRootForFile(relativePath)
        || seen.has(relativePath)) {
        throw new Error('invalid managed file');
      }
      seen.add(relativePath);
    }
    return manifest;
  } catch {
    throw migrationError('E_COLLISION', 'Existing migration manifest is invalid.', 'preflight');
  }
}

function manifestManagedRootForFile(relativePath) {
  if (['AGENTS.md', 'CLAUDE.md', '.harness-hub/.gitignore', '.claude/settings.json', '.codex/hooks.json'].includes(relativePath)) {
    return relativePath;
  }
  const skill = relativePath.match(/^(\.claude\/skills|\.agents\/skills)\/([^/]+)\/.+$/);
  return skill ? `${skill[1]}/${skill[2]}` : null;
}

function manifestManagedRoots(manifest) {
  return [...new Set((manifest?.files ?? []).map((file) => manifestManagedRootForFile(file.path)))].sort();
}

function manifestOwnedSkillNames(manifest, host) {
  const skillRoot = host === 'claude' ? '.claude/skills' : '.agents/skills';
  return manifestManagedRoots(manifest)
    .filter((managedPath) => managedPath.startsWith(`${skillRoot}/`))
    .map((managedPath) => managedPath.slice(skillRoot.length + 1));
}

function prepareManagedPaths(targetRoot, hosts, force, distributedSkills, previousManifest, staleManagedPaths) {
  assertManagedPathsSafe(targetRoot, hosts, staleManagedPaths);
  const managedPaths = [...new Set([
    ...takeoverManagedPaths(hosts, distributedSkills),
    ...staleManagedPaths,
  ])];

  const manifestPath = path.join(targetRoot, '.harness-hub', 'manifest.json');
  const ownedFiles = new Map((previousManifest?.files ?? []).map((file) => [file.path, file.sha256]));
  if (previousManifest) ownedFiles.set('.harness-hub/manifest.json', fileHash(manifestPath));

  const collisions = [];
  for (const managedPath of managedPaths) {
    const absolutePath = path.join(targetRoot, managedPath);
    const stat = fs.statSync(absolutePath, { throwIfNoEntry: false });
    if (!stat) {
      continue;
    }
    const files = stat.isDirectory()
      ? listFiles(absolutePath).map((file) => `${managedPath}/${file}`)
      : [managedPath];
    for (const file of files) {
      const expectedHash = ownedFiles.get(file);
      const retainedRuntimeIgnore = file === '.harness-hub/.gitignore'
        && fs.readFileSync(path.join(targetRoot, file), 'utf8') === 'state/\n.gitignore\n';
      if (!expectedHash
        ? !retainedRuntimeIgnore
        : fileHash(path.join(targetRoot, file)) !== expectedHash) {
        collisions.push(file);
      }
    }
  }

  if (collisions.length > 0 && !force) {
    throw migrationError(
      'E_COLLISION',
      `Managed paths contain unowned, changed, or rollback-unsafe files: ${collisions.sort().join(', ')}`,
      'preflight',
    );
  }

  for (const managedPath of managedPaths) {
    removePathNoFollow(path.join(targetRoot, managedPath));
  }
}

function hostManagedPaths(host) {
  return host === 'claude'
    ? ['.claude/skills', '.claude/settings.json']
    : ['.agents/skills', '.codex/hooks.json'];
}

function takeoverManagedPaths(hosts, distributedSkills) {
  return [
    'AGENTS.md',
    'CLAUDE.md',
    '.harness-hub/.gitignore',
    '.harness-hub/manifest.json',
    ...hosts.flatMap((host) => {
      const skillRoot = host === 'claude' ? '.claude/skills' : '.agents/skills';
      const hookConfig = host === 'claude' ? '.claude/settings.json' : '.codex/hooks.json';
      return [...distributedSkills.map((skill) => `${skillRoot}/${skill.name}`), hookConfig];
    }),
  ];
}

function projectSourceFilesAtHead(targetRoot, head, excludedRoots) {
  const files = runGit(targetRoot, ['ls-tree', '-r', '--name-only', '-z', head, '--'], 'E_TARGET_GIT')
    .split('\0')
    .filter(Boolean)
    .map((relativePath) => relativePath.replaceAll('\\', '/'));
  return files.filter((relativePath) => !excludedRoots.some((root) => (
    relativePath === root || relativePath.startsWith(`${root}/`)
  )));
}

function rollbackManagedPaths(hosts) {
  return [
    'AGENTS.md',
    'CLAUDE.md',
    '.harness-hub/.gitignore',
    '.harness-hub/manifest.json',
    ...hosts.flatMap(hostManagedPaths),
    'knowledge',
    'evals',
    '.harness-hub/state',
  ];
}

function assertManagedPathsSafe(targetRoot, hosts, extraPaths = []) {
  for (const relativePath of [...new Set([...rollbackManagedPaths(hosts), ...extraPaths])]) {
    assertPathHasNoLinks(targetRoot, relativePath);
  }
}

function assertStandaloneGitCheckout(root, label) {
  if (!fs.lstatSync(path.join(root, '.git'), { throwIfNoEntry: false })?.isDirectory()) {
    throw migrationError(
      'E_LINKED_WORKTREE',
      `Repository migration requires a standalone ${label} checkout; linked worktrees and submodule worktrees are not supported.`,
      'preflight',
    );
  }
}

function ignoredSnapshotExclusions(hosts) {
  return rollbackManagedPaths(hosts);
}

function assertPathHasNoLinks(root, relativePath) {
  let current = root;
  for (const segment of relativePath.split('/')) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!stat) {
      return;
    }
    if (stat.isSymbolicLink()) {
      throw migrationError(
        'E_SYMLINK',
        `Managed path '${path.relative(root, current).replaceAll('\\', '/')}' must not be a symbolic link or junction.`,
        'preflight',
      );
    }
    if (!stat.isDirectory()) {
      return;
    }
  }
  assertDirectoryHasNoLinks(root, current);
}

function assertDirectoryHasNoLinks(root, directory) {
  for (const entry of fs.readdirSync(directory)) {
    const absolutePath = path.join(directory, entry);
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      throw migrationError(
        'E_SYMLINK',
        `Managed path '${path.relative(root, absolutePath).replaceAll('\\', '/')}' must not be a symbolic link or junction.`,
        'preflight',
      );
    }
    if (stat.isDirectory()) {
      assertDirectoryHasNoLinks(root, absolutePath);
    }
  }
}

function snapshotRestorablePaths(root, relativePaths) {
  return relativePaths.map((relativePath) => ({
    path: relativePath,
    entries: snapshotRestorableTree(path.join(root, relativePath)),
  }));
}

function snapshotRestorableTree(root) {
  const entries = [];
  const visit = (absolutePath, relativePath) => {
    const stat = fs.lstatSync(absolutePath, { throwIfNoEntry: false });
    if (!stat) {
      entries.push({ path: relativePath, type: 'missing' });
      return;
    }
    if (stat.isSymbolicLink()) {
      throw migrationError('E_SYMLINK', `Cannot snapshot linked path '${absolutePath}'.`, 'preflight');
    }
    if (stat.isDirectory()) {
      entries.push({ path: relativePath, type: 'directory' });
      for (const entry of fs.readdirSync(absolutePath).sort()) {
        visit(path.join(absolutePath, entry), relativePath ? `${relativePath}/${entry}` : entry);
      }
      return;
    }
    if (!stat.isFile()) {
      throw migrationError('E_COLLISION', `Managed path '${absolutePath}' is not a regular file or directory.`, 'preflight');
    }
    entries.push({
      path: relativePath,
      type: 'file',
      bytes: fs.readFileSync(absolutePath).toString('base64'),
    });
  };
  visit(root, '');
  return entries;
}

function restoreRestorablePaths(root, snapshot) {
  for (const item of snapshot) {
    const absoluteRoot = path.join(root, item.path);
    removePathNoFollow(absoluteRoot);
    if (item.entries.length === 1 && item.entries[0].type === 'missing') {
      continue;
    }
    for (const entry of item.entries) {
      const absolutePath = entry.path
        ? path.join(absoluteRoot, ...entry.path.split('/'))
        : absoluteRoot;
      if (entry.type === 'directory') {
        fs.mkdirSync(absolutePath, { recursive: true });
      } else if (entry.type === 'file') {
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, Buffer.from(entry.bytes, 'base64'));
      }
    }
  }
}

function restorablePathsMatch(root, snapshot) {
  try {
    return JSON.stringify(snapshotRestorablePaths(root, snapshot.map((item) => item.path)))
      === JSON.stringify(snapshot);
  } catch {
    return false;
  }
}

function captureClosedRun(root, runId) {
  if (typeof runId !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,95}$/.test(runId)) return null;
  const relativePath = `.harness-hub/state/runs/${runId}`;
  const runPath = path.join(root, relativePath, 'run.json');
  const integrationPath = path.join(root, relativePath, 'integration.json');
  try {
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
    const integration = JSON.parse(fs.readFileSync(integrationPath, 'utf8'));
    if (run.runId !== runId || integration.runId !== runId
      || !['completed', 'blocked', 'failed'].includes(run.status)
      || integration.status !== run.status) {
      return null;
    }
    const agentIds = Array.isArray(integration.agentEvidence)
      ? integration.agentEvidence.map((item) => item?.agentId)
      : [];
    if (agentIds.some((agentId) => typeof agentId !== 'string'
      || !/^[a-z0-9][a-z0-9._-]{0,95}$/.test(agentId))) {
      return null;
    }
    const evidencePaths = [
      `${relativePath}/run.json`,
      `${relativePath}/integration.json`,
      `${relativePath}/migration-copy-receipt.json`,
      ...agentIds.flatMap((agentId) => [
        `${relativePath}/agents/${agentId}/state.json`,
        `${relativePath}/agents/${agentId}/output.json`,
        `${relativePath}/agents/${agentId}/trace.jsonl`,
        `${relativePath}/agents/${agentId}/stderr.log`,
      ]),
    ];
    return {
      runId,
      snapshot: snapshotRestorablePaths(root, evidencePaths),
    };
  } catch {
    return null;
  }
}

function removePathNoFollow(absolutePath) {
  const stat = fs.lstatSync(absolutePath, { throwIfNoEntry: false });
  if (!stat) {
    return;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (error) {
      if (!stat.isSymbolicLink()) {
        throw error;
      }
      fs.rmdirSync(absolutePath);
    }
    return;
  }
  for (const entry of fs.readdirSync(absolutePath)) {
    removePathNoFollow(path.join(absolutePath, entry));
  }
  fs.rmdirSync(absolutePath);
}

function compareDirectories(sourceDir, targetDir, sourceFiles) {
  const targetFiles = listFiles(targetDir);
  if (JSON.stringify(targetFiles) !== JSON.stringify(sourceFiles)) {
    throw validationError(`Skill directory '${targetDir}' does not match its source.`);
  }
  for (const relativePath of sourceFiles) {
    if (!fs.readFileSync(path.join(sourceDir, relativePath)).equals(fs.readFileSync(path.join(targetDir, relativePath)))) {
      throw validationError(`Skill file '${relativePath}' does not match its source.`);
    }
  }
}

function listFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const relativePaths = entry.isDirectory()
      ? listFiles(path.join(root, entry.name)).map((file) => `${entry.name}/${file}`)
      : [entry.name];
    files.push(...relativePaths);
  }
  return files.sort();
}

function snapshotDirectory(root) {
  const stat = fs.statSync(root, { throwIfNoEntry: false });
  if (!stat) {
    return null;
  }
  if (!stat.isDirectory()) {
    throw validationError(`Project knowledge path '${root}' must be a directory.`);
  }
  return listFiles(root).map((relativePath) => ({
    path: relativePath,
    sha256: fileHash(path.join(root, relativePath)),
  }));
}

function snapshotGitControlPlane(root, errorCode) {
  const gitDir = resolveGitPath(root, runGit(root, ['rev-parse', '--absolute-git-dir'], errorCode));
  const commonDir = resolveGitPath(root, runGit(root, ['rev-parse', '--git-common-dir'], errorCode));
  const candidates = [
    ['config', path.join(commonDir, 'config')],
    ['worktree-config', path.join(gitDir, 'config.worktree')],
    ['refs', path.join(commonDir, 'refs')],
    ['packed-refs', path.join(commonDir, 'packed-refs')],
    ['common-logs', path.join(commonDir, 'logs')],
    ['worktree-logs', path.join(gitDir, 'logs')],
    ['hooks', path.join(commonDir, 'hooks')],
    ['HEAD', path.join(gitDir, 'HEAD')],
    ['ORIG_HEAD', path.join(gitDir, 'ORIG_HEAD')],
    ['FETCH_HEAD', path.join(gitDir, 'FETCH_HEAD')],
    ['MERGE_HEAD', path.join(gitDir, 'MERGE_HEAD')],
    ['CHERRY_PICK_HEAD', path.join(gitDir, 'CHERRY_PICK_HEAD')],
    ['REVERT_HEAD', path.join(gitDir, 'REVERT_HEAD')],
    ['COMMIT_EDITMSG', path.join(gitDir, 'COMMIT_EDITMSG')],
    ['rebase-merge', path.join(gitDir, 'rebase-merge')],
    ['rebase-apply', path.join(gitDir, 'rebase-apply')],
    ['sequencer', path.join(gitDir, 'sequencer')],
    ['commondir', path.join(gitDir, 'commondir')],
    ['gitdir', path.join(gitDir, 'gitdir')],
    ['shallow', path.join(commonDir, 'shallow')],
    ['index', resolveGitPath(root, runGit(root, ['rev-parse', '--git-path', 'index'], errorCode))],
    ['info/exclude', resolveGitPath(root, runGit(root, ['rev-parse', '--git-path', 'info/exclude'], errorCode))],
  ];
  const dotGit = path.join(root, '.git');
  if (fs.lstatSync(dotGit, { throwIfNoEntry: false })?.isFile()) {
    candidates.push(['git-link', dotGit]);
  }
  const seen = new Set();
  const locations = candidates.filter(([, absolutePath]) => {
    const resolvedPath = path.resolve(absolutePath);
    const key = process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return locations.map(([name, absolutePath]) => ({
    name,
    path: absolutePath,
    entries: snapshotRestorableTree(absolutePath),
    ...(name === 'index' ? { repositoryRoot: root, semanticSha256: gitIndexSemanticHash(root, errorCode) } : {}),
  }));
}

function resolveGitPath(root, value) {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(root, value);
}

function gitControlPlaneMatches(snapshot) {
  try {
    return snapshot.every((item) => item.name === 'index'
      ? item.semanticSha256 === gitIndexSemanticHash(item.repositoryRoot, 'E_VALIDATE')
      : JSON.stringify(snapshotRestorableTree(item.path)) === JSON.stringify(item.entries));
  } catch {
    return false;
  }
}

function gitIndexSemanticHash(root, errorCode) {
  return crypto.createHash('sha256').update(runGit(root, ['ls-files', '--stage', '-z'], errorCode)).digest('hex');
}

function restoreGitControlPlane(snapshot) {
  for (const item of snapshot) {
    removePathNoFollow(item.path);
    if (item.entries.length === 1 && item.entries[0].type === 'missing') {
      continue;
    }
    for (const entry of item.entries) {
      const absolutePath = entry.path
        ? path.join(item.path, ...entry.path.split('/'))
        : item.path;
      if (entry.type === 'directory') {
        fs.mkdirSync(absolutePath, { recursive: true });
      } else if (entry.type === 'file') {
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, Buffer.from(entry.bytes, 'base64'));
      }
    }
  }
}

function snapshotIgnoredPaths(root, exclusions = []) {
  const result = spawnSync(
    'git',
    ['ls-files', '--others', '--ignored', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'buffer' },
  );
  if (result.status !== 0) {
    throw migrationError('E_TARGET_GIT', 'Could not inspect ignored repository paths.');
  }
  return result.stdout.toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((relativePath) => relativePath.replaceAll('\\', '/'))
    .filter((relativePath) => !exclusions.some(
      (boundary) => relativePath === boundary || relativePath.startsWith(`${boundary}/`),
    ))
    .sort()
    .map((relativePath) => {
      const absolutePath = path.join(root, ...relativePath.split('/'));
      const stat = fs.lstatSync(absolutePath, { throwIfNoEntry: false });
      if (!stat) {
        throw migrationError('E_TARGET_GIT', `Ignored path '${relativePath}' disappeared during preflight.`);
      }
      if (stat.isSymbolicLink()) {
        return { path: relativePath, type: 'link', target: fs.readlinkSync(absolutePath) };
      }
      if (stat.isFile()) {
        return { path: relativePath, type: 'file', sha256: fileHash(absolutePath) };
      }
      return { path: relativePath, type: stat.isDirectory() ? 'directory' : 'other' };
    });
}

function ignoredPathsMatch(root, snapshot, exclusions = []) {
  try {
    return JSON.stringify(snapshotIgnoredPaths(root, exclusions)) === JSON.stringify(snapshot);
  } catch {
    return false;
  }
}

function protectedFromSecondary(primaryHost) {
  return [
    'AGENTS.md',
    'CLAUDE.md',
    'knowledge',
    '.harness-hub/.gitignore',
    '.harness-hub/manifest.json',
    ...hostManagedPaths(primaryHost),
  ];
}

function snapshotPaths(root, relativePaths) {
  const snapshot = [];
  for (const relativePath of relativePaths) {
    const absolutePath = path.join(root, relativePath);
    const stat = fs.statSync(absolutePath, { throwIfNoEntry: false });
    if (!stat) {
      snapshot.push({ path: relativePath, type: 'missing' });
    } else if (stat.isDirectory()) {
      snapshot.push({ path: relativePath, type: 'directory' });
      for (const file of listFiles(absolutePath)) {
        snapshot.push({
          path: `${relativePath}/${file}`,
          sha256: fileHash(path.join(absolutePath, file)),
          type: 'file',
        });
      }
    } else {
      snapshot.push({
        path: relativePath,
        sha256: fileHash(absolutePath),
        type: 'file',
      });
    }
  }
  return snapshot;
}

function fileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isGitTracked(root, relativePath) {
  return spawnSync('git', ['ls-files', '--error-unmatch', '--', relativePath], {
    cwd: root,
    encoding: 'utf8',
  }).status === 0;
}

function requireFile(filePath) {
  if (!fs.statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
    throw validationError(`Required migration file '${filePath}' is missing.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function validationError(message) {
  return migrationError('E_VALIDATE', message, 'validation');
}

function attachRunId(error, runId) {
  return Object.assign(error, { runId });
}

function runMigrationSlice(options) {
  const runId = `migration-${options.role}-${options.host}-${crypto.randomBytes(6).toString('hex')}`;
  const allowedPaths = migrationAllowedPaths(options.host, options.role);
  const forbiddenPaths = migrationForbiddenPaths(options.host, options.role);
  let result;
  let migrationCopy;
  try {
    migrationCopy = createMigrationCopyPlan(options, runId);
    result = runExecutableLoop({
      targetDir: options.target.root,
      loop: 'repository-migration-loop',
      runId,
      host: options.host,
      input: {
        schemaVersion: 1,
        task: `Perform the ${options.role} slice of one full Harness Hub repository migration for ${options.host}.`,
        targetSpec: options.role === 'primary'
          ? 'Run lifecycleContext.migrationCopy.command exactly once; it installs the Git-tracked Host surface and shared contract byte-for-byte without touching project knowledge.'
          : 'Run lifecycleContext.migrationCopy.command exactly once; it installs only the Git-tracked secondary Host surface without changing shared, primary-host, or project-owned content.',
        acceptanceCriteria: [
          'Complete the declared slice in one host CLI process.',
          'Do not commit, push, publish, deploy, change credentials, or change user/global configuration.',
          'Return structured migration evidence for deterministic verification.',
        ],
        allowedPaths,
        forbiddenPaths,
        validationCommands: [],
        context: {
          host: options.host,
          role: options.role,
          migrationCopy: { command: migrationCopy.command, tool: migrationCopy.tool },
        },
      },
      deterministicVerifier: (runtimeEvidence) => verifyMigrationSlice({
        ...options,
        migrationCopy,
      }, runtimeEvidence),
    });
  } catch (error) {
    if (error && typeof error === 'object'
      && ['E_HOST_MISSING', 'E_HOST_LAUNCHER', 'E_HOST_FAILED', 'E_HOST_OUTPUT', 'E_TRACE_MISSING'].includes(error.code)) {
      throw attachRunId(migrationError('E_HOST', error.message, 'host'), runId);
    }
    throw attachRunId(validationError(error instanceof Error ? error.message : String(error)), runId);
  } finally {
    if (migrationCopy) {
      fs.rmSync(migrationCopy.planPath, { force: true });
      fs.rmSync(migrationCopy.runnerPath, { force: true });
    }
  }

  if (result.status !== 'completed') {
    const findings = Array.isArray(result.handoff?.findings) ? result.handoff.findings : [];
    const message = findings.join(' ') || result.handoff?.summary || `Migration Loop '${runId}' did not complete.`;
    if (result.status === 'failed') {
      if (result.error && ['E_HOST_MISSING', 'E_HOST_LAUNCHER', 'E_HOST_FAILED', 'E_HOST_OUTPUT', 'E_TRACE_MISSING'].includes(result.error.code)) {
        throw attachRunId(migrationError('E_HOST', result.error.message || message, 'host'), runId);
      }
      if (result.error) throw attachRunId(validationError(message), runId);
      throw attachRunId(migrationError('E_HOST', message, 'host'), runId);
    }
    throw attachRunId(validationError(message), runId);
  }
  return {
    runId,
    host: options.host,
    role: options.role,
    status: result.status,
    iteration: result.iteration,
    handoff: result.handoff,
    metrics: result.metrics,
  };
}

function createMigrationCopyPlan(options, runId) {
  const runDir = path.join(
    options.target.root,
    '.harness-hub',
    'state',
    'runs',
    runId,
  );
  fs.mkdirSync(runDir, { recursive: true });
  const planPath = path.join(runDir, 'migration-copy-plan.json');
  const runnerPath = path.join(runDir, 'migration-copy-runner.mjs');
  const receiptPath = path.join(runDir, 'migration-copy-receipt.json');
  const plan = {
    schemaVersion: 1,
    runId,
    host: options.host,
    role: options.role,
    sourceRoot: options.source.root,
    sourceCommit: options.source.head,
    targetRoot: options.target.root,
    targetHead: options.target.head,
    receiptPath,
  };
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  fs.writeFileSync(
    runnerPath,
    `import { runInternalMigrationCopy } from ${JSON.stringify(pathToFileURL(fileURLToPath(import.meta.url)).href)};\nrunInternalMigrationCopy(process.argv[2], process.argv[3]);\n`,
  );
  const planSha256 = fileHash(planPath);
  const tool = process.platform === 'win32' ? 'PowerShell' : 'Bash';
  const command = [
    ...(tool === 'PowerShell' ? ['&'] : []),
    quoteCommandArgument(process.execPath, tool),
    quoteCommandArgument(runnerPath, tool),
    runId,
    planSha256,
  ].join(' ');
  return { command, tool, planPath, planSha256, receiptPath, runId, runnerPath };
}

function quoteCommandArgument(value, tool) {
  const normalized = String(value).replaceAll('\\', '/');
  if (/[\r\n]/.test(normalized)) {
    throw validationError('Internal migration command path contains unsupported characters.');
  }
  if (tool === 'PowerShell') {
    return `'${normalized.replaceAll("'", "''")}'`;
  }
  return `'${normalized.replaceAll("'", `'"'"'`)}'`;
}

export function runInternalMigrationCopy(runId, planSha256) {
  if (!/^[a-z0-9][a-z0-9._-]{0,95}$/.test(runId) || !/^[a-f0-9]{64}$/.test(planSha256)) {
    throw validationError('Internal migration copy arguments are invalid.');
  }
  const targetRoot = fs.realpathSync.native(process.cwd());
  const planPath = path.join(
    targetRoot,
    '.harness-hub',
    'state',
    'runs',
    runId,
    'migration-copy-plan.json',
  );
  const planStat = fs.lstatSync(planPath, { throwIfNoEntry: false });
  if (!planStat?.isFile() || planStat.isSymbolicLink() || fileHash(planPath) !== planSha256) {
    throw validationError('Internal migration copy plan is missing, linked, or does not match its approved hash.');
  }
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const sourceRoot = fs.realpathSync.native(SOURCE_ROOT);
  const receiptPath = path.join(path.dirname(planPath), 'migration-copy-receipt.json');
  if (plan.schemaVersion !== 1
    || plan.runId !== runId
    || !['claude', 'codex'].includes(plan.host)
    || !['primary', 'secondary'].includes(plan.role)
    || fs.realpathSync.native(plan.sourceRoot) !== sourceRoot
    || fs.realpathSync.native(plan.targetRoot) !== targetRoot
    || path.resolve(plan.receiptPath) !== receiptPath
    || runGit(sourceRoot, ['rev-parse', 'HEAD'], 'E_VALIDATE') !== plan.sourceCommit
    || runGit(sourceRoot, ['status', '--porcelain=v1', '--untracked-files=all'], 'E_VALIDATE') !== ''
    || runGit(targetRoot, ['rev-parse', 'HEAD'], 'E_VALIDATE') !== plan.targetHead) {
    throw validationError('Internal migration copy plan does not match the current source, target, or Git state.');
  }
  if (fs.existsSync(receiptPath)) {
    throw validationError('Internal migration copy command may run only once.');
  }

  const { distributedSkills } = readSkillDistribution(sourceRoot);
  const hostSkillRoot = plan.host === 'claude' ? '.claude/skills' : '.agents/skills';
  for (const skill of distributedSkills) {
    const targetSkillRoot = path.join(targetRoot, hostSkillRoot, skill.name);
    assertPathHasNoLinks(targetRoot, `${hostSkillRoot}/${skill.name}`);
    for (const relativePath of skill.files) {
      const targetPath = path.join(targetSkillRoot, relativePath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(path.join(sourceRoot, skill.path, relativePath), targetPath);
    }
  }
  const hookSource = path.join(
    sourceRoot,
    'harness',
    'agent-hooks',
    plan.host === 'claude' ? 'claude/settings.json' : 'codex/hooks.json',
  );
  const hookTarget = path.join(targetRoot, plan.host === 'claude' ? '.claude/settings.json' : '.codex/hooks.json');
  assertPathHasNoLinks(targetRoot, path.relative(targetRoot, hookTarget).replaceAll('\\', '/'));
  fs.mkdirSync(path.dirname(hookTarget), { recursive: true });
  fs.copyFileSync(hookSource, hookTarget);
  if (plan.role === 'primary') {
    assertPathHasNoLinks(targetRoot, 'AGENTS.md');
    assertPathHasNoLinks(targetRoot, 'CLAUDE.md');
    fs.copyFileSync(path.join(sourceRoot, 'harness', 'target', 'AGENTS.md'), path.join(targetRoot, 'AGENTS.md'));
    fs.writeFileSync(path.join(targetRoot, 'CLAUDE.md'), '@AGENTS.md\n');
  }

  const fileCount = distributedSkills.reduce((count, skill) => count + skill.files.length, 0)
    + 1
    + (plan.role === 'primary' ? 2 : 0);
  fs.writeFileSync(receiptPath, `${JSON.stringify({
    schemaVersion: 1,
    runId,
    host: plan.host,
    role: plan.role,
    planSha256,
    sourceCommit: plan.sourceCommit,
    targetHead: plan.targetHead,
    fileCount,
  }, null, 2)}\n`);
}

function runKnowledgeInitSlice(options) {
  const runId = `knowledge-init-${options.host}-${crypto.randomBytes(6).toString('hex')}`;
  const protectedSnapshot = snapshotPaths(options.target.root, protectedFromKnowledgeInit(options.validatedHosts));
  let result;
  try {
    result = runExecutableLoop({
      targetDir: options.target.root,
      loop: 'knowledge-init-loop',
      runId,
      host: options.host,
      forbidKnowledgeTree: path.join(options.source.root, 'knowledge'),
      input: {
        schemaVersion: 1,
        task: 'Initialize this target repository\'s project-owned LLM-Wiki from its own source files.',
        targetSpec: 'Create the smallest useful source-traceable Google OKF v0.1 knowledge tree without copying Harness Hub knowledge.',
        acceptanceCriteria: [
          'The knowledge-init-loop deterministic Google OKF v0.1 gate passes.',
          'At least one real target-repository source is cited.',
          'Shared contracts, host resources, product files, evals, Git state, and Harness Hub source remain unchanged.',
        ],
        allowedPaths: ['knowledge'],
        forbiddenPaths: [
          '.git',
          '.agents',
          '.claude',
          '.codex',
          '.harness-hub/.gitignore',
          '.harness-hub/manifest.json',
          'AGENTS.md',
          'CLAUDE.md',
        ],
        validationCommands: [],
        context: {
          host: options.host,
          knowledgeMode: 'init',
          targetRoot: options.target.root,
        },
      },
    });
  } catch (error) {
    if (error && typeof error === 'object'
      && ['E_HOST_MISSING', 'E_HOST_LAUNCHER', 'E_HOST_FAILED', 'E_HOST_OUTPUT', 'E_TRACE_MISSING'].includes(error.code)) {
      throw attachRunId(migrationError('E_HOST', error.message, 'host'), runId);
    }
    throw attachRunId(validationError(error instanceof Error ? error.message : String(error)), runId);
  }

  if (result.status !== 'completed') {
    const findings = Array.isArray(result.handoff?.findings) ? result.handoff.findings : [];
    const message = findings.join(' ') || result.handoff?.summary || `Knowledge initialization Loop '${runId}' did not complete.`;
    if (result.status === 'failed') {
      if (result.error && ['E_HOST_MISSING', 'E_HOST_LAUNCHER', 'E_HOST_FAILED', 'E_HOST_OUTPUT', 'E_TRACE_MISSING'].includes(result.error.code)) {
        throw attachRunId(migrationError('E_HOST', result.error.message || message, 'host'), runId);
      }
      if (result.error) throw attachRunId(validationError(message), runId);
      throw attachRunId(migrationError('E_HOST', message, 'host'), runId);
    }
    throw attachRunId(validationError(message), runId);
  }

  const findings = [];
  let managedPathsSafe = true;
  try {
    assertManagedPathsSafe(options.target.root, options.validatedHosts, options.target.staleManagedPaths);
  } catch (error) {
    managedPathsSafe = false;
    findings.push(error instanceof Error ? error.message : String(error));
  }
  if (!gitControlPlaneMatches(options.target.gitControlSnapshot)
    || runGit(options.target.root, ['rev-parse', 'HEAD'], 'E_VALIDATE') !== options.target.head) {
    findings.push('Knowledge initialization must not modify the target Git control plane or HEAD.');
  }
  if (!ignoredPathsMatch(
    options.target.root,
    options.target.ignoredSnapshot,
    options.target.ignoredExclusions,
  )) {
    findings.push('Knowledge initialization changed an ignored target path outside knowledge and managed runtime state.');
  }
  if (!gitControlPlaneMatches(options.source.gitControlSnapshot)
    || !ignoredPathsMatch(options.source.root, options.source.ignoredSnapshot)
    || runGit(options.source.root, ['rev-parse', 'HEAD'], 'E_VALIDATE') !== options.source.head
    || runGit(options.source.root, ['status', '--porcelain=v1', '--untracked-files=all'], 'E_VALIDATE') !== '') {
    findings.push('Knowledge initialization must not modify the Harness Hub source repository.');
  }
  if (managedPathsSafe
    && JSON.stringify(snapshotPaths(options.target.root, protectedFromKnowledgeInit(options.validatedHosts)))
    !== JSON.stringify(protectedSnapshot)) {
    findings.push('Knowledge initialization changed shared, host, or product-owned protected paths.');
  }
  if (managedPathsSafe) {
    try {
      const validation = validateMigrationOutput(
        options.source.root,
        options.target,
        options.validatedHosts,
        { validateKnowledge: true },
      );
      const projectSources = new Set(options.target.projectSourceFiles);
      if (!validation.knowledge.sources.some((relativePath) => projectSources.has(relativePath))) {
        findings.push('Project knowledge must cite at least one pre-migration target HEAD file outside Harness Hub-managed paths.');
      }
      const knowledgeFiles = snapshotDirectory(path.join(options.target.root, 'knowledge'))
        .map((entry) => `knowledge/${entry.path}`);
      const ignoredKnowledge = gitIgnoredPaths(options.target.root, knowledgeFiles);
      if (ignoredKnowledge.length > 0) {
        findings.push(`Project knowledge must not be ignored by Git: ${ignoredKnowledge.join(', ')}`);
      }
    } catch (error) {
      findings.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (findings.length > 0) {
    throw attachRunId(validationError(findings.join(' ')), runId);
  }

  return {
    runId,
    loop: 'knowledge-init-loop',
    host: options.host,
    role: 'knowledge-init',
    status: result.status,
    iteration: result.iteration,
    handoff: result.handoff,
    metrics: result.metrics,
  };
}

function gitIgnoredPaths(targetRoot, relativePaths) {
  const result = spawnSync('git', ['check-ignore', '--no-index', '-z', '--stdin'], {
    cwd: targetRoot,
    input: `${relativePaths.join('\0')}\0`,
    encoding: 'utf8',
  });
  if (![0, 1].includes(result.status)) {
    throw validationError('Could not verify whether project knowledge is ignored by Git.');
  }
  return result.stdout.split('\0').filter(Boolean).sort();
}

function protectedFromKnowledgeInit(hosts) {
  return [
    'AGENTS.md',
    'CLAUDE.md',
    '.harness-hub/.gitignore',
    '.harness-hub/manifest.json',
    ...hosts.flatMap(hostManagedPaths),
  ];
}

function verifyMigrationSlice(options, runtimeEvidence) {
  const findings = [];
  try {
    const receipt = JSON.parse(requireFile(options.migrationCopy.receiptPath));
    const expectedFileCount = options.distributedSkills.reduce(
      (count, skill) => count + skill.files.length,
      0,
    ) + 1 + (options.role === 'primary' ? 2 : 0);
    if (receipt.schemaVersion !== 1
      || receipt.runId !== options.migrationCopy.runId
      || receipt.host !== options.host
      || receipt.role !== options.role
      || receipt.planSha256 !== options.migrationCopy.planSha256
      || receipt.sourceCommit !== options.source.head
      || receipt.targetHead !== options.target.head
      || receipt.fileCount !== expectedFileCount) {
      findings.push('Migration copy receipt does not match the approved Host slice and tracked file set.');
    }
  } catch {
    findings.push('Migration Host did not invoke the approved deterministic copy command.');
  }
  let managedPathsSafe = true;
  try {
    assertManagedPathsSafe(options.target.root, options.validatedHosts, options.target.staleManagedPaths);
  } catch (error) {
    managedPathsSafe = false;
    findings.push(error instanceof Error ? error.message : String(error));
  }
  if (runtimeEvidence?.producerOutput?.host !== options.host
    || runtimeEvidence?.producerOutput?.role !== options.role) {
    findings.push(`Producer evidence must identify host '${options.host}' and role '${options.role}'.`);
  }
  if (!gitControlPlaneMatches(options.target.gitControlSnapshot)) {
    findings.push('Host CLI must not modify target Git config, refs, index, HEAD, or info/exclude.');
  }
  if (!ignoredPathsMatch(
    options.target.root,
    options.target.ignoredSnapshot,
    options.target.ignoredExclusions,
  )) {
    findings.push('Host CLI changed an ignored target path outside its exact managed boundary.');
  }
  if (runGit(options.target.root, ['rev-parse', 'HEAD'], 'E_VALIDATE') !== options.target.head) {
    findings.push('Host CLI must not move the target HEAD.');
  }
  if (!gitControlPlaneMatches(options.source.gitControlSnapshot)
    || !ignoredPathsMatch(options.source.root, options.source.ignoredSnapshot)
    || runGit(options.source.root, ['rev-parse', 'HEAD'], 'E_VALIDATE') !== options.source.head
    || runGit(options.source.root, ['status', '--porcelain=v1', '--untracked-files=all'], 'E_VALIDATE') !== ''
    || runGit(options.source.root, ['config', '--get', 'remote.origin.url'], 'E_VALIDATE') !== options.source.url) {
    findings.push('Host CLI must not modify the Harness Hub source worktree or Git control plane.');
  }
  if (managedPathsSafe && options.protectedSnapshot
    && JSON.stringify(snapshotPaths(options.target.root, protectedFromSecondary(options.validatedHosts[0])))
      !== JSON.stringify(options.protectedSnapshot)) {
    findings.push('Secondary host must not modify shared or primary-host files.');
  }
  if (managedPathsSafe) {
    try {
      validateMigrationOutput(options.source.root, options.target, options.validatedHosts, {
        validateKnowledge: options.validateKnowledge,
      });
    } catch (error) {
      findings.push(error instanceof Error ? error.message : String(error));
    }
  }
  return {
    status: 'completed',
    verdict: findings.length === 0 ? 'pass' : 'blocked',
    findings,
    handoff: {
      summary: findings.length === 0
        ? `${options.host} ${options.role} migration slice passed deterministic validation.`
        : `${options.host} ${options.role} migration slice failed deterministic validation.`,
    },
  };
}

function migrationAllowedPaths(host, role) {
  const hostPaths = hostManagedPaths(host);
  if (role === 'secondary') {
    return hostPaths;
  }
  return [
    'AGENTS.md',
    'CLAUDE.md',
    ...hostPaths,
  ];
}

function migrationForbiddenPaths(host, role) {
  const paths = ['.git', 'knowledge'];
  if (role === 'secondary') {
    paths.push('AGENTS.md', 'CLAUDE.md', '.harness-hub/manifest.json');
    paths.push(...(host === 'claude' ? ['.agents', '.codex'] : ['.claude']));
  }
  return paths;
}

function rollbackTarget(target, managedSnapshot) {
  restoreGitControlPlane(target.gitControlSnapshot);
  runGit(target.root, ['reset', '--hard', target.head], 'E_ROLLBACK');
  runGit(target.root, ['clean', '-fd'], 'E_ROLLBACK');
  restoreRestorablePaths(target.root, managedSnapshot);
  restoreGitControlPlane(target.gitControlSnapshot);
  if (runGit(target.root, ['rev-parse', 'HEAD'], 'E_ROLLBACK') !== target.head
    || runGit(target.root, ['status', '--porcelain=v1', '--untracked-files=all'], 'E_ROLLBACK') !== '') {
    throw migrationError('E_ROLLBACK', 'Git rollback did not restore the target.', 'rollback');
  }
  restoreGitControlPlane(target.gitControlSnapshot);
  if (!gitControlPlaneMatches(target.gitControlSnapshot)
    || !restorablePathsMatch(target.root, managedSnapshot)
    || !ignoredPathsMatch(target.root, target.ignoredSnapshot, target.ignoredExclusions)) {
    throw migrationError('E_ROLLBACK', 'Rollback did not restore managed, ignored, and Git control state exactly.', 'rollback');
  }
}

function rollbackSource(source) {
  restoreGitControlPlane(source.gitControlSnapshot);
  runGit(source.root, ['reset', '--hard', source.head], 'E_ROLLBACK');
  runGit(source.root, ['clean', '-fd'], 'E_ROLLBACK');
  restoreGitControlPlane(source.gitControlSnapshot);
  if (runGit(source.root, ['rev-parse', 'HEAD'], 'E_ROLLBACK') !== source.head
    || runGit(source.root, ['status', '--porcelain=v1', '--untracked-files=all'], 'E_ROLLBACK') !== ''
    || runGit(source.root, ['config', '--get', 'remote.origin.url'], 'E_ROLLBACK') !== source.url) {
    throw migrationError('E_ROLLBACK', 'Git rollback did not restore the source.', 'rollback');
  }
  restoreGitControlPlane(source.gitControlSnapshot);
  if (!gitControlPlaneMatches(source.gitControlSnapshot)
    || !ignoredPathsMatch(source.root, source.ignoredSnapshot)) {
    throw migrationError('E_ROLLBACK', 'Rollback did not restore the source ignored and Git control state exactly.', 'rollback');
  }
}

function preflightSource(sourceDir, knownRoot = null) {
  const root = knownRoot ?? runGit(sourceDir, ['rev-parse', '--show-toplevel'], 'E_SOURCE_GIT');
  assertStandaloneGitCheckout(root, 'Harness Hub source');
  const head = runGit(sourceDir, ['rev-parse', '--verify', 'HEAD'], 'E_SOURCE_HEAD');
  const url = runGit(sourceDir, ['config', '--get', 'remote.origin.url'], 'E_SOURCE_GIT');
  const status = runGit(sourceDir, ['status', '--porcelain=v1', '--untracked-files=all'], 'E_SOURCE_GIT');
  if (status !== '') {
    throw migrationError('E_SOURCE_DIRTY', 'Harness Hub source must be a clean Git worktree.');
  }
  return {
    gitControlSnapshot: snapshotGitControlPlane(root, 'E_SOURCE_GIT'),
    head,
    ignoredSnapshot: snapshotIgnoredPaths(root),
    root,
    url,
  };
}

function writeManifest(source, targetRoot, hosts, primaryHost, distributedSkills) {
  const managedPaths = ['.harness-hub/.gitignore', 'AGENTS.md', 'CLAUDE.md'];
  for (const host of hosts) {
    const skillRoot = host === 'claude' ? '.claude/skills' : '.agents/skills';
    for (const skill of distributedSkills) {
      const relativeRoot = `${skillRoot}/${skill.name}`;
      managedPaths.push(...skill.files.map((file) => `${relativeRoot}/${file}`));
    }
    managedPaths.push(host === 'claude' ? '.claude/settings.json' : '.codex/hooks.json');
  }
  const files = [...new Set(managedPaths)].sort().map((relativePath) => ({
    path: relativePath,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(targetRoot, relativePath))).digest('hex'),
  }));
  const manifest = {
    schemaVersion: 1,
    source: { url: source.url, commit: source.head },
    hosts: [...hosts].sort(),
    primaryHost,
    files,
  };
  const manifestDir = path.join(targetRoot, '.harness-hub');
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(path.join(manifestDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function runGit(cwd, args, code) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw migrationError(code, 'Target must be a Git repository with an existing HEAD.');
  }
  return result.stdout.trimEnd();
}

function migrationError(code, message, phase = 'preflight', exitCode = 3) {
  return Object.assign(new Error(message), { code, phase, exitCode });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  && process.argv[2] === 'copy-slice') {
  try {
    if (process.argv.length !== 5) {
      throw validationError('Internal migration copy accepts only runId and plan hash.');
    }
    runInternalMigrationCopy(process.argv[3], process.argv[4]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 3;
  }
}
