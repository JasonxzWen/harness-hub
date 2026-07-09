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

function runGit(cwd: string, args: string[]) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false });
  expect(result.status, result.stderr || result.stdout).toBe(0);
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
    'Outdated guidance: a stale rule caused misleading agent behavior and should be reviewed.',
  ].join('\n'));
  writeFile(path.join(repo, '.codex', 'AGENTS.md'), [
    '# Local Codex Rules',
    `For ${projectName}, preserve PowerShell UTF-8 encoding SOP notes and GitHub PR status checks.`,
  ].join('\n'));
  writeFile(path.join(repo, '.claude', 'CLAUDE.md'), [
    '# Local Claude Rules',
    `For ${projectName}, cache repeatedly rediscovered workflow facts instead of relearning from scratch.`,
  ].join('\n'));
  writeFile(path.join(repo, '.codex', 'automations', 'daily.log'), [
    `scheduled automation for ${projectName}`,
    'The same mistake appeared again and again: gh check-run status was retried before mergeability settled.',
    'Script SOP: use utf-8 encoding for Chinese JSONL logs.',
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
        message: 'Audit the project interaction bottlenecks. The previous wording was ambiguous and the agent misunderstood the GitHub SOP.',
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
  expect(skill).toContain('automation logs, and layered prompt/rule context');
  expect(skill).toContain('Current executable capabilities');
  expect(skill).toContain('improvement queue JSON');
  expect(skill).toContain('Prompt and rule audit');
  expect(skill).toContain('Knowledge cache candidates');
  expect(skill).toContain('Default to read-only analysis');
  expect(skill).toContain('ignored or outside-repo local path');
  expect(skill).toContain('Do not confuse this with `source-post`');
  expect(skill).toContain('Do not confuse this with `agent-introspection-debugging`');
  expect(dataSources).toContain('Read current-repository local evidence broadly');
  expect(dataSources).toContain('only for sessions whose cwd, workspace, or explicit repo metadata resolves inside the current repository');
  expect(dataSources).toContain('Layered prompt and rule context');
  expect(dataSources).toContain('Automation logs');
  expect(dataSources).toContain('`confirmed`');
  expect(dataSources).toContain('`candidate`');
  expect(analysisRubric).toContain('Tool Decision Audit');
  expect(analysisRubric).toContain('Prompt And Rule Audit');
  expect(analysisRubric).toContain('SOP And Knowledge Audit');
  expect(analysisRubric).toContain('Improvement Queue Bar');
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
  expect(reportShape).toContain('Prompt And Rule Audit');
  expect(reportShape).toContain('Knowledge Cache Candidates');
  expect(reportShape).toContain('Improvement Queue JSON');
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
  expect(component.provides).toContain('prompt-rule-context-audits');
  expect(component.provides).toContain('automation-log-audits');
  expect(component.provides).toContain('sop-and-script-lesson-mining');
  expect(component.provides).toContain('knowledge-cache-candidate-mining');
  expect(component.provides).toContain('executable-improvement-queues');
  expect(component.provides).toContain('private-improvement-queue-json');
  expect(component.provides).toContain('effective-interact-visual-report-inputs');
  expect(component.overlapsWith).toContain('skill:source-post');
  expect(component.overlapsWith).toContain('skill:agent-introspection-debugging');
  expect(component.routing).toContain('private repository interaction insight audit');
  expect(component.routing).toContain('prompt/rule context audit');
  expect(component.routing).toContain('automation log audit');
  expect(component.routing).toContain('executable improvement queue');
  expect(component.routing).toContain('effective-interact as the visual presentation layer');
  expect(component.recommendation).toContain('ignored private reports');
  expect(component.recommendation).toContain('prompt/rule layers');
  expect(component.recommendation).toContain('cacheable knowledge candidates');
  expect(component.recommendation).toContain('private improvement queue JSON');
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
      signals: Record<string, boolean>;
    });
  const normalizedPaths = ledger.map((event) => event.path.replace(/\\/g, '/'));
  expect(normalizedPaths.some((eventPath) => eventPath.includes('skills/noise'))).toBe(false);
  expect(normalizedPaths.some((eventPath) => eventPath.includes('src/noise.md'))).toBe(false);
  expect(ledger.some((event) => event.sourceClass === 'host-trace')).toBe(true);
  expect(ledger.some((event) => event.sourceClass === 'prompt-context')).toBe(true);
  expect(ledger.some((event) => event.sourceClass === 'automation-log')).toBe(true);
  expect(ledger.some((event) => event.evidenceRole === 'interaction')).toBe(true);
  expect(ledger.some((event) => event.confidence === 'high' && event.repoAffinity === 'exact')).toBe(true);
  expect(ledger.some((event) => event.signals.promptContext)).toBe(true);
  expect(ledger.some((event) => event.signals.automation)).toBe(true);
  expect(ledger.some((event) => event.signals.userFriction)).toBe(true);
  expect(ledger.some((event) => event.signals.guidanceDrift)).toBe(true);
  expect(ledger.some((event) => event.signals.sopLesson)).toBe(true);
  expect(ledger.some((event) => event.signals.encodingIssue)).toBe(true);
  expect(ledger.some((event) => event.signals.githubSop)).toBe(true);
  expect(ledger.some((event) => event.signals.knowledgeCache)).toBe(true);
  expect(ledger.some((event) => event.signals.repeatedMistake)).toBe(true);
  expect(ledger.length).toBeLessThan(20);

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
    improvementQueuePath: string;
    effectiveInteractInputPath: string;
    counts: { total: number; improvementQueueItems: number };
  };
  const markdown = fs.readFileSync(reportPayload.reportPath, 'utf8');

  expect(reportPayload.ok).toBe(true);
  expect(fs.existsSync(reportPayload.improvementQueuePath)).toBe(true);
  expect(path.resolve(reportPayload.effectiveInteractInputPath)).toBe(path.resolve(effectiveInteractInputPath));
  expect(reportPayload.counts.total).toBeGreaterThanOrEqual(3);
  expect(reportPayload.counts.improvementQueueItems).toBeGreaterThan(0);
  expect(markdown).toContain('## BLUF');
  expect(markdown).toContain('## Evidence Coverage');
  expect(markdown).toContain('## Top Insights');
  expect(markdown).toContain('## Top Bottlenecks');
  expect(markdown).toContain('## Top Recommendations');
  expect(markdown).toContain('## Improvement Queue Summary');
  expect(markdown).toContain('insight-improvement-queue.json');
  expect(markdown).toContain('## Task Profile');
  expect(markdown).toContain('Task clusters');
  expect(markdown).toContain('## Trace Audit');
  expect(markdown).toContain('Tool branch review');
  expect(markdown).toContain('## Learning Opportunity Map');
  expect(markdown).toContain('## Prompt And Rule Audit');
  expect(markdown).toContain('## User Friction Patterns');
  expect(markdown).toContain('## Project Guidance Garbage And Drift');
  expect(markdown).toContain('## SOP And Script Lessons');
  expect(markdown).toContain('## Repeated Agent Mistakes');
  expect(markdown).toContain('## Knowledge Cache Candidates');
  expect(markdown).toContain('## Automation Trace Review');
  expect(markdown).toContain('## Core Positioning');
  expect(markdown).toContain('## Unknowns');
  expect(markdown).toContain('Strong confirmed interaction events');
  expect(markdown).toContain('evt-');
  expect(fs.existsSync(effectiveInteractInputPath)).toBe(true);

  const improvementQueue = JSON.parse(fs.readFileSync(reportPayload.improvementQueuePath, 'utf8')) as {
    schemaVersion: number;
    policy: { rawExcerptPolicy: string; defaultMutation: string; patchDraftPolicy: string };
    counts: { patchDrafts: number };
    items: Array<{
      id: string;
      category: string;
      tags: string[];
      status: string;
      actionability: string;
      scope: string;
      targetDestination: string;
      summary: string;
      suggestedChange: string;
      executionLevel: string;
      patchDraftPath: string | null;
      evidenceIds: string[];
      evidenceTier: string;
      sourceClasses: string[];
      privacy: string;
      rawExcerptPolicy: string;
      confirmationPolicy: string;
      costRationale: Record<string, string>;
      expectedFutureCostReduction: string;
      risk: string;
      priority: string;
      validationSignal: string;
      counterEvidence: string[];
      rejectionReasons: string[];
    }>;
  };
  const queueText = JSON.stringify(improvementQueue);
  const categories = new Set(improvementQueue.items.map((item) => item.category));

  expect(improvementQueue.schemaVersion).toBe(1);
  expect(improvementQueue.policy.defaultMutation).toBe('none');
  expect(improvementQueue.policy.rawExcerptPolicy).toBe('report-only');
  expect(improvementQueue.policy.patchDraftPolicy).toBe('optional-separate-artifact-never-auto-applied');
  expect(categories).toContain('project-rule-candidate');
  expect(categories).toContain('stale-info-removal-candidate');
  expect(categories).toContain('sop-candidate');
  expect(categories).toContain('knowledge-cache-candidate');
  expect(categories).toContain('eval-case-candidate');
  expect(categories).toContain('workflow-change-candidate');
  expect(queueText).not.toContain('excerpt');
  expect(queueText).not.toContain('The previous wording was ambiguous');
  const patchDraftItems = improvementQueue.items.filter((item) => item.patchDraftPath);
  expect(improvementQueue.counts.patchDrafts).toBe(patchDraftItems.length);
  expect(patchDraftItems.length).toBeGreaterThan(0);
  for (const item of improvementQueue.items) {
    expect(item.id).toMatch(/^iq-[a-z0-9-]+-[a-f0-9]{10}$/);
    expect(item.tags.length).toBeGreaterThan(0);
    expect(['new', 'needs-more-evidence']).toContain(item.status);
    expect(['actionable', 'needs-more-evidence']).toContain(item.actionability);
    expect(['project', 'session', 'user']).toContain(item.scope);
    expect(item.targetDestination.length).toBeGreaterThan(0);
    expect(item.summary.length).toBeGreaterThan(0);
    expect(item.suggestedChange.length).toBeGreaterThan(0);
    expect(item.executionLevel).toBe('level-2-actionable-candidate');
    expect(item.patchDraftPath === null || item.patchDraftPath.startsWith('patch-drafts/')).toBe(true);
    expect(item.evidenceIds.length).toBeGreaterThan(0);
    expect(['strong', 'medium', 'weak']).toContain(item.evidenceTier);
    expect(item.sourceClasses.length).toBeGreaterThan(0);
    expect(item.privacy).toBe('private-local');
    expect(item.rawExcerptPolicy).toBe('report-only');
    expect(['needs-human-confirmation', 'agent-actionable-after-review']).toContain(item.confirmationPolicy);
    expect(item.costRationale.frequency).toBeTruthy();
    expect(item.costRationale.timeLostPerOccurrence).toBeTruthy();
    expect(item.costRationale.blastRadius).toBeTruthy();
    expect(item.costRationale.fixEffort).toBeTruthy();
    expect(item.costRationale.verificationClarity).toBeTruthy();
    expect(['high', 'medium', 'low']).toContain(item.expectedFutureCostReduction);
    expect(['high', 'medium', 'low']).toContain(item.risk);
    expect(['P0', 'P1', 'P2']).toContain(item.priority);
    expect(item.validationSignal.length).toBeGreaterThan(0);
    expect(Array.isArray(item.counterEvidence)).toBe(true);
    expect(Array.isArray(item.rejectionReasons)).toBe(true);
    if (item.patchDraftPath) {
      const draftPath = path.join(path.dirname(reportPayload.improvementQueuePath), item.patchDraftPath);
      expect(fs.existsSync(draftPath)).toBe(true);
      const draft = fs.readFileSync(draftPath, 'utf8');
      expect(draft).toContain('Status: draft-only; do not apply automatically.');
      expect(draft).toContain('```diff');
      expect(draft).toContain('Evidence IDs:');
      expect(draft).toContain('Counter-evidence:');
      expect(draft).toContain('Rejection reasons:');
      expect(draft).not.toContain('The previous wording was ambiguous');
    }
  }

  const originalIds = improvementQueue.items.map((item) => item.id);
  const secondReportPath = path.join(fixture.out, 'insight-report-second.md');
  const secondReport = spawnSync(process.execPath, [
    reportScript,
    '--ledger',
    collectPayload.ledgerPath,
    '--manifest',
    collectPayload.manifestPath,
    '--out',
    secondReportPath,
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });
  expect(secondReport.status, secondReport.stderr || secondReport.stdout).toBe(0);
  const secondPayload = JSON.parse(secondReport.stdout) as { improvementQueuePath: string };
  const secondQueue = JSON.parse(fs.readFileSync(secondPayload.improvementQueuePath, 'utf8')) as typeof improvementQueue;
  expect(secondQueue.items.map((item) => item.id)).toEqual(originalIds);

  const effectiveInteractInput = JSON.parse(fs.readFileSync(effectiveInteractInputPath, 'utf8')) as {
    title: string;
    renderMode: string;
    intent: { artifactKind: string; primaryQuestion: string };
    sections: Array<{ type: string; title: string }>;
    nextActions: string[];
  };
  expect(effectiveInteractInput.renderMode).toBe('pre-rendered');
  expect(effectiveInteractInput.title).toBe('Insight 交互审计可视化汇报');
  expect(effectiveInteractInput.intent.primaryQuestion).toContain('哪些交互模式');
  expect(JSON.stringify(effectiveInteractInput)).not.toContain('\uFFFD');
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
}, 20_000);

