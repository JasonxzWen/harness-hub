import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const removedLegacyPaths = [
  '.claude-plugin',
  '.github/workflows/publish-npm.yml',
  'src',
  'harness/minimal',
  'scripts/harness-agent-gate.mjs',
  'scripts/harness-agent-hook-adapter.mjs',
  'scripts/smoke-managed-update.ps1',
  'skills/harness-quality-check',
  'skills/hub-maintenance-workflow',
  'skills/workflow-router/scripts/agentic-loop-check.mjs',
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
  expect(result.stdout).toContain('node bin/harness-hub.mjs migrate <target> --host claude|codex|both --yes');
  expect(result.stdout).toContain('--primary claude|codex');
  for (const obsolete of [' install ', ' update ', ' remove ', ' init-harness ', ' activate-agents ', ' migrate-lock ']) {
    expect(result.stdout, obsolete).not.toContain(obsolete);
  }

  const bootstrap = fs.readFileSync('BOOTSTRAP-TARGET.md', 'utf8');
  expect(bootstrap).toContain('git clone');
  expect(bootstrap).toContain('node bin/harness-hub.mjs migrate');
  expect(bootstrap).toContain('repository skills are installed only under `.agents/skills/`');
  expect(bootstrap).toContain('hooks remain in `.codex/hooks.json`');
  expect(bootstrap).toContain('only after the target repository is trusted');
  expect(bootstrap).not.toContain('.codex/skills');
  expect(bootstrap).not.toMatch(/\bnpx\b|npm (?:install|publish|pack)(?:\s|$)/);

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

test('host hooks execute the repository-local workflow runtime without an npm binary', () => {
  const claude = fs.readFileSync('harness/agent-hooks/claude/settings.json', 'utf8');
  const codex = fs.readFileSync('harness/agent-hooks/codex/hooks.json', 'utf8');
  const hookDocs = fs.readFileSync('harness/agent-hooks/README.md', 'utf8');
  const targetContract = fs.readFileSync('harness/target/AGENTS.md', 'utf8');
  const hookRuntime = fs.readFileSync('skills/workflow-router/scripts/harness-agent-hook.mjs', 'utf8');

  expect(claude).toContain('node .claude/skills/workflow-router/scripts/harness-agent-hook.mjs --host claude');
  expect(codex).toContain('node .agents/skills/workflow-router/scripts/harness-agent-hook.mjs --host codex');
  expect(codex).not.toContain('.codex/skills');
  expect(claude).not.toContain('harness-agent-hook --host');
  expect(codex).not.toContain('harness-agent-hook --host');
  expect(hookDocs).toContain('skills live under `.agents/skills/`');
  expect(hookDocs).toContain('hook configuration remains `.codex/hooks.json`');
  expect(hookDocs).toContain('only for a trusted project');
  expect(targetContract).toContain('Codex repository skills are discovered only from `.agents/skills/`');
  expect(targetContract).toContain('hooks remain in `.codex/hooks.json`');
  expect(targetContract).toContain('run only after Codex trusts this project');
  expect(targetContract).toContain('batch the current dependency frontier with recommended defaults');
  expect(targetContract).toContain('never infer acceptance for unanswered rows');
  expect(hookRuntime).toContain('HARNESS_HUB_CHILD_RUN');
});

test('distributed skills contain the executable Loop layer without source-repository fixtures', () => {
  const routerScripts = fs.readdirSync('skills/workflow-router/scripts').sort();

  expect(routerScripts).toContain('loop-runtime.mjs');
  expect(routerScripts).toContain('okf-validate.mjs');
  expect(routerScripts).toContain('harness-agent-hook.mjs');
  expect(routerScripts).not.toContain('agentic-loop-check.mjs');
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
