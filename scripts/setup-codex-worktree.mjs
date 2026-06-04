import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { syncCodexSkills } from './sync-codex-skills.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const STATE_TEMPLATE_DIR = path.join('harness', 'minimal', 'state-templates');
const STATE_TARGET_DIR = path.join('.harness-hub', 'state');

function toPortable(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function assertInsideRoot(root, target) {
  const relative = path.relative(root, target);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return target;
  }
  throw new Error(`Refusing to write outside repository root: ${target}`);
}

function readStateTemplateFiles(root) {
  const templateRoot = path.join(root, STATE_TEMPLATE_DIR);
  if (!fs.existsSync(templateRoot)) {
    throw new Error(`Missing harness state template root: ${toPortable(STATE_TEMPLATE_DIR)}`);
  }

  return fs
    .readdirSync(templateRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => ({
      name: entry.name,
      source: path.join(templateRoot, entry.name),
      dest: path.join(root, STATE_TARGET_DIR, entry.name),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function setupHarnessState(root, options = {}) {
  const dryRun = options.dryRun === true;
  const resetState = options.resetState === true;
  const stateDir = assertInsideRoot(root, path.join(root, STATE_TARGET_DIR));
  const templateFiles = readStateTemplateFiles(root).map((file) => ({
    ...file,
    dest: assertInsideRoot(root, file.dest),
  }));
  const stateExists = fs.existsSync(stateDir);
  const stateIsDirectory = stateExists ? fs.statSync(stateDir).isDirectory() : false;

  if (stateExists && !stateIsDirectory && !resetState) {
    throw new Error(`Harness state path exists but is not a directory; rerun with --reset-state to replace: ${toPortable(path.relative(root, stateDir))}`);
  }

  const missingTemplates = stateIsDirectory
    ? templateFiles.filter((file) => !fs.existsSync(file.dest))
    : templateFiles;
  const templatesToWrite = resetState ? templateFiles : missingTemplates;

  if (!dryRun) {
    if (resetState) {
      fs.rmSync(stateDir, { recursive: true, force: true });
    }
    fs.mkdirSync(stateDir, { recursive: true });
    for (const file of templatesToWrite) {
      fs.copyFileSync(file.source, file.dest);
    }
  }

  return {
    stateDir,
    resetState,
    existed: stateExists,
    templates: templateFiles.map((file) => file.name),
    writtenTemplates: templatesToWrite.map((file) => file.name),
  };
}

export function setupCodexWorktree(options = {}) {
  const root = path.resolve(options.root ?? REPO_ROOT);
  const dryRun = options.dryRun === true;
  const resetState = options.resetState === true;
  const skills = syncCodexSkills({ root, dryRun });
  const state = setupHarnessState(root, { dryRun, resetState });

  return {
    root,
    dryRun,
    skills,
    state,
  };
}

function parseArgs(argv) {
  const options = { dryRun: false, resetState: false, root: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--reset-state' || arg === '--fresh') {
      options.resetState = true;
      continue;
    }
    if (arg === '--root') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('--root requires a value');
      }
      options.root = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function printSummary(result) {
  const skillAction = result.dryRun ? 'Would sync' : 'Synced';
  console.log(`${skillAction} ${result.skills.copied} skills into ${toPortable(path.relative(result.root, result.skills.codexSkillsRoot))}/`);
  if (result.skills.staleRemoved > 0) {
    console.log(`${result.dryRun ? 'Would remove' : 'Removed'} ${result.skills.staleRemoved} stale skill directories.`);
  }

  const statePath = `${toPortable(path.relative(result.root, result.state.stateDir))}/`;
  if (result.state.resetState) {
    const stateAction = result.dryRun ? 'Would reset' : 'Reset';
    console.log(`${stateAction} clean harness state in ${statePath} from ${result.state.templates.length} templates.`);
  } else if (!result.state.existed) {
    const stateAction = result.dryRun ? 'Would initialize' : 'Initialized';
    console.log(`${stateAction} clean harness state in ${statePath} from ${result.state.writtenTemplates.length} templates.`);
  } else if (result.state.writtenTemplates.length > 0) {
    const stateAction = result.dryRun ? 'Would preserve existing harness state and create' : 'Preserved existing harness state and created';
    console.log(`${stateAction} ${result.state.writtenTemplates.length} missing templates in ${statePath}.`);
  } else {
    const stateAction = result.dryRun ? 'Would preserve' : 'Preserved';
    console.log(`${stateAction} existing harness state in ${statePath}; all ${result.state.templates.length} templates already exist.`);
  }
  console.log('No checkpoint commit was created for worktree setup.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = setupCodexWorktree(parseArgs(process.argv.slice(2)));
    printSummary(result);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
