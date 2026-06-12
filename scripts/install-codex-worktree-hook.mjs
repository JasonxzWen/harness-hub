import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const MARKER = 'harness-hub-codex-worktree-bootstrap';

const HOOK_BODY = `#!/bin/sh
# Managed by Harness Hub (${MARKER}).
# Runs ignored local Codex bootstrap after git worktree add.

zero_ref="0000000000000000000000000000000000000000"

if [ "\${3:-}" != "1" ] || [ "\${1:-}" != "$zero_ref" ]; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
setup_script="$repo_root/scripts/setup-codex-worktree.mjs"

if [ ! -f "$setup_script" ]; then
  exit 0
fi

if command -v node >/dev/null 2>&1; then
  node "$setup_script" || {
    echo "Warning: Harness Hub Codex worktree setup failed; run: bun run codex:worktree-setup" >&2
  }
else
  echo "Warning: node not found; run: bun run codex:worktree-setup" >&2
fi

exit 0
`;

function runGit(root, args, options = {}) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (!options.allowFailure && result.status !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || `git ${args.join(' ')} failed`;
    throw new Error(message);
  }
  return result;
}

function toPortable(displayPath) {
  return displayPath.split(path.sep).join('/');
}

function resolveFromRoot(root, maybeRelativePath) {
  return path.isAbsolute(maybeRelativePath)
    ? path.normalize(maybeRelativePath)
    : path.resolve(root, maybeRelativePath);
}

function resolveHookPath(root) {
  const hooksPathConfig = runGit(root, ['config', '--get', 'core.hooksPath'], { allowFailure: true });
  const configuredHooksPath = hooksPathConfig.status === 0 ? hooksPathConfig.stdout.trim() : '';

  if (configuredHooksPath) {
    return {
      hookPath: path.join(resolveFromRoot(root, configuredHooksPath), 'post-checkout'),
      configuredHooksPath,
    };
  }

  const gitPath = runGit(root, ['rev-parse', '--git-path', 'hooks/post-checkout']).stdout.trim();
  return {
    hookPath: resolveFromRoot(root, gitPath),
    configuredHooksPath: null,
  };
}

function inspectExistingHook(hookPath) {
  if (!fs.existsSync(hookPath)) {
    return { exists: false, managed: false };
  }

  const content = fs.readFileSync(hookPath, 'utf8');
  return {
    exists: true,
    managed: content.includes(MARKER),
  };
}

export function installCodexWorktreeHook(options = {}) {
  const root = path.resolve(options.root ?? REPO_ROOT);
  const dryRun = options.dryRun === true;
  const force = options.force === true;
  const { hookPath, configuredHooksPath } = resolveHookPath(root);
  const existing = inspectExistingHook(hookPath);

  if (existing.exists && !existing.managed && !force) {
    throw new Error(
      `Refusing to overwrite existing post-checkout hook at ${hookPath}. Re-run with --force only after reviewing it.`,
    );
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(hookPath), { recursive: true });
    fs.writeFileSync(hookPath, HOOK_BODY, { mode: 0o755 });
    fs.chmodSync(hookPath, 0o755);
  }

  return {
    root,
    hookPath,
    dryRun,
    force,
    configuredHooksPath,
    existing,
  };
}

function parseArgs(argv) {
  const options = { dryRun: false, force: false, root: undefined };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--force') {
      options.force = true;
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
  const action = result.dryRun ? 'Would install' : result.existing.managed ? 'Updated' : 'Installed';
  console.log(`${action} Codex worktree bootstrap hook at ${toPortable(result.hookPath)}`);
  if (result.configuredHooksPath) {
    console.log(`Using configured core.hooksPath: ${result.configuredHooksPath}`);
  }
  console.log('Hook runs scripts/setup-codex-worktree.mjs after git worktree add.');
  console.log('Hook failures are advisory and do not block git worktree add.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = installCodexWorktreeHook(parseArgs(process.argv.slice(2)));
    printSummary(result);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
