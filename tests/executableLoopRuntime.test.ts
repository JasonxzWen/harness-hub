import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from 'bun:test';

const LOOP_RUNTIME = path.resolve('skills/workflow-router/scripts/loop-runtime.mjs');

test('the executable runtime exposes one complete contract map for every built-in small loop', () => {
  const result = spawnSync(process.execPath, [LOOP_RUNTIME, 'contracts', '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  expect({ status: result.status, stderr: result.stderr }).toMatchObject({ status: 0, stderr: '' });
  const report = JSON.parse(result.stdout);
  expect(report.loopIds).toEqual([
    'delivery-loop',
    'implementation-review-loop',
    'knowledge-init-loop',
    'knowledge-maintain-loop',
    'report-loop',
    'repository-migration-loop',
    'requirements-loop',
    'retro-loop',
    'spec-loop',
    'test-loop',
  ]);
  expect(report.contracts).toHaveLength(10);
  const readOnlyProducers = new Set(['requirements-loop', 'spec-loop', 'implementation-review-loop', 'delivery-loop', 'report-loop', 'retro-loop']);
  const workflowOwners = new Set([
    'answer-workflow',
    'sdd-workflow',
    'diagnosis-workflow',
    'review-workflow',
    'delivery-workflow',
    'workflow-router',
  ]);
  const knowledgeInit = report.contracts.find((contract: { id: string }) => contract.id === 'knowledge-init-loop');
  const delivery = report.contracts.find((contract: { id: string }) => contract.id === 'delivery-loop');
  const migration = report.contracts.find((contract: { id: string }) => contract.id === 'repository-migration-loop');
  expect(delivery.maxIterations).toBe(1);
  expect(knowledgeInit.objective).toContain('first full migration');
  expect(knowledgeInit.objective).not.toContain('install');
  expect(migration.objective).toContain('shared and Host distribution slice');
  expect(`${migration.objective} ${migration.verifier.objective} ${migration.successCriteria.join(' ')}`).not.toMatch(/knowledge|OKF/i);
  for (const contract of report.contracts) {
    for (const skill of contract.skills) {
      expect(workflowOwners.has(skill)).toBe(false);
    }
    expect(contract.producer.readOnly).toBe(readOnlyProducers.has(contract.id));
    if (readOnlyProducers.has(contract.id)) {
      expect(contract.sideEffects.producer).toMatch(/read-only/i);
    }
    expect(contract.authorization.remote).toBe('Delegated CLI execution is always forbidden; only the main Agent may act on explicit user authorization.');
    expect(contract.handoff.fields).toEqual(['status', 'summary', 'output', 'findings', 'openQuestions', 'nextAction']);
    expect(contract).toMatchObject({
      schemaVersion: 1,
      id: expect.stringMatching(/-loop$/),
      objective: expect.any(String),
      input: expect.any(Object),
      output: expect.any(Object),
      skills: expect.any(Array),
      producer: expect.objectContaining({ readOnly: expect.any(Boolean) }),
      verifier: expect.objectContaining({ readOnly: true }),
      successCriteria: expect.any(Array),
      maxIterations: expect.any(Number),
      stopConditions: expect.any(Array),
      interaction: expect.objectContaining({ mayClaimUserAcceptance: false }),
      sideEffects: expect.any(Object),
      authorization: expect.any(Object),
      handoff: expect.any(Object),
    });
  }
});

test('spec-loop independently executes a producer and verifier and seals a compact handoff', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-runtime-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'spec-first-pass';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    const excludePathValue = execFileSync('git', ['rev-parse', '--git-path', 'info/exclude'], { cwd: targetDir, encoding: 'utf8' }).trim();
    const excludePath = path.isAbsolute(excludePathValue) ? excludePathValue : path.resolve(targetDir, excludePathValue);
    const excludeBefore = fs.readFileSync(excludePath);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Specify a deterministic greeting command.',
      targetSpec: 'The command prints one stable greeting and exits successfully.',
      acceptanceCriteria: [
        'The output is exactly hello followed by a newline.',
        'The process exits with status 0.',
      ],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'spec-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toMatchObject({ status: 0 });
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      schemaVersion: 1,
      runId,
      loop: 'spec-loop',
      status: 'completed',
      iteration: 1,
      handoff: {
        status: 'completed',
        summary: 'Spec accepted after independent review.',
        output: {
          spec: 'Print exactly hello followed by a newline, then exit with status 0.',
        },
      },
      metrics: {
        cliCalls: 2,
        interruptCount: 0,
        firstAttemptSuccess: true,
      },
    });

    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer', 'verifier']);
    expect(calls[0].args).toContain('--sandbox');
    expect(calls[0].args).toContain('read-only');
    expect(calls[0].args).toContain('--ephemeral');
    expect(calls[0].args).toContain('--json');
    expect(calls[0].args).not.toContain('--dangerously-bypass-hook-trust');
    expect(calls[0].args).toContain('--ignore-rules');
    expect(calls[1].args).toContain('--sandbox');
    expect(calls[1].args).toContain('read-only');
    expect(calls[1].prompt.producerOutput).toEqual({
      spec: 'Print exactly hello followed by a newline, then exit with status 0.',
    });

    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    const run = readJson(path.join(runDir, 'run.json'));
    expect(run).toMatchObject({
      schemaVersion: 1,
      runId,
      loop: 'spec-loop',
      status: 'completed',
      phase: 'completed',
      iteration: 1,
      contract: {
        id: 'spec-loop',
        objective: expect.any(String),
        input: expect.any(Object),
        output: expect.any(Object),
        skills: expect.any(Array),
        producer: expect.any(Object),
        verifier: expect.any(Object),
        successCriteria: expect.any(Array),
        maxIterations: expect.any(Number),
        stopConditions: expect.any(Array),
        interaction: expect.any(Object),
        sideEffects: expect.any(Object),
        handoff: expect.any(Object),
      },
      metrics: {
        cliCalls: 2,
        interruptCount: 0,
      },
    });

    const producerState = readJson(path.join(runDir, 'agents', 'producer-1', 'state.json'));
    const verifierState = readJson(path.join(runDir, 'agents', 'verifier-1', 'state.json'));
    expect(producerState).toMatchObject({
      agentId: 'producer-1',
      host: 'codex',
      role: 'producer',
      status: 'completed',
      readOnly: true,
      trace: {
        source: 'runtime-captured',
        path: 'agents/producer-1/trace.jsonl',
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        eventCount: 1,
      },
    });
    expect(verifierState).toMatchObject({
      agentId: 'verifier-1',
      host: 'codex',
      role: 'verifier',
      status: 'completed',
      readOnly: true,
      result: { verdict: 'pass', findings: [] },
    });

    const integration = readJson(path.join(runDir, 'integration.json'));
    expect(integration).toMatchObject({
      schemaVersion: 1,
      runId,
      loop: 'spec-loop',
      verdict: 'pass',
      status: 'completed',
      validationStatus: 'pass',
      handoff: {
        status: 'completed',
        summary: 'Spec accepted after independent review.',
      },
    });
    expect(integration).not.toHaveProperty('loops');
    expect(integration).not.toHaveProperty('mainAgentDecision');
    expect(integration).not.toHaveProperty('agentIds');
    expect(integration.agentEvidence.map((item: { agentId: string }) => item.agentId)).toEqual(['producer-1', 'verifier-1']);
    expect(integration.agentEvidence.every((item: { sha256: string }) => /^[a-f0-9]{64}$/.test(item.sha256))).toBe(true);
    expect(fs.readFileSync(excludePath).equals(excludeBefore)).toBe(true);
    expect(fs.readFileSync(path.join(targetDir, '.harness-hub', '.gitignore'), 'utf8')).toBe('state/\n.gitignore\n');
    const producerTracePath = path.join(runDir, 'agents', 'producer-1', 'trace.jsonl');
    expect(fs.existsSync(producerTracePath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(producerTracePath, 'utf8').trim())).toMatchObject({
      type: 'turn.completed',
      role: 'producer',
    });
    expect(fs.readFileSync(path.join(targetDir, 'README.md'), 'utf8')).toBe('# Synthetic target\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a runtime infrastructure failure closes the Loop run with integration and handoff evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-infrastructure-failure-'));
  const targetDir = path.join(root, 'target');
  const inputPath = path.join(root, 'input.json');
  const runId = 'infrastructure-failure';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Close an infrastructure failure with durable evidence.',
      targetSpec: 'A started Loop never remains in running state after a terminal runtime error.',
      acceptanceCriteria: ['run.json, integration.json, and a compact handoff record the failure.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'spec-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], { cwd: process.cwd(), encoding: 'utf8' });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      status: 'failed',
      error: { code: 'E_TARGET_GIT' },
      handoff: { status: 'failed' },
    });
    expect(report.handoff.findings.join(' ')).toMatch(/E_TARGET_GIT/);
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'run.json'))).toMatchObject({ status: 'failed', phase: 'handoff' });
    expect(readJson(path.join(runDir, 'integration.json'))).toMatchObject({ status: 'failed', verdict: 'fail' });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('spec-loop iterates after verifier rejection and completes only after an independent pass', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-revise-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'spec-revise-then-pass';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Specify a deterministic greeting command.',
      targetSpec: 'The command prints one stable greeting and exits successfully.',
      acceptanceCriteria: ['Output and exit behavior are both explicit.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'completed',
        output: { spec: 'Print hello.' },
        handoff: { summary: 'Drafted the first spec.' },
      },
      {
        status: 'completed',
        verdict: 'revise',
        findings: ['The exit status and exact newline are unspecified.'],
        handoff: { summary: 'The first draft is incomplete.' },
      },
      {
        status: 'completed',
        output: { spec: 'Print exactly hello followed by a newline, then exit with status 0.' },
        handoff: { summary: 'Revised the spec from the verifier finding.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Revised spec accepted.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'spec-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      runId,
      status: 'completed',
      iteration: 2,
      handoff: {
        summary: 'Revised spec accepted.',
        output: { spec: 'Print exactly hello followed by a newline, then exit with status 0.' },
      },
      metrics: {
        cliCalls: 4,
        firstAttemptSuccess: false,
      },
    });

    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer', 'verifier', 'producer', 'verifier']);
    expect(calls[2].prompt.previousFindings).toEqual(['The exit status and exact newline are unspecified.']);
    expect(calls[3].prompt.producerOutput).toEqual({
      spec: 'Print exactly hello followed by a newline, then exit with status 0.',
    });

    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'run.json'))).toMatchObject({
      status: 'completed',
      phase: 'completed',
      iteration: 2,
    });
    expect(fs.existsSync(path.join(runDir, 'agents', 'producer-1', 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(runDir, 'agents', 'verifier-1', 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(runDir, 'agents', 'producer-2', 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(runDir, 'agents', 'verifier-2', 'state.json'))).toBe(true);
    const integration = readJson(path.join(runDir, 'integration.json'));
    expect(integration.agentEvidence.map((item: { agentId: string }) => item.agentId)).toEqual([
      'producer-1',
      'verifier-1',
      'producer-2',
      'verifier-2',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('spec-loop retries a failed producer and a rejected draft before completing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-producer-fail-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'spec-producer-fail-then-pass';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Specify a deterministic greeting command.',
      targetSpec: 'The command prints one stable greeting and exits successfully.',
      acceptanceCriteria: ['Output and exit behavior are both explicit.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      { __exitCode: 9 },
      {
        status: 'completed',
        output: { spec: 'Print hello.' },
        handoff: { summary: 'Drafted an incomplete spec.' },
      },
      {
        status: 'completed',
        verdict: 'revise',
        findings: ['The exact newline and exit status are missing.'],
        handoff: { summary: 'The draft needs one revision.' },
      },
      {
        status: 'completed',
        output: { spec: 'Print exactly hello followed by a newline, then exit with status 0.' },
        handoff: { summary: 'Revised the spec.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Spec accepted after failure recovery.' },
      },
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'completed',
      iteration: 3,
      metrics: {
        cliCalls: 5,
        firstAttemptSuccess: false,
      },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer', 'producer', 'verifier', 'producer', 'verifier']);
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'agents', 'producer-1', 'state.json'))).toMatchObject({ status: 'failed' });
    expect(readJson(path.join(runDir, 'run.json'))).toMatchObject({ status: 'completed', iteration: 3 });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('spec-loop stops with an explicit failed handoff at maxIterations', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-max-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'spec-max-iterations';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Specify a deterministic greeting command.',
      targetSpec: 'The command prints one stable greeting and exits successfully.',
      acceptanceCriteria: ['Output and exit behavior are both explicit.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      ...Array.from({ length: 3 }, (_, index) => ({
        status: 'completed',
        output: { spec: `Incomplete draft ${index + 1}.` },
        handoff: { summary: `Drafted attempt ${index + 1}.` },
      })).flatMap((producer, index) => [producer, {
        status: 'completed',
        verdict: 'revise',
        findings: [`Attempt ${index + 1} still omits the exit status.`],
        handoff: { summary: `Attempt ${index + 1} is incomplete.` },
      }]),
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'failed',
      iteration: 3,
      handoff: {
        status: 'failed',
        nextAction: expect.stringContaining('do not claim success'),
      },
      metrics: {
        cliCalls: 6,
        firstAttemptSuccess: false,
      },
    });
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'run.json'))).toMatchObject({
      status: 'failed',
      phase: 'handoff',
      iteration: 3,
    });
    expect(readJson(path.join(runDir, 'integration.json'))).toMatchObject({
      verdict: 'fail',
      status: 'failed',
      validationStatus: 'fail',
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('spec-loop pauses for real user input and resumes the same run without fabricating acceptance', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-resume-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const answersPath = path.join(root, 'answers.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'spec-pause-resume';
  const question = 'What exact command name should the specification use?';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Specify a deterministic greeting command.',
      targetSpec: 'The command name must come from the user.',
      acceptanceCriteria: ['The chosen command name is explicit.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'paused',
        output: {},
        openQuestions: [question],
        handoff: { summary: 'A user-owned naming decision is required.' },
      },
      {
        status: 'completed',
        output: { spec: 'The hello command prints hello followed by a newline and exits with status 0.' },
        handoff: { summary: 'Applied the user-provided command name.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'User-grounded spec accepted.' },
      },
    ]);

    const paused = runLoopCli({ targetDir, inputPath, binDir, runId });

    expect(paused.status).toBe(0);
    expect(JSON.parse(paused.stdout)).toMatchObject({
      status: 'paused',
      iteration: 1,
      handoff: {
        status: 'paused',
        openQuestions: [question],
      },
      metrics: {
        cliCalls: 1,
        interruptCount: 1,
        firstAttemptSuccess: false,
      },
    });
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(fs.existsSync(path.join(runDir, 'integration.json'))).toBe(false);
    expect(readJson(path.join(runDir, 'run.json'))).toMatchObject({
      status: 'paused',
      phase: 'producer',
      pendingInteraction: {
        questions: [question],
      },
    });
    expect(readJson(path.join(runDir, 'agents', 'producer-1', 'state.json'))).toMatchObject({ status: 'paused' });

    fs.writeFileSync(answersPath, `${JSON.stringify({
      source: 'user',
      answers: [{ question, answer: 'Use the command name hello.' }],
    }, null, 2)}\n`);
    const resumed = runLoopCli({ targetDir, inputPath, answersPath, binDir, runId });

    expect(resumed.status).toBe(0);
    expect(JSON.parse(resumed.stdout)).toMatchObject({
      status: 'completed',
      iteration: 1,
      handoff: {
        summary: 'User-grounded spec accepted.',
      },
      metrics: {
        cliCalls: 3,
        interruptCount: 1,
        firstAttemptSuccess: false,
      },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer', 'producer', 'verifier']);
    expect(calls[1].prompt.userAnswers).toEqual([{ question, answer: 'Use the command name hello.' }]);
    expect(fs.existsSync(path.join(runDir, 'agents', 'producer-1-resume-1', 'state.json'))).toBe(true);
    expect(readJson(path.join(runDir, 'integration.json')).agentEvidence.map((item: { agentId: string }) => item.agentId)).toEqual([
      'producer-1',
      'producer-1-resume-1',
      'verifier-1',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('read-only producer reports writes outside its boundary before verifier execution', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-lease-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'spec-path-boundary';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Write a specification only under docs/spec.md.',
      targetSpec: 'No other repository path may change.',
      acceptanceCriteria: ['Only docs/spec.md may be written.'],
      allowedPaths: ['docs/spec.md'],
      forbiddenPaths: ['.git', 'outside.txt'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        __writeFiles: { 'outside.txt': 'unauthorized\n' },
        status: 'completed',
        output: { spec: 'A superficially valid spec.' },
        handoff: { summary: 'Claimed completion after an out-of-scope write.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'This response must never be consumed.' },
      },
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'blocked',
      iteration: 1,
      handoff: {
        status: 'blocked',
        findings: [expect.stringContaining('outside.txt')],
      },
      metrics: { cliCalls: 1 },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer']);
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'agents', 'producer-1', 'state.json'))).toMatchObject({
      status: 'blocked',
      boundary: {
        changedPaths: ['outside.txt'],
        findings: [expect.stringContaining('outside.txt')],
      },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a Host failure with boundary findings is terminal instead of being washed clean by a retry', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-terminal-boundary-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'terminal-host-boundary';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Produce a read-only specification.',
      targetSpec: 'A failed Host process cannot hide an out-of-scope mutation by succeeding later.',
      acceptanceCriteria: ['Boundary findings terminate the Loop on the first failed Host call.'],
      allowedPaths: [],
      forbiddenPaths: ['.git', 'outside.txt'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        __writeFiles: { 'outside.txt': 'unauthorized\n' },
        __exitCode: 9,
        __traceBeforeExit: true,
        status: 'completed',
        output: { spec: 'The failed process claims a valid specification.' },
        handoff: { summary: 'The first process failed after writing outside its boundary.' },
      },
      {
        status: 'completed',
        output: { spec: 'A later retry must not wash the boundary failure clean.' },
        handoff: { summary: 'This retry must never execute.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'This Verifier must never execute.' },
      },
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'blocked',
      iteration: 1,
      handoff: { findings: [expect.stringContaining('outside.txt')] },
      metrics: { cliCalls: 1 },
    });
    expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);
    expect(readJson(path.join(targetDir, '.harness-hub', 'state', 'runs', runId, 'agents', 'producer-1', 'state.json'))).toMatchObject({
      status: 'failed',
      failure: { code: 'E_HOST_FAILED' },
      boundary: { findings: [expect.stringContaining('outside.txt')] },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('missing Host trace or output with boundary findings is terminal', () => {
  for (const failure of [
    { id: 'missing-trace', response: { __skipTrace: true }, code: 'E_TRACE_MISSING' },
    { id: 'missing-output', response: { __skipOutput: true }, code: 'E_HOST_OUTPUT' },
  ]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `harness-hub-loop-${failure.id}-boundary-`));
    const targetDir = path.join(root, 'target');
    const binDir = path.join(root, 'bin');
    const inputPath = path.join(root, 'input.json');
    const callsPath = path.join(root, 'calls.jsonl');
    const runId = `${failure.id}-terminal-boundary`;

    try {
      fs.mkdirSync(targetDir);
      fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
      initGitRepository(targetDir);
      fs.writeFileSync(inputPath, `${JSON.stringify({
        schemaVersion: 1,
        task: 'Produce a read-only specification.',
        targetSpec: 'Missing Host evidence cannot hide an out-of-scope mutation by succeeding later.',
        acceptanceCriteria: ['Boundary findings terminate the Loop on the first invalid Host result.'],
        allowedPaths: [],
        forbiddenPaths: ['.git', 'outside.txt'],
        validationCommands: [],
      }, null, 2)}\n`);
      writeFakeCodex(binDir, callsPath, [
        {
          ...failure.response,
          __writeFiles: { 'outside.txt': 'unauthorized\n' },
          status: 'completed',
          output: { spec: 'The invalid Host result claims a valid specification.' },
          handoff: { summary: 'The first call changed a forbidden path.' },
        },
        {
          status: 'completed',
          output: { spec: 'This retry must never execute.' },
          handoff: { summary: 'This retry must never execute.' },
        },
      ]);

      const result = runLoopCli({ targetDir, inputPath, binDir, runId });

      expect(result.status).toBe(3);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: 'blocked',
        iteration: 1,
        handoff: { findings: [expect.stringContaining('outside.txt')] },
      });
      expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);
      expect(readJson(path.join(targetDir, '.harness-hub', 'state', 'runs', runId, 'agents', 'producer-1', 'state.json'))).toMatchObject({
        status: 'failed',
        failure: { code: failure.code },
        boundary: { findings: [expect.stringContaining('outside.txt')] },
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}, 15_000);

test('implementation-review-loop dispatches a read-only Arbiter when independent Agent verdicts conflict', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-arbiter-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'implementation-review-arbiter';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(validationScript, "process.stdout.write('review-validation');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Review a deterministic greeting implementation.',
      targetSpec: 'The greeting command is correct, observable, robust, and minimal.',
      acceptanceCriteria: ['Conflicting independent review verdicts are reconciled by a read-only Arbiter.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(validationScript)],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'completed',
        output: { verdict: 'pass', findings: [], deterministicEvidence: { commands: [] } },
        handoff: { summary: 'Producer review found no blocker.' },
      },
      {
        status: 'completed',
        verdict: 'revise',
        findings: ['Verifier believes the error path is underspecified.'],
        handoff: { summary: 'Verifier requested revision.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Arbiter resolved the conflict from repository evidence.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'implementation-review-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect({ status: result.status, stderr: result.stderr }).toMatchObject({ status: 0, stderr: '' });
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'completed',
      iteration: 1,
      handoff: { summary: 'Arbiter resolved the conflict from repository evidence.' },
      metrics: { cliCalls: 3, firstAttemptSuccess: true },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer', 'verifier', 'arbiter']);
    expect(calls[2].args).toContain('--sandbox');
    expect(calls[2].args).toContain('read-only');
    expect(calls[2].prompt).toMatchObject({
      producerOutput: { verdict: 'pass' },
      verifierResult: { verdict: 'revise' },
    });
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(JSON.parse(fs.readFileSync(path.join(runDir, 'agents', 'arbiter-1', 'state.json'), 'utf8'))).toMatchObject({
      role: 'arbiter',
      readOnly: true,
      status: 'completed',
    });
    expect(JSON.parse(fs.readFileSync(path.join(runDir, 'integration.json'), 'utf8')).agentEvidence.map((item: { agentId: string }) => item.agentId)).toEqual([
      'producer-1',
      'verifier-1',
      'arbiter-1',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('a CLI Agent cannot forge another Loop run or integration record', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-control-plane-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'spec-control-plane-boundary';
  const forgedPath = '.harness-hub/state/runs/forged-run/integration.json';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Write a read-only specification.',
      targetSpec: 'Runtime evidence is authoritative and cannot be supplied by the Agent.',
      acceptanceCriteria: ['The Agent cannot modify another run, integration, lease, or ledger.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        __writeFiles: { [forgedPath]: '{"verdict":"pass"}\n' },
        status: 'completed',
        output: { spec: 'A superficially valid spec.' },
        handoff: { summary: 'Attempted to forge integration evidence.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'This verifier must not run.' },
      },
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'blocked',
      metrics: { cliCalls: 1 },
      handoff: { findings: [expect.stringContaining('runtime control plane')] },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer']);
    expect(readJson(path.join(targetDir, '.harness-hub', 'state', 'runs', runId, 'agents', 'producer-1', 'state.json'))).toMatchObject({
      status: 'blocked',
      boundary: { findings: [expect.stringContaining(forgedPath)] },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('spec-loop executes Claude Code producer and read-only verifier with directly captured trace', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-claude-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'spec-claude-first-pass';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Specify a deterministic greeting command.',
      targetSpec: 'The command prints one stable greeting and exits successfully.',
      acceptanceCriteria: ['Output and exit behavior are explicit.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeClaude(binDir, callsPath, [
      {
        status: 'completed',
        output: { spec: 'Print exactly hello followed by a newline, then exit with status 0.' },
        handoff: { summary: 'Drafted an executable spec with Claude Code.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Claude Code verifier accepted the spec.' },
      },
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, host: 'claude' });

    expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toMatchObject({ status: 0 });
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'completed',
      iteration: 1,
      metrics: { cliCalls: 2, firstAttemptSuccess: true },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer', 'verifier']);
    expect(calls[0].args).toContain('-p');
    expect(calls[0].args).toContain('--permission-mode');
    expect(calls[0].args).toContain('plan');
    expect(calls[0].args).not.toContain('--dangerously-skip-permissions');
    expect(calls[0].args).toContain('--output-format');
    expect(calls[0].args).toContain('stream-json');
    expect(calls[0].args).toContain('--json-schema');
    expect(calls[0].args).not.toContain('--safe-mode');
    expect(calls[1].args).toContain('--permission-mode');
    expect(calls[1].args).toContain('plan');
    expect(calls[1].args).not.toContain('--dangerously-skip-permissions');
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'agents', 'producer-1', 'state.json'))).toMatchObject({
      host: 'claude',
      trace: {
        source: 'runtime-captured',
        eventCount: 2,
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('delegated delivery uses read-only Codex and Claude modes without dangerous bypasses', () => {
  for (const host of ['codex', 'claude'] as const) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `harness-hub-${host}-write-mode-`));
    const targetDir = path.join(root, 'target');
    const binDir = path.join(root, 'bin');
    const inputPath = path.join(root, 'input.json');
    const callsPath = path.join(root, 'calls.jsonl');
    const validationScript = path.join(root, 'validation.mjs');
    const runId = `${host}-bounded-write-mode`;
    const responses = [
      {
        status: 'completed',
        output: { validation: { summary: 'Deterministic validation completed.' } },
        openQuestions: [],
        handoff: { summary: 'Delivery Producer completed within its read-only boundary.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Delivery Verifier accepted the bounded execution.' },
      },
    ];

    try {
      fs.mkdirSync(targetDir);
      fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
      fs.writeFileSync(validationScript, "process.stdout.write('validated');\n");
      initGitRepository(targetDir);
      fs.writeFileSync(inputPath, `${JSON.stringify({
        schemaVersion: 1,
        task: 'Complete a local delivery without bypassing Host safety.',
        targetSpec: 'Delegated delivery remains read-only while runtime owns authorized local actions.',
        acceptanceCriteria: ['Codex uses read-only sandbox.', 'Claude uses plan mode without editing tools.'],
        allowedPaths: ['README.md'],
        forbiddenPaths: ['.git'],
        validationCommands: [validationArgv(validationScript)],
      }, null, 2)}\n`);
      if (host === 'codex') writeFakeCodex(binDir, callsPath, responses);
      else writeFakeClaude(binDir, callsPath, responses);

      const result = runLoopCli({ targetDir, inputPath, binDir, runId, host, loop: 'delivery-loop' });

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
      const producerArgs = calls[0].args as string[];
      if (host === 'codex') {
        const sandboxIndex = producerArgs.indexOf('--sandbox');
        expect(sandboxIndex).toBeGreaterThanOrEqual(0);
        expect(producerArgs[sandboxIndex + 1]).toBe('read-only');
        expect(producerArgs).not.toContain('--dangerously-bypass-approvals-and-sandbox');
        expect(producerArgs).not.toContain('danger-full-access');
      } else {
        const permissionIndex = producerArgs.indexOf('--permission-mode');
        expect(permissionIndex).toBeGreaterThanOrEqual(0);
        expect(producerArgs[permissionIndex + 1]).toBe('plan');
        expect(producerArgs).not.toContain('--tools');
        expect(producerArgs).not.toContain('--dangerously-skip-permissions');
        expect(producerArgs).not.toContain('--allow-dangerously-skip-permissions');
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
}, 20_000);

test('report-loop invokes effective-interact from lifecycle context without prompt keywords and verifies the artifact', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-report-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'report-lifecycle-trigger';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Summarize the completed repository changes for the owner.',
      targetSpec: 'The handoff must minimize interpretation cost and cite validation evidence.',
      acceptanceCriteria: ['The lifecycle policy decides the presentation mode.', 'The generated output is verified.'],
      allowedPaths: ['reports/handoff.html'],
      forbiddenPaths: ['.git'],
      validationCommands: [],
      context: {
        stage: 'handoff',
        changeCount: 12,
        decisionCount: 3,
      },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'completed',
        output: {
          complexity: 'complex',
          presentation: { mode: 'html-artifact', text: null },
          interactionInput: effectiveInteractionInput('Delivery handoff'),
        },
        handoff: { summary: 'Generated the complex delivery handoff.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'The lifecycle-triggered handoff artifact is valid.' },
      },
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'report-loop' });

    expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toMatchObject({ status: 0 });
    expect(JSON.parse(result.stdout)).toMatchObject({
      loop: 'report-loop',
      status: 'completed',
      handoff: {
        output: {
          complexity: 'complex',
          effectiveInteractUsed: true,
          presentation: {
            generatedBy: 'effective-interact',
            validation: { status: 'pass' },
          },
        },
      },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls[0].prompt.task).not.toMatch(/effective-interact|visual|可视化/i);
    expect(calls[0].prompt.loop.skills).toContain('effective-interact');
    expect(calls[0].prompt.lifecycleContext).toEqual({ stage: 'handoff', changeCount: 12, decisionCount: 3 });
    const integration = readJson(path.join(targetDir, '.harness-hub', 'state', 'runs', runId, 'integration.json'));
    expect(integration.validationEvidence).toContain('report-loop lifecycle requires and verifies an effective-interact artifact.');
    expect(integration.deterministicEvidence.loopValidation).toMatchObject({ kind: 'effective-interact', status: 'pass' });
    expect(fs.readFileSync(path.join(
      targetDir,
      '.harness-hub',
      'state',
      'runs',
      runId,
      'artifacts',
      'report.html',
    ), 'utf8')).toContain('data-html-work-report');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('retro-loop keeps a real-task Eval candidate grounded in target-local evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-retro-eval-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'retro-local-eval';
  const candidate = {
    evidenceAnchors: ['audit/session.jsonl'],
    task: 'Re-run the repository-local task from its captured evidence.',
    successCriteria: ['The target repository task passes without human intervention.'],
    grader: 'Use the target repository deterministic task checks.',
  };

  try {
    fs.mkdirSync(path.join(targetDir, 'audit'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'audit', 'session.jsonl'), '{"event":"task_completed"}\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Derive only evidence-backed target-local Eval candidates.',
      targetSpec: 'Keep project-specific evidence and Eval candidates inside this target repository.',
      acceptanceCriteria: ['Every Eval candidate cites an existing target-relative evidence path.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'completed',
        output: { findings: [], recommendations: ['Keep the candidate project-local.'], existingEntityChanges: [], evalCandidates: [candidate] },
        openQuestions: [],
        handoff: { summary: 'One target-local Eval candidate is supported by session evidence.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'The project-local evidence anchor is valid.' },
      },
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'retro-loop' });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'completed',
      handoff: { output: { evalCandidates: [candidate] } },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer', 'verifier']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('retro-loop deterministically rejects absolute traversal and missing Eval evidence anchors', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-retro-eval-boundary-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'retro-invalid-eval-evidence';
  const invalidAnchors = [
    path.resolve(targetDir, 'absolute-evidence.jsonl'),
    '../outside/session.jsonl',
    'audit/missing.jsonl',
  ];

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Reject Eval evidence that is not owned by this target repository.',
      targetSpec: 'Only existing target-relative evidence may support a project Eval candidate.',
      acceptanceCriteria: ['Absolute traversal and missing anchors fail deterministically.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      status: 'completed',
      output: {
        findings: [],
        recommendations: [],
        existingEntityChanges: [],
        evalCandidates: [{
          evidenceAnchors: invalidAnchors,
          task: 'Invalid cross-boundary candidate.',
          successCriteria: ['This candidate must be rejected.'],
          grader: 'Deterministic boundary check.',
        }],
      },
      openQuestions: [],
      handoff: { summary: 'This output must fail before independent verification.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'retro-loop' });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ status: 'blocked', metrics: { cliCalls: 1 } });
    const findings = report.handoff.findings.join(' ');
    expect(findings).toContain('absolute-evidence.jsonl');
    expect(findings).toContain('../outside/session.jsonl');
    expect(findings).toContain('audit/missing.jsonl');
    expect(findings).toMatch(/not a current-project relative path/i);
    expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('workflow metrics aggregate token cost duration and intervention guardrails', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-workflow-metrics-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'answer-workflow-metrics';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Return one concise status report.',
      targetSpec: 'A simple report stays plain text while metrics remain complete.',
      acceptanceCriteria: ['The report Workflow records cost and token guardrails.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
      context: { stage: 'status', changeCount: 0, decisionCount: 0 },
    }, null, 2)}\n`);
    writeFakeClaude(binDir, callsPath, [
      {
        status: 'completed',
        output: {
          complexity: 'simple',
          presentation: { mode: 'plain-text', text: 'No material change.' },
          interactionInput: null,
        },
        openQuestions: [],
        handoff: { summary: 'Simple report prepared.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Simple report verified.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'workflow',
      targetDir,
      '--workflow',
      'answer-workflow',
      '--run-id',
      runId,
      '--host',
      'claude',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.metrics).toMatchObject({
      cliCalls: 2,
      interruptCount: 0,
      inputTokens: 24,
      outputTokens: 12,
      totalTokens: 36,
      costUsd: 0.02,
      firstAttemptSuccess: true,
    });
    expect(report.metrics.durationMs).toBeGreaterThanOrEqual(0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('sdd-workflow ponytail lifecycle gate only orchestrates small loops and passes compact handoffs between them', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-workflow-runtime-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'sdd-full-flow';
  const testPath = 'tests/workflow-behavior.mjs';
  const implementationPath = 'src/workflow-behavior.txt';
  const validationCommand = validationArgv(testPath);
  const testSource = [
    "import fs from 'node:fs';",
    "const target = new URL('../src/workflow-behavior.txt', import.meta.url);",
    "if (!fs.existsSync(target)) { process.stderr.write('missing-workflow-behavior'); process.exit(5); }",
    "process.stdout.write('workflow-behavior-present');",
    '',
  ].join('\n');
  const loops = [
    'requirements-loop',
    'spec-loop',
    'test-loop',
    'implementation-review-loop',
    'knowledge-maintain-loop',
    'delivery-loop',
    'retro-loop',
    'report-loop',
  ];
  const outputs: Record<string, Record<string, unknown>> = {
    'requirements-loop': { constraints: ['No remote writes.'], details: ['Synthetic scope.'], openQuestions: [], aligned: true },
    'spec-loop': { spec: 'Implement one deterministic synthetic behavior.' },
    'test-loop': { testPlan: { P0: ['focused behavior'], P1: [], P2: [] } },
    'implementation-review-loop': { verdict: 'pass', findings: [] },
    'knowledge-maintain-loop': {
      changedConcepts: ['knowledge/project.md'],
      sources: [implementationPath],
      logEntry: 'Maintained from workflow implementation evidence.',
    },
    'delivery-loop': {
      validation: { summary: 'Focused deterministic validation passed.' },
    },
    'retro-loop': { findings: [], recommendations: ['No change required.'], existingEntityChanges: [], evalCandidates: [] },
    'report-loop': {
      complexity: 'complex',
      presentation: { mode: 'html-artifact', text: null },
      interactionInput: effectiveInteractionInput('Workflow handoff'),
    },
  };

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.mkdirSync(path.join(targetDir, 'knowledge'));
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n# Project knowledge\n\n- [Project](project.md)\n- [Update log](log.md)\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'log.md'), '---\ntype: log\n---\n# Knowledge update log\n\n## 2026-07-12\n\n- Baseline.\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'project.md'), '---\ntype: project\ntitle: Synthetic target\n---\n# Synthetic target\n\nBaseline summary.\n\n## Sources\n\n- [README](../README.md)\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Complete the accepted synthetic repository change.',
      targetSpec: 'Use the standard SDD lifecycle and return an evidence-backed handoff.',
      acceptanceCriteria: ['Every workflow stage completes.', 'Handoffs are passed without raw trace duplication.'],
      allowedPaths: ['knowledge', testPath, implementationPath],
      forbiddenPaths: ['.git'],
      validationCommands: [validationCommand],
      context: {
        stage: 'implementation',
        testPaths: [testPath],
        implementationPaths: [implementationPath],
        redFailurePatterns: ['missing-workflow-behavior'],
        knowledgeMaintenanceRequired: true,
        knowledgeRoot: 'knowledge',
      },
    }, null, 2)}\n`);
    const responses = loops.flatMap((loop) => {
      const verifier = {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        openQuestions: [],
        handoff: { summary: `${loop} verified.` },
      };
      if (loop === 'test-loop') {
        return [{
          __writeFiles: { [testPath]: testSource },
          status: 'completed',
          output: outputs[loop],
          openQuestions: [],
          handoff: { summary: 'test-loop design completed.' },
        }, {
          __writeFiles: { [implementationPath]: 'implemented\n' },
          status: 'completed',
          output: { implementationSummary: 'Implemented after causal RED.' },
          openQuestions: [],
          handoff: { summary: 'test-loop implementation completed.' },
        }, verifier];
      }
      if (loop === 'knowledge-maintain-loop') {
        return [{
          __writeFiles: {
            'knowledge/log.md': '---\ntype: log\n---\n# Knowledge update log\n\n## 2026-07-12\n\n- Baseline.\n\n## 2026-07-13\n\n- Maintained from workflow implementation evidence.\n',
            'knowledge/project.md': '---\ntype: project\ntitle: Synthetic target\n---\n# Synthetic target\n\nImplemented workflow behavior.\n\n## Sources\n\n- [Implementation](../src/workflow-behavior.txt)\n',
          },
          status: 'completed',
          output: outputs[loop],
          openQuestions: [],
          handoff: { summary: 'knowledge-maintain-loop producer completed.' },
        }, verifier];
      }
      return [{
        status: 'completed',
        output: outputs[loop],
        openQuestions: [],
        handoff: { summary: `${loop} producer completed.` },
      }, verifier];
    });
    writeFakeCodex(binDir, callsPath, responses);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'workflow',
      targetDir,
      '--workflow',
      'sdd-workflow',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toMatchObject({ status: 0 });
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      schemaVersion: 1,
      runId,
      workflow: 'sdd-workflow',
      status: 'completed',
      handoff: {
        status: 'completed',
        summary: 'report-loop verified.',
      },
      metrics: {
        cliCalls: 17,
        firstAttemptSuccess: true,
      },
    });
    expect(report.steps.map((step: { loop: string }) => step.loop)).toEqual(loops);
    expect(report.steps.some((step: { loop: string }) => step.loop === 'knowledge-maintain-loop')).toBe(true);
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.loop.id)).toEqual([
      'requirements-loop', 'requirements-loop',
      'spec-loop', 'spec-loop',
      'test-loop', 'test-loop', 'test-loop',
      'implementation-review-loop', 'implementation-review-loop',
      'knowledge-maintain-loop', 'knowledge-maintain-loop',
      'delivery-loop', 'delivery-loop',
      'retro-loop', 'retro-loop',
      'report-loop', 'report-loop',
    ]);
    expect(calls[9].prompt.allowedPaths).toEqual(['knowledge']);
    expect(calls[2].prompt.lifecycleContext.upstreamHandoffs).toEqual([
      expect.objectContaining({ loop: 'requirements-loop', status: 'completed', summary: 'requirements-loop verified.' }),
    ]);
    expect(calls.at(-2).prompt.lifecycleContext.stage).toBe('handoff');
    expect(calls.at(-2).prompt.lifecycleContext.upstreamHandoffs).toEqual([
      expect.objectContaining({ loop: 'retro-loop', status: 'completed' }),
    ]);
    expect(calls.every((call) => call.prompt.lifecycleContext.upstreamHandoffs.length <= 1)).toBe(true);
    expect(fs.readFileSync(inputPath, 'utf8')).not.toMatch(/ponytail/i);
    const simplicityCalls = calls.filter((call) => [
      'spec-loop',
      'implementation-review-loop',
    ].includes(call.prompt.loop.id));
    expect(simplicityCalls.length).toBeGreaterThan(0);
    expect(simplicityCalls.every((call) => call.prompt.loop.skills.includes('ponytail'))).toBe(true);
    expect(calls.flatMap((call, index) => {
      const schemaIndex = call.args.indexOf('--output-schema');
      if (schemaIndex < 0 || !call.args[schemaIndex + 1]) {
        return [`call[${index}] is missing --output-schema`];
      }
      return collectStrictObjectSchemaViolations(readJson(call.args[schemaIndex + 1]), `call[${index}]`);
    })).toEqual([]);
    const workflowRunDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    const workflowRun = readJson(path.join(workflowRunDir, 'run.json'));
    expect(workflowRun).toMatchObject({
      kind: 'workflow',
      workflow: 'sdd-workflow',
      status: 'completed',
    });
    expect(workflowRun).not.toHaveProperty('handoffs');
    const workflowIntegration = readJson(path.join(workflowRunDir, 'integration.json'));
    expect(workflowIntegration.childRuns).toHaveLength(8);
    expect(workflowIntegration).not.toHaveProperty('mainAgentDecision');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 45_000);

test('delivery-workflow stops before delivery when minimal-design review is rejected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-delivery-review-gate-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'delivery-review-rejected';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(validationScript, "process.stdout.write('validated');\n");
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Deliver an accepted minimal implementation.',
      targetSpec: 'Reuse the existing runtime and do not add an abstraction.',
      acceptanceCriteria: ['No unmapped entity reaches delivery.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(validationScript)],
      context: { stage: 'delivery' },
    }, null, 2)}\n`);
    const rejection = 'The implementation adds an entity that does not map to targetSpec or acceptanceCriteria.';
    writeFakeCodex(binDir, callsPath, [{
      status: 'completed',
      output: { verdict: 'revise', findings: [rejection] },
      handoff: { summary: rejection },
    }, {
      status: 'completed',
      verdict: 'revise',
      findings: [rejection],
      handoff: { summary: rejection },
    }]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'workflow',
      targetDir,
      '--workflow',
      'delivery-workflow',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).not.toBe(0);
    expect(result.stdout, result.stderr).not.toBe('');
    const report = JSON.parse(result.stdout);
    expect(report.status).toBe('failed');
    expect(report.steps).toContainEqual(expect.objectContaining({
      loop: 'implementation-review-loop',
      status: 'failed',
    }));
    expect(JSON.stringify(report.handoff)).toContain(rejection);
    expect(report.steps.some((step: { loop: string }) => step.loop === 'delivery-loop')).toBe(false);
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer', 'verifier']);
    expect(calls.some((call) => call.prompt.loop.id === 'delivery-loop')).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('review-workflow ignores knowledge maintenance flag because no preceding write lifecycle exists', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-workflow-knowledge-maintain-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'review-with-knowledge-maintenance';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.mkdirSync(path.join(targetDir, 'knowledge'));
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n# Project knowledge\n\n- [Project](project.md)\n- [Update log](log.md)\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'log.md'), '---\ntype: log\n---\n# Knowledge update log\n\n## 2026-07-12\n\n- Baseline.\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'project.md'), '---\ntype: project\ntitle: Synthetic target\n---\n# Synthetic target\n\nBaseline summary.\n\n## Sources\n\n- [README](../README.md)\n');
    initGitRepository(targetDir);
    fs.writeFileSync(validationScript, "process.stdout.write('review-pass');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Review implementation, maintain project knowledge when required, and report.',
      targetSpec: 'Knowledge maintenance is conditional and owns its own Loop implementation.',
      acceptanceCriteria: ['The knowledge Loop runs only when explicitly required.', 'Each child receives at most the immediately preceding handoff.'],
      allowedPaths: ['knowledge', 'reports/knowledge-review.html'],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(validationScript)],
      context: { knowledgeMaintenanceRequired: true },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'completed',
        output: { verdict: 'pass', findings: [], deterministicEvidence: { source: 'agent-claim' } },
        handoff: { summary: 'Implementation review completed.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Implementation review verified.' },
      },
      {
        status: 'completed',
        output: {
          complexity: 'complex',
          presentation: { mode: 'html-artifact', text: null },
          interactionInput: effectiveInteractionInput('Knowledge maintenance review'),
        },
        handoff: { summary: 'Review handoff input prepared.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Review handoff verified.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'workflow',
      targetDir,
      '--workflow',
      'review-workflow',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.steps.map((step: { loop: string }) => step.loop)).toEqual([
      'implementation-review-loop',
      'report-loop',
    ]);
    expect(report.metrics.cliCalls).toBe(4);
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls[2].prompt.lifecycleContext.upstreamHandoffs).toEqual([
      expect.objectContaining({ loop: 'implementation-review-loop', status: 'completed' }),
    ]);
    expect(calls[2].prompt.lifecycleContext.upstreamHandoffs).toHaveLength(1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('router owner output is consumed by the workflow runner instead of remaining advisory text', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-router-runtime-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'routed-review-flow';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(validationScript, "process.stdout.write('review-validation');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Inspect the current implementation evidence.',
      targetSpec: 'Return correctness and robustness findings with a verified handoff.',
      acceptanceCriteria: ['The Router chooses exactly one owner.', 'The selected Workflow actually runs its Loops.'],
      allowedPaths: ['reports/review-handoff.html'],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(validationScript)],
      context: {},
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'completed',
        output: { verdict: 'pass', findings: [], deterministicEvidence: ['synthetic evidence'] },
        handoff: { summary: 'Implementation review completed.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Implementation review verified.' },
      },
      {
        status: 'completed',
        output: {
          complexity: 'complex',
          presentation: { mode: 'html-artifact', text: null },
          interactionInput: effectiveInteractionInput('Review handoff'),
        },
        handoff: { summary: 'Review handoff generated.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Review handoff verified.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'route',
      targetDir,
      '--prompt',
      'Review the implementation for correctness and robustness.',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toMatchObject({ status: 0 });
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      route: { state: 'review', owner: 'review-workflow' },
      workflow: 'review-workflow',
      status: 'completed',
      metrics: { cliCalls: 4 },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.filter((_: unknown, index: number) => index % 2 === 0).map((call) => call.prompt.loop.id)).toEqual([
      'implementation-review-loop',
      'report-loop',
    ]);
    expect(calls[0].prompt.lifecycleContext.router).toMatchObject({ owner: 'review-workflow', state: 'review' });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('knowledge-maintain-loop rejects empty evidence and leaves the failed mutation observable', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-knowledge-empty-evidence-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'knowledge-empty-evidence';
  const baselineLog = '---\ntype: log\n---\n# Knowledge log\n\n## 2026-07-12\n\n- Initial.\n';

  try {
    fs.mkdirSync(path.join(targetDir, 'knowledge'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, 'src', 'source.ts'), 'export const source = 1;\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n# Knowledge\n\n- [Project](project.md)\n- [Log](log.md)\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'project.md'), '---\ntype: project\ntitle: Synthetic\n---\n# Synthetic\n\n## Sources\n\n- [Source](../src/source.ts)\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'log.md'), baselineLog);
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Maintain knowledge from a real source change.',
      targetSpec: 'Empty maintenance evidence cannot complete.',
      acceptanceCriteria: ['At least one concept and source are declared.'],
      allowedPaths: ['knowledge', 'src'],
      forbiddenPaths: ['.git'],
      validationCommands: [],
      context: {
        knowledgeRoot: 'knowledge',
        knowledgeMaintenanceEvidence: { changedPaths: ['src/source.ts'] },
      },
    }, null, 2)}\n`);
    const logEntry = 'Empty evidence must not pass.';
    writeFakeCodex(binDir, callsPath, [{
      __writeFiles: { 'knowledge/log.md': `${baselineLog}\n## 2026-07-13\n\n- ${logEntry}\n` },
      status: 'completed',
      output: { changedConcepts: [], sources: [], logEntry },
      handoff: { summary: 'Producer claimed an empty maintenance update.' },
    }, {
      status: 'completed', verdict: 'pass', findings: [], handoff: { summary: 'This Verifier must not run.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'knowledge-maintain-loop' });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ status: 'blocked', metrics: { cliCalls: 1 } });
    expect(report.handoff.findings.join(' ')).toMatch(/changedConcepts|sources/i);
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls[0].prompt.allowedPaths).toEqual(['knowledge']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('knowledge-maintain-loop requires a runtime-captured source for every changed concept', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-knowledge-concept-sources-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'knowledge-concept-sources';

  try {
    fs.mkdirSync(path.join(targetDir, 'knowledge'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, 'src', 'a.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(targetDir, 'src', 'b.ts'), 'export const b = 1;\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'index.md'), '---\ntype: index\nokf_version: "0.1"\n---\n# Knowledge\n\n- [A](a.md)\n- [B](b.md)\n- [Log](log.md)\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'a.md'), '---\ntype: concept\ntitle: A\n---\n# A\n\n## Sources\n\n- [A source](../src/a.ts)\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'b.md'), '---\ntype: concept\ntitle: B\n---\n# B\n\n## Sources\n\n- [B source](../src/b.ts)\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'log.md'), '---\ntype: log\n---\n# Knowledge log\n\n## 2026-07-12\n\n- Baseline.\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Maintain two concepts from two changed sources.',
      targetSpec: 'Each changed concept cites declared runtime evidence.',
      acceptanceCriteria: ['A union citation cannot hide an unsupported concept.'],
      allowedPaths: ['knowledge'],
      forbiddenPaths: ['.git'],
      validationCommands: [],
      context: {
        knowledgeRoot: 'knowledge',
        knowledgeMaintenanceEvidence: { changedPaths: ['src/a.ts', 'src/b.ts'] },
      },
    }, null, 2)}\n`);
    const logEntry = 'Updated A and B.';
    writeFakeCodex(binDir, callsPath, [{
      __writeFiles: {
        'knowledge/a.md': '---\ntype: concept\ntitle: A\n---\n# A updated\n\n## Sources\n\n- [A source](../src/a.ts)\n',
        'knowledge/b.md': '---\ntype: concept\ntitle: B\n---\n# B updated\n\n## Sources\n\n- [B source](../src/b.ts)\n',
        'knowledge/log.md': `---\ntype: log\n---\n# Knowledge log\n\n## 2026-07-12\n\n- Baseline.\n\n## 2026-07-13\n\n- ${logEntry}\n`,
      },
      status: 'completed',
      output: { changedConcepts: ['knowledge/a.md', 'knowledge/b.md'], sources: ['src/a.ts'], logEntry },
      handoff: { summary: 'Producer omitted B from declared sources.' },
    }, {
      status: 'completed', verdict: 'pass', findings: [], handoff: { summary: 'This Verifier must not run.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'knowledge-maintain-loop' });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ status: 'blocked', metrics: { cliCalls: 1 } });
    expect(report.handoff.findings.join(' ')).toContain('knowledge/b.md');
    expect(report.handoff.findings.join(' ')).toMatch(/source|evidence/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('knowledge-init-loop creates and deterministically validates a target-owned OKF wiki before verifier pass', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-knowledge-init-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'knowledge-init-valid';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Initialize project knowledge from current target sources.',
      targetSpec: 'Create the smallest source-traceable Google OKF v0.1 wiki.',
      acceptanceCriteria: ['OKF validation passes.', 'Knowledge cites target sources.'],
      allowedPaths: ['knowledge', 'README.md'],
      forbiddenPaths: ['.git'],
      validationCommands: [],
      context: { knowledgeMode: 'init' },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        __writeFiles: {
          'knowledge/index.md': '---\ntype: index\nokf_version: "0.1"\n---\n# Project knowledge\n\n- [Project](project.md)\n- [Update log](log.md)\n',
          'knowledge/log.md': '---\ntype: log\n---\n# Knowledge update log\n\n## 2026-07-13\n\n- Initialized from repository evidence.\n',
          'knowledge/project.md': '---\ntype: project\ntitle: Synthetic target\n---\n# Synthetic target\n\nA project-specific summary.\n\n## Sources\n\n- [README](../README.md)\n',
        },
        status: 'completed',
        output: {
          knowledgeRoot: 'knowledge',
          concepts: ['knowledge/project.md'],
          sources: ['README.md'],
          logEntry: '2026-07-13 initialized from repository evidence.',
        },
        handoff: { summary: 'Initialized the project-owned OKF wiki.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'OKF project wiki verified.' },
      },
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'knowledge-init-loop' });

    expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toMatchObject({ status: 0 });
    expect(JSON.parse(result.stdout)).toMatchObject({ loop: 'knowledge-init-loop', status: 'completed' });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls[0].prompt.allowedPaths).toEqual(['knowledge']);
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'agents', 'producer-1', 'state.json'))).toMatchObject({
      deterministicValidation: {
        kind: 'google-okf-v0.1',
        status: 'pass',
        fileCount: 3,
        sourceCount: 1,
      },
    });
    expect(readJson(path.join(runDir, 'integration.json')).validationEvidence).toContain(
      'knowledge-init-loop passes deterministic Google OKF v0.1 structure, link, source, log, and isolation validation.',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('knowledge-init-loop cannot be passed by Agent judgment when deterministic OKF evidence is missing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-knowledge-invalid-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'knowledge-init-invalid';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Initialize project knowledge.',
      targetSpec: 'Only valid source-traceable OKF may pass.',
      acceptanceCriteria: ['Missing deterministic evidence blocks success.'],
      allowedPaths: ['knowledge'],
      forbiddenPaths: ['.git'],
      validationCommands: [],
      context: { knowledgeMode: 'init' },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        __writeFiles: {
          'knowledge/index.md': '---\ntype: index\nokf_version: "0.1"\n---\n# Project knowledge\n\n- [Missing](missing.md)\n',
          'knowledge/log.md': '---\ntype: log\n---\n# Empty update log\n',
          'knowledge/project.md': '# Missing frontmatter and sources\n',
        },
        status: 'completed',
        output: { knowledgeRoot: 'knowledge', concepts: ['knowledge/project.md'], sources: [], logEntry: 'claimed' },
        handoff: { summary: 'The Producer incorrectly claims valid knowledge.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'This Agent verdict must never run.' },
      },
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'knowledge-init-loop' });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      status: 'blocked',
      metrics: { cliCalls: 1 },
    });
    expect(report.handoff.findings.some((finding: string) => finding.includes('OKF'))).toBe(true);
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer']);
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'agents', 'producer-1', 'state.json'))).toMatchObject({
      status: 'blocked',
      deterministicValidation: { kind: 'google-okf-v0.1', status: 'blocked' },
    });
    expect(readJson(path.join(runDir, 'integration.json'))).toMatchObject({
      verdict: 'blocked',
      validationStatus: 'fail',
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('runtime executes validationCommands and a non-zero result cannot be overridden by Agent pass', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-validation-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'validation-command-fails';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(validationScript, "process.stdout.write('validation-out'); process.stderr.write('validation-err'); process.exit(7);\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Validate a deterministic greeting specification.',
      targetSpec: 'The specification remains valid only when the deterministic command passes.',
      acceptanceCriteria: ['A non-zero validation command blocks the Loop.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(validationScript)],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'completed',
        output: { spec: 'A syntactically valid Agent-authored specification.' },
        handoff: { summary: 'Producer claims success.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Verifier claims success.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'spec-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'blocked',
      handoff: { findings: [expect.stringContaining('exit code 7')] },
    });
    expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);

    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'run.json'))).toMatchObject({
      validationRuns: [{
        iteration: 1,
        phase: 'validation',
        commands: [{
          command: process.execPath,
          args: [validationScript],
          cwd: '.',
          exitCode: 7,
          stdout: 'validation-out',
          stderr: 'validation-err',
        }],
      }],
    });
    expect(readJson(path.join(runDir, 'integration.json'))).toMatchObject({
      verdict: 'blocked',
      validationStatus: 'fail',
      deterministicEvidence: {
        validationRuns: [expect.objectContaining({ iteration: 1 })],
      },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('test-loop blocks before Agent dispatch when executable phase and command evidence is missing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-test-evidence-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'test-evidence-missing';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Prove one missing behavior through RED and GREEN.',
      targetSpec: 'The behavior is accepted only with runtime-captured command evidence.',
      acceptanceCriteria: ['RED fails and GREEN passes through real commands.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
      context: {},
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, []);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'test-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report.status).toBe('blocked');
    expect(report.handoff.findings).toEqual(expect.arrayContaining([
      expect.stringContaining('testPaths'),
      expect.stringContaining('implementationPaths'),
      expect.stringContaining('validation command'),
    ]));
    expect(fs.existsSync(callsPath)).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('test-loop writes tests, proves a target-specific RED, implements, proves GREEN, then requests value review', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-test-evidence-pass-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'test-evidence-runtime-captured';
  const testPath = 'tests/target-behavior.mjs';
  const implementationPath = 'src/target-behavior.txt';
  const validationCommand = validationArgv(testPath);
  const testSource = [
    "import fs from 'node:fs';",
    "const target = new URL('../src/target-behavior.txt', import.meta.url);",
    "if (!fs.existsSync(target)) { process.stderr.write('missing-target-behavior'); process.exit(5); }",
    "if (fs.readFileSync(target, 'utf8').trim() !== 'implemented') { process.stderr.write('wrong-target-behavior'); process.exit(6); }",
    "process.stdout.write('behavior-present');",
    '',
  ].join('\n');

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Prove one missing behavior through RED and GREEN.',
      targetSpec: 'The same command fails for the missing target behavior before implementation and passes afterward.',
      acceptanceCriteria: ['Tests are written before implementation.', 'The returned evidence is runtime-captured.'],
      allowedPaths: [testPath, implementationPath],
      forbiddenPaths: ['.git'],
      validationCommands: [validationCommand],
      context: {
        testPaths: [testPath],
        implementationPaths: [implementationPath],
        redFailurePatterns: ['missing-target-behavior'],
      },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        __writeFiles: { [testPath]: testSource },
        status: 'completed',
        output: { testPlan: { P0: ['target behavior'], P1: [], P2: [] } },
        handoff: { summary: 'Tests designed and written without implementation.' },
      },
      {
        __writeFiles: { [implementationPath]: 'implemented\n' },
        status: 'completed',
        output: { implementationSummary: 'Implemented the target behavior after causal RED.' },
        handoff: { summary: 'Implementation completed after RED.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Runtime evidence accepted.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'test-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'completed',
      handoff: {
        output: {
          redEvidence: {
            source: 'runtime-captured',
            validationCommands: [{ command: process.execPath, args: [testPath], cwd: '.', exitCode: 5, stderr: 'missing-target-behavior' }],
          },
          greenEvidence: {
            source: 'runtime-captured',
            validationCommands: [{ command: process.execPath, args: [testPath], cwd: '.', exitCode: 0, stdout: 'behavior-present' }],
          },
          review: { source: 'independent-verifier', verdict: 'pass' },
        },
      },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer', 'producer', 'verifier']);
    expect(calls[0].prompt).toMatchObject({
      allowedPaths: [testPath],
      testPhase: 'design-and-write-tests',
    });
    expect(calls[1].prompt).toMatchObject({
      allowedPaths: [implementationPath],
      testPhase: 'implementation-after-causal-red',
      redEvidence: { source: 'runtime-captured' },
    });
    const run = readJson(path.join(targetDir, '.harness-hub', 'state', 'runs', runId, 'run.json'));
    expect(run.validationRuns.map((entry: { phase: string }) => entry.phase)).toEqual(['red', 'green']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('implementation-review-loop and delivery-loop cannot pass without runtime deterministic evidence', () => {
  for (const loop of ['implementation-review-loop', 'delivery-loop'] as const) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `harness-hub-loop-${loop}-`));
    const targetDir = path.join(root, 'target');
    const binDir = path.join(root, 'bin');
    const inputPath = path.join(root, 'input.json');
    const callsPath = path.join(root, 'calls.jsonl');
    const runId = `${loop}-missing-evidence`;

    try {
      fs.mkdirSync(targetDir);
      fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
      initGitRepository(targetDir);
      fs.writeFileSync(inputPath, `${JSON.stringify({
        schemaVersion: 1,
        task: `Run ${loop} with deterministic evidence.`,
        targetSpec: 'Agent claims cannot replace runtime command evidence.',
        acceptanceCriteria: ['Missing runtime evidence blocks the Loop.'],
        allowedPaths: [],
        forbiddenPaths: ['.git'],
        validationCommands: [],
      }, null, 2)}\n`);
      const output = loop === 'implementation-review-loop'
        ? { verdict: 'pass', findings: [], deterministicEvidence: { source: 'agent-claim' } }
        : {
          validation: { summary: 'Producer claims the delivery is ready.' },
        };
      writeFakeCodex(binDir, callsPath, [
        { status: 'completed', output, openQuestions: [], handoff: { summary: 'Producer claims evidence.' } },
        { status: 'completed', verdict: 'pass', findings: [], handoff: { summary: 'Verifier claims pass.' } },
      ]);

      const result = spawnSync(process.execPath, [
        LOOP_RUNTIME,
        'run',
        targetDir,
        '--loop',
        loop,
        '--run-id',
        runId,
        '--host',
        'codex',
        '--input',
        inputPath,
        '--json',
      ], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
      });

      expect(result.status).toBe(3);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: 'blocked',
        handoff: { findings: [expect.stringContaining('runtime-executed deterministic validationCommands evidence')] },
      });
      expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test('verifier missing structured output is recorded and retried within maxIterations', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-verifier-retry-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'verifier-output-retry';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Specify a deterministic retry behavior.',
      targetSpec: 'A missing Verifier output is observable and retried.',
      acceptanceCriteria: ['The next bounded iteration can complete.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'completed',
        output: { spec: 'First draft.' },
        handoff: { summary: 'First producer completed.' },
      },
      { __skipOutput: true },
      {
        status: 'completed',
        output: { spec: 'Second draft after a missing Verifier output.' },
        handoff: { summary: 'Second producer completed.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Second Verifier accepted the draft.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'spec-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'completed', iteration: 2 });
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'agents', 'verifier-1', 'state.json'))).toMatchObject({
      role: 'verifier',
      status: 'failed',
      failure: { code: 'E_HOST_OUTPUT' },
    });
    const events = fs.readFileSync(path.join(runDir, 'events.jsonl'), 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(events).toContainEqual(expect.objectContaining({
      event: 'iteration_failed',
      iteration: 1,
      role: 'verifier',
    }));
    expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line).prompt.role)).toEqual([
      'producer',
      'verifier',
      'producer',
      'verifier',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('Arbiter process failure ends the single implementation-review pass with a compact handoff', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-loop-arbiter-retry-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'arbiter-process-retry';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(validationScript, "process.stdout.write('review-evidence');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Review a deterministic implementation.',
      targetSpec: 'Conflicting review verdicts use a read-only Arbiter.',
      acceptanceCriteria: ['A failed Arbiter returns evidence to the main Agent without reviewing the unchanged implementation again.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(validationScript)],
    }, null, 2)}\n`);
    const producer = {
      status: 'completed',
      output: { verdict: 'pass', findings: [], deterministicEvidence: { source: 'agent-claim' } },
      handoff: { summary: 'Producer review passes.' },
    };
    const verifier = {
      status: 'completed',
      verdict: 'revise',
      findings: ['Independent review disagrees.'],
      handoff: { summary: 'Verifier requests revision.' },
    };
    writeFakeCodex(binDir, callsPath, [
      producer,
      verifier,
      { __exitCode: 9, __traceBeforeExit: true },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'implementation-review-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).not.toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ status: 'failed', iteration: 1, metrics: { cliCalls: 3 } });
    expect(report.handoff.findings.join(' ')).toMatch(/Arbiter failed/);
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'agents', 'arbiter-1', 'state.json'))).toMatchObject({
      role: 'arbiter',
      status: 'failed',
      failure: { code: 'E_HOST_FAILED' },
      trace: { exitCode: 9 },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual([
      'producer',
      'verifier',
      'arbiter',
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('paused Workflow resumes the same child Loop and then continues remaining Loops', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-workflow-resume-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const answersPath = path.join(root, 'answers.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'review-pause-resume';
  const question = 'Which authorization boundary applies to this review?';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(validationScript, "process.stdout.write('review-validation');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Review the accepted implementation and report the result.',
      targetSpec: 'A paused review resumes without restarting its Workflow.',
      acceptanceCriteria: ['The same child run resumes and report-loop executes afterward.'],
      allowedPaths: ['reports/review.html'],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(validationScript)],
    }, null, 2)}\n`);
    fs.writeFileSync(answersPath, `${JSON.stringify({
      source: 'user',
      answers: [{ question, answer: 'Read-only review; no remote writes are authorized.' }],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'paused',
        output: {},
        openQuestions: [question],
        handoff: { summary: 'A real user decision is required.' },
      },
      {
        status: 'completed',
        output: { verdict: 'pass', findings: [], deterministicEvidence: { source: 'agent-claim' } },
        handoff: { summary: 'Review completed after the user answer.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Independent review passes.' },
      },
      {
        status: 'completed',
        output: {
          complexity: 'complex',
          presentation: { mode: 'html-artifact', text: null },
          interactionInput: effectiveInteractionInput('Review handoff'),
        },
        handoff: { summary: 'Complex review handoff generated.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Review handoff verified.' },
      },
    ]);
    const args = [
      LOOP_RUNTIME,
      'workflow',
      targetDir,
      '--workflow',
      'review-workflow',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ];
    const environment = { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` };

    const paused = spawnSync(process.execPath, args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: environment,
    });
    expect(paused.status, paused.stderr).toBe(0);
    expect(JSON.parse(paused.stdout)).toMatchObject({
      workflow: 'review-workflow',
      status: 'paused',
      steps: [{
        loop: 'implementation-review-loop',
        runId: `${runId}-01-implementation-review-loop`,
        status: 'paused',
      }],
      handoff: { openQuestions: [question] },
    });

    const resumed = spawnSync(process.execPath, [...args.slice(0, -1), '--answers', answersPath, '--json'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: environment,
    });
    expect(resumed.status, resumed.stderr).toBe(0);
    const resumedReport = JSON.parse(resumed.stdout);
    expect(resumedReport).toMatchObject({
      workflow: 'review-workflow',
      status: 'completed',
      metrics: {
        cliCalls: 5,
        interruptCount: 1,
        inputTokens: 50,
        outputTokens: 25,
        totalTokens: 75,
        costUsd: 0.05,
        firstAttemptSuccess: false,
      },
      steps: [
        { loop: 'implementation-review-loop', runId: `${runId}-01-implementation-review-loop`, status: 'completed' },
        { loop: 'report-loop', runId: `${runId}-02-report-loop`, status: 'completed' },
      ],
    });

    const runsDir = path.join(targetDir, '.harness-hub', 'state', 'runs');
    const childDuration = resumedReport.steps.reduce((total: number, step: { runId: string }) => (
      total + readJson(path.join(runsDir, step.runId, 'run.json')).metrics.durationMs
    ), 0);
    expect(resumedReport.metrics.durationMs).toBe(childDuration);
    expect(readJson(path.join(runsDir, runId, 'run.json'))).toMatchObject({
      status: 'completed',
      resumeCount: 1,
      steps: [{ loop: 'implementation-review-loop' }, { loop: 'report-loop' }],
    });
    expect(readJson(path.join(runsDir, `${runId}-01-implementation-review-loop`, 'run.json'))).toMatchObject({
      status: 'completed',
      resumeCount: 1,
      interactions: [{ source: 'user', answers: [{ question }] }],
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls.map((call) => call.prompt.role)).toEqual(['producer', 'producer', 'verifier', 'producer', 'verifier']);
    expect(calls[1].prompt.userAnswers).toEqual([{ question, answer: 'Read-only review; no remote writes are authorized.' }]);
    expect(calls[3].prompt.lifecycleContext.upstreamHandoffs).toHaveLength(1);
    expect(calls[3].prompt.lifecycleContext.upstreamHandoffs[0]).toMatchObject({
      loop: 'implementation-review-loop',
      status: 'completed',
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('delivery CLI authorization is fail-closed and never delegates remote writes or merge', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-delivery-authorization-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(validationScript, "process.stdout.write('delivery-validation');\n");
    const producer = {
      status: 'completed',
      output: {
        validation: { summary: 'Runtime must determine all delivery truth.' },
      },
      openQuestions: [],
      handoff: { summary: 'Delivery slice completed without remote actions.' },
    };
    const verifier = {
      status: 'completed',
      verdict: 'pass',
      findings: [],
      handoff: { summary: 'Delivery evidence verified.' },
    };
    writeFakeCodex(binDir, callsPath, [producer, verifier, producer, verifier, producer, verifier]);

    const contexts = [
      {},
      { authorization: { remoteWrites: true } },
      { authorization: { merge: true } },
    ];
    for (let index = 0; index < contexts.length; index += 1) {
      const inputPath = path.join(root, `input-${index}.json`);
      fs.writeFileSync(inputPath, `${JSON.stringify({
        schemaVersion: 1,
        task: 'Close an accepted delivery without performing remote actions in this test.',
        targetSpec: 'CLI executors may receive local commit authorization but remote writes and merge remain main-Agent actions.',
        acceptanceCriteria: ['Remote writes and merge stay false in every delegated CLI prompt.'],
        allowedPaths: [],
        forbiddenPaths: ['.git'],
        validationCommands: [validationArgv(validationScript)],
        context: contexts[index],
      }, null, 2)}\n`);
      const result = spawnSync(process.execPath, [
        LOOP_RUNTIME,
        'run',
        targetDir,
        '--loop',
        'delivery-loop',
        '--run-id',
        `delivery-auth-${index}`,
        '--host',
        'codex',
        '--input',
        inputPath,
        '--json',
      ], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
      });
      expect(result.status, result.stderr).toBe(0);
    }

    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls[0].prompt.authorization).toEqual({
      readOnly: true,
      commit: false,
      remoteWrites: false,
      merge: false,
      userAcceptanceMayBeInferred: false,
    });
    expect(calls[2].prompt.authorization).toEqual({
      readOnly: true,
      commit: false,
      remoteWrites: false,
      merge: false,
      userAcceptanceMayBeInferred: false,
    });
    expect(calls[4].prompt.authorization).toEqual({
      readOnly: true,
      commit: false,
      remoteWrites: false,
      merge: false,
      userAcceptanceMayBeInferred: false,
    });
    for (const call of [calls[1], calls[3], calls[5]]) {
      expect(call.prompt.authorization).toEqual({
        readOnly: true,
        commit: false,
        remoteWrites: false,
        merge: false,
        userAcceptanceMayBeInferred: false,
      });
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 30_000);

test('a deterministic verifier reports its writes without hiding the accepted Producer slice', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-deterministic-verifier-boundary-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runnerPath = path.join(root, 'runner.mjs');
  const runId = 'deterministic-verifier-boundary';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Run one deterministic migration slice.',
      targetSpec: 'A deterministic Verifier is strictly read-only.',
      acceptanceCriteria: ['Verifier writes are detected and cannot pass.'],
      allowedPaths: ['managed.txt'],
      forbiddenPaths: ['.git', 'verifier-write.txt'],
      validationCommands: [],
      context: {
        migrationCopy: { command: 'synthetic-copy', tool: 'PowerShell' },
      },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      __writeFiles: { 'managed.txt': 'producer slice\n' },
      __traceEvents: [
        {
          type: 'item.completed',
          item: {
            type: 'command_execution',
            command: process.platform === 'win32'
              ? 'powershell.exe -Command synthetic-copy'
              : '/bin/sh -lc synthetic-copy',
            status: 'completed',
            exit_code: 0,
          },
        },
        { type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 5 } },
      ],
      status: 'completed',
      output: { host: 'codex', role: 'primary', migrationSummary: 'Synthetic managed slice.' },
      handoff: { summary: 'Producer slice completed.' },
    }]);
    fs.writeFileSync(runnerPath, [
      "import fs from 'node:fs';",
      "import path from 'node:path';",
      `import { runExecutableLoop } from ${JSON.stringify(pathToFileURL(LOOP_RUNTIME).href)};`,
      `const targetDir = ${JSON.stringify(targetDir)};`,
      `const input = JSON.parse(fs.readFileSync(${JSON.stringify(inputPath)}, 'utf8'));`,
      'const result = runExecutableLoop({',
      '  targetDir,',
      "  loop: 'repository-migration-loop',",
      `  runId: ${JSON.stringify(runId)},`,
      "  host: 'codex',",
      '  input,',
      '  deterministicVerifier() {',
      "    fs.writeFileSync(path.join(targetDir, 'verifier-write.txt'), 'forbidden verifier write\\n');",
      "    return { status: 'completed', verdict: 'pass', findings: [], handoff: { summary: 'Verifier claimed pass.' } };",
      '  },',
      '});',
      'process.stdout.write(JSON.stringify(result));',
    ].join('\n'));

    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect({ status: result.status, stderr: result.stderr }).toMatchObject({ status: 0, stderr: '' });
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'blocked' });
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'agents', 'verifier-1', 'state.json'))).toMatchObject({
      status: 'blocked',
      boundary: { changedPaths: ['verifier-write.txt'] },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('a mutating validation command remains visible and prevents later commands from washing the evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-validation-boundary-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const firstPath = path.join(root, 'first.mjs');
  const secondPath = path.join(root, 'second.mjs');
  const runId = 'validation-command-boundary';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.writeFileSync(firstPath, "import fs from 'node:fs'; fs.writeFileSync('wash.txt', 'temporary\\n');\n");
    fs.writeFileSync(secondPath, "import fs from 'node:fs'; fs.rmSync('wash.txt', { force: true }); fs.writeFileSync('second-ran.txt', 'bad\\n');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Review without accepting mutating validation.',
      targetSpec: 'Each validation command is independently read-only.',
      acceptanceCriteria: ['The first mutation is recorded as a deterministic boundary failure and the second command never runs.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(firstPath), validationArgv(secondPath)],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      status: 'completed',
      output: { verdict: 'pass', findings: [], deterministicEvidence: {} },
      handoff: { summary: 'Producer review completed.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'implementation-review-loop' });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'blocked' });
    expect(fs.existsSync(path.join(targetDir, 'second-ran.txt'))).toBe(false);
    const run = readJson(path.join(targetDir, '.harness-hub', 'state', 'runs', runId, 'run.json'));
    expect(run.validationRuns[0].commands).toHaveLength(1);
    expect(run.validationRuns[0].commands[0].boundary.changedPaths).toEqual(['wash.txt']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('validation rejects Git global options and aliases before they can mutate a remote', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-validation-git-alias-'));
  const targetDir = path.join(root, 'target');
  const remoteDir = path.join(root, 'remote.git');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    execFileSync('git', ['init', '--bare', remoteDir], { stdio: 'ignore' });
    execFileSync('git', ['remote', 'add', 'origin', remoteDir], { cwd: targetDir });
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Reject validation aliases that disguise remote writes.',
      targetSpec: 'Validation command authorization is fail-closed before execution.',
      acceptanceCriteria: ['No remote ref is created and no Host Agent starts.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [{ command: 'git', args: ['-c', 'alias.leak=push', 'leak', 'origin', 'HEAD:refs/heads/leaked'] }],
    }, null, 2)}\n`);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId: 'validation-git-alias', loop: 'implementation-review-loop' });

    expect(result.status).toBe(2);
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'E_AUTHORIZATION' });
    expect(fs.existsSync(callsPath)).toBe(false);
    expect(spawnSync('git', ['show-ref', '--verify', 'refs/heads/leaked'], { cwd: remoteDir }).status).not.toBe(0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('validation command cwd cannot traverse an existing linked directory', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-validation-linked-cwd-'));
  const targetDir = path.join(root, 'target');
  const externalDir = path.join(root, 'external');
  const linkedDir = path.join(targetDir, 'linked');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');

  try {
    fs.mkdirSync(targetDir);
    fs.mkdirSync(externalDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    fs.symlinkSync(externalDir, linkedDir, process.platform === 'win32' ? 'junction' : 'dir');
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Reject linked validation cwd.',
      targetSpec: 'Validation never escapes through links.',
      acceptanceCriteria: ['The Host is not invoked.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [{ command: process.execPath, args: [], cwd: 'linked' }],
    }, null, 2)}\n`);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId: 'validation-linked-cwd', loop: 'implementation-review-loop' });

    expect(result.status).toBe(2);
    expect(JSON.parse(result.stderr)).toMatchObject({ code: 'E_INPUT_PATH' });
    expect(result.stderr).toMatch(/symbolic link|junction|reparse/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a failed write Producer releases its lease and records the failed Host evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-lease-host-failure-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'lease-host-failure';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, '.gitignore'), 'ignored.txt\n');
    initGitRepository(targetDir);
    fs.writeFileSync(path.join(targetDir, 'ignored.txt'), 'original ignored content\n');
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Fail after changing an ignored managed path.',
      targetSpec: 'Host failure is explicit and never leaves an active lease.',
      acceptanceCriteria: ['The lease is released and the failed Host trace remains observable.'],
      allowedPaths: ['ignored.txt'],
      forbiddenPaths: ['.git'],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      __writeFiles: { 'ignored.txt': 'unrecoverable ignored mutation\n' },
      __exitCode: 9,
      __traceBeforeExit: true,
      status: 'completed',
      output: {},
      handoff: { summary: 'This process fails.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'repository-migration-loop' });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'failed',
      handoff: { findings: [expect.stringMatching(/Producer failed/i)] },
    });
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'leases', 'producer-1-paths.json'))).toMatchObject({ status: 'released' });
    expect(readJson(path.join(runDir, 'agents', 'producer-1', 'state.json'))).toMatchObject({
      status: 'failed',
      failure: { code: 'E_HOST_FAILED' },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('implementation-review Producer is read-only and cannot edit allowed implementation paths', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-review-read-only-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'review-producer-read-only';

  try {
    fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, 'src', 'implementation.ts'), 'export const value = 1;\n');
    initGitRepository(targetDir);
    const indexPath = resolveTestGitPath(targetDir, 'index');
    const stagedBefore = execFileSync('git', ['ls-files', '--stage', '-z'], { cwd: targetDir });
    const indexBefore = fs.readFileSync(indexPath);
    const commitMessagePath = resolveTestGitPath(targetDir, 'COMMIT_EDITMSG');
    const commitMessageBefore = fs.readFileSync(commitMessagePath);
    fs.writeFileSync(validationScript, "process.stdout.write('review-validation');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Review the implementation without editing it.',
      targetSpec: 'Review Producers are read-only even when an implementation path is in allowedPaths.',
      acceptanceCriteria: ['Any attempted implementation edit is blocked before Verifier execution.'],
      allowedPaths: ['src/implementation.ts'],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(validationScript)],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        __writeFiles: { 'src/implementation.ts': 'export const value = 2;\n' },
        status: 'completed',
        output: { verdict: 'pass', findings: [], deterministicEvidence: { source: 'agent-claim' } },
        handoff: { summary: 'Producer attempted to edit the implementation.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'This Verifier must not execute.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'implementation-review-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    expect(fs.readFileSync(indexPath).equals(indexBefore)).toBe(true);
    expect(execFileSync('git', ['ls-files', '--stage', '-z'], { cwd: targetDir }).equals(stagedBefore)).toBe(true);
    expect(fs.readFileSync(commitMessagePath).equals(commitMessageBefore)).toBe(true);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'blocked',
      handoff: { findings: [expect.stringMatching(/read-only/i)] },
    });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls).toHaveLength(1);
    expect(calls[0].prompt.authorization.readOnly).toBe(true);
    expect(calls[0].args).toContain('read-only');
    expect(readJson(path.join(targetDir, '.harness-hub', 'state', 'runs', runId, 'agents', 'producer-1', 'state.json'))).toMatchObject({
      readOnly: true,
      ownedPaths: [],
      status: 'blocked',
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an unauthorized CLI commit is detected even when it leaves the worktree clean', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-git-control-plane-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const runId = 'unauthorized-commit';

  try {
    fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, 'src', 'value.ts'), 'export const value = 1;\n');
    initGitRepository(targetDir);
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Write a specification without committing repository state.',
      targetSpec: 'Git control-plane mutations require explicit delivery authorization.',
      acceptanceCriteria: ['An unauthorized commit is blocked before Verifier execution.'],
      allowedPaths: ['src/value.ts'],
      forbiddenPaths: [],
      validationCommands: [],
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        __writeFiles: { 'src/value.ts': 'export const value = 2;\n' },
        __gitCommands: [['add', 'src/value.ts'], ['commit', '-m', 'unauthorized agent commit']],
        status: 'completed',
        output: { spec: 'Producer committed a superficially valid change.' },
        handoff: { summary: 'Producer claims completion after committing.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'This Verifier must not execute.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'spec-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'blocked',
      handoff: { findings: expect.arrayContaining([expect.stringContaining('Git control plane')]) },
    });
    expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);
    expect(readJson(path.join(targetDir, '.harness-hub', 'state', 'runs', runId, 'agents', 'producer-1', 'state.json'))).toMatchObject({
      status: 'blocked',
      gitControlPlane: {
        changes: expect.arrayContaining(['head', 'path:worktree:index']),
      },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('delivery blocks conflicting pull requests and unsuccessful or pending CI from runtime probes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-delivery-remote-probes-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const ghCallsPath = path.join(root, 'gh-calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'delivery-remote-probes';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDir, encoding: 'utf8' }).trim();
    fs.writeFileSync(validationScript, "process.stdout.write('delivery-validation');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Close delivery only from current remote facts.',
      targetSpec: 'Conflicts and incomplete CI are deterministic failures.',
      acceptanceCriteria: ['PR head, mergeability, and every CI result are runtime-probed.'],
      allowedPaths: [],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(validationScript)],
      context: { remoteDelivery: { pullRequest: true, ci: true } },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      status: 'completed',
      output: { validation: { summary: 'Ready for runtime PR and CI probes.' } },
      openQuestions: [],
      handoff: { summary: 'Producer claimed delivery closure.' },
    }, {
      status: 'completed', verdict: 'pass', findings: [], handoff: { summary: 'This Verifier must not run.' },
    }]);
    writeFakeGh(binDir, ghCallsPath, {
      number: 17,
      url: 'https://example.invalid/pr/17',
      state: 'CLOSED',
      mergeable: 'CONFLICTING',
      headRefName: 'feature',
      headRefOid: head,
      baseRefName: 'main',
    }, [
      { name: 'unit', state: 'FAILURE', bucket: 'fail', link: '', workflow: 'ci' },
      { name: 'integration', state: 'PENDING', bucket: 'pending', link: '', workflow: 'ci' },
    ]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'delivery-loop' });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ status: 'blocked', metrics: { cliCalls: 1 } });
    expect(report.handoff.findings.join(' ')).toMatch(/CLOSED|state/i);
    expect(report.handoff.findings.join(' ')).toMatch(/CONFLICTING|mergeable/i);
    expect(report.handoff.findings.join(' ')).toMatch(/FAILURE|PENDING|CI/i);
    const ghCalls = fs.readFileSync(ghCallsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(ghCalls).toHaveLength(2);
    expect(ghCalls[0].join(' ')).toContain('headRefOid');
    const producer = readJson(path.join(targetDir, '.harness-hub', 'state', 'runs', runId, 'agents', 'producer-1', 'state.json'));
    expect(producer.deliveryRuntimeTruth.pullRequest.value).toMatchObject({ headRefOid: head, mergeable: 'CONFLICTING' });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 20_000);

