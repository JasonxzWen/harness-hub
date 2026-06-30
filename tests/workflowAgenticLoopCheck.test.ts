import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, test } from 'bun:test';

const scriptPath = 'skills/workflow-router/scripts/agentic-loop-check.mjs';

function writeFixture(value: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-agentic-loop-'));
  const filePath = path.join(dir, 'loops.json');
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  return filePath;
}

function runLoopCheck(value: unknown): { status: number | null; json: { ok: boolean; findings: Array<{ id: string }>; mutates: boolean; dispatchesDelegatedAgents: boolean; recordsChecked: number }; stderr: string } {
  const filePath = writeFixture(value);
  const result = spawnSync(process.execPath, [path.resolve(scriptPath), '--file', filePath, '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return {
    status: result.status,
    json: JSON.parse(result.stdout),
    stderr: result.stderr,
  };
}

test('agentic loop check accepts complete host-neutral loop evidence', () => {
  const result = runLoopCheck({
    loops: [
      {
        loop: 'frontend-acceptance',
        stage: 'verification',
        task: 'Build the requested frontend acceptance loop.',
        acceptanceCriteria: [
          'Current version is checked against the original task.',
          'Verifier evidence and arbiter verdict are recorded.',
        ],
        producer: {
          type: 'main-agent',
          evidence: 'current diff and local dev server',
          output: 'implemented frontend loop and started dev server',
        },
        verifier: {
          type: 'delegated-agent',
          evidence: 'browser run passed at desktop and mobile viewports',
        },
        arbiter: {
          type: 'delegated-agent',
          readOnly: true,
          evidence: 'checked task, screenshots, console, and acceptance criteria',
        },
        evidence: 'screenshots and console/network summary',
        verdict: 'pass',
        mainAgentDecision: 'deliver',
      },
    ],
  });

  expect(result.status).toBe(0);
  expect(result.json.ok).toBe(true);
  expect(result.json.recordsChecked).toBe(1);
  expect(result.json.mutates).toBe(false);
  expect(result.json.dispatchesDelegatedAgents).toBe(false);
  expect(result.json.findings).toEqual([]);
});

test('agentic loop check rejects missing verifier and non-read-only arbiter evidence', () => {
  const result = runLoopCheck({
    loops: [
      {
        loop: 'implementation-review',
        stage: 'finish-closeout',
        targetSpec: 'Review the current implementation against the accepted spec.',
        acceptanceCriteria: 'Verifier and read-only arbiter evidence must be present.',
        producer: {
          type: 'main-agent',
          evidence: 'diff summary',
          currentDiff: 'docs and workflow-router changes',
        },
        arbiter: {
          type: 'delegated-agent',
          readOnly: false,
          actions: ['edit code'],
        },
        evidence: 'review notes',
        verdict: 'warn',
        mainAgentDecision: 'revise',
      },
    ],
  });

  expect(result.status).toBe(1);
  expect(result.json.ok).toBe(false);
  expect(result.json.findings.map((finding) => finding.id)).toContain('missing-verifier');
  expect(result.json.findings.map((finding) => finding.id)).toContain('arbiter-not-read-only');
  expect(result.json.findings.map((finding) => finding.id)).toContain('arbiter-mutates');
});

test('agentic loop check rejects unsafe delivery after failed arbitration', () => {
  const result = runLoopCheck({
    loop: 'plan-review',
    stage: 'pre-implementation',
    task: 'Review the implementation plan.',
    acceptanceCriteria: 'Plan must not be delivered when arbitration fails.',
    producer: {
      type: 'main-agent',
      evidence: 'plan draft',
      output: 'plan draft',
    },
    verifier: {
      type: 'delegated-agent',
      evidence: 'found missing acceptance criteria',
    },
    arbiter: {
      type: 'delegated-agent',
      readOnly: true,
      evidence: 'compared task and plan',
    },
    evidence: 'arbiter report',
    verdict: 'fail',
    mainAgentDecision: 'deliver',
  });

  expect(result.status).toBe(1);
  expect(result.json.ok).toBe(false);
  expect(result.json.findings.map((finding) => finding.id)).toContain('unsafe-delivery-after-failed-loop');
});

test('agentic loop check requires task, acceptance criteria, and producer output evidence', () => {
  const result = runLoopCheck({
    loop: 'implementation-review',
    stage: 'finish-closeout',
    producer: {
      type: 'main-agent',
      evidence: 'diff summary only',
    },
    verifier: {
      type: 'delegated-agent',
      evidence: 'review notes',
    },
    arbiter: {
      type: 'delegated-agent',
      readOnly: true,
      evidence: 'compared available evidence',
    },
    evidence: 'arbiter report',
    verdict: 'warn',
    mainAgentDecision: 'revise',
  });

  expect(result.status).toBe(1);
  expect(result.json.ok).toBe(false);
  expect(result.json.findings.map((finding) => finding.id)).toContain('missing-task-or-target-spec');
  expect(result.json.findings.map((finding) => finding.id)).toContain('missing-acceptance-criteria');
  expect(result.json.findings.map((finding) => finding.id)).toContain('missing-producer-output');
});
