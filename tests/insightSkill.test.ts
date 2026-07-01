import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

const skillDir = 'skills/insight';
const skill = fs.readFileSync(`${skillDir}/SKILL.md`, 'utf8');
const dataSources = fs.readFileSync(`${skillDir}/references/data-sources.md`, 'utf8');
const analysisRubric = fs.readFileSync(`${skillDir}/references/analysis-rubric.md`, 'utf8');
const reportShape = fs.readFileSync(`${skillDir}/references/report-shape.md`, 'utf8');
const collectScript = `${skillDir}/scripts/collect-insight-events.mjs`;
const reportScript = `${skillDir}/scripts/build-insight-report.mjs`;
const createInteractionScript = 'skills/effective-interact/scripts/create-interaction.mjs';
const validateInteractionScript = 'skills/effective-interact/scripts/validate-interaction.mjs';
const activationScript = 'skills/workflow-router/scripts/skill-activation-check.mjs';

function writeFile(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insight-skill-'));
  const projectName = `insight-target-${path.basename(root).replace(/[^a-z0-9-]/gi, '').toLowerCase()}`;
  const repo = path.join(root, projectName);
  const codexRoot = path.join(root, 'codex-traces');
  const claudeRoot = path.join(root, 'claude-traces');
  const out = path.join(root, 'reports');

  fs.mkdirSync(repo, { recursive: true });
  writeFile(path.join(repo, 'package.json'), JSON.stringify({ name: `@demo/${projectName}` }, null, 2));
  writeFile(path.join(repo, 'AGENTS.md'), [
    '# Agent Rules',
    `The ${projectName} repository values evidence-backed handoffs and validation.`,
  ].join('\n'));
  writeFile(path.join(codexRoot, 'session.jsonl'), [
    JSON.stringify({
      timestamp: '2026-06-20T10:00:00.000Z',
      type: 'session_meta',
      payload: { cwd: repo },
    }),
    JSON.stringify({
      timestamp: '2026-06-20T10:01:00.000Z',
      type: 'event_msg',
      payload: {
        type: 'user_message',
        message: 'Audit the project interaction bottlenecks.',
      },
    }),
    JSON.stringify({
      timestamp: '2026-06-20T10:02:00.000Z',
      type: 'event_msg',
      payload: {
        type: 'mcp_tool_call_end',
        invocation: { server: 'shell', tool: 'exec_command' },
        result: { isError: true, content: 'validation failed before handoff' },
      },
    }),
  ].join('\n'));
  writeFile(path.join(claudeRoot, 'conversation.md'), [
    '# Claude Code Session',
    `Project ${projectName} request: user asked for an agent task profile.`,
    'Decision accepted: keep reports private.',
  ].join('\n'));
  for (let index = 0; index < 20; index += 1) {
    writeFile(path.join(repo, 'skills', 'noise', `source-${index}.md`), [
      '# Not an interaction trace',
      `${projectName} validation failed decision handoff tool trace`,
      'This source file should not become a confirmed interaction event.',
    ].join('\n'));
  }
  writeFile(path.join(repo, 'src', 'noise.md'), [
    '# Source Noise',
    `${projectName} user request tool_call failed validation decision handoff`,
  ].join('\n'));

  return { root, repo, codexRoot, claudeRoot, out };
}

test('insight documents private read-only repository interaction audits', () => {
  expect(skill).toContain('repository interaction insight audit');
  expect(skill).toContain('Default to read-only analysis');
  expect(skill).toContain('ignored or outside-repo local path');
  expect(skill).toContain('Do not confuse this with `source-post`');
  expect(skill).toContain('Do not confuse this with `agent-introspection-debugging`');
  expect(dataSources).toContain('Read project-related local evidence broadly');
  expect(dataSources).toContain('`confirmed`');
  expect(dataSources).toContain('`candidate`');
  expect(analysisRubric).toContain('Tool Decision Audit');
  expect(analysisRubric).toContain('at most three primary recommendations');
  expect(skill).toContain('Use layered evidence and confidence levels');
  expect(skill).toContain('Strong insights require confirmed, non-low-confidence interaction evidence');
  expect(skill).toContain('Candidate traces, ordinary repo state, low-confidence evidence, or sparse samples can support only weak leads');
  expect(skill).toContain('Do not fabricate patterns to fill the report shape');
  expect(skill).toContain('It is acceptable to return fewer than three strong insights or recommendations when evidence is thin');
  expect(skill).toContain('For high-volume, multi-session, multi-case, or option-heavy audits');
  expect(skill).toContain('--effective-interact-input <input.json>');
  expect(skill).toContain('Use `effective-interact` for dense final reports');
  expect(reportShape).toContain('also generate an `effective-interact` visual-report input');
});