test('insight report writes patch draft artifacts only for strong targeted findings', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insight-patch-draft-'));
  const repo = path.join(root, 'repo');
  const now = '2026-06-20T10:00:00.000Z';
  fs.mkdirSync(repo, { recursive: true });
  writeFile(path.join(repo, 'AGENTS.md'), [
    '# Agent Rules',
    '',
    'Keep project guidance evidence-backed.',
  ].join('\n'));

  function runReport(events: Array<Record<string, unknown>>, name: string, extraArgs: string[] = []) {
    const outDir = path.join(root, name);
    const ledgerPath = path.join(outDir, 'insight-events.jsonl');
    const manifestPath = path.join(outDir, 'insight-manifest.json');
    const reportPath = path.join(outDir, 'insight-report.md');
    writeFile(ledgerPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
    writeFile(manifestPath, JSON.stringify({
      schemaVersion: 2,
      repo,
      since: now,
      hosts: ['codex'],
      identity: { basename: 'repo' },
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
      ...extraArgs,
      '--json',
    ], { cwd: process.cwd(), encoding: 'utf8', shell: false });
    expect(report.status, report.stderr || report.stdout).toBe(0);
    const payload = JSON.parse(report.stdout) as { improvementQueuePath: string };
    const queue = JSON.parse(fs.readFileSync(payload.improvementQueuePath, 'utf8')) as {
      policy: { patchDraftPolicy: string };
      counts: { patchDrafts: number };
      items: Array<{
        category: string;
        status: string;
        evidenceTier: string;
        patchDraftPath: string | null;
      }>;
    };
    return { queue, queuePath: payload.improvementQueuePath };
  }

  const strong = runReport([
    {
      id: 'evt-strong-user-friction',
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
      signals: { userFriction: true, guidanceDrift: true, promptContext: true },
      excerpt: 'User corrected misleading project guidance.',
    },
    {
      id: 'evt-strong-tool-friction',
      ts: now,
      host: 'codex',
      sourceType: 'user-host-trace',
      sourceClass: 'host-trace',
      evidenceRole: 'interaction',
      eventType: 'tool-result',
      path: path.join(root, 'session.jsonl'),
      relevance: 'confirmed',
      repoAffinity: 'exact',
      confidence: 'high',
      signals: { userFriction: true, guidanceDrift: true },
      excerpt: 'The same stale instruction caused the agent to follow the wrong path again.',
    },
  ], 'strong');
  const strongRule = strong.queue.items.find((item) => item.category === 'project-rule-candidate');
  expect(strongRule?.status).toBe('new');
  expect(strongRule?.evidenceTier).toBe('strong');
  expect(strongRule?.patchDraftPath).toBeTruthy();
  expect(strong.queue.counts.patchDrafts).toBeGreaterThan(0);
  const draftPath = path.join(path.dirname(strong.queuePath), strongRule?.patchDraftPath || '');
  const draft = fs.readFileSync(draftPath, 'utf8');
  expect(draft).toContain('diff --git a/AGENTS.md b/AGENTS.md');
  expect(draft).toContain('Insight Project Rule Candidate');
  expect(fs.readFileSync(path.join(repo, 'AGENTS.md'), 'utf8')).not.toContain('Insight Project Rule Candidate');

  const noDraft = runReport([
    {
      id: 'evt-no-draft-user-friction',
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
      signals: { userFriction: true, guidanceDrift: true, promptContext: true },
      excerpt: 'User corrected misleading project guidance.',
    },
    {
      id: 'evt-no-draft-tool-friction',
      ts: now,
      host: 'codex',
      sourceType: 'user-host-trace',
      sourceClass: 'host-trace',
      evidenceRole: 'interaction',
      eventType: 'tool-result',
      path: path.join(root, 'session.jsonl'),
      relevance: 'confirmed',
      repoAffinity: 'exact',
      confidence: 'high',
      signals: { userFriction: true, guidanceDrift: true },
      excerpt: 'The same stale instruction caused the agent to follow the wrong path again.',
    },
  ], 'strong-no-drafts', ['--no-patch-drafts']);
  const noDraftRule = noDraft.queue.items.find((item) => item.category === 'project-rule-candidate');
  expect(noDraft.queue.policy.patchDraftPolicy).toBe('disabled-by-request');
  expect(noDraftRule?.status).toBe('new');
  expect(noDraftRule?.evidenceTier).toBe('strong');
  expect(noDraftRule?.patchDraftPath).toBeNull();
  expect(noDraft.queue.counts.patchDrafts).toBe(0);
  expect(fs.existsSync(path.join(path.dirname(noDraft.queuePath), 'patch-drafts'))).toBe(false);

  const weak = runReport([
    {
      id: 'evt-weak-context',
      ts: now,
      host: 'repo',
      sourceType: 'repo-context',
      sourceClass: 'repo-state',
      evidenceRole: 'context',
      eventType: 'file-evidence',
      path: path.join(repo, 'AGENTS.md'),
      relevance: 'confirmed',
      repoAffinity: 'background',
      confidence: 'medium',
      signals: { userFriction: true, guidanceDrift: true, promptContext: true },
      excerpt: 'A stale-looking rule may be misleading, but no interaction confirms impact.',
    },
  ], 'weak');
  const weakRule = weak.queue.items.find((item) => item.category === 'project-rule-candidate');
  expect(weakRule?.status).toBe('needs-more-evidence');
  expect(weakRule?.evidenceTier).toBe('weak');
  expect(weakRule?.patchDraftPath).toBeNull();
  expect(weak.queue.counts.patchDrafts).toBe(0);
});

test('insight collector keeps host sessions and automations inside the invoking repo scope', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'insight-scope-'));
  const repo = path.join(root, 'target-repo');
  const siblingRepo = path.join(root, 'sibling-worktree');
  const otherRepo = path.join(root, 'other-repo');
  const codexRoot = path.join(root, 'codex-sessions');
  const automationRoot = path.join(root, 'automations');
  const out = path.join(root, 'reports');
  const packageName = '@demo/target-repo';
  const remoteUrl = 'git@github.com:demo/target-repo.git';

  fs.mkdirSync(repo, { recursive: true });
  fs.mkdirSync(siblingRepo, { recursive: true });
  fs.mkdirSync(otherRepo, { recursive: true });
  writeFile(path.join(repo, 'package.json'), JSON.stringify({ name: packageName }, null, 2));
  writeFile(path.join(siblingRepo, 'package.json'), JSON.stringify({ name: packageName }, null, 2));
  writeFile(path.join(repo, 'AGENTS.md'), 'Target repo rules.');
  runGit(repo, ['init', '-q']);
  runGit(repo, ['remote', 'add', 'origin', remoteUrl]);
  runGit(siblingRepo, ['init', '-q']);
  runGit(siblingRepo, ['remote', 'add', 'origin', remoteUrl]);

  writeFile(path.join(codexRoot, 'in-scope.jsonl'), [
    JSON.stringify({ timestamp: '2026-06-20T10:00:00.000Z', type: 'session_meta', payload: { cwd: repo } }),
    JSON.stringify({
      timestamp: '2026-06-20T10:01:00.000Z',
      type: 'event_msg',
      payload: { type: 'user_message', message: 'in-scope codex session for target repo' },
    }),
  ].join('\n'));
  writeFile(path.join(codexRoot, 'same-logical-repo.jsonl'), [
    JSON.stringify({ timestamp: '2026-06-20T10:30:00.000Z', type: 'session_meta', payload: { cwd: siblingRepo } }),
    JSON.stringify({
      timestamp: '2026-06-20T10:31:00.000Z',
      type: 'event_msg',
      payload: { type: 'user_message', message: 'same logical repo sibling worktree codex session' },
    }),
  ].join('\n'));
  writeFile(path.join(codexRoot, 'out-of-scope.jsonl'), [
    JSON.stringify({ timestamp: '2026-06-20T11:00:00.000Z', type: 'session_meta', payload: { cwd: otherRepo } }),
    JSON.stringify({
      timestamp: '2026-06-20T11:01:00.000Z',
      type: 'event_msg',
      payload: {
        type: 'user_message',
        message: `out-of-scope codex session mentions ${packageName} and target-repo but belongs elsewhere`,
      },
    }),
  ].join('\n'));
  writeFile(path.join(codexRoot, 'no-cwd.jsonl'), JSON.stringify({
    timestamp: '2026-06-20T12:01:00.000Z',
    type: 'event_msg',
    payload: {
      type: 'user_message',
      message: `no-cwd codex session mentions ${packageName} but has no repo scope metadata`,
    },
  }));

  writeFile(path.join(automationRoot, 'target-task', 'automation.toml'), [
    'kind = "cron"',
    'name = "Target task"',
    `cwds = ["${repo.replace(/\\/g, '\\\\')}"]`,
  ].join('\n'));
  writeFile(path.join(automationRoot, 'target-task', 'memory.md'), 'in-scope automation memory for target repo');
  writeFile(path.join(automationRoot, 'other-task', 'automation.toml'), [
    'kind = "cron"',
    'name = "Other task"',
    `cwds = ["${otherRepo.replace(/\\/g, '\\\\')}"]`,
  ].join('\n'));
  writeFile(
    path.join(automationRoot, 'other-task', 'memory.md'),
    `out-of-scope automation memory mentions ${packageName} and target-repo but belongs elsewhere`,
  );

  const collect = spawnSync(process.execPath, [
    collectScript,
    '--repo',
    repo,
    '--since',
    '30d',
    '--hosts',
    'codex',
    '--codex-root',
    codexRoot,
    '--automation-root',
    automationRoot,
    '--out',
    out,
    '--json',
  ], { cwd: process.cwd(), encoding: 'utf8', shell: false });

  expect(collect.status, collect.stderr || collect.stdout).toBe(0);
  const collectPayload = JSON.parse(collect.stdout) as { ledgerPath: string; manifestPath: string };
  const ledgerText = fs.readFileSync(collectPayload.ledgerPath, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(collectPayload.manifestPath, 'utf8')) as {
    scope: {
      skippedOutOfScopeSessions: number;
      skippedOutOfScopeAutomations: number;
      includedSameRepoWorktreeSessions: number;
      skippedOutOfScopeSessionSamples: Array<{
        reason: string;
        path: string;
        scopePath?: string;
        sourceClass: string;
      }>;
      skippedOutOfScopeAutomationSamples: Array<{
        reason: string;
        path: string;
        configPath?: string;
        scopePath?: string;
        sourceClass: string;
      }>;
    };
  };

  expect(ledgerText).toContain('in-scope codex session');
  expect(ledgerText).toContain('same logical repo sibling worktree codex session');
  expect(ledgerText).toContain('repo-scoped-git-remote');
  expect(ledgerText).toContain('in-scope automation memory');
  expect(ledgerText).not.toContain('out-of-scope codex session');
  expect(ledgerText).not.toContain('no-cwd codex session');
  expect(ledgerText).not.toContain('out-of-scope automation memory');
  expect(manifest.scope.includedSameRepoWorktreeSessions).toBeGreaterThanOrEqual(1);
  expect(manifest.scope.skippedOutOfScopeSessions).toBeGreaterThanOrEqual(2);
  expect(manifest.scope.skippedOutOfScopeAutomations).toBeGreaterThanOrEqual(1);
  expect(manifest.scope.skippedOutOfScopeSessionSamples.length).toBeGreaterThanOrEqual(2);
  expect(manifest.scope.skippedOutOfScopeAutomationSamples.length).toBeGreaterThanOrEqual(1);
  expect(manifest.scope.skippedOutOfScopeSessionSamples.map((sample) => sample.reason)).toContain('scope-path-outside-current-repo');
  expect(manifest.scope.skippedOutOfScopeSessionSamples.map((sample) => sample.reason)).toContain('missing-cwd-or-workspace');
  expect(manifest.scope.skippedOutOfScopeAutomationSamples.map((sample) => sample.reason)).toContain('automation-cwd-outside-current-repo');
  expect(manifest.scope.skippedOutOfScopeSessionSamples.some((sample) => sample.scopePath?.includes(otherRepo))).toBe(true);
  expect(manifest.scope.skippedOutOfScopeAutomationSamples.some((sample) => sample.configPath?.endsWith('automation.toml'))).toBe(true);
  expect(JSON.stringify(manifest.scope.skippedOutOfScopeSessionSamples)).not.toContain('out-of-scope codex session mentions');
  expect(JSON.stringify(manifest.scope.skippedOutOfScopeAutomationSamples)).not.toContain('out-of-scope automation memory mentions');
}, 20_000);

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
  const recommendationSection = markdown.split('## Top Recommendations')[1].split('## Improvement Queue Summary')[0];

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
  const effectiveInteractComplaint = spawnSync(process.execPath, [
    activationScript,
    '--prompt',
    '\u5e0c\u671b\u628a ponytail \u5438\u6536\u5230 effective-interact\uff0c\u5206\u6790\u5386\u53f2\u4f1a\u8bdd\u7684\u89e6\u53d1\u9891\u7387\uff0c\u73b0\u5728\u611f\u89c9\u4e0d\u89e6\u53d1\uff0ctrigger \u4e0d\u591f\u786c',
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
  expect(JSON.parse(effectiveInteractComplaint.stdout).selectedSkill).toBe('effective-interact');
  expect(JSON.parse(blog.stdout).selectedSkill).toBe('source-post');
  expect(JSON.parse(singleRun.stdout).selectedSkill).toBe('agent-introspection-debugging');
});