test('delivery runtime performs explicitly authorized cleanup and commit after read-only delegated review', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-authorized-commit-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'authorized-delivery-commit';

  try {
    fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, 'src', 'value.ts'), 'export const value = 1;\n');
    fs.writeFileSync(path.join(targetDir, '.gitignore'), 'tmp/\n');
    initGitRepository(targetDir);
    const reviewedHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDir, encoding: 'utf8' }).trim();
    fs.writeFileSync(path.join(targetDir, 'src', 'value.ts'), 'export const value = 2;\n');
    fs.mkdirSync(path.join(targetDir, 'tmp'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'tmp', 'cache.txt'), 'stale cache\n');
    fs.writeFileSync(validationScript, [
      "import fs from 'node:fs';",
      "if (fs.existsSync('tmp/cache.txt')) { process.stderr.write('cleanup-did-not-run-first'); process.exit(9); }",
      "process.stdout.write('delivery-validation-after-cleanup');",
      '',
    ].join('\n'));
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Commit an accepted local delivery slice.',
      targetSpec: 'Only the explicitly authorized local commit may change Git control state.',
      acceptanceCriteria: ['The commit preserves the reviewed bytes and deterministic validation passes.', 'Ignored delivery residue is cleaned.'],
      allowedPaths: ['src/value.ts', 'tmp'],
      forbiddenPaths: [],
      validationCommands: [validationArgv(validationScript)],
      context: {
        authorization: {
          commit: true,
          commitMessage: 'authorized delivery commit',
          cleanupPaths: ['tmp'],
        },
      },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [
      {
        status: 'completed',
        output: {
          validation: { summary: 'Ready for runtime-owned cleanup, validation, and local commit.' },
        },
        openQuestions: [],
        handoff: { summary: 'Delivery is ready for runtime-owned local actions.' },
      },
      {
        status: 'completed',
        verdict: 'pass',
        findings: [],
        handoff: { summary: 'Authorized delivery verified.' },
      },
    ]);

    const result = spawnSync(process.execPath, [
      LOOP_RUNTIME,
      'run',
      targetDir,
      '--loop',
      'delivery-loop',
      '--run-id',
      runId,
      '--host',
      'codex',
      '--input',
      inputPath,
      '--json',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
    });

    expect(result.status, `${result.stderr}\n${result.stdout}`).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'completed' });
    const calls = fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    expect(calls[0].prompt.authorization).toMatchObject({
      readOnly: true,
      commit: false,
      remoteWrites: false,
      merge: false,
    });
    expect(readJson(path.join(targetDir, '.harness-hub', 'state', 'runs', runId, 'agents', 'producer-1', 'state.json'))).toMatchObject({
      status: 'completed',
      readOnly: true,
      authorization: { commit: false },
      deliveryRuntimeTruth: {
        localActions: {
          cleanupPaths: ['tmp'],
          commit: { status: 'committed' },
        },
        authorization: { commit: true, remoteWrites: false, merge: false },
      },
    });
    const committedHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDir, encoding: 'utf8' }).trim();
    expect(committedHead).not.toBe(reviewedHead);
    expect(execFileSync('git', ['rev-parse', `${committedHead}^`], { cwd: targetDir, encoding: 'utf8' }).trim()).toBe(reviewedHead);
    expect(execFileSync('git', ['log', '-1', '--format=%s'], { cwd: targetDir, encoding: 'utf8' }).trim()).toBe('authorized delivery commit');
    expect(fs.readFileSync(path.join(targetDir, 'src', 'value.ts'), 'utf8')).toBe('export const value = 2;\n');
    expect(fs.existsSync(path.join(targetDir, 'tmp'))).toBe(false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('delivery reports completed cleanup when post-cleanup validation fails', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-delivery-cleanup-evidence-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'delivery-cleanup-evidence';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, '.gitignore'), 'tmp/\n');
    initGitRepository(targetDir);
    fs.mkdirSync(path.join(targetDir, 'tmp'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'tmp', 'cache.txt'), 'stale cache\n');
    fs.writeFileSync(validationScript, [
      "import fs from 'node:fs';",
      "if (fs.existsSync('tmp/cache.txt')) { process.stderr.write('cleanup-did-not-run-first'); process.exit(9); }",
      "process.stderr.write('post-cleanup-validation-failure');",
      'process.exit(7);',
      '',
    ].join('\n'));
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Keep cleanup side effects visible when validation fails.',
      targetSpec: 'Delivery handoff and integration evidence report every completed runtime action.',
      acceptanceCriteria: ['Cleanup runs before validation.', 'A later failure reports the completed cleanup.'],
      allowedPaths: ['tmp'],
      forbiddenPaths: ['.git'],
      validationCommands: [validationArgv(validationScript)],
      context: { authorization: { cleanupPaths: ['tmp'] } },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      status: 'completed',
      output: { validation: { summary: 'Ready for cleanup and validation.' } },
      openQuestions: [],
      handoff: { summary: 'Delivery is ready for runtime cleanup.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'delivery-loop' });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report.handoff.findings.join(' ')).toMatch(/side effects already occurred.+cleanup completed.+tmp/i);
    expect(fs.existsSync(path.join(targetDir, 'tmp'))).toBe(false);
    const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
    expect(readJson(path.join(runDir, 'run.json')).deliveryLocalActions).toMatchObject({ cleanupPaths: ['tmp'] });
    expect(readJson(path.join(runDir, 'integration.json')).deterministicEvidence.deliveryLocalActions).toMatchObject({ cleanupPaths: ['tmp'] });
    expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('delivery validates Agent-owned output before any runtime-owned side effect', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-delivery-output-gate-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'delivery-output-gate';

  try {
    fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, 'src', 'value.ts'), 'export const value = 1;\n');
    fs.writeFileSync(path.join(targetDir, '.gitignore'), 'tmp/\n');
    initGitRepository(targetDir);
    const reviewedHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDir, encoding: 'utf8' }).trim();
    fs.writeFileSync(path.join(targetDir, 'src', 'value.ts'), 'export const value = 2;\n');
    fs.mkdirSync(path.join(targetDir, 'tmp'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'tmp', 'cache.txt'), 'must survive malformed output\n');
    fs.writeFileSync(validationScript, "process.stdout.write('must-not-authorize-side-effects');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Reject malformed delivery output before local actions.',
      targetSpec: 'Only a complete Agent-owned delivery envelope may authorize runtime actions.',
      acceptanceCriteria: ['Malformed output leaves HEAD and ignored residue unchanged.'],
      allowedPaths: ['src/value.ts', 'tmp'],
      forbiddenPaths: [],
      validationCommands: [validationArgv(validationScript)],
      context: { authorization: { commit: true, commitMessage: 'must not commit', cleanupPaths: ['tmp'] } },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      status: 'completed',
      output: { validation: {} },
      openQuestions: [],
      handoff: { summary: 'Malformed Producer claims readiness.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'delivery-loop' });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout).handoff.findings.join(' ')).toMatch(/summary/i);
    expect(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDir, encoding: 'utf8' }).trim()).toBe(reviewedHead);
    expect(fs.readFileSync(path.join(targetDir, 'tmp', 'cache.txt'), 'utf8')).toBe('must survive malformed output\n');
    expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('delivery runtime refuses cleanup paths that overlap forbiddenPaths', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-delivery-forbidden-cleanup-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'delivery-forbidden-cleanup';

  try {
    fs.mkdirSync(targetDir);
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, '.gitignore'), 'knowledge/\n');
    initGitRepository(targetDir);
    fs.mkdirSync(path.join(targetDir, 'knowledge'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'project.md'), 'target-owned knowledge\n');
    fs.writeFileSync(validationScript, "process.stdout.write('delivery-validation');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Protect forbidden ignored knowledge during cleanup.',
      targetSpec: 'Runtime cleanup respects forbiddenPaths even under a broad allowed path.',
      acceptanceCriteria: ['Target-owned ignored knowledge is not deleted.'],
      allowedPaths: ['.'],
      forbiddenPaths: ['knowledge'],
      validationCommands: [validationArgv(validationScript)],
      context: { authorization: { cleanupPaths: ['knowledge'] } },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      status: 'completed',
      output: { validation: { summary: 'Ready for bounded cleanup.' } },
      openQuestions: [],
      handoff: { summary: 'Delivery is ready for runtime cleanup.' },
    }, {
      status: 'completed', verdict: 'pass', findings: [], handoff: { summary: 'Must not run.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'delivery-loop' });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout).handoff.findings.join(' ')).toMatch(/forbidden/i);
    expect(fs.readFileSync(path.join(targetDir, 'knowledge', 'project.md'), 'utf8')).toBe('target-owned knowledge\n');
    expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('delivery runtime restores the index and refuses to commit forbiddenPaths', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-delivery-forbidden-commit-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'delivery-forbidden-commit';

  try {
    fs.mkdirSync(path.join(targetDir, 'knowledge'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'project.md'), 'baseline knowledge\n');
    initGitRepository(targetDir);
    const reviewedHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDir, encoding: 'utf8' }).trim();
    fs.writeFileSync(path.join(targetDir, 'knowledge', 'project.md'), 'target-owned update\n');
    fs.writeFileSync(validationScript, "process.stdout.write('delivery-validation');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Protect forbidden project knowledge from runtime commit.',
      targetSpec: 'Broad allowed paths never override forbiddenPaths.',
      acceptanceCriteria: ['Forbidden bytes remain uncommitted and the original index is restored.'],
      allowedPaths: ['.'],
      forbiddenPaths: ['knowledge'],
      validationCommands: [validationArgv(validationScript)],
      context: { authorization: { commit: true, commitMessage: 'must not commit forbidden knowledge' } },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      status: 'completed',
      output: { validation: { summary: 'Ready for a bounded runtime commit.' } },
      openQuestions: [],
      handoff: { summary: 'Delivery is ready for the runtime commit gate.' },
    }, {
      status: 'completed', verdict: 'pass', findings: [], handoff: { summary: 'Must not run.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'delivery-loop' });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout).handoff.findings.join(' ')).toMatch(/forbidden/i);
    expect(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDir, encoding: 'utf8' }).trim()).toBe(reviewedHead);
    expect(spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: targetDir }).status).toBe(0);
    expect(fs.readFileSync(path.join(targetDir, 'knowledge', 'project.md'), 'utf8')).toBe('target-owned update\n');
    expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('delivery runtime checks staged blobs against reviewed bytes before creating a commit', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-delivery-index-freeze-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const filterScript = path.join(root, 'clean-filter.mjs');
  const runId = 'delivery-index-freeze';

  try {
    fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    initGitRepository(targetDir);
    const indexLock = path.join(targetDir, '.git', 'index.lock');
    fs.writeFileSync(filterScript, [
      "import fs from 'node:fs';",
      'const chunks = [];',
      'for await (const chunk of process.stdin) chunks.push(chunk);',
      "const input = Buffer.concat(chunks).toString('utf8');",
      `process.stdout.write(fs.existsSync(${JSON.stringify(indexLock)}) ? \`injected:\${input}\` : input);`,
      '',
    ].join('\n'));
    const filterCommand = `"${process.execPath.replaceAll('\\', '/')}" "${filterScript.replaceAll('\\', '/')}"`;
    execFileSync('git', ['config', 'filter.index-lock.clean', filterCommand], { cwd: targetDir });
    fs.writeFileSync(path.join(targetDir, '.gitattributes'), 'src/value.txt filter=index-lock\n');
    fs.writeFileSync(path.join(targetDir, 'src', 'value.txt'), 'baseline\n');
    execFileSync('git', ['add', '.gitattributes', 'src/value.txt'], { cwd: targetDir });
    execFileSync('git', ['commit', '-m', 'add filtered baseline'], { cwd: targetDir });
    const reviewedHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDir, encoding: 'utf8' }).trim();
    fs.writeFileSync(path.join(targetDir, 'src', 'value.txt'), 'reviewed update\n');
    fs.writeFileSync(validationScript, "process.stdout.write('delivery-validation');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Commit only the bytes captured by the delivery review.',
      targetSpec: 'Index filters cannot replace reviewed bytes before commit.',
      acceptanceCriteria: ['A staged blob mismatch blocks before HEAD moves.'],
      allowedPaths: ['src/value.txt'],
      forbiddenPaths: [],
      validationCommands: [validationArgv(validationScript)],
      context: { authorization: { commit: true, commitMessage: 'must not commit transformed bytes' } },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      status: 'completed',
      output: { validation: { summary: 'Ready for the reviewed-byte commit gate.' } },
      openQuestions: [],
      handoff: { summary: 'Delivery is ready for runtime staging.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'delivery-loop' });

    expect(result.status).toBe(3);
    expect(JSON.parse(result.stdout).handoff.findings.join(' ')).toMatch(/staged.+reviewed bytes/i);
    expect(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDir, encoding: 'utf8' }).trim()).toBe(reviewedHead);
    expect(spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: targetDir }).status).toBe(0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

test('read-only delegated delivery blocks a Host commit before runtime-owned actions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-hub-delivery-content-freeze-'));
  const targetDir = path.join(root, 'target');
  const binDir = path.join(root, 'bin');
  const inputPath = path.join(root, 'input.json');
  const callsPath = path.join(root, 'calls.jsonl');
  const validationScript = path.join(root, 'validation.mjs');
  const runId = 'delivery-content-freeze';

  try {
    fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'README.md'), '# Synthetic target\n');
    fs.writeFileSync(path.join(targetDir, 'src', 'value.ts'), 'export const value = 1;\n');
    initGitRepository(targetDir);
    fs.writeFileSync(path.join(targetDir, 'src', 'value.ts'), 'export const value = 2;\n');
    fs.writeFileSync(validationScript, "process.stdout.write('delivery-validation');\n");
    fs.writeFileSync(inputPath, `${JSON.stringify({
      schemaVersion: 1,
      task: 'Close delivery for an already reviewed implementation.',
      targetSpec: 'Delivery may commit reviewed bytes but cannot edit implementation content.',
      acceptanceCriteria: ['No intermediate commit may contain different bytes even if a later commit restores the reviewed tree.'],
      allowedPaths: ['src/value.ts'],
      forbiddenPaths: [],
      validationCommands: [validationArgv(validationScript)],
      context: { authorization: { commit: true, commitMessage: 'runtime-owned delivery commit' } },
    }, null, 2)}\n`);
    writeFakeCodex(binDir, callsPath, [{
      __writeFiles: { 'src/value.ts': 'export const value = 3;\n' },
      __gitCommands: [
        ['add', 'src/value.ts'],
        ['commit', '-m', 'unauthorized delegated commit'],
      ],
      status: 'completed',
      output: { validation: { summary: 'Delivery claims completion after a Host commit.' } },
      openQuestions: [],
      handoff: { summary: 'Delegated Producer claims it committed the delivery.' },
    }, {
      status: 'completed',
      verdict: 'pass',
      findings: [],
      openQuestions: [],
      handoff: { summary: 'This Verifier must not execute.' },
    }]);

    const result = runLoopCli({ targetDir, inputPath, binDir, runId, loop: 'delivery-loop' });

    expect(result.status).toBe(3);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ status: 'blocked', metrics: { cliCalls: 1 } });
    expect(report.handoff.findings.join(' ')).toContain('Read-only Agent changed Git control plane');
    expect(fs.readFileSync(callsPath, 'utf8').trim().split(/\r?\n/)).toHaveLength(1);
    const call = JSON.parse(fs.readFileSync(callsPath, 'utf8').trim());
    expect(call.prompt.authorization).toMatchObject({ readOnly: true, commit: false });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 15_000);