test('insight capability metadata registers standard install surface and boundaries', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, {
      path?: string;
      provides?: string[];
      overlapsWith?: string[];
      routing?: string;
      recommendation?: string;
    }>;
  };
  const component = index.components['skill:insight'];

  expect(component.path).toBe('skills/insight');
  expect(component.provides).toContain('repository-interaction-insight-audits');
  expect(component.provides).toContain('private-insight-reports');
  expect(component.provides).toContain('effective-interact-visual-report-inputs');
  expect(component.overlapsWith).toContain('skill:source-post');
  expect(component.overlapsWith).toContain('skill:agent-introspection-debugging');
  expect(component.routing).toContain('private repository interaction insight audit');
  expect(component.routing).toContain('effective-interact as the visual presentation layer');
  expect(component.recommendation).toContain('ignored private reports');
  expect(component.recommendation).toContain('optional effective-interact visual report inputs');
  expect(component.recommendation).toContain('no default project');
});

test('insight collection and report scripts produce a private audit from fixture traces', () => {
  const fixture = makeFixture();

  const collect = spawnSync(process.execPath, [
    collectScript,
    '--repo',
    fixture.repo,
    '--since',
    '30d',
    '--hosts',
    'codex,claude-code',
    '--codex-root',
    fixture.codexRoot,
    '--claude-root',
    fixture.claudeRoot,
    '--out',
    fixture.out,
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });

  expect(collect.status, collect.stderr || collect.stdout).toBe(0);
  const collectPayload = JSON.parse(collect.stdout) as {
    ok: boolean;
    ledgerPath: string;
    manifestPath: string;
    counts: { total: number; byRelevance: Record<string, number>; byHost: Record<string, number> };
  };

  expect(collectPayload.ok).toBe(true);
  expect(collectPayload.counts.total).toBeGreaterThanOrEqual(3);
  expect(collectPayload.counts.byRelevance.confirmed).toBeGreaterThanOrEqual(2);
  expect(collectPayload.counts.byRelevance.candidate).toBeGreaterThanOrEqual(1);
  expect(collectPayload.counts.byHost.codex).toBeGreaterThanOrEqual(1);
  expect(collectPayload.counts.byHost['claude-code']).toBeGreaterThanOrEqual(1);
  expect(fs.existsSync(collectPayload.ledgerPath)).toBe(true);
  expect(fs.existsSync(collectPayload.manifestPath)).toBe(true);

  const ledger = fs.readFileSync(collectPayload.ledgerPath, 'utf8')
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as {
      path: string;
      sourceClass: string;
      confidence: string;
      repoAffinity: string;
      eventType: string;
      evidenceRole: string;
    });
  const normalizedPaths = ledger.map((event) => event.path.replace(/\\/g, '/'));
  expect(normalizedPaths.some((eventPath) => eventPath.includes('skills/noise'))).toBe(false);
  expect(normalizedPaths.some((eventPath) => eventPath.includes('src/noise.md'))).toBe(false);
  expect(ledger.some((event) => event.sourceClass === 'host-trace')).toBe(true);
  expect(ledger.some((event) => event.evidenceRole === 'interaction')).toBe(true);
  expect(ledger.some((event) => event.confidence === 'high' && event.repoAffinity === 'exact')).toBe(true);
  expect(ledger.length).toBeLessThan(12);

  const reportPath = path.join(fixture.out, 'insight-report.md');
  const effectiveInteractInputPath = path.join(fixture.out, 'insight-visual.input.json');
  const report = spawnSync(process.execPath, [
    reportScript,
    '--ledger',
    collectPayload.ledgerPath,
    '--manifest',
    collectPayload.manifestPath,
    '--out',
    reportPath,
    '--effective-interact-input',
    effectiveInteractInputPath,
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });

  expect(report.status, report.stderr || report.stdout).toBe(0);
  const reportPayload = JSON.parse(report.stdout) as {
    ok: boolean;
    reportPath: string;
    effectiveInteractInputPath: string;
    counts: { total: number };
  };
  const markdown = fs.readFileSync(reportPayload.reportPath, 'utf8');

  expect(reportPayload.ok).toBe(true);
  expect(path.resolve(reportPayload.effectiveInteractInputPath)).toBe(path.resolve(effectiveInteractInputPath));
  expect(reportPayload.counts.total).toBeGreaterThanOrEqual(3);
  expect(markdown).toContain('## BLUF');
  expect(markdown).toContain('## Evidence Coverage');
  expect(markdown).toContain('## Top Insights');
  expect(markdown).toContain('## Top Bottlenecks');
  expect(markdown).toContain('## Top Recommendations');
  expect(markdown).toContain('## Task Profile');
  expect(markdown).toContain('Task clusters');
  expect(markdown).toContain('## Trace Audit');
  expect(markdown).toContain('Tool branch review');
  expect(markdown).toContain('## Core Positioning');
  expect(markdown).toContain('## Unknowns');
  expect(markdown).toContain('Strong confirmed interaction events');
  expect(markdown).toContain('evt-');
  expect(fs.existsSync(effectiveInteractInputPath)).toBe(true);

  const effectiveInteractInput = JSON.parse(fs.readFileSync(effectiveInteractInputPath, 'utf8')) as {
    renderMode: string;
    intent: { artifactKind: string };
    sections: Array<{ type: string; title: string }>;
    nextActions: string[];
  };
  expect(effectiveInteractInput.renderMode).toBe('pre-rendered');
  expect(effectiveInteractInput.intent.artifactKind).toBe('status');
  expect(effectiveInteractInput.sections.some((section) => section.type === 'data-table' && section.title === 'Top Insights')).toBe(true);
  expect(effectiveInteractInput.sections.some((section) => section.type === 'data-table' && section.title === 'Evidence Coverage')).toBe(true);
  expect(effectiveInteractInput.nextActions.length).toBeGreaterThan(0);

  const generated = spawnSync(process.execPath, [
    createInteractionScript,
    '--input',
    effectiveInteractInputPath,
    '--out-dir',
    fixture.out,
    '--slug',
    'insight-visual-report',
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });
  expect(generated.status, generated.stderr || generated.stdout).toBe(0);
  const generatedPayload = JSON.parse(generated.stdout) as { outputPath: string };
  const validation = spawnSync(process.execPath, [
    validateInteractionScript,
    generatedPayload.outputPath,
    '--json',
    '--skip-browser',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });
  expect(validation.status, validation.stderr || validation.stdout).toBe(0);
  expect(JSON.parse(validation.stdout).ok).toBe(true);
});

