import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const removedLegacyPaths = [
  '.claude-plugin',
  '.github/workflows/publish-npm.yml',
  '.github/workflows/publish-source-posts.yml',
  'site',
  'src',
  'harness/minimal',
  'scripts/harness-agent-gate.mjs',
  'scripts/harness-agent-hook-adapter.mjs',
  'scripts/smoke-managed-update.ps1',
  'docs/agentic-loop-catalog.md',
  'docs/host-adapters/claude-code-agentic-loops.md',
  'docs/host-adapters/codex-agentic-loops.md',
  'skills/answer-workflow',
  'skills/delivery-workflow',
  'skills/diagnosis-workflow',
  'skills/coding-standards',
  'skills/compound-code-review',
  'skills/harness-quality-check',
  'skills/hub-maintenance-workflow',
  'skills/review-workflow',
  'skills/sdd-workflow',
  'skills/tdd-workflow',
  'skills/verification-loop',
  'skills/workflow-router',
] as const;

function containsFile(targetPath: string): boolean {
  const stat = fs.statSync(targetPath, { throwIfNoEntry: false });
  if (!stat) {
    return false;
  }
  if (stat.isFile()) {
    return true;
  }
  return fs.readdirSync(targetPath).some((entry) => containsFile(path.join(targetPath, entry)));
}

test('repository Git state is the only distribution and version source', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as Record<string, unknown> & {
    bin?: Record<string, string>;
    private?: boolean;
    scripts?: Record<string, string>;
  };

  expect(packageJson.private).toBe(true);
  for (const key of ['version', 'main', 'publishConfig', 'files']) {
    expect(packageJson[key], key).toBeUndefined();
  }
  expect(packageJson.bin).toEqual({ 'harness-hub': 'bin/harness-hub.mjs' });
  for (const script of ['build', 'prepack', 'validate:release', 'smoke:managed-update']) {
    expect(packageJson.scripts?.[script], script).toBeUndefined();
  }
  expect(packageJson.scripts?.validate).toContain('bun test ./tests');
  expect(fs.readFileSync('.gitattributes', 'utf8')).toBe('* text=auto eol=lf\n');

  for (const removedPath of removedLegacyPaths) {
    expect(containsFile(removedPath), removedPath).toBe(false);
  }
});