function readJson(filePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectStrictObjectSchemaViolations(value: unknown, pointer: string): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const schema = value as Record<string, any>;
  const violations: string[] = [];
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types.includes('object')) {
    if (schema.additionalProperties !== false) violations.push(`${pointer} permits additional object properties`);
    const propertyNames = Object.keys(schema.properties ?? {}).sort();
    const requiredNames = Array.isArray(schema.required) ? [...schema.required].sort() : [];
    if (JSON.stringify(requiredNames) !== JSON.stringify(propertyNames)) {
      violations.push(`${pointer} required properties do not match declared properties`);
    }
  }
  for (const [key, child] of Object.entries(schema)) {
    if (child && typeof child === 'object') {
      violations.push(...collectStrictObjectSchemaViolations(child, `${pointer}/${key}`));
    }
  }
  return violations;
}

function resolveTestGitPath(targetDir: string, gitPath: string): string {
  const value = execFileSync('git', ['rev-parse', '--git-path', gitPath], { cwd: targetDir, encoding: 'utf8' }).trim();
  return path.isAbsolute(value) ? value : path.resolve(targetDir, value);
}

function effectiveInteractionInput(title: string): Record<string, unknown> {
  return {
    title,
    summary: '结论：运行时已生成并验证复杂交付报告。',
    status: 'complete',
    renderMode: 'pre-rendered',
    sections: [{
      type: 'markdown',
      title: '验证证据',
      content: '- effective-interact runtime 通过。\n- 静态验证器通过。',
    }],
  };
}