test('insight report weights bottlenecks toward primary interaction evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insight-report-weighting-'));
  const ledgerPath = path.join(root, 'insight-events.jsonl');
  const manifestPath = path.join(root, 'insight-manifest.json');
  const reportPath = path.join(root, 'insight-report.md');
  const now = '2026-06-20T10:00:00.000Z';
  const events = [
    {
      id: 'evt-repo-state',
      ts: now,
      host: 'repo',
      sourceType: 'repo-context',
      sourceClass: 'repo-state',
      evidenceRole: 'context',
      eventType: 'file-evidence',
      path: path.join(root, 'definition-of-done.md'),
      relevance: 'confirmed',
      repoAffinity: 'background',
      confidence: 'medium',
      signals: { blocker: true, validation: true, decision: true, handoff: true },
      excerpt: 'missing dependency worktree validation failed before handoff',
    },
    {
      id: 'evt-tool-primary',
      ts: now,
      host: 'codex',
      sourceType: 'user-host-trace',
      sourceClass: 'host-trace',
      evidenceRole: 'interaction',
      eventType: 'tool-call',
      path: path.join(root, 'session.jsonl'),
      relevance: 'confirmed',
      repoAffinity: 'exact',
      confidence: 'high',
      signals: { toolTrace: true, blocker: true, validation: true },
      excerpt: 'shell:exec_command validation failed because dependency is missing',
    },
    {
      id: 'evt-user-primary',
      ts: now,
      host: 'codex',
      sourceType: 'user-host-trace',
      sourceClass: 'host-trace',
      evidenceRole: 'interaction',
      eventType: 'user-message',
      path: path.join(root, 'session.jsonl'),
      relevance: 'confirmed',
      repoAffinity: 'exact',
      confidence: 'high',
      signals: { userRequest: true, decision: true },
      excerpt: 'User asked to inspect the recent tool-call branch and validation closure.',
    },
  ];
  writeFile(ledgerPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
  writeFile(manifestPath, JSON.stringify({
    schemaVersion: 2,
    repo: root,
    since: now,
    hosts: ['codex'],
    identity: { basename: path.basename(root) },
    roots: [],
    warnings: [],
  }, null, 2));

  const report = spawnSync(process.execPath, [
    reportScript,
    '--ledger',
    ledgerPath,
    '--manifest',
    manifestPath,
    '--out',
    reportPath,
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });

  expect(report.status, report.stderr || report.stdout).toBe(0);
  const markdown = fs.readFileSync(reportPath, 'utf8');
  const bottleneckSection = markdown.split('## Top Bottlenecks')[1].split('## Top Recommendations')[0];
  const recommendationSection = markdown.split('## Top Recommendations')[1].split('## Task Profile')[0];

  expect(bottleneckSection).toContain('evt-tool-primary');
  expect(bottleneckSection).not.toContain('evt-repo-state');
  expect(recommendationSection).not.toContain('evt-repo-state');
});