test('the repository exposes one full-migration CLI and no lifecycle subcommands', () => {
  const result = spawnSync(process.execPath, ['bin/harness-hub.mjs', '--help'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  expect(result.stdout).toContain('node bin/harness-hub.mjs migrate <target> --yes [--host claude|codex|both]');
  expect(result.stdout).toContain('--primary claude|codex');
  expect(result.stdout).toContain('valid schemaVersion 1 manifest');
  for (const obsolete of [' install ', ' update ', ' remove ', ' init-harness ', ' activate-agents ', ' migrate-lock ']) {
    expect(result.stdout, obsolete).not.toContain(obsolete);
  }

  const bootstrap = fs.readFileSync('BOOTSTRAP-TARGET.md', 'utf8');
  expect(bootstrap).toContain('git clone');
  expect(bootstrap).toContain('node bin/harness-hub.mjs migrate');
  expect(bootstrap).toContain('repository Skills are installed under `.agents/skills/`');
  expect(bootstrap).toContain('hooks remain in `.codex/hooks.json`');
  expect(bootstrap).toContain('only when the user already trusts the target');
  expect(bootstrap).not.toContain('.codex/skills');
  expect(bootstrap).not.toMatch(/\bnpx\b|npm (?:install|publish|pack)(?:\s|$)/);

  const updateDocs = [
    'BOOTSTRAP-TARGET.md',
    'README.md',
    'README.zh-CN.md',
    'AGENTS.md',
    'harness/target/AGENTS.md',
  ];
  for (const documentPath of updateDocs) {
    const document = fs.readFileSync(documentPath, 'utf8');
    expect(document, documentPath).toContain('https://github.com/JasonxzWen/harness-hub');
    expect(document, documentPath).toContain('node bin/harness-hub.mjs migrate <current-repository> --yes');
    expect(document, documentPath).toContain('.harness-hub/manifest.json');
    expect(document, documentPath).toMatch(/default branch/i);
    expect(document, documentPath).toMatch(/source commit/i);
  }

  for (const command of [
    'install',
    'update',
    'remove',
    'check',
    'status',
    'init',
    'init-harness',
    'bootstrap-dev',
    'activate-agents',
    'activate-codex',
    'migrate-lock',
    'analyze',
    'self-check',
  ]) {
    const rejected = spawnSync(process.execPath, ['bin/harness-hub.mjs', command, '.'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(rejected.status, command).toBe(2);
    expect(JSON.parse(rejected.stderr), command).toMatchObject({ code: 'E_INPUT', phase: 'input' });
  }

  const internalModule = spawnSync(process.execPath, ['scripts/migrate.mjs', '--help'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  expect(internalModule).toMatchObject({ status: 0, stdout: '', stderr: '' });
});

test('every canonical skill has an explicit versionless distribution decision', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    version?: unknown;
    generatedAt?: unknown;
    components: Record<string, {
      distribution?: string;
      kind: string;
      path: string;
      version?: unknown;
    }>;
  };
  const skillDirectories = fs.readdirSync('skills', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join('skills', entry.name, 'SKILL.md')))
    .map((entry) => `skills/${entry.name}`)
    .sort();
  const components = Object.entries(index.components);
  const componentPaths = components.map(([, component]) => component.path).sort();
  const internal = components.filter(([, component]) => component.distribution === 'hub-internal');

  expect(index.version).toBeUndefined();
  expect(index.generatedAt).toBeUndefined();
  expect(components.every(([, component]) => component.kind === 'skill')).toBe(true);
  expect(components.every(([, component]) => component.version === undefined)).toBe(true);
  expect(components.every(([, component]) => ['target-distributed', 'hub-internal'].includes(component.distribution ?? ''))).toBe(true);
  expect(componentPaths).toEqual(skillDirectories);
  expect(internal.map(([id]) => id)).toEqual([]);
  expect(index.components['skill:harness-quality-check']).toBeUndefined();
});

test('host hooks use only the standalone deterministic safety hook', () => {
  const claude = JSON.parse(fs.readFileSync('harness/agent-hooks/claude/settings.json', 'utf8'));
  const codex = JSON.parse(fs.readFileSync('harness/agent-hooks/codex/hooks.json', 'utf8'));
  const hookDocs = fs.readFileSync('harness/agent-hooks/README.md', 'utf8');
  const targetContract = fs.readFileSync('harness/target/AGENTS.md', 'utf8');
  const safetyHook = fs.readFileSync('harness/agent-hooks/safety-hook.mjs', 'utf8');

  expect(Object.keys(claude.hooks)).toEqual(['PreToolUse']);
  expect(Object.keys(codex.hooks)).toEqual(['PreToolUse']);
  expect(JSON.stringify(claude)).toContain('node .harness-hub/safety-hook.mjs');
  expect(JSON.stringify(codex)).toContain('node .harness-hub/safety-hook.mjs');
  expect(JSON.stringify(claude)).not.toMatch(/workflow-router|loop-runtime|Task|Agent/);
  expect(JSON.stringify(codex)).not.toMatch(/workflow-router|loop-runtime|Task|Agent/);
  expect(hookDocs).toContain('skills live under `.agents/skills/`');
  expect(hookDocs).toContain('hook configuration remains `.codex/hooks.json`');
  expect(hookDocs).toContain('only for a trusted project');
  expect(targetContract).toContain('Codex discovers skills from `.agents/skills/`');
  expect(targetContract).toContain('reads hooks from `.codex/hooks.json`');
  expect(targetContract).toContain('Codex project hooks run only when the user already trusts the project');
  expect(safetyHook).toContain('dispatchesAgents: false');
  expect(safetyHook).toContain('mutates: false');
  expect(safetyHook).not.toMatch(/node:child_process|spawnSync|execFile|\.harness-hub\/state|workflow-router|loop-runtime/);
  expect(safetyHook).not.toMatch(/writeFileSync|appendFileSync|mkdirSync|rmSync|renameSync/);
});

test('distribution keeps standalone validators without a generic Agent runtime', () => {
  const executableSources = [
    'bin/harness-hub.mjs',
    'scripts/migrate.mjs',
    'harness/agent-hooks/safety-hook.mjs',
  ].map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');

  expect(fs.existsSync('scripts/okf-validate.mjs')).toBe(true);
  expect(fs.existsSync('harness/agent-hooks/safety-hook.mjs')).toBe(true);
  expect(containsFile('skills/workflow-router')).toBe(false);
  expect(executableSources).not.toMatch(/runExecutable(?:Loop|Workflow)|repository-migration-loop|copy-slice|migration-copy-receipt|state\/runs|leases|integration\.json/);
  expect(fs.existsSync('skills/clone-website/assets/website-cloner/scripts/validate-site.mjs')).toBe(true);
  for (const fixture of [
    'decision-brief-self-check-report.json',
    'harness-vocabulary-explainer-report.json',
    'skill-research-report-readable.json',
    'source-post-report.json',
    'trigger-scope-retro-report.json',
  ]) {
    expect(fs.existsSync(path.join('skills/effective-interact/assets/fixtures', fixture)), fixture).toBe(false);
  }
});