function validationArgv(scriptPath: string, args: string[] = []): Record<string, unknown> {
  return { command: process.execPath, args: [scriptPath, ...args], cwd: '.' };
}

function runLoopCli(options: { targetDir: string; inputPath: string; answersPath?: string; binDir: string; runId: string; host?: 'codex' | 'claude'; loop?: string }) {
  return spawnSync(process.execPath, [
    LOOP_RUNTIME,
    'run',
    options.targetDir,
    '--loop',
    options.loop ?? 'spec-loop',
    '--run-id',
    options.runId,
    '--host',
    options.host ?? 'codex',
    '--input',
    options.inputPath,
    ...(options.answersPath ? ['--answers', options.answersPath] : []),
    '--json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${options.binDir}${path.delimiter}${process.env.PATH ?? ''}`,
    },
  });
}

function initGitRepository(targetDir: string): void {
  execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'tests@example.com'], { cwd: targetDir });
  execFileSync('git', ['config', 'user.name', 'Harness Hub Tests'], { cwd: targetDir });
  execFileSync('git', ['add', '.'], { cwd: targetDir });
  execFileSync('git', ['commit', '-m', 'baseline'], { cwd: targetDir, stdio: 'ignore' });
}

function writeFakeClaude(
  binDir: string,
  callsPath: string,
  responses: Array<Record<string, unknown>>,
): void {
  fs.mkdirSync(binDir, { recursive: true });
  const workerPath = path.join(binDir, 'claude-fake.mjs');
  const traceOutputPath = path.join(binDir, 'claude-fake.stdout');
  fs.writeFileSync(workerPath, [
    "import fs from 'node:fs';",
    "let input = '';",
    'for await (const chunk of process.stdin) input += chunk;',
    'const args = process.argv.slice(2);',
    'const prompt = JSON.parse(input);',
    `const responses = ${JSON.stringify(responses)};`,
    `const priorCalls = fs.existsSync(${JSON.stringify(callsPath)}) ? fs.readFileSync(${JSON.stringify(callsPath)}, 'utf8').trim().split(/\\r?\\n/).filter(Boolean).length : 0;`,
    `fs.appendFileSync(${JSON.stringify(callsPath)}, JSON.stringify({ args, prompt }) + '\\n');`,
    'const response = responses[priorCalls];',
    "if (!response) throw new Error(`missing fake response for call ${priorCalls + 1}`);",
    `fs.writeFileSync(${JSON.stringify(traceOutputPath)}, [`,
    "  JSON.stringify({ type: 'system', subtype: 'init', session_id: `fake-${priorCalls + 1}` }),",
    "  JSON.stringify({ type: 'result', subtype: 'success', is_error: false, structured_output: response, usage: { input_tokens: 12, output_tokens: 6 }, total_cost_usd: 0.01 }),",
    "].join('\\n') + '\\n');",
  ].join('\n'));

  if (process.platform === 'win32') {
    fs.writeFileSync(
      path.join(binDir, 'claude.ps1'),
      `Remove-Item -LiteralPath '${traceOutputPath.replaceAll("'", "''")}' -ErrorAction SilentlyContinue\r\n& '${process.execPath.replaceAll("'", "''")}' '${workerPath.replaceAll("'", "''")}' @args | Out-Null\r\n$code = $LASTEXITCODE\r\nif (Test-Path -LiteralPath '${traceOutputPath.replaceAll("'", "''")}') { Get-Content -Raw -LiteralPath '${traceOutputPath.replaceAll("'", "''")}' | Write-Output }\r\nexit $code\r\n`,
    );
    return;
  }

  const commandPath = path.join(binDir, 'claude');
  fs.writeFileSync(commandPath, `#!/bin/sh\nrm -f "${traceOutputPath}"\n"${process.execPath}" "${workerPath}" "$@" >/dev/null\ncode=$?\nif [ -f "${traceOutputPath}" ]; then cat "${traceOutputPath}"; fi\nexit $code\n`);
  fs.chmodSync(commandPath, 0o755);
}