test('insight report does not treat successful handoffs as bottlenecks or tool branches', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insight-report-handoff-'));
  const ledgerPath = path.join(root, 'insight-events.jsonl');
  const manifestPath = path.join(root, 'insight-manifest.json');
  const reportPath = path.join(root, 'insight-report.md');
  const now = '2026-06-20T10:00:00.000Z';
  const events = [
    {
      id: 'evt-success-handoff',
      ts: now,
      host: 'codex',
      sourceType: 'user-host-trace',
      sourceClass: 'host-trace',
      evidenceRole: 'interaction',
      eventType: 'handoff',
      path: path.join(root, 'session.jsonl'),
      relevance: 'confirmed',
      repoAffinity: 'exact',
      confidence: 'high',
      signals: { handoff: true, validation: true, decision: true, toolTrace: true },
      excerpt: 'Wrote context handoff notes and reviewed tool branch results successfully.',
    },
    {
      id: 'evt-real-tool-failure',
      ts: now,
      host: 'codex',
      sourceType: 'user-host-trace',
      sourceClass: 'host-trace',
      evidenceRole: 'interaction',
      eventType: 'tool-call',
      path: path.join(root, 'session.jsonl'),
      relevance: 'confirmed',
      repoAffinity: 'exact',
      confidence: 'high',
      signals: { toolTrace: true, blocker: true, validation: true },
      excerpt: 'shell:exec_command validation failed because dependency is missing',
    },
    {
      id: 'evt-user-context',
      ts: now,
      host: 'codex',
      sourceType: 'user-host-trace',
      sourceClass: 'host-trace',
      evidenceRole: 'interaction',
      eventType: 'user-message',
      path: path.join(root, 'session.jsonl'),
      relevance: 'confirmed',
      repoAffinity: 'exact',
      confidence: 'high',
      signals: { userRequest: true, decision: true },
      excerpt: 'Continue the accepted insight report scoring fix.',
    },
  ];
  writeFile(ledgerPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
  writeFile(manifestPath, JSON.stringify({
    schemaVersion: 2,
    repo: root,
    since: now,
    hosts: ['codex'],
    identity: { basename: path.basename(root) },
    roots: [],
    warnings: [],
  }, null, 2));

  const report = spawnSync(process.execPath, [
    reportScript,
    '--ledger',
    ledgerPath,
    '--manifest',
    manifestPath,
    '--out',
    reportPath,
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });

  expect(report.status, report.stderr || report.stdout).toBe(0);
  const markdown = fs.readFileSync(reportPath, 'utf8');
  const bottleneckSection = markdown.split('## Top Bottlenecks')[1].split('## Top Recommendations')[0];
  const traceSection = markdown.split('## Trace Audit')[1].split('## Core Positioning')[0];

  expect(bottleneckSection).toContain('evt-real-tool-failure');
  expect(bottleneckSection).not.toContain('evt-success-handoff');
  expect(traceSection).toContain('Tool-call interaction events: 1.');
  expect(traceSection).toContain('Failed or blocker-linked tool events: 1.');
  expect(traceSection).not.toContain('handoff=1');
});

