import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const CODEX_SKILLS_DIR = path.join('.codex', 'skills');
const HARNESS_STATE_DIR = path.join('.harness-hub', 'state');
const REQUIRED_STATE_FILES = ['current-task.md', 'decisions.md', 'progress.md', 'session-handoff.md'];
const SETUP_COMMAND = 'bun run codex:worktree-setup';

function toPortable(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function inspectSkills(root) {
  const dir = path.join(root, CODEX_SKILLS_DIR);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return {
      id: 'codex-skills',
      ok: false,
      path: toPortable(CODEX_SKILLS_DIR),
      reason: 'Missing repo-local Codex skill wrappers.',
    };
  }

  const skillCount = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, 'SKILL.md')))
    .length;

  if (skillCount === 0) {
    return {
      id: 'codex-skills',
      ok: false,
      path: toPortable(CODEX_SKILLS_DIR),
      reason: 'Repo-local Codex skill wrappers contain no SKILL.md files.',
    };
  }

  return {
    id: 'codex-skills',
    ok: true,
    path: toPortable(CODEX_SKILLS_DIR),
    reason: `Found ${skillCount} repo-local skill wrappers.`,
  };
}

function inspectHarnessState(root) {
  const dir = path.join(root, HARNESS_STATE_DIR);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return {
      id: 'harness-state',
      ok: false,
      path: toPortable(HARNESS_STATE_DIR),
      reason: 'Missing worktree-local harness state directory.',
      missingFiles: REQUIRED_STATE_FILES,
    };
  }

  const missingFiles = REQUIRED_STATE_FILES.filter((file) => !fs.existsSync(path.join(dir, file)));
  if (missingFiles.length > 0) {
    return {
      id: 'harness-state',
      ok: false,
      path: toPortable(HARNESS_STATE_DIR),
      reason: `Missing harness state files: ${missingFiles.join(', ')}.`,
      missingFiles,
    };
  }

  return {
    id: 'harness-state',
    ok: true,
    path: toPortable(HARNESS_STATE_DIR),
    reason: 'Found required worktree-local harness state files.',
    missingFiles: [],
  };
}

export function inspectCodexWorktree(options = {}) {
  const root = path.resolve(options.root ?? REPO_ROOT);
  const checks = [inspectSkills(root), inspectHarnessState(root)];
  const ok = checks.every((check) => check.ok);
  return {
    schemaVersion: 1,
    root,
    ok,
    checks,
    setupCommand: SETUP_COMMAND,
  };
}

function parseArgs(argv) {
  const options = { root: undefined, writeTask: false, json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--write-task') {
      options.writeTask = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
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

function formatText(result, options) {
  const lines = [];
  if (result.ok) {
    lines.push('Codex worktree bootstrap is ready.');
  } else if (options.writeTask) {
    lines.push('Codex worktree bootstrap is incomplete for write tasks.');
  } else {
    lines.push('Warning: Codex worktree bootstrap is incomplete; read-only work may continue.');
  }

  for (const check of result.checks) {
    lines.push(`- ${check.ok ? 'ok' : 'missing'} ${check.path}: ${check.reason}`);
  }

  if (!result.ok) {
    lines.push(`Run: ${result.setupCommand}`);
  }

  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = inspectCodexWorktree({ root: options.root });
    if (options.json) {
      console.log(JSON.stringify({ ...result, writeTask: options.writeTask }, null, 2));
    } else {
      console.log(formatText(result, options));
    }
    process.exit(result.ok || !options.writeTask ? 0 : 2);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