function writeFakeGh(
  binDir: string,
  callsPath: string,
  pullRequest: Record<string, unknown>,
  checks: Array<Record<string, unknown>>,
): void {
  fs.mkdirSync(binDir, { recursive: true });
  const workerPath = path.join(binDir, 'gh-fake.mjs');
  fs.writeFileSync(workerPath, [
    "import fs from 'node:fs';",
    'const args = process.argv.slice(2);',
    `fs.appendFileSync(${JSON.stringify(callsPath)}, JSON.stringify(args) + '\\n');`,
    `const pullRequest = ${JSON.stringify(pullRequest)};`,
    `const checks = ${JSON.stringify(checks)};`,
    "if (args[0] === 'pr' && args[1] === 'view') process.stdout.write(JSON.stringify(pullRequest));",
    "else if (args[0] === 'pr' && args[1] === 'checks') process.stdout.write(JSON.stringify(checks));",
    "else { process.stderr.write('unsupported fake gh call'); process.exit(2); }",
  ].join('\n'));
  if (process.platform === 'win32') {
    fs.writeFileSync(
      path.join(binDir, 'gh.ps1'),
      `& '${process.execPath.replaceAll("'", "''")}' '${workerPath.replaceAll("'", "''")}' @args\r\nexit $LASTEXITCODE\r\n`,
    );
    return;
  }
  const commandPath = path.join(binDir, 'gh');
  fs.writeFileSync(commandPath, `#!/bin/sh\nexec "${process.execPath}" "${workerPath}" "$@"\n`);
  fs.chmodSync(commandPath, 0o755);
}