test('insight collector samples large JSONL tails without losing readable Chinese excerpts', () => {
  const fixture = makeFixture();
  const largeJsonl = path.join(fixture.codexRoot, 'large-session.jsonl');
  const oldLine = JSON.stringify({
    timestamp: '2026-06-20T09:00:00.000Z',
    type: 'event_msg',
    payload: {
      type: 'user_message',
      message: 'OLD prefix should not be sampled',
      context: { cwd: fixture.repo },
    },
  });
  const padding = Array.from({ length: 20 }, (_, index) => JSON.stringify({
    timestamp: `2026-06-20T09:${String(index + 1).padStart(2, '0')}:00.000Z`,
    type: 'event_msg',
    payload: {
      type: 'mcp_tool_call_end',
      invocation: { server: 'shell', tool: 'exec_command' },
      result: { content: 'padding '.repeat(80) },
    },
  }));
  const chineseMessage = '请检查中文需求和工具调用分支';
  const recentLine = JSON.stringify({
    timestamp: '2026-06-20T10:00:00.000Z',
    type: 'event_msg',
    payload: {
      type: 'user_message',
      message: chineseMessage,
      context: { cwd: fixture.repo },
    },
  });
  writeFile(largeJsonl, [oldLine, ...padding, recentLine].join('\n'));

  const collect = spawnSync(process.execPath, [
    collectScript,
    '--repo',
    fixture.repo,
    '--since',
    '30d',
    '--hosts',
    'codex',
    '--codex-root',
    fixture.codexRoot,
    '--out',
    fixture.out,
    '--jsonl-tail-bytes',
    '900',
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });

  expect(collect.status, collect.stderr || collect.stdout).toBe(0);
  const collectPayload = JSON.parse(collect.stdout) as { ledgerPath: string; manifestPath: string };
  const ledgerText = fs.readFileSync(collectPayload.ledgerPath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(collectPayload.manifestPath, 'utf8')) as { warnings: string[] };

  expect(ledgerText).toContain(chineseMessage);
  expect(ledgerText).not.toContain('OLD prefix should not be sampled');
  expect(ledgerText).not.toContain('\uFFFD');
  expect(manifest.warnings.some((warning) => warning.includes('Sampled tail of large JSONL file'))).toBe(true);
});

test('insight activation selects private audits without stealing adjacent source post or agent-debug prompts', () => {
  const positive = spawnSync(process.execPath, [
    activationScript,
    '--prompt',
    'Run a repository interaction insight audit from recent Codex and Claude Code work traces, include agent task profile and tool-call decision audit.',
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });
  const blog = spawnSync(process.execPath, [
    activationScript,
    '--prompt',
    'Turn this external OpenAI article into a Chinese source-backed public post with media references and repo iteration review.',
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });
  const singleRun = spawnSync(process.execPath, [
    activationScript,
    '--prompt',
    'The agent is stuck in a repeated tool loop and burning context without progress; capture state and recover.',
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });

  expect(JSON.parse(positive.stdout).selectedSkill).toBe('insight');
  expect(JSON.parse(blog.stdout).selectedSkill).toBe('source-post');
  expect(JSON.parse(singleRun.stdout).selectedSkill).toBe('agent-introspection-debugging');
});