function writeFakeCodex(binDir: string, callsPath: string, responses: Array<Record<string, unknown>> = [
  {
    status: 'completed',
    output: { spec: 'Print exactly hello followed by a newline, then exit with status 0.' },
    handoff: { summary: 'Drafted an executable spec.' },
  },
  {
    status: 'completed',
    verdict: 'pass',
    findings: [],
    handoff: { summary: 'Spec accepted after independent review.' },
  },
]): void {
  fs.mkdirSync(binDir, { recursive: true });
  const workerPath = path.join(binDir, 'codex-fake.mjs');
  const traceOutputPath = path.join(binDir, 'codex-fake.stdout');
  fs.writeFileSync(workerPath, [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "import { execFileSync } from 'node:child_process';",
    "let input = '';",
    'for await (const chunk of process.stdin) input += chunk;',
    'const args = process.argv.slice(2);',
    "const outputIndex = args.indexOf('-o');",
    "if (outputIndex < 0 || !args[outputIndex + 1]) throw new Error('missing -o output path');",
    'const prompt = JSON.parse(input);',
    `const responses = ${JSON.stringify(responses)};`,
    `const priorCalls = fs.existsSync(${JSON.stringify(callsPath)}) ? fs.readFileSync(${JSON.stringify(callsPath)}, 'utf8').trim().split(/\\r?\\n/).filter(Boolean).length : 0;`,
    `fs.appendFileSync(${JSON.stringify(callsPath)}, JSON.stringify({ args, prompt }) + '\\n');`,
    "const response = responses[priorCalls];",
    "if (!response) throw new Error(`missing fake response for call ${priorCalls + 1}`);",
    "if (response.__exitCode && !response.__traceBeforeExit) process.exit(response.__exitCode);",
    "for (const [relativePath, content] of Object.entries(response.__writeFiles || {})) { const filePath = path.join(process.cwd(), relativePath); fs.mkdirSync(path.dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, content); }",
    "for (const gitArgs of response.__gitCommands || []) execFileSync('git', gitArgs, { stdio: 'ignore' });",
    "const { __exitCode, __traceBeforeExit, __writeFiles, __gitCommands, __skipOutput, __skipTrace, __traceEvents, ...publicResponse } = response;",
    "if (!__skipOutput) fs.writeFileSync(args[outputIndex + 1], JSON.stringify(publicResponse));",
    "const traceEvents = Array.isArray(__traceEvents) ? __traceEvents : [{ type: 'turn.completed', role: prompt.role, usage: { input_tokens: 10, output_tokens: 5 }, total_cost_usd: 0.01 }];",
    `if (!__skipTrace) fs.writeFileSync(${JSON.stringify(traceOutputPath)}, traceEvents.map((event) => JSON.stringify(event)).join('\\n') + '\\n');`,
    "if (__exitCode) process.exit(__exitCode);",
  ].join('\n'));

  if (process.platform === 'win32') {
    fs.writeFileSync(
      path.join(binDir, 'codex.ps1'),
      `Remove-Item -LiteralPath '${traceOutputPath.replaceAll("'", "''")}' -ErrorAction SilentlyContinue\r\n& '${process.execPath.replaceAll("'", "''")}' '${workerPath.replaceAll("'", "''")}' @args | Out-Null\r\n$code = $LASTEXITCODE\r\nif (Test-Path -LiteralPath '${traceOutputPath.replaceAll("'", "''")}') { Get-Content -Raw -LiteralPath '${traceOutputPath.replaceAll("'", "''")}' | Write-Output }\r\nexit $code\r\n`,
    );
    fs.writeFileSync(path.join(binDir, 'codex.cmd'), `@echo off\r\n"${process.execPath}" "${workerPath}" %*\r\n`);
    return;
  }

  const commandPath = path.join(binDir, 'codex');
  fs.writeFileSync(commandPath, `#!/bin/sh\nrm -f "${traceOutputPath}"\n"${process.execPath}" "${workerPath}" "$@" >/dev/null\ncode=$?\nif [ -f "${traceOutputPath}" ]; then cat "${traceOutputPath}"; fi\nexit $code\n`);
  fs.chmodSync(commandPath, 0o755);
}
