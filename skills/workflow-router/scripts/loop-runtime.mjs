#!/usr/bin/env node

import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { classifyIntent } from './route-intent.mjs';
import { validateOkf } from './okf-validate.mjs';

const LOOP_RUN_LEDGER = path.join('.harness-hub', 'state', 'loop-runs.jsonl');
const SKILLS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EFFECTIVE_INTERACT_CREATE = path.join(SKILLS_ROOT, 'effective-interact', 'scripts', 'create-interaction.mjs');
const EFFECTIVE_INTERACT_VALIDATE = path.join(SKILLS_ROOT, 'effective-interact', 'scripts', 'validate-interaction.mjs');
const GIT_TRANSIENT_CONTROL_FILES = Object.freeze([
  'COMMIT_EDITMSG',
  'MERGE_MSG',
  'SQUASH_MSG',
  'ORIG_HEAD',
  'FETCH_HEAD',
  'MERGE_HEAD',
  'REBASE_HEAD',
  'CHERRY_PICK_HEAD',
  'REVERT_HEAD',
  'AUTO_MERGE',
  'index.lock',
]);

const LOOP_CONTRACTS = Object.freeze({
  'requirements-loop': createLoopContract({
    id: 'requirements-loop',
    producerReadOnly: true,
    objective: 'Default to lightweight brainstorming, extract constraints/details/open questions, run grill-me, and iterate until facts are aligned or real user input is required.',
    skills: ['product-capability', 'grill-me'],
    output: {
      properties: {
        constraints: 'string array',
        details: 'string array',
        openQuestions: 'string array',
        aligned: 'boolean grounded only in supplied user evidence',
      },
      schema: objectSchema(['constraints', 'details', 'openQuestions', 'aligned'], {
        constraints: stringArraySchema(),
        details: stringArraySchema(),
        openQuestions: stringArraySchema(),
        aligned: { type: 'boolean' },
      }),
      invariants: ['alignment-requires-no-open-questions'],
    },
    producerObjective: 'Brainstorm from repository/user facts, identify hidden assumptions, then apply grill-me without inventing user acceptance.',
    verifierObjective: 'Check constraint coverage, unresolved decisions, and that alignment claims are grounded in actual invocation or resume answers.',
    successCriteria: ['No blocking open question remains.', 'Every alignment claim is grounded in user-provided evidence.', 'Verifier returns pass.'],
    maxIterations: 3,
  }),
  'spec-loop': createLoopContract({
    id: 'spec-loop',
    objective: 'Produce the smallest concise, complete, unambiguous, executable specification and independently review it against repository facts and accepted outcomes.',
    output: {
      properties: {
        spec: 'non-empty string',
      },
      schema: objectSchema(['spec'], { spec: { type: 'string', minLength: 1 } }),
      invariants: [],
    },
    skills: ['doc-coauthoring', 'ponytail'],
    producerObjective: 'Draft or revise the specification from the supplied facts and prior review findings.',
    producerReadOnly: true,
    verifierObjective: 'Independently check that the specification is concise, complete, unambiguous, executable, consistent with current implementation evidence, and introduces no entity or option without a targetSpec or acceptance-criteria need.',
    successCriteria: [
      'Producer returns the declared structured output.',
      'Deterministic contract validation passes.',
      'Every proposed entity and change maps to targetSpec or an acceptance criterion, with existing simpler mechanisms reused first.',
      'Independent Verifier returns pass with no blocking findings.',
    ],
    maxIterations: 3,
    sideEffects: {
      producer: 'Read-only; returns the specification as structured output.',
      verifier: 'Read-only.',
      runtime: 'May write only .harness-hub/state/runs and the existing loop run ledger.',
    },
  }),
  'test-loop': createLoopContract({
    id: 'test-loop',
    objective: 'Design valuable P0/P1/P2 tests, prove RED is caused by the missing target behavior, prove GREEN, and review coverage and boundaries.',
    skills: ['tdd-workflow', 'e2e-testing'],
    output: {
      properties: {
        testPlan: 'object with P0/P1/P2 boundaries',
        redEvidence: 'structured deterministic command evidence',
        greenEvidence: 'structured deterministic command evidence',
        review: 'coverage, boundary, and value findings',
      },
      schema: objectSchema(['testPlan', 'redEvidence', 'greenEvidence', 'review'], {
        testPlan: testPlanSchema(),
        implementation: { type: ['object', 'null'] },
        redEvidence: { type: 'object' },
        greenEvidence: { type: 'object' },
        review: { type: 'object' },
      }),
      invariants: ['runtime-red-green-evidence', 'independent-test-review'],
    },
    producerObjective: 'First write only tests, then yield to runtime RED validation; after a causal RED, write only implementation and yield to runtime GREEN validation.',
    verifierObjective: 'Review the completed RED/GREEN cycle for coverage, boundary, and value; reject false REDs, missing GREEN evidence, and implementation-detail-only assertions.',
    successCriteria: ['RED cause is the target missing behavior.', 'GREEN commands pass.', 'Coverage/value review passes.'],
    maxIterations: 3,
  }),
  'implementation-review-loop': createLoopContract({
    id: 'implementation-review-loop',
    producerReadOnly: true,
    objective: 'Independently review design fit, functional correctness, robustness, observability, error handling, minimal change, and over-design without overriding deterministic failures.',
    skills: ['compound-code-review', 'security-review', 'ponytail'],
    output: {
      properties: {
        verdict: 'pass, revise, or blocked',
        findings: 'structured actionable findings',
        deterministicEvidence: 'commands and results that cannot be overruled by Agent judgment',
      },
      schema: objectSchema(['verdict', 'findings', 'deterministicEvidence'], {
        verdict: { type: 'string', enum: ['pass', 'revise', 'blocked'] },
        findings: stringArraySchema(),
        deterministicEvidence: { type: 'object' },
      }),
      invariants: ['deterministic-evidence-runtime-owned'],
    },
    producerObjective: 'Inspect implementation and evidence, map every new entity and behavior to targetSpec and acceptanceCriteria, and produce a scoped technical review rather than editing the implementation.',
    verifierObjective: 'Independently challenge correctness, robustness, observability, error handling, unnecessary complexity, speculative compatibility, and failures to reuse an existing or standard mechanism.',
    arbiter: {
      objective: 'Read-only reconciliation only when independent findings materially conflict.',
      readOnly: true,
      when: 'producer/verifier conflict cannot be resolved by deterministic evidence',
    },
    successCriteria: ['No deterministic failure exists.', 'Every new entity and branch maps to the accepted design and test boundary.', 'No unresolved blocking finding remains.', 'Verifier or Arbiter returns pass.'],
    maxIterations: 1,
  }),
  'delivery-loop': createLoopContract({
    id: 'delivery-loop',
    producerReadOnly: true,
    objective: 'Close deterministic validation, runtime-owned authorized cleanup/local commit, and read-only PR/conflict/CI state while keeping remote mutations and merge in the main Agent.',
    skills: ['verification-loop'],
    output: {
      properties: {
        validation: 'deterministic validation summary',
        git: 'worktree/commit state',
        pullRequest: 'PR state or explicit authorized skip',
        ci: 'check state or explicit non-PR skip',
        authorization: 'remote actions performed or refused',
        deterministicEvidence: 'runtime-captured validation command results',
      },
      schema: objectSchema(['validation', 'git', 'pullRequest', 'ci', 'authorization', 'deterministicEvidence'], {
        validation: { type: 'object' },
        git: { type: 'object' },
        pullRequest: { type: 'object' },
        ci: { type: 'object' },
        authorization: { type: 'object' },
        deterministicEvidence: { type: 'object' },
      }),
      invariants: ['deterministic-evidence-runtime-owned'],
    },
    producerObjective: 'Inspect the requested delivery and return a concise validation summary without changing repository or external state.',
    verifierObjective: 'Independently verify cleanup, deterministic commands, Git/PR/CI truth, conflict state, and no unauthorized merge.',
    successCriteria: ['All applicable deterministic gates pass.', 'Delegated CLI execution is read-only.', 'Only the runtime performs explicitly authorized local cleanup or commit.', 'Remote state is reported from read-only evidence.'],
    maxIterations: 1,
    sideEffects: {
      producer: 'Read-only; must not change repository or external state.',
      verifier: 'Read-only.',
      runtime: 'Existing Loop state plus explicitly authorized ignored-path cleanup and local commit; remote writes and merge remain main-Agent responsibilities.',
    },
  }),
  'report-loop': createLoopContract({
    id: 'report-loop',
    producerReadOnly: true,
    objective: 'Produce a low-interpretation-cost report; deterministically invoke effective-interact for complex delivery, comparisons, and handoffs without keyword dependence.',
    skills: ['effective-interact'],
    output: {
      properties: {
        complexity: 'simple or complex with deterministic reason',
        presentation: 'plain text or requested artifact path; runtime replaces complex presentation with generated and validated artifact evidence',
        interactionInput: 'effective-interact structured generator input for complex reports; null for simple reports',
        effectiveInteractUsed: 'runtime-owned boolean; Agent claims are ignored',
      },
      schema: objectSchema(['complexity', 'presentation', 'interactionInput', 'effectiveInteractUsed'], {
        complexity: { type: 'string', enum: ['simple', 'complex'] },
        presentation: { type: ['object', 'string'] },
        interactionInput: { type: ['object', 'null'] },
        effectiveInteractUsed: { type: 'boolean' },
      }),
      invariants: ['report-complexity-from-lifecycle', 'effective-interact-runtime-owned'],
    },
    producerObjective: 'Classify report complexity from lifecycle context and return structured effective-interact input plus the requested artifact path, or concise plain text for a simple report.',
    verifierObjective: 'Review the runtime-generated, formally validated artifact or concise plain text; Router intent and Agent-authored HTML are not evidence.',
    successCriteria: ['Complex reports actually use effective-interact.', 'Simple reports remain concise.', 'Generated output is verified.'],
    maxIterations: 2,
    sideEffects: {
      producer: 'Read-only; returns only structured presentation input.',
      verifier: 'Read-only.',
      runtime: 'Generates effective-interact artifacts only under this run\'s ignored state artifacts directory.',
    },
  }),
  'retro-loop': createLoopContract({
    id: 'retro-loop',
    producerReadOnly: true,
    objective: 'Review this session and Agent history for low-value calls, repeated lookup, false evidence, routing failures, and context waste; improve an existing entity only when evidence justifies it.',
    skills: ['agent-interaction-audit'],
    output: {
      properties: {
        findings: 'evidence-backed interaction findings',
        recommendations: 'ranked changes or explicit no-change',
        existingEntityChanges: 'Skill/Workflow/Eval/OKF updates; no speculative new entity',
        evalCandidates: 'project-local real-task Eval candidates with only this project evidence anchors, task, success criteria, and suggested grader',
      },
      schema: objectSchema(['findings', 'recommendations', 'existingEntityChanges', 'evalCandidates'], {
        findings: stringArraySchema(),
        recommendations: stringArraySchema(),
        existingEntityChanges: stringArraySchema(),
        evalCandidates: {
          type: 'array',
          items: objectSchema(['evidenceAnchors', 'task', 'successCriteria', 'grader'], {
            evidenceAnchors: stringArraySchema(),
            task: { type: 'string', minLength: 1 },
            successCriteria: stringArraySchema(),
            grader: { type: 'string', minLength: 1 },
          }),
        },
      }),
      invariants: ['project-local-eval-candidates'],
    },
    producerObjective: 'Inspect current run/session evidence, identify high-ROI improvements, and optionally return project-local real-task Eval candidates without creating Hub entities.',
    verifierObjective: "Reject vague advice, unsupported blame, duplicate entities, Eval candidates without current-project evidence, and leakage of another project's data.",
    successCriteria: ['Findings cite actual run/session evidence.', 'Recommendations target existing entities where possible.', 'No project-specific data leaves its project.'],
    maxIterations: 2,
  }),
  'knowledge-init-loop': createLoopContract({
    id: 'knowledge-init-loop',
    objective: 'On first full migration, scan the target repository and create a source-traceable Google OKF v0.1 LLM-Wiki owned by that project.',
    skills: ['documentation-lookup'],
    output: {
      properties: {
        knowledgeRoot: 'target-owned knowledge directory',
        concepts: 'created OKF concept paths',
        sources: 'target-relative source citations',
        logEntry: 'initialization record',
      },
      schema: objectSchema(['knowledgeRoot', 'concepts', 'sources', 'logEntry'], {
        knowledgeRoot: { type: 'string', minLength: 1 },
        concepts: stringArraySchema(),
        sources: stringArraySchema(),
        logEntry: { type: 'string', minLength: 1 },
      }),
      invariants: ['okf-runtime-validation'],
    },
    producerObjective: 'Inspect real target files and create the smallest useful source-traceable OKF wiki without copying distribution-source knowledge.',
    verifierObjective: 'Run deterministic OKF/isolation validation and reject placeholders, broken sources, or distribution-source internal leakage.',
    successCriteria: ['OKF v0.1 deterministic validation passes.', 'At least one real target source is cited.', 'Project knowledge contains no distribution-source internal content.'],
    maxIterations: 2,
  }),
  'knowledge-maintain-loop': createLoopContract({
    id: 'knowledge-maintain-loop',
    objective: 'Maintain project-owned OKF knowledge from real project changes during daily work; distribution migration never performs this mutation.',
    skills: ['agent-interaction-audit'],
    output: {
      properties: {
        changedConcepts: 'updated project-owned OKF concept paths',
        sources: 'changed target-relative source citations',
        logEntry: 'knowledge maintenance record',
      },
      schema: objectSchema(['changedConcepts', 'sources', 'logEntry'], {
        changedConcepts: stringArraySchema(),
        sources: stringArraySchema(),
        logEntry: { type: 'string', minLength: 1 },
      }),
      invariants: ['okf-runtime-validation', 'knowledge-diff-source-log-alignment'],
    },
    producerObjective: 'Update only knowledge supported by real target changes and append the project knowledge log.',
    verifierObjective: 'Run deterministic OKF/source/diff validation and reject unsupported or distribution-driven rewrites.',
    successCriteria: ['Every knowledge change has a current target source.', 'OKF deterministic validation passes.', 'The change is initiated by project work, not repository migration.'],
    maxIterations: 2,
  }),
  'repository-migration-loop': createLoopContract({
    id: 'repository-migration-loop',
    objective: 'Execute one host-owned shared and Host distribution slice of the full repository migration.',
    skills: [],
    output: {
      properties: {
        host: 'claude or codex',
        role: 'primary or secondary',
        migrationSummary: 'concise description of completed host and shared surfaces',
      },
      schema: objectSchema(['host', 'role', 'migrationSummary'], {
        host: { type: 'string', enum: ['claude', 'codex'] },
        role: { type: 'string', enum: ['primary', 'secondary'] },
        migrationSummary: { type: 'string', minLength: 1 },
      }),
      invariants: [],
    },
    producerObjective: 'Perform the declared primary or secondary shared and Host distribution slice in one CLI session and return structured evidence without committing or changing remote state.',
    verifierObjective: 'Deterministically validate the shared and Host distribution surface, ownership boundaries, source immutability, and target HEAD without starting another CLI session.',
    verifierKind: 'deterministic',
    successCriteria: ['The host CLI is invoked exactly once.', 'All deterministic shared/Host distribution and ownership checks pass.', 'No protected project content or remote state changes.'],
    maxIterations: 1,
    sideEffects: {
      producer: 'May write only the migration slice declared in invocation.allowedPaths.',
      verifier: 'Read-only deterministic validation.',
      runtime: 'May write only existing Loop run, lease, trace, audit, and integration state.',
    },
  }),
});

function objectSchema(required, properties) {
  return {
    type: 'object',
    additionalProperties: false,
    required,
    properties,
  };
}

function stringArraySchema() {
  return { type: 'array', items: { type: 'string', minLength: 1 } };
}

function testPlanSchema() {
  return objectSchema(['P0', 'P1', 'P2'], {
    P0: stringArraySchema(),
    P1: stringArraySchema(),
    P2: stringArraySchema(),
  });
}

function createLoopContract(definition) {
  return Object.freeze({
    schemaVersion: 1,
    id: definition.id,
    objective: definition.objective,
    input: {
      required: ['task', 'targetSpec', 'acceptanceCriteria'],
      properties: {
        task: 'non-empty string',
        targetSpec: 'non-empty string',
        acceptanceCriteria: 'non-empty string array',
        allowedPaths: 'safe repository-relative path array',
        forbiddenPaths: 'safe repository-relative path array',
        validationCommands: 'structured { command, args, cwd? } argv array executed without a shell',
        context: 'loop-specific lifecycle/evidence object',
      },
    },
    output: definition.output,
    skills: definition.skills,
    producer: { objective: definition.producerObjective, readOnly: definition.producerReadOnly === true },
    verifier: {
      objective: definition.verifierObjective,
      readOnly: true,
      ...(definition.verifierKind ? { kind: definition.verifierKind } : {}),
    },
    arbiter: definition.arbiter || null,
    successCriteria: definition.successCriteria,
    maxIterations: definition.maxIterations,
    stopConditions: ['verifier-pass', 'maximum-iterations', 'user-decision-required', 'deterministic-failure', 'authorization-boundary'],
    interaction: {
      pauseWhen: ['A missing answer would change user-visible behavior, ownership, cost, safety, or acceptance criteria.'],
      resume: 'Invoke the same Loop with the same runId and unchanged invocation contract.',
      mayClaimUserAcceptance: false,
    },
    sideEffects: definition.sideEffects || {
      producer: definition.producerReadOnly === true
        ? 'Read-only; must not change repository or external state.'
        : 'May write only invocation.allowedPaths.',
      verifier: 'Read-only.',
      runtime: 'May write only .harness-hub/state/runs and the existing loop run ledger.',
    },
    authorization: {
      local: 'Only effects explicitly declared by the invocation are authorized.',
      remote: 'Delegated CLI execution is always forbidden; only the main Agent may act on explicit user authorization.',
    },
    handoff: {
      fields: ['status', 'summary', 'output', 'findings', 'openQuestions', 'nextAction'],
      summaryMaxCharacters: 600,
    },
  });
}

const EXECUTABLE_WORKFLOWS = Object.freeze({
  'answer-workflow': Object.freeze(['report-loop']),
  'sdd-workflow': Object.freeze([
    'requirements-loop',
    'spec-loop',
    'test-loop',
    'implementation-review-loop',
    'delivery-loop',
    'retro-loop',
    'report-loop',
  ]),
  'diagnosis-workflow': Object.freeze([
    'requirements-loop',
    'test-loop',
    'implementation-review-loop',
    'delivery-loop',
    'retro-loop',
    'report-loop',
  ]),
  'review-workflow': Object.freeze(['implementation-review-loop', 'report-loop']),
  'delivery-workflow': Object.freeze(['implementation-review-loop', 'delivery-loop', 'retro-loop', 'report-loop']),
});

function producerResponseSchema(outputSchema) {
  return objectSchema(['status', 'output', 'openQuestions', 'handoff'], {
    status: { type: 'string', enum: ['completed', 'paused', 'blocked'] },
    output: structuredClone(outputSchema),
    openQuestions: { type: 'array', items: { type: 'string' } },
    handoff: objectSchema(['summary'], { summary: { type: 'string' } }),
  });
}

const TEST_DESIGN_OUTPUT_SCHEMA = Object.freeze(objectSchema(['testPlan'], {
  testPlan: testPlanSchema(),
}));

const TEST_IMPLEMENTATION_OUTPUT_SCHEMA = Object.freeze(objectSchema(['implementationSummary'], {
  implementationSummary: { type: 'string', minLength: 1 },
}));

function agentOwnedOutputSchema(contract) {
  if (contract.id === 'implementation-review-loop') {
    return objectSchema(['verdict', 'findings'], {
      verdict: { type: 'string', enum: ['pass', 'revise', 'blocked'] },
      findings: stringArraySchema(),
    });
  }
  if (contract.id === 'delivery-loop') {
    return objectSchema(['validation'], {
      validation: objectSchema(['summary'], {
        summary: { type: 'string', minLength: 1 },
      }),
    });
  }
  if (contract.id === 'report-loop') {
    return objectSchema(['complexity', 'presentation', 'interactionInput'], {
      complexity: { type: 'string', enum: ['simple', 'complex'] },
      presentation: objectSchema(['mode', 'text'], {
        mode: { type: 'string', enum: ['plain-text', 'html-artifact'] },
        text: { type: ['string', 'null'] },
      }),
      interactionInput: {
        type: ['object', 'null'],
        additionalProperties: false,
        required: ['title', 'summary', 'status', 'renderMode', 'sections'],
        properties: {
          title: { type: 'string', minLength: 1 },
          summary: { type: 'string', minLength: 1 },
          status: { type: 'string', minLength: 1 },
          renderMode: { type: 'string', enum: ['pre-rendered'] },
          sections: {
            type: 'array',
            items: objectSchema(['type', 'title', 'content'], {
              type: { type: 'string', enum: ['markdown'] },
              title: { type: 'string', minLength: 1 },
              content: { type: 'string', minLength: 1 },
            }),
          },
        },
      },
    });
  }
  return contract.output.schema;
}

const VERIFIER_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['status', 'verdict', 'findings', 'openQuestions', 'handoff'],
  properties: {
    status: { type: 'string', enum: ['completed', 'paused', 'blocked'] },
    verdict: { type: 'string', enum: ['pass', 'revise', 'blocked'] },
    findings: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
    handoff: {
      type: 'object',
      additionalProperties: false,
      required: ['summary'],
      properties: { summary: { type: 'string' } },
    },
  },
});

export function getLoopContract(loopId) {
  const contract = LOOP_CONTRACTS[normalizeId(loopId, 'loop')];
  if (!contract) {
    throw new LoopRuntimeError(`Unknown executable Loop '${loopId}'.`, 'E_LOOP_UNKNOWN', 2);
  }
  return structuredClone(contract);
}

export function listLoopContracts() {
  const loopIds = Object.keys(LOOP_CONTRACTS).sort();
  return {
    schemaVersion: 1,
    loopIds,
    contracts: loopIds.map((loopId) => getLoopContract(loopId)),
  };
}

export function runExecutableLoop(options) {
  const targetDir = requireDirectory(options.targetDir, 'target');
  const loop = normalizeId(options.loop, 'loop');
  const runId = normalizeId(options.runId, 'runId');
  const host = normalizeHost(options.host);
  const contract = getLoopContract(loop);
  const input = normalizeInvocationInput(options.input, targetDir, contract);
  const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
  const now = new Date().toISOString();
  const invocationHash = hashJson({ loop, host, input });
  const contractHash = hashJson(contract);

  ensureRuntimeStateDir(targetDir);
  fs.mkdirSync(runDir, { recursive: true });

  const runStartedAt = Date.now();
  try {
    return withRunLock(runDir, () => {
    const existing = readOptionalJson(path.join(runDir, 'run.json'));
    let baseDurationMs = 0;
    let resumeContext = {};
    let runState;
    if (existing) {
      assertResumeCompatible(existing, { runId, loop, host, contractHash, invocationHash });
      const userAnswers = normalizeUserAnswers(options.answers, existing.pendingInteraction);
      baseDurationMs = Number(existing.metrics?.durationMs) || 0;
      runState = {
        ...existing,
        status: 'running',
        phase: existing.pendingInteraction.role,
        pendingInteraction: null,
        resumeCount: (Number(existing.resumeCount) || 0) + 1,
        interactions: [
          ...(Array.isArray(existing.interactions) ? existing.interactions : []),
          {
            questions: existing.pendingInteraction.questions,
            answers: userAnswers.answers,
            source: 'user',
            resumedAt: now,
          },
        ],
        updatedAt: now,
      };
      resumeContext = { userAnswers: userAnswers.answers };
      writeRunState(runDir, runState);
      appendRunEvent(runDir, runId, loop, 'run_resumed', {
        iteration: runState.iteration,
        role: existing.pendingInteraction.role,
        answerCount: userAnswers.answers.length,
      });
    } else {
      if (options.answers !== undefined && options.answers !== null) {
        throw new LoopRuntimeError('User answers can only resume an existing paused Loop.', 'E_RESUME_STATE', 2);
      }
      runState = {
        schemaVersion: 1,
        runId,
        loop,
        host,
        targetDir,
        contract,
        contractHash,
        invocationHash,
        input,
        status: 'running',
        phase: 'ready',
        iteration: 1,
        maxIterations: contract.maxIterations,
        agentIds: [],
        interactions: [],
        resumeCount: 0,
        metrics: emptyMetrics(),
        startedAt: now,
        updatedAt: now,
      };
      writeRunState(runDir, runState);
      appendRunEvent(runDir, runId, loop, 'run_started', { host, iteration: 1 });
    }

    const agentIds = [...(Array.isArray(runState.agentIds) ? runState.agentIds : [])];
    let previousFindings = Array.isArray(runState.previousFindings) ? runState.previousFindings : [];
    if (loop === 'test-loop') {
      const phasePlanFindings = validateTestLoopPhasePlan(input, targetDir);
      if (phasePlanFindings.length > 0) {
        return blockForDeterministicFailure({
          runDir,
          runState,
          runStartedAt,
          findings: phasePlanFindings,
          agentIds,
        });
      }
    }
    for (let iteration = runState.iteration; iteration <= contract.maxIterations; iteration += 1) {
      runState = updateRunState(runDir, runState, { phase: 'producing', iteration });
      let producer;
      let producerExecutions = [];
      let validationRuns = [];
      try {
        if (loop === 'test-loop') {
          const cycle = executeTestLoopProducerCycle({
            targetDir,
            runDir,
            runId,
            host,
            loop,
            contract,
            input,
            iteration,
            runState,
            previousFindings,
            resumeContext,
          });
          producer = cycle.producer;
          producerExecutions = cycle.executions;
          validationRuns = cycle.validationRuns;
          runState = cycle.runState;
        } else {
          producer = executeRole({
            targetDir,
            runDir,
            runId,
            host,
            loop,
            contract,
            input,
            role: 'producer',
            iteration,
            readOnly: contract.producer.readOnly,
            responseSchema: producerResponseSchema(agentOwnedOutputSchema(contract)),
            context: {
              ...(previousFindings.length > 0 ? { previousFindings } : {}),
              ...resumeContext,
            },
          });
          producerExecutions = [producer];
        }
        resumeContext = {};
      } catch (error) {
        if (!(error instanceof LoopRuntimeError) || !['E_HOST_FAILED', 'E_HOST_OUTPUT', 'E_TRACE_MISSING'].includes(error.code)) {
          throw error;
        }
        for (const execution of Array.isArray(error.details.priorExecutions) ? error.details.priorExecutions : []) {
          if (!agentIds.includes(execution.agentId)) agentIds.push(execution.agentId);
          runState = incrementCliMetrics(runDir, runState, execution.trace || null);
        }
        const agentId = error.details.agentId;
        if (typeof agentId === 'string' && agentId) {
          agentIds.push(agentId);
        }
        runState = incrementCliMetrics(runDir, runState, error.details.trace || null);
        runState = updateRunState(runDir, runState, { agentIds });
        if (loop === 'repository-migration-loop') {
          throw error;
        }
        const boundaryFindings = Array.isArray(error.details.boundaryFindings)
          ? error.details.boundaryFindings
          : [];
        if (boundaryFindings.length > 0) {
          return blockForDeterministicFailure({
            runDir,
            runState,
            runStartedAt,
            findings: boundaryFindings,
            agentIds,
            reason: 'authorization-boundary',
          });
        }
        previousFindings = [`Producer failed: ${error.message}`];
        appendRunEvent(runDir, runId, loop, 'iteration_failed', {
          iteration,
          role: 'producer',
          findings: previousFindings,
        });
        if (iteration === contract.maxIterations) {
          return failAtMaximumIterations({
            runDir,
            runState,
            runStartedAt,
            findings: previousFindings,
            agentIds,
          });
        }
        continue;
      }
      for (const execution of producerExecutions) {
        if (!agentIds.includes(execution.agentId)) agentIds.push(execution.agentId);
        runState = incrementCliMetrics(runDir, runState, execution.trace);
      }
      runState = updateRunState(runDir, runState, { agentIds });
      if (producer.boundaryFindings.length > 0) {
        return blockForDeterministicFailure({
          runDir,
          runState,
          runStartedAt,
          findings: producer.boundaryFindings,
          agentIds,
          reason: 'authorization-boundary',
        });
      }
      if (producer.result.status === 'paused') {
        return pauseRun({
          targetDir,
          runDir,
          runState,
          runStartedAt,
          baseDurationMs,
          role: 'producer',
          result: producer.result,
          agentIds,
        });
      }
      if (loop === 'delivery-loop') {
        const actionGateFindings = validateJsonSchema(
          producer.result,
          producerResponseSchema(agentOwnedOutputSchema(contract)),
          'Producer response',
        );
        if (producer.result.status !== 'completed') {
          actionGateFindings.push(`Producer status is '${String(producer.result.status)}', not completed.`);
        }
        if (typeof producer.result.handoff?.summary !== 'string' || !producer.result.handoff.summary.trim()) {
          actionGateFindings.push('Producer handoff.summary must be a non-empty string.');
        }
        if (normalizeOpenQuestions(producer.result.openQuestions).length > 0) {
          actionGateFindings.push('delivery-loop cannot perform local actions while Producer openQuestions remain unresolved.');
        }
        if (actionGateFindings.length > 0) {
          return blockForDeterministicFailure({
            runDir,
            runState,
            runStartedAt,
            findings: actionGateFindings,
            agentIds,
          });
        }
      }
      const deterministicValidation = validateLoopDeterministicOutput({
        targetDir,
        runDir,
        contract,
        input,
        producer,
        forbidKnowledgeTree: options.forbidKnowledgeTree,
      });
      const deterministicFindings = deterministicValidation?.findings || [];
      if (deterministicFindings.length > 0) {
        return blockForDeterministicFailure({
          runDir,
          runState,
          runStartedAt,
          findings: deterministicFindings,
          agentIds,
        });
      }
      const deliveryCleanup = loop === 'delivery-loop'
        ? performDeliveryCleanup({ targetDir, input })
        : null;
      if (deliveryCleanup?.findings.length > 0) {
        return blockForDeterministicFailure({
          runDir,
          runState,
          runStartedAt,
          findings: deliveryCleanup.findings,
          agentIds,
        });
      }
      if (deliveryCleanup) {
        runState = updateRunState(runDir, runState, { deliveryLocalActions: deliveryCleanup.evidence });
        if (deliveryCleanup.evidence.cleanupPaths.length > 0) {
          appendRunEvent(runDir, runId, loop, 'delivery_cleanup_completed', {
            iteration,
            paths: deliveryCleanup.evidence.cleanupPaths,
          });
        }
      }
      if (loop !== 'test-loop') {
        validationRuns = executeLoopValidationCommands({ targetDir, iteration, contract, input });
      }
      if (validationRuns.length > 0 && loop !== 'test-loop') {
        runState = updateRunState(runDir, runState, {
          validationRuns: [
            ...(Array.isArray(runState.validationRuns) ? runState.validationRuns : []),
            ...validationRuns,
          ],
        });
      }
      attachRuntimeDeterministicEvidence({ runDir, contract, producer, validationRuns });
      const preActionFindings = [
        ...validationRuns.flatMap((validationRun) => validationRun.findings),
        ...validateRequiredCommandEvidence(contract, validationRuns),
      ];
      if (preActionFindings.length > 0) {
        return blockForDeterministicFailure({
          runDir,
          runState,
          runStartedAt,
          findings: preActionFindings,
          agentIds,
        });
      }
      const deliveryLocalActions = loop === 'delivery-loop'
        ? performDeliveryCommit({ targetDir, runDir, input, evidence: deliveryCleanup.evidence })
        : null;
      if (deliveryLocalActions) {
        runState = updateRunState(runDir, runState, { deliveryLocalActions: deliveryLocalActions.evidence });
        if (deliveryLocalActions.evidence.commit.status !== 'not-authorized') {
          appendRunEvent(runDir, runId, loop, 'delivery_commit_finished', {
            iteration,
            commit: deliveryLocalActions.evidence.commit,
          });
        }
      }
      if (deliveryLocalActions?.findings.length > 0) {
        return blockForDeterministicFailure({
          runDir,
          runState,
          runStartedAt,
          findings: deliveryLocalActions.findings,
          agentIds,
        });
      }
      const deliveryRuntimeTruth = loop === 'delivery-loop'
        ? attachDeliveryRuntimeTruth({ targetDir, runDir, producer, input, localActions: deliveryLocalActions.evidence })
        : null;
      const producerValidation = [
        ...validateProducerResult(contract, producer.result, { targetDir, input, runDir }),
        ...(deliveryRuntimeTruth?.findings || []),
      ];
      if (producerValidation.length > 0) {
        return blockForDeterministicFailure({
          runDir,
          runState,
          runStartedAt,
          findings: producerValidation,
          agentIds,
        });
      }

      runState = updateRunState(runDir, runState, { phase: 'verifying' });
      let verifier;
      try {
        verifier = contract.verifier.kind === 'deterministic'
          ? executeDeterministicVerifier({
            targetDir,
            runDir,
            runId,
            host,
            loop,
            input,
            iteration,
            producerOutput: producer.result.output,
            verifier: options.deterministicVerifier,
          })
          : executeRole({
            targetDir,
            runDir,
            runId,
            host,
            loop,
            contract,
            input,
            role: 'verifier',
            iteration,
            readOnly: true,
            responseSchema: VERIFIER_SCHEMA,
            context: { producerOutput: producer.result.output },
          });
      } catch (error) {
        const failure = normalizeRecoverableAgentFailure(error, 'Verifier');
        if (failure.agentId) agentIds.push(failure.agentId);
        runState = incrementCliMetrics(runDir, runState, failure.trace);
        runState = updateRunState(runDir, runState, { agentIds });
        if (failure.boundaryFindings.length > 0) {
          return blockForDeterministicFailure({
            runDir,
            runState,
            runStartedAt,
            findings: failure.boundaryFindings,
            agentIds,
            reason: 'authorization-boundary',
          });
        }
        previousFindings = failure.findings;
        appendRunEvent(runDir, runId, loop, 'iteration_failed', {
          iteration,
          role: 'verifier',
          findings: previousFindings,
        });
        if (iteration === contract.maxIterations) {
          return failAtMaximumIterations({
            runDir,
            runState,
            runStartedAt,
            findings: previousFindings,
            agentIds,
          });
        }
        continue;
      }
      agentIds.push(verifier.agentId);
      if (verifier.trace) {
        runState = incrementCliMetrics(runDir, runState, verifier.trace);
      }
      runState = updateRunState(runDir, runState, { agentIds });
      if (verifier.boundaryFindings.length > 0) {
        return blockForDeterministicFailure({
          runDir,
          runState,
          runStartedAt,
          findings: verifier.boundaryFindings,
          agentIds,
          reason: 'authorization-boundary',
        });
      }
      const verifierValidation = validateVerifierResult(verifier.result);
      if (verifierValidation.length > 0) {
        return blockForDeterministicFailure({
          runDir,
          runState,
          runStartedAt,
          findings: verifierValidation,
          agentIds,
        });
      }

      let decision = verifier;
      if (requiresArbiter(contract, producer.result.output, verifier.result)) {
        runState = updateRunState(runDir, runState, { phase: 'arbitrating' });
        let arbiter;
        try {
          arbiter = executeRole({
            targetDir,
            runDir,
            runId,
            host,
            loop,
            contract,
            input,
            role: 'arbiter',
            iteration,
            readOnly: true,
            responseSchema: VERIFIER_SCHEMA,
            context: {
              producerOutput: producer.result.output,
              verifierResult: verifier.result,
            },
          });
        } catch (error) {
          const failure = normalizeRecoverableAgentFailure(error, 'Arbiter');
          if (failure.agentId) agentIds.push(failure.agentId);
          runState = incrementCliMetrics(runDir, runState, failure.trace);
          runState = updateRunState(runDir, runState, { agentIds });
          if (failure.boundaryFindings.length > 0) {
            return blockForDeterministicFailure({
              runDir,
              runState,
              runStartedAt,
              findings: failure.boundaryFindings,
              agentIds,
              reason: 'authorization-boundary',
            });
          }
          previousFindings = failure.findings;
          appendRunEvent(runDir, runId, loop, 'iteration_failed', {
            iteration,
            role: 'arbiter',
            findings: previousFindings,
          });
          if (iteration === contract.maxIterations) {
            return failAtMaximumIterations({
              runDir,
              runState,
              runStartedAt,
              findings: previousFindings,
              agentIds,
            });
          }
          continue;
        }
        agentIds.push(arbiter.agentId);
        runState = incrementCliMetrics(runDir, runState, arbiter.trace);
        runState = updateRunState(runDir, runState, { agentIds });
        if (arbiter.boundaryFindings.length > 0) {
          return blockForDeterministicFailure({
            runDir,
            runState,
            runStartedAt,
            findings: arbiter.boundaryFindings,
            agentIds,
            reason: 'authorization-boundary',
          });
        }
        const arbiterValidation = validateVerifierResult(arbiter.result);
        if (arbiterValidation.length > 0) {
          return blockForDeterministicFailure({
            runDir,
            runState,
            runStartedAt,
            findings: arbiterValidation,
            agentIds,
          });
        }
        decision = arbiter;
      }

      if (loop === 'test-loop') {
        attachTestLoopReview({ runDir, producer, decision });
      }
      if (decision.result.verdict === 'pass') {
        const summary = compactSummary(decision.result.handoff.summary, contract.handoff.summaryMaxCharacters);
        const handoff = {
          status: 'completed',
          summary,
          output: producer.result.output,
          findings: [],
          nextAction: 'Return control to the workflow/main Agent.',
        };
        const integration = writeIntegration({
          runDir,
          runId,
          loop,
          agentIds,
          verdict: 'pass',
          status: 'completed',
          executorMode: contract.verifier.kind === 'deterministic'
            ? 'cli-agent+deterministic-verifier'
            : 'cli-agent',
          validationStatus: 'pass',
          validationEvidence: buildSuccessEvidence(contract, input, producer.result.output),
          deterministicEvidence: {
            validationRuns: Array.isArray(runState.validationRuns) ? runState.validationRuns : [],
            ...(deterministicValidation?.report
              ? { loopValidation: deterministicValidation.report }
              : {}),
            ...(deliveryRuntimeTruth ? { deliveryRuntimeTruth: deliveryRuntimeTruth.evidence } : {}),
          },
          handoff,
        });
        const completedAt = new Date().toISOString();
        runState = updateRunState(runDir, runState, {
          status: 'completed',
          phase: 'completed',
          handoff,
          integrationSha256: hashFile(path.join(runDir, 'integration.json')),
          metrics: {
            ...runState.metrics,
            durationMs: baseDurationMs + Date.now() - runStartedAt,
            firstAttemptSuccess: iteration === 1 && runState.metrics.interruptCount === 0,
          },
          completedAt,
        });
        appendRunEvent(runDir, runId, loop, 'run_completed', {
          iteration,
          verdict: integration.verdict,
          integrationSha256: runState.integrationSha256,
        });
        appendJsonl(path.join(targetDir, LOOP_RUN_LEDGER), {
          schemaVersion: 1,
          event: 'loop_orchestration_integrated',
          generatedAt: completedAt,
          runId,
          loop,
          status: 'completed',
          verdict: 'pass',
          agentIds,
          integrationSha256: runState.integrationSha256,
        });
        return publicRunResult(runState);
      }

      previousFindings = decision.result.findings.length > 0
        ? decision.result.findings
        : [`${decision.agentId.startsWith('arbiter-') ? 'Arbiter' : 'Verifier'} returned '${decision.result.verdict}' without an actionable finding.`];
      appendRunEvent(runDir, runId, loop, 'iteration_rejected', {
        iteration,
        verdict: decision.result.verdict,
        findings: previousFindings,
      });
      if (decision.result.verdict === 'blocked') {
        return blockForDeterministicFailure({
          runDir,
          runState,
          runStartedAt,
          findings: previousFindings,
          agentIds,
          reason: 'verifier-blocked',
        });
      }
      if (iteration === contract.maxIterations) {
        return failAtMaximumIterations({
          runDir,
          runState,
          runStartedAt,
          findings: previousFindings,
          agentIds,
        });
      }
    }

    throw new LoopRuntimeError('Loop state machine exited without a terminal result.', 'E_STATE', 1);
    });
  } catch (error) {
    return withRunLock(runDir, () => {
      const runState = readOptionalJson(path.join(runDir, 'run.json'));
      if (runState?.status !== 'running') throw error;
      const agentIds = Array.isArray(runState.agentIds) ? [...runState.agentIds] : [];
      const failedAgentId = error instanceof LoopRuntimeError ? error.details.agentId : null;
      if (typeof failedAgentId === 'string' && failedAgentId && !agentIds.includes(failedAgentId)) {
        agentIds.push(failedAgentId);
      }
      return failForRuntimeError({
        runDir,
        runState,
        runStartedAt,
        error,
        agentIds,
      });
    });
  }
}

export function runExecutableWorkflow(options) {
  const targetDir = requireDirectory(options.targetDir, 'target');
  const workflow = normalizeId(options.workflow, 'workflow');
  const runId = normalizeId(options.runId, 'runId');
  const host = normalizeHost(options.host);
  const baseLoopIds = EXECUTABLE_WORKFLOWS[workflow];
  if (!baseLoopIds) {
    throw new LoopRuntimeError(`Unknown executable Workflow '${workflow}'.`, 'E_WORKFLOW_UNKNOWN', 2);
  }
  const input = normalizeInvocationInput(options.input, targetDir, getLoopContract('spec-loop'));
  const loopIds = workflowLoopSequence(workflow, baseLoopIds, input.context);
  const runDir = path.join(targetDir, '.harness-hub', 'state', 'runs', runId);
  const invocationHash = hashJson({ workflow, host, input });
  ensureRuntimeStateDir(targetDir);
  fs.mkdirSync(runDir, { recursive: true });

  return withRunLock(runDir, () => {
    const now = new Date().toISOString();
    const existing = readOptionalJson(path.join(runDir, 'run.json'));
    let state;
    let startIndex = 0;
    let resumeChild = false;
    if (existing) {
      assertWorkflowResumeCompatible(existing, { runId, workflow, host, invocationHash });
      startIndex = existing.pendingChild.index;
      resumeChild = true;
      state = {
        ...existing,
        status: 'running',
        phase: 'orchestrating',
        pendingChild: null,
        resumeCount: (Number(existing.resumeCount) || 0) + 1,
        updatedAt: now,
      };
      writeRunState(runDir, state);
      appendRunEvent(runDir, runId, workflow, 'workflow_resumed', {
        index: startIndex + 1,
        loop: loopIds[startIndex],
        childRunId: existing.pendingChild.runId,
      });
    } else {
      if (options.answers !== undefined && options.answers !== null) {
        throw new LoopRuntimeError('Workflow answers can only resume an existing paused Workflow.', 'E_RESUME_STATE', 2);
      }
      state = {
        schemaVersion: 1,
        kind: 'workflow',
        runId,
        workflow,
        host,
        targetDir,
        input,
        invocationHash,
        status: 'running',
        phase: 'orchestrating',
        loopIds,
        steps: [],
        pendingChild: null,
        resumeCount: 0,
        metrics: emptyMetrics(),
        startedAt: now,
        updatedAt: now,
      };
      writeRunState(runDir, state);
      appendRunEvent(runDir, runId, workflow, 'workflow_started', { host, loopIds });
    }

    for (let index = startIndex; index < loopIds.length; index += 1) {
      const loop = loopIds[index];
      const priorChangedPaths = workflowPriorChangedPaths(targetDir, state);
      if (loop === 'knowledge-maintain-loop' && priorChangedPaths.length === 0) {
        const skipped = {
          index: index + 1,
          loop,
          runId: null,
          status: 'skipped',
          reason: 'No runtime-captured non-knowledge change exists in a preceding write Loop.',
        };
        state = updateRunState(runDir, state, {
          steps: [...state.steps, skipped],
        });
        appendRunEvent(runDir, runId, workflow, 'workflow_step_skipped', skipped);
        continue;
      }
      const childRunId = workflowChildRunId(runId, index, loop);
      const previousCompletedStep = state.steps.findLast((step) => step.status === 'completed' && step.handoff);
      const upstreamHandoffs = previousCompletedStep ? [structuredClone(previousCompletedStep.handoff)] : [];
      const childAllowedPaths = workflowChildAllowedPaths({ loop, input, targetDir });
      const childContext = {
        ...input.context,
        ...(loop === 'report-loop' ? { stage: workflowReportStage(workflow, input.context) } : {}),
        workflow: {
          id: workflow,
          runId,
          step: index + 1,
          stepCount: loopIds.length,
        },
        upstreamHandoffs,
        ...(loop === 'knowledge-maintain-loop'
          ? { knowledgeMaintenanceEvidence: { changedPaths: priorChangedPaths } }
          : {}),
      };
      appendRunEvent(runDir, runId, workflow, 'workflow_step_started', {
        index: index + 1,
        loop,
        childRunId,
      });
      const result = runExecutableLoop({
        targetDir,
        loop,
        runId: childRunId,
        host,
        input: {
          ...input,
          allowedPaths: childAllowedPaths,
          validationCommands: workflowValidationCommands(loop, input.validationCommands),
          context: childContext,
        },
        ...(resumeChild && index === startIndex ? { answers: options.answers } : {}),
      });
      resumeChild = false;
      const handoff = compactChildHandoff(loop, result);
      const childRunDir = path.join(targetDir, '.harness-hub', 'state', 'runs', childRunId);
      const child = {
        index: index + 1,
        loop,
        runId: childRunId,
        status: result.status,
        iteration: result.iteration,
        metrics: result.metrics,
        runSha256: hashFile(path.join(childRunDir, 'run.json')),
        ...(fs.existsSync(path.join(childRunDir, 'integration.json'))
          ? { integrationSha256: hashFile(path.join(childRunDir, 'integration.json')) }
          : {}),
        handoff,
      };
      const steps = [
        ...state.steps.filter((step) => step.index !== index + 1),
        child,
      ].sort((left, right) => left.index - right.index);
      state = updateRunState(runDir, state, {
        steps,
        metrics: aggregateWorkflowMetrics(steps),
      });
      appendRunEvent(runDir, runId, workflow, 'workflow_step_finished', {
        index: index + 1,
        loop,
        childRunId,
        status: result.status,
      });
      if (result.status !== 'completed') {
        state = updateRunState(runDir, state, {
          status: result.status,
          phase: result.status === 'paused' ? 'paused' : 'handoff',
          pendingChild: result.status === 'paused'
            ? { index, loop, runId: childRunId }
            : null,
          handoff: result.handoff,
          metrics: {
            ...state.metrics,
            firstAttemptSuccess: false,
          },
        });
        appendRunEvent(runDir, runId, workflow, `workflow_${result.status}`, {
          loop,
          childRunId,
        });
        return publicWorkflowResult(state);
      }
    }

    const finalChild = state.steps.at(-1);
    const handoff = finalChild.handoff;
    const integration = {
      schemaVersion: 1,
      runId,
      workflow,
      status: 'completed',
      verdict: 'pass',
      childRuns: state.steps,
      handoff,
      integratedAt: new Date().toISOString(),
    };
    writeJsonAtomic(path.join(runDir, 'integration.json'), integration);
    state = updateRunState(runDir, state, {
      status: 'completed',
      phase: 'completed',
      handoff,
      integrationSha256: hashFile(path.join(runDir, 'integration.json')),
      metrics: {
        ...state.metrics,
        firstAttemptSuccess: state.metrics.interruptCount === 0
          && state.steps.every((step) => step.iteration === 1 && step.status === 'completed'),
      },
      completedAt: new Date().toISOString(),
    });
    appendRunEvent(runDir, runId, workflow, 'workflow_completed', {
      integrationSha256: state.integrationSha256,
      childRunCount: state.steps.length,
    });
    appendJsonl(path.join(targetDir, LOOP_RUN_LEDGER), {
      schemaVersion: 1,
      event: 'workflow_orchestration_integrated',
      generatedAt: state.completedAt,
      runId,
      workflow,
      status: 'completed',
      childRunCount: state.steps.length,
      integrationSha256: state.integrationSha256,
    });
    return publicWorkflowResult(state);
  });
}

export function runRoutedWorkflow(options) {
  const prompt = requireNonEmptyString(options.prompt, 'prompt');
  const route = classifyIntent(prompt);
  if (!route.owner) {
    throw new LoopRuntimeError(
      route.state === 'clarify'
        ? route.clarification || 'Router requires clarification before execution.'
        : 'Router did not select an executable Workflow owner.',
      'E_ROUTE_OWNER',
      3,
      { route },
    );
  }
  if (!EXECUTABLE_WORKFLOWS[route.owner]) {
    throw new LoopRuntimeError(
      `Router owner '${route.owner}' is not target-distributed executable Workflow content.`,
      'E_ROUTE_OWNER',
      3,
      { route },
    );
  }
  const input = isRecord(options.input) ? structuredClone(options.input) : options.input;
  const result = runExecutableWorkflow({
    ...options,
    workflow: route.owner,
    input: {
      ...input,
      context: {
        ...(isRecord(input?.context) ? input.context : {}),
        router: route,
      },
    },
  });
  return { ...result, route };
}

function workflowReportStage(workflow, context) {
  if (workflow === 'answer-workflow' && context?.router?.effectiveInteract !== 'required') {
    return 'answer';
  }
  return 'handoff';
}

function workflowLoopSequence(workflow, baseLoopIds, context) {
  const loops = [...baseLoopIds];
  if (!['sdd-workflow', 'diagnosis-workflow'].includes(workflow)
    || context?.knowledgeMaintenanceRequired !== true
    || loops.includes('knowledge-maintain-loop')) {
    return loops;
  }
  const anchor = loops.lastIndexOf('implementation-review-loop');
  if (anchor < 0) return loops;
  loops.splice(anchor + 1, 0, 'knowledge-maintain-loop');
  return loops;
}

function workflowValidationCommands(loop, commands) {
  return ['test-loop', 'implementation-review-loop', 'delivery-loop'].includes(loop)
    ? commands
    : [];
}

function workflowChildAllowedPaths(options) {
  const contract = getLoopContract(options.loop);
  const assertWithinParent = (paths) => {
    for (const childPath of paths) {
      if (!options.input.allowedPaths.some((parentPath) => pathIsWithin(childPath, parentPath))) {
        throw new LoopRuntimeError(
          `Workflow child '${options.loop}' path '${childPath}' is outside the parent allowedPaths scope.`,
          'E_INPUT_PATH',
          2,
        );
      }
    }
    return paths;
  };
  if (contract.producer.readOnly) {
    return [];
  }
  if (['knowledge-init-loop', 'knowledge-maintain-loop'].includes(options.loop)) {
    const knowledgeRoot = typeof options.input.context.knowledgeRoot === 'string'
      ? options.input.context.knowledgeRoot
      : 'knowledge';
    return assertWithinParent(normalizeRelativePaths([knowledgeRoot], options.targetDir, 'input.context.knowledgeRoot'));
  }
  if (options.loop === 'test-loop') {
    const plan = inspectTestLoopPhasePlan(options.input, options.targetDir);
    if (plan.findings.length > 0) return [];
    return assertWithinParent([...new Set([...plan.testPaths, ...plan.implementationPaths])].sort());
  }
  return [];
}

function workflowPriorChangedPaths(targetDir, state) {
  const knowledgeRoot = typeof state.input?.context?.knowledgeRoot === 'string'
    ? state.input.context.knowledgeRoot.replaceAll('\\', '/').replace(/^\.\//, '')
    : 'knowledge';
  const changed = [];
  for (const step of state.steps) {
    if (step.status !== 'completed' || typeof step.runId !== 'string') continue;
    const agentsDir = path.join(targetDir, '.harness-hub', 'state', 'runs', step.runId, 'agents');
    if (!fs.statSync(agentsDir, { throwIfNoEntry: false })?.isDirectory()) continue;
    for (const agentId of fs.readdirSync(agentsDir)) {
      const agentState = readOptionalJson(path.join(agentsDir, agentId, 'state.json'));
      if (agentState?.role !== 'producer' || agentState?.readOnly === true) continue;
      for (const changedPath of Array.isArray(agentState.boundary?.changedPaths) ? agentState.boundary.changedPaths : []) {
        if (!pathIsWithin(changedPath, knowledgeRoot)
          && changedPath !== '.harness-hub'
          && !changedPath.startsWith('.harness-hub/')) {
          changed.push(changedPath);
        }
      }
    }
  }
  return [...new Set(changed)].sort();
}

function workflowChildRunId(workflowRunId, index, loop) {
  const suffix = `${String(index + 1).padStart(2, '0')}-${loop}`;
  const prefixLength = Math.max(1, 95 - suffix.length);
  return `${workflowRunId.slice(0, prefixLength)}-${suffix}`;
}

function compactChildHandoff(loop, result) {
  const output = result.handoff?.output;
  const serialized = output === undefined ? '' : JSON.stringify(output);
  return {
    loop,
    status: result.status,
    summary: compactSummary(result.handoff?.summary || `${loop} returned ${result.status}.`, 600),
    ...(serialized && serialized.length <= 4_000 ? { output } : {}),
    ...(Array.isArray(result.handoff?.openQuestions) ? { openQuestions: result.handoff.openQuestions } : {}),
  };
}

function emptyMetrics() {
  return {
    cliCalls: 0,
    interruptCount: 0,
    durationMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    firstAttemptSuccess: false,
  };
}

function mergeWorkflowMetrics(current, child) {
  return {
    ...current,
    cliCalls: current.cliCalls + numberMetric(child.cliCalls),
    interruptCount: current.interruptCount + numberMetric(child.interruptCount),
    durationMs: current.durationMs + numberMetric(child.durationMs),
    inputTokens: current.inputTokens + numberMetric(child.inputTokens),
    outputTokens: current.outputTokens + numberMetric(child.outputTokens),
    totalTokens: current.totalTokens + numberMetric(child.totalTokens),
    costUsd: Number((current.costUsd + numberMetric(child.costUsd)).toFixed(6)),
  };
}

function aggregateWorkflowMetrics(steps) {
  return steps.reduce(
    (metrics, step) => mergeWorkflowMetrics(metrics, step.metrics || {}),
    emptyMetrics(),
  );
}

function publicWorkflowResult(state) {
  return {
    schemaVersion: 1,
    runId: state.runId,
    workflow: state.workflow,
    status: state.status,
    steps: state.steps.map((step) => ({
      loop: step.loop,
      runId: step.runId,
      status: step.status,
      iteration: step.iteration,
      handoff: step.handoff,
    })),
    handoff: state.handoff,
    metrics: state.metrics,
  };
}

function executeDeterministicVerifier(options) {
  if (typeof options.verifier !== 'function') {
    throw new LoopRuntimeError(
      `Loop '${options.loop}' requires an in-process deterministic verifier.`,
      'E_DETERMINISTIC_VERIFIER',
      3,
    );
  }
  const agentId = nextAgentId(options.runDir, 'verifier', options.iteration);
  const agentDir = path.join(options.runDir, 'agents', agentId);
  fs.mkdirSync(agentDir, { recursive: true });
  const startedAt = new Date().toISOString();
  appendRunEvent(options.runDir, options.runId, options.loop, 'agent_started', {
    agentId,
    role: 'verifier',
    host: 'deterministic',
    readOnly: true,
    iteration: options.iteration,
  });
  writeJsonAtomic(path.join(agentDir, 'state.json'), {
    schemaVersion: 1,
    runId: options.runId,
    loop: options.loop,
    iteration: options.iteration,
    agentId,
    host: options.host,
    role: 'verifier',
    executorMode: 'deterministic',
    status: 'running',
    readOnly: true,
    ownedPaths: [],
    startedAt,
  });

  let worktreeBefore;
  let gitControlPlaneBefore;
  let controlPlaneBefore;
  try {
    worktreeBefore = captureWorktreeSnapshot(options.targetDir);
    gitControlPlaneBefore = captureGitControlPlane(options.targetDir);
    controlPlaneBefore = captureRuntimeControlPlane(options.targetDir, agentDir);
  } catch (error) {
    const failure = new LoopRuntimeError(
      `Deterministic verifier boundary snapshot failed: ${error instanceof Error ? error.message : String(error)}`,
      'E_BOUNDARY_CAPTURE',
      3,
      { runId: options.runId, agentId },
    );
    recordRoleInfrastructureFailure({ ...options, role: 'verifier', agentId, authorization: { readOnly: true }, error: failure });
    throw failure;
  }
  let result;
  try {
    result = options.verifier({
      targetDir: options.targetDir,
      input: structuredClone(options.input),
      producerOutput: structuredClone(options.producerOutput),
      runId: options.runId,
      loop: options.loop,
      iteration: options.iteration,
    });
  } catch (error) {
    result = {
      status: 'completed',
      verdict: 'blocked',
      findings: [error instanceof Error ? error.message : String(error)],
      handoff: { summary: 'Deterministic migration verification failed.' },
    };
  }
  let worktreeAfter;
  let gitControlPlaneAfter;
  let controlPlaneAfter;
  try {
    controlPlaneAfter = captureRuntimeControlPlane(options.targetDir, agentDir);
    worktreeAfter = captureWorktreeSnapshot(options.targetDir);
    gitControlPlaneAfter = captureGitControlPlane(options.targetDir);
  } catch (error) {
    const failure = new LoopRuntimeError(
      `Deterministic verifier boundary capture failed after execution: ${error instanceof Error ? error.message : String(error)}`,
      'E_BOUNDARY_CAPTURE',
      3,
      { runId: options.runId, agentId },
    );
    recordRoleInfrastructureFailure({ ...options, role: 'verifier', agentId, authorization: { readOnly: true }, error: failure });
    throw failure;
  }
  const gitControlPlaneChanges = compareGitControlPlane(gitControlPlaneBefore, gitControlPlaneAfter);
  const committedPaths = committedPathsBetween(options.targetDir, gitControlPlaneBefore, gitControlPlaneAfter);
  const changedPaths = [...new Set([
    ...compareWorktreeSnapshots(worktreeBefore, worktreeAfter),
    ...committedPaths,
  ])].sort();
  const controlPlaneChanges = compareWorktreeSnapshots(controlPlaneBefore, controlPlaneAfter);
  const boundaryFindings = [
    ...evaluatePathBoundary({
      role: 'verifier',
      readOnly: true,
      changedPaths,
      allowedPaths: [],
      forbiddenPaths: options.input.forbiddenPaths,
    }),
    ...evaluateGitControlPlaneBoundary({
      loop: options.loop,
      readOnly: true,
      authorization: { commit: false, merge: false },
      before: gitControlPlaneBefore,
      after: gitControlPlaneAfter,
      changes: gitControlPlaneChanges,
    }),
    ...controlPlaneChanges.map((changedPath) => `Deterministic verifier changed runtime control plane path '.harness-hub/state/${changedPath}'.`),
  ];
  if (boundaryFindings.length > 0) {
    result = {
      status: 'completed',
      verdict: 'blocked',
      findings: [...(Array.isArray(result?.findings) ? result.findings : []), ...boundaryFindings],
      handoff: { summary: 'Deterministic verifier violated its read-only boundary.' },
    };
  }
  const roleStatus = boundaryFindings.length > 0 || result?.verdict === 'blocked'
    ? 'blocked'
    : (result?.status === 'completed' ? 'completed' : 'failed');
  const state = {
    schemaVersion: 1,
    runId: options.runId,
    loop: options.loop,
    iteration: options.iteration,
    agentId,
    host: options.host,
    role: 'verifier',
    executorMode: 'deterministic',
    status: roleStatus,
    readOnly: true,
    ownedPaths: [],
    result,
    boundary: { changedPaths, findings: boundaryFindings },
    gitControlPlane: { before: gitControlPlaneBefore, after: gitControlPlaneAfter, changes: gitControlPlaneChanges },
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(path.join(agentDir, 'state.json'), state);
  appendJsonl(path.join(agentDir, 'events.jsonl'), {
    schemaVersion: 1,
    event: `agent_${roleStatus}`,
    generatedAt: state.updatedAt,
    agentId,
    host: options.host,
    role: 'verifier',
    executorMode: 'deterministic',
    iteration: options.iteration,
    stateSha256: hashFile(path.join(agentDir, 'state.json')),
  });
  appendRunEvent(options.runDir, options.runId, options.loop, `agent_${roleStatus}`, {
    agentId,
    role: 'verifier',
    executorMode: 'deterministic',
    iteration: options.iteration,
    stateSha256: hashFile(path.join(agentDir, 'state.json')),
  });
  return { agentId, result, trace: null, boundaryFindings };
}

function executeRole(options) {
  const agentId = nextAgentId(options.runDir, options.role, options.iteration);
  const agentDir = path.join(options.runDir, 'agents', agentId);
  const schemaPath = path.join(agentDir, 'output-schema.json');
  const outputPath = path.join(agentDir, 'output.json');
  fs.mkdirSync(agentDir, { recursive: true });
  writeJsonAtomic(schemaPath, options.responseSchema);
  const authorization = roleAuthorization(options);

  const prompt = {
    schemaVersion: 1,
    loop: {
      id: options.loop,
      objective: options.contract.objective,
      skills: options.contract.skills,
      successCriteria: options.contract.successCriteria,
    },
    role: options.role,
    roleObjective: options.contract[options.role].objective,
    iteration: options.iteration,
    task: options.input.task,
    targetSpec: options.input.targetSpec,
    acceptanceCriteria: options.input.acceptanceCriteria,
    allowedPaths: options.input.allowedPaths,
    forbiddenPaths: options.input.forbiddenPaths,
    validationCommands: options.input.validationCommands,
    lifecycleContext: options.input.context,
    authorization,
    ...options.context,
    responseContract: options.responseSchema,
  };
  const startedAt = new Date().toISOString();
  appendRunEvent(options.runDir, options.runId, options.loop, 'agent_started', {
    agentId,
    role: options.role,
    host: options.host,
    readOnly: options.readOnly,
    iteration: options.iteration,
  });
  writeJsonAtomic(path.join(agentDir, 'state.json'), {
    schemaVersion: 1,
    runId: options.runId,
    loop: options.loop,
    iteration: options.iteration,
    agentId,
    host: options.host,
    role: options.role,
    status: 'running',
    readOnly: options.readOnly,
    authorization,
    ownedPaths: options.readOnly ? [] : options.input.allowedPaths,
    startedAt,
  });

  let leasePath = null;
  let leaseChangedPaths = [];
  let leaseFindings = [];
  try {
    const worktreeBefore = captureWorktreeSnapshot(options.targetDir);
    const gitControlPlaneBefore = captureGitControlPlane(options.targetDir);
    leasePath = options.readOnly || options.input.allowedPaths.length === 0
      ? null
      : grantPathLease({
      targetDir: options.targetDir,
      runDir: options.runDir,
      runId: options.runId,
      agentId,
      ownedPaths: options.input.allowedPaths,
      forbiddenPaths: options.input.forbiddenPaths,
    });

    const controlPlaneBefore = captureRuntimeControlPlane(options.targetDir, agentDir);
    const trace = invokeHost({
    host: options.host,
    targetDir: options.targetDir,
    outputPath,
    schemaPath,
    tracePath: path.join(agentDir, 'trace.jsonl'),
    traceRelativePath: `agents/${agentId}/trace.jsonl`,
    stderrPath: path.join(agentDir, 'stderr.log'),
    stderrRelativePath: `agents/${agentId}/stderr.log`,
    prompt,
    readOnly: options.readOnly,
  });
    const controlPlaneAfter = captureRuntimeControlPlane(options.targetDir, agentDir);
    const worktreeAfter = captureWorktreeSnapshot(options.targetDir);
    const gitControlPlaneAfter = captureGitControlPlane(options.targetDir);
  const gitControlPlaneChanges = compareGitControlPlane(gitControlPlaneBefore, gitControlPlaneAfter);
  const committedPaths = committedPathsBetween(options.targetDir, gitControlPlaneBefore, gitControlPlaneAfter);
  const changedPaths = [...new Set([
    ...compareWorktreeSnapshots(worktreeBefore, worktreeAfter),
    ...committedPaths,
  ])].sort();
  const controlPlaneChanges = compareWorktreeSnapshots(controlPlaneBefore, controlPlaneAfter);
  const boundaryFindings = [
    ...evaluatePathBoundary({
    role: options.role,
    readOnly: options.readOnly,
    changedPaths,
    allowedPaths: options.input.allowedPaths,
    forbiddenPaths: options.input.forbiddenPaths,
    }),
    ...evaluateGitControlPlaneBoundary({
      loop: options.loop,
      readOnly: options.readOnly,
      authorization,
      before: gitControlPlaneBefore,
      after: gitControlPlaneAfter,
      changes: gitControlPlaneChanges,
    }),
    ...migrationCommandFindings(options, trace),
    ...runtimeControlPlaneFindings(options, controlPlaneChanges),
  ];
  leaseChangedPaths = changedPaths;
  leaseFindings = boundaryFindings;
  const traceFailed = trace.error || trace.exitCode !== 0 || trace.eventCount === 0 || trace.invalidEventCount > 0;
  if (traceFailed) {
    const failureCode = trace.eventCount === 0 || trace.invalidEventCount > 0 ? 'E_TRACE_MISSING' : 'E_HOST_FAILED';
    const failureMessage = trace.eventCount === 0 || trace.invalidEventCount > 0
      ? `${options.host} ${options.role} did not produce a valid directly captured process trace (${trace.eventCount} valid, ${trace.invalidEventCount} invalid events; launcher ${trace.launcher?.executable || 'unknown'}).`
      : trace.error
        ? `${options.host} ${options.role} failed: ${trace.error}`
        : `${options.host} ${options.role} failed with exit code ${trace.exitCode}.`;
    const state = {
      schemaVersion: 1,
      runId: options.runId,
      loop: options.loop,
      iteration: options.iteration,
      agentId,
      host: options.host,
      role: options.role,
      status: 'failed',
      readOnly: options.readOnly,
      authorization,
      ownedPaths: options.readOnly ? [] : options.input.allowedPaths,
      trace,
      failure: { code: failureCode, message: failureMessage },
      boundary: { changedPaths, findings: boundaryFindings },
      gitControlPlane: { before: gitControlPlaneBefore, after: gitControlPlaneAfter, changes: gitControlPlaneChanges },
      updatedAt: new Date().toISOString(),
    };
    writeJsonAtomic(path.join(agentDir, 'state.json'), state);
    appendRoleFailureEvents(options, agentId, state);
    throw new LoopRuntimeError(
      failureMessage,
      failureCode,
      3,
      { runId: options.runId, agentId, trace, boundaryFindings },
    );
  }

  let result;
  try {
    result = readJson(outputPath);
  } catch (error) {
    const failureMessage = `${options.host} ${options.role} did not return valid structured output: ${error.message}`;
    const state = {
      schemaVersion: 1,
      runId: options.runId,
      loop: options.loop,
      iteration: options.iteration,
      agentId,
      host: options.host,
      role: options.role,
      status: 'failed',
      readOnly: options.readOnly,
      authorization,
      ownedPaths: options.readOnly ? [] : options.input.allowedPaths,
      trace,
      failure: { code: 'E_HOST_OUTPUT', message: failureMessage },
      boundary: { changedPaths, findings: boundaryFindings },
      gitControlPlane: { before: gitControlPlaneBefore, after: gitControlPlaneAfter, changes: gitControlPlaneChanges },
      updatedAt: new Date().toISOString(),
    };
    writeJsonAtomic(path.join(agentDir, 'state.json'), state);
    appendRoleFailureEvents(options, agentId, state);
    throw new LoopRuntimeError(
      failureMessage,
      'E_HOST_OUTPUT',
      3,
      { runId: options.runId, agentId, trace, boundaryFindings },
    );
  }
  trace.final = {
    path: `agents/${agentId}/output.json`,
    sha256: hashFile(outputPath),
  };
  const roleStatus = boundaryFindings.length > 0
    ? 'blocked'
    : (['completed', 'paused', 'blocked'].includes(result?.status) ? result.status : 'failed');
  const state = {
    schemaVersion: 1,
    runId: options.runId,
    loop: options.loop,
    iteration: options.iteration,
    agentId,
    host: options.host,
    role: options.role,
    status: roleStatus,
    readOnly: options.readOnly,
    authorization,
    ownedPaths: options.readOnly ? [] : options.input.allowedPaths,
    trace,
    result,
    boundary: { changedPaths, findings: boundaryFindings },
    gitControlPlane: { before: gitControlPlaneBefore, after: gitControlPlaneAfter, changes: gitControlPlaneChanges },
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(path.join(agentDir, 'state.json'), state);
  appendJsonl(path.join(agentDir, 'events.jsonl'), {
    schemaVersion: 1,
    event: `agent_${roleStatus}`,
    generatedAt: state.updatedAt,
    agentId,
    host: options.host,
    role: options.role,
    iteration: options.iteration,
    stateSha256: hashFile(path.join(agentDir, 'state.json')),
  });
  appendRunEvent(options.runDir, options.runId, options.loop, `agent_${roleStatus}`, {
    agentId,
    role: options.role,
    iteration: options.iteration,
    stateSha256: hashFile(path.join(agentDir, 'state.json')),
  });
  return {
    agentId,
    result,
    trace,
    boundaryFindings,
    statePath: path.join(agentDir, 'state.json'),
    runDir: options.runDir,
    runId: options.runId,
    loop: options.loop,
  };
  } catch (error) {
    const failure = error instanceof LoopRuntimeError
      ? error
      : new LoopRuntimeError(
        `${options.host} ${options.role} execution boundary failed: ${error instanceof Error ? error.message : String(error)}`,
        'E_BOUNDARY_CAPTURE',
        3,
        { runId: options.runId, agentId },
      );
    failure.details.runId = failure.details.runId || options.runId;
    failure.details.agentId = failure.details.agentId || agentId;
    recordRoleInfrastructureFailure({ ...options, agentId, authorization, error: failure });
    throw failure;
  } finally {
    if (leasePath) {
      try {
        releasePathLease(leasePath, leaseChangedPaths, leaseFindings);
      } catch (error) {
        try {
          fs.rmSync(leasePath, { force: true });
        } catch {
          // The failure below is authoritative; never leave a successful state.
        }
        const failure = new LoopRuntimeError(
          `Path lease release failed for '${path.basename(leasePath)}': ${error instanceof Error ? error.message : String(error)}`,
          'E_STATE',
          3,
          { runId: options.runId, agentId, leasePath },
        );
        recordRoleInfrastructureFailure({ ...options, agentId, authorization, error: failure });
        throw failure;
      }
    }
  }
}

function roleAuthorization(options) {
  return {
    readOnly: options.readOnly,
    commit: false,
    remoteWrites: false,
    merge: false,
    userAcceptanceMayBeInferred: false,
  };
}

function migrationCommandFindings(options, trace) {
  if (options.loop !== 'repository-migration-loop' || options.role !== 'producer') {
    return [];
  }
  const expected = options.input.context?.migrationCopy?.command;
  if (typeof expected !== 'string' || !expected.trim()) {
    return ['repository-migration-loop has no approved internal copy command.'];
  }
  const executions = Array.isArray(trace.commandExecutions) ? trace.commandExecutions : [];
  const unexpectedActivity = Array.isArray(trace.unexpectedToolActivity) ? trace.unexpectedToolActivity : [];
  if (unexpectedActivity.length > 0) {
    return [`repository-migration-loop must not use other tools; observed ${unexpectedActivity.join(', ')}.`];
  }
  if (executions.length !== 1) {
    return [`repository-migration-loop must execute exactly one approved copy command; observed ${executions.length}.`];
  }
  const execution = executions[0];
  const findings = [];
  const expectedTool = options.input.context?.migrationCopy?.tool;
  if (options.host === 'claude' && execution.tool !== expectedTool) {
    findings.push('repository-migration-loop used a shell tool other than the approved platform tool.');
  }
  const observedCommand = options.host === 'codex'
    ? unwrapCodexShellCommand(execution.command)
    : execution.command;
  if (observedCommand !== expected) {
    findings.push('repository-migration-loop executed a command other than the approved byte-copy command.');
  }
  if (execution.status !== 'completed' || (execution.exitCode !== null && execution.exitCode !== 0)) {
    findings.push('repository-migration-loop approved byte-copy command did not complete successfully.');
  }
  return findings;
}

function unwrapCodexShellCommand(command) {
  const argv = parseShellJoinedCommand(command);
  if (!argv || argv.length < 3) return null;
  const executable = path.basename(argv[0]).toLowerCase().replace(/\.exe$/, '');
  if (['bash', 'sh', 'zsh'].includes(executable)
    && argv.length === 3
    && ['-c', '-lc'].includes(argv[1])) {
    return argv[2];
  }
  if (['powershell', 'pwsh'].includes(executable)) {
    if (argv.length === 3 && argv[1].toLowerCase() === '-command') return argv[2];
    if (argv.length === 4
      && argv[1].toLowerCase() === '-noprofile'
      && argv[2].toLowerCase() === '-command') return argv[3];
  }
  return null;
}

function parseShellJoinedCommand(command) {
  if (typeof command !== 'string') return null;
  const argv = [];
  let token = '';
  let tokenStarted = false;
  let quote = null;
  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];
    if (quote === "'") {
      if (character === "'") quote = null;
      else token += character;
      continue;
    }
    if (quote === '"') {
      if (character === '"') quote = null;
      else if (character === '\\' && index + 1 < command.length) token += command[++index];
      else token += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      tokenStarted = true;
    } else if (/\s/.test(character)) {
      if (tokenStarted) {
        argv.push(token);
        token = '';
        tokenStarted = false;
      }
    } else if (character === '\\' && index + 1 < command.length) {
      token += command[++index];
      tokenStarted = true;
    } else {
      token += character;
      tokenStarted = true;
    }
  }
  if (quote !== null) return null;
  if (tokenStarted) argv.push(token);
  return argv;
}

function runtimeControlPlaneFindings(options, changedPaths) {
  const allowedReceipt = options.loop === 'repository-migration-loop' && options.role === 'producer'
    ? `runs/${options.runId}/migration-copy-receipt.json`
    : null;
  return changedPaths
    .filter((changedPath) => changedPath !== allowedReceipt)
    .map((changedPath) => `CLI Agent changed runtime control plane path '.harness-hub/state/${changedPath}'.`);
}

function recordRoleInfrastructureFailure(options) {
  const statePath = path.join(options.runDir, 'agents', options.agentId, 'state.json');
  const previous = readOptionalJson(statePath) || {
    schemaVersion: 1,
    runId: options.runId,
    loop: options.loop,
    iteration: options.iteration,
    agentId: options.agentId,
    host: options.host,
    role: options.role,
    readOnly: options.readOnly ?? true,
    authorization: options.authorization,
    ownedPaths: options.readOnly ? [] : options.input?.allowedPaths || [],
  };
  if (previous.status === 'failed' && previous.failure?.code === options.error.code) return;
  const state = {
    ...previous,
    status: 'failed',
    failure: { code: options.error.code, message: options.error.message },
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(statePath, state);
  appendRoleFailureEvents(options, options.agentId, state);
}

function appendRoleFailureEvents(options, agentId, state) {
  const event = {
    schemaVersion: 1,
    event: 'agent_failed',
    generatedAt: state.updatedAt,
    agentId,
    host: options.host,
    role: options.role,
    iteration: options.iteration,
    failure: state.failure,
    stateSha256: hashFile(path.join(options.runDir, 'agents', agentId, 'state.json')),
  };
  appendJsonl(path.join(options.runDir, 'agents', agentId, 'events.jsonl'), event);
  appendRunEvent(options.runDir, options.runId, options.loop, 'agent_failed', {
    agentId,
    role: options.role,
    iteration: options.iteration,
    failure: state.failure,
    stateSha256: event.stateSha256,
  });
}

function normalizeRecoverableAgentFailure(error, roleLabel) {
  if (!(error instanceof LoopRuntimeError)
    || !['E_HOST_FAILED', 'E_HOST_OUTPUT', 'E_TRACE_MISSING'].includes(error.code)) {
    throw error;
  }
  return {
    agentId: typeof error.details.agentId === 'string' ? error.details.agentId : null,
    trace: error.details.trace || null,
    boundaryFindings: Array.isArray(error.details.boundaryFindings) ? error.details.boundaryFindings : [],
    findings: [`${roleLabel} failed: ${error.message}`],
  };
}

function nextAgentId(runDir, role, iteration) {
  const base = `${role}-${iteration}`;
  const agentsDir = path.join(runDir, 'agents');
  if (!fs.existsSync(path.join(agentsDir, base))) {
    return base;
  }
  for (let resume = 1; resume <= 100; resume += 1) {
    const candidate = `${base}-resume-${resume}`;
    if (!fs.existsSync(path.join(agentsDir, candidate))) {
      return candidate;
    }
  }
  throw new LoopRuntimeError(`Too many resume attempts for ${base}.`, 'E_STATE', 3);
}

function captureWorktreeSnapshot(targetDir) {
  let changedNames;
  let untrackedNames;
  let ignoredNames;
  try {
    changedNames = readGitPathList(targetDir, ['diff', '--name-only', '-z', 'HEAD', '--']);
    untrackedNames = readGitPathList(targetDir, ['ls-files', '--others', '--exclude-standard', '-z']);
    ignoredNames = readGitPathList(targetDir, ['ls-files', '--others', '--ignored', '--exclude-standard', '-z']);
  } catch (error) {
    throw new LoopRuntimeError(
      `Executable Loops require a Git worktree with a valid HEAD: ${error.message}`,
      'E_TARGET_GIT',
      3,
    );
  }
  const normalizePaths = (items) => [...new Set(items)]
    .map((item) => item.replaceAll('\\', '/'))
    .filter((item) => item && item !== '.harness-hub/state' && !item.startsWith('.harness-hub/state/'))
    .sort();
  const contentPaths = normalizePaths([...changedNames, ...untrackedNames]);
  const paths = normalizePaths([...contentPaths, ...ignoredNames]);
  const pathStates = Object.fromEntries(paths.map((relativePath) => [relativePath, hashPathState(path.join(targetDir, relativePath))]));
  return {
    paths: pathStates,
    contentPaths: Object.fromEntries(contentPaths.map((relativePath) => [relativePath, hashGitWorktreeContent(targetDir, relativePath)])),
  };
}

function captureRuntimeControlPlane(targetDir, excludedAgentDir) {
  const stateRoot = path.join(targetDir, '.harness-hub', 'state');
  const excluded = path.resolve(excludedAgentDir);
  const paths = {};
  const visit = (current) => {
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!stat) {
      return;
    }
    const resolved = path.resolve(current);
    if (resolved === excluded || resolved.startsWith(`${excluded}${path.sep}`)) {
      return;
    }
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        visit(path.join(current, entry));
      }
      return;
    }
    const relativePath = path.relative(stateRoot, current).replaceAll('\\', '/');
    paths[relativePath] = hashPathState(current);
  };
  visit(stateRoot);
  return { paths };
}

export function captureGitControlPlane(targetDir) {
  const gitDir = resolveGitPath(targetDir, ['rev-parse', '--absolute-git-dir']);
  const commonDir = resolveGitPath(targetDir, ['rev-parse', '--git-common-dir']);
  const excludePath = resolveGitPath(targetDir, ['rev-parse', '--git-path', 'info/exclude']);
  const paths = {};
  captureGitPath(paths, 'worktree:HEAD', path.join(gitDir, 'HEAD'));
  paths['worktree:index'] = hashText(readGitText(targetDir, ['ls-files', '--stage', '-z']));
  captureGitPath(paths, 'worktree:config.worktree', path.join(gitDir, 'config.worktree'));
  captureGitPath(paths, 'common:config', path.join(commonDir, 'config'));
  captureGitPath(paths, 'common:info/exclude', excludePath);
  captureGitPath(paths, 'common:packed-refs', path.join(commonDir, 'packed-refs'));
  for (const name of gitTransientControlFiles(gitDir)) {
    captureGitPath(paths, `worktree:${name}`, path.join(gitDir, name));
  }
  captureGitTree(paths, 'worktree:refs', path.join(gitDir, 'refs'));
  captureGitTree(paths, 'common:refs', path.join(commonDir, 'refs'));
  captureGitTree(paths, 'worktree:logs', path.join(gitDir, 'logs'));
  captureGitTree(paths, 'common:logs', path.join(commonDir, 'logs'));
  captureGitTree(paths, 'common:hooks', path.join(commonDir, 'hooks'));
  captureGitTree(paths, 'worktree:rebase-merge', path.join(gitDir, 'rebase-merge'));
  captureGitTree(paths, 'worktree:rebase-apply', path.join(gitDir, 'rebase-apply'));
  captureGitTree(paths, 'worktree:sequencer', path.join(gitDir, 'sequencer'));
  return {
    schemaVersion: 1,
    gitDir,
    commonDir,
    head: readGitText(targetDir, ['rev-parse', 'HEAD']),
    symbolicHead: readOptionalGitText(targetDir, ['symbolic-ref', '-q', 'HEAD']),
    paths,
  };
}

export function compareGitControlPlane(before, after) {
  const changes = [];
  if (before.head !== after.head) changes.push('head');
  if (before.symbolicHead !== after.symbolicHead) changes.push('symbolic-head');
  const paths = new Set([...Object.keys(before.paths), ...Object.keys(after.paths)]);
  for (const gitPath of paths) {
    if (before.paths[gitPath] !== after.paths[gitPath]) {
      changes.push(`path:${gitPath}`);
    }
  }
  return [...new Set(changes)].sort();
}

function resolveGitPath(targetDir, args) {
  const value = readGitText(targetDir, args);
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(targetDir, value);
}

function readGitText(targetDir, args) {
  return execFileSync('git', args, {
    cwd: targetDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  }).trim();
}

function readOptionalGitText(targetDir, args) {
  const result = spawnSync('git', args, {
    cwd: targetDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  return result.status === 0 ? (result.stdout || '').trim() || null : null;
}

function captureGitPath(paths, label, filePath) {
  paths[label] = hashPathState(filePath);
}

function captureGitTree(paths, label, root) {
  const visit = (current) => {
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!stat) return;
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        visit(path.join(current, entry));
      }
      return;
    }
    const relative = path.relative(root, current).replaceAll('\\', '/');
    paths[`${label}/${relative}`] = hashPathState(current);
  };
  visit(root);
}

function gitTransientControlFiles(gitDir) {
  const names = new Set(GIT_TRANSIENT_CONTROL_FILES);
  for (const entry of fs.readdirSync(gitDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.startsWith('BISECT_')) names.add(entry.name);
  }
  return [...names].sort();
}

function readGitPathList(targetDir, args) {
  const output = execFileSync('git', args, {
    cwd: targetDir,
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
  });
  return output.toString('utf8').split('\0').filter(Boolean);
}

function compareWorktreeSnapshots(before, after) {
  const paths = new Set([...Object.keys(before.paths), ...Object.keys(after.paths)]);
  return [...paths]
    .filter((relativePath) => before.paths[relativePath] !== after.paths[relativePath])
    .sort();
}

function committedPathsBetween(targetDir, before, after) {
  if (!before.head || !after.head || before.head === after.head) {
    return [];
  }
  return readGitPathList(targetDir, ['diff', '--name-only', '-z', before.head, after.head, '--'])
    .map((item) => item.replaceAll('\\', '/'));
}

function hashGitWorktreeContent(targetDir, relativePath) {
  const absolutePath = path.join(targetDir, relativePath);
  const stat = fs.lstatSync(absolutePath, { throwIfNoEntry: false });
  if (!stat) return null;
  let result;
  if (stat.isSymbolicLink()) {
    result = spawnSync('git', ['hash-object', '--stdin'], {
      cwd: targetDir,
      input: fs.readlinkSync(absolutePath),
      encoding: 'utf8',
      shell: false,
    });
  } else if (stat.isDirectory()) {
    result = spawnSync('git', ['-C', relativePath, 'rev-parse', 'HEAD'], {
      cwd: targetDir,
      encoding: 'utf8',
      shell: false,
    });
  } else if (stat.isFile()) {
    result = spawnSync('git', ['hash-object', `--path=${relativePath}`, '--', relativePath], {
      cwd: targetDir,
      encoding: 'utf8',
      shell: false,
    });
  }
  return result?.status === 0 && result.stdout.trim()
    ? result.stdout.trim()
    : hashPathState(absolutePath);
}

function evaluateGitControlPlaneBoundary(options) {
  return options.changes.map((change) => (
    `${options.readOnly ? 'Read-only Agent' : 'CLI Agent'} changed Git control plane '${change}' outside its authorization boundary.`
  ));
}

function evaluatePathBoundary(options) {
  const findings = [];
  for (const changedPath of options.changedPaths) {
    if (options.readOnly) {
      findings.push(`Read-only ${options.role} changed '${changedPath}'.`);
      continue;
    }
    const forbidden = options.forbiddenPaths.find((boundary) => pathIsWithin(changedPath, boundary));
    if (forbidden) {
      findings.push(`Producer changed forbidden path '${changedPath}' (boundary '${forbidden}').`);
      continue;
    }
    if (!options.allowedPaths.some((boundary) => pathIsWithin(changedPath, boundary))) {
      findings.push(`Producer changed '${changedPath}' outside its allowed path lease.`);
    }
  }
  return findings;
}

function pathIsWithin(candidate, boundary) {
  return boundary === '.' || candidate === boundary || candidate.startsWith(`${boundary}/`);
}

function grantPathLease(options) {
  const leasesDir = path.join(options.runDir, 'leases');
  fs.mkdirSync(leasesDir, { recursive: true });
  for (const entry of fs.readdirSync(leasesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }
    const existing = readOptionalJson(path.join(leasesDir, entry.name));
    if (!isRecord(existing) || existing.status !== 'active' || !Array.isArray(existing.ownedPaths)) {
      continue;
    }
    for (const ownedPath of options.ownedPaths) {
      const conflict = existing.ownedPaths.find((existingPath) => pathsOverlap(ownedPath, existingPath));
      if (conflict) {
        throw new LoopRuntimeError(
          `Path lease '${ownedPath}' overlaps active lease '${existing.leaseId}' path '${conflict}'.`,
          'E_LEASE_CONFLICT',
          3,
        );
      }
    }
  }
  const leaseId = `${options.agentId}-paths`;
  const leasePath = path.join(leasesDir, `${leaseId}.json`);
  writeJsonAtomic(leasePath, {
    schemaVersion: 1,
    runId: options.runId,
    leaseId,
    agentId: options.agentId,
    ownedPaths: options.ownedPaths,
    forbiddenPaths: options.forbiddenPaths,
    status: 'active',
    grantedAt: new Date().toISOString(),
    baselineHashes: options.ownedPaths.map((ownedPath) => ({
      path: ownedPath,
      sha256: hashPathState(path.join(options.targetDir, ownedPath)),
    })),
  });
  return leasePath;
}

function releasePathLease(leasePath, changedPaths, findings) {
  const lease = readJson(leasePath);
  writeJsonAtomic(leasePath, {
    ...lease,
    status: 'released',
    changedPaths,
    findings,
    releasedAt: new Date().toISOString(),
  });
}

function pathsOverlap(left, right) {
  return pathIsWithin(left, right) || pathIsWithin(right, left);
}

function hashPathState(filePath) {
  const stat = fs.lstatSync(filePath, { throwIfNoEntry: false });
  if (!stat) {
    return null;
  }
  if (stat.isSymbolicLink()) {
    return hashText(`symlink:${fs.readlinkSync(filePath)}`);
  }
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(filePath, { withFileTypes: true })
      .map((entry) => `${entry.name}:${hashPathState(path.join(filePath, entry.name))}`)
      .sort();
    return hashText(`directory:${entries.join('|')}`);
  }
  if (stat.isFile()) {
    return hashFile(filePath);
  }
  return hashText(`other:${stat.mode}:${stat.size}:${stat.mtimeMs}`);
}

function invokeHost(options) {
  const args = options.host === 'codex'
    ? codexInvocationArgs(options)
    : claudeInvocationArgs(options);
  const launcher = resolveHostLauncher(options.host);
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const result = spawnSync(launcher.command, launcher.passArgs ? [...launcher.prefixArgs, ...args] : launcher.prefixArgs, {
    cwd: options.targetDir,
    encoding: 'utf8',
    input: JSON.stringify(options.prompt),
    maxBuffer: 10 * 1024 * 1024,
    timeout: 15 * 60 * 1000,
    env: {
      ...process.env,
      HARNESS_HUB_CHILD_RUN: '1',
      ...(launcher.environment || {}),
      ...(!launcher.passArgs ? { HARNESS_HUB_HOST_ARGS_JSON: JSON.stringify(args) } : {}),
    },
  });
  const finished = Date.now();
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  fs.writeFileSync(options.tracePath, stdout, 'utf8');
  fs.writeFileSync(options.stderrPath, stderr, 'utf8');
  const traceLines = stdout.split(/\r?\n/).filter((line) => line.trim());
  const invalidEventCount = traceLines.filter((line) => {
    try {
      return !isRecord(JSON.parse(line));
    } catch {
      return true;
    }
  }).length;
  const traceEvents = traceLines.flatMap((line) => {
    try {
      const event = JSON.parse(line);
      return isRecord(event) ? [event] : [];
    } catch {
      return [];
    }
  });
  const claudeResultEvent = options.host === 'claude'
    ? [...traceEvents].reverse().find((event) => event.type === 'result')
    : null;
  const hostReportedError = options.host === 'claude' && claudeResultEvent?.is_error === true;
  const commandExecutions = extractCommandExecutions(options.host, traceEvents);
  const unexpectedToolActivity = extractUnexpectedToolActivity(options.host, traceEvents);
  if (options.host === 'claude' && result.status === 0 && !hostReportedError) {
    const resultEvent = [...traceEvents].reverse().find((event) => event.type === 'result' && isRecord(event.structured_output));
    if (resultEvent) {
      writeJsonAtomic(options.outputPath, resultEvent.structured_output);
    }
  }
  const usageEvent = [...traceEvents].reverse().find((event) => isRecord(event.usage));
  const costEvent = [...traceEvents].reverse().find((event) => typeof event.total_cost_usd === 'number');
  return {
    source: 'runtime-captured',
    path: options.traceRelativePath,
    sha256: hashFile(options.tracePath),
    eventCount: traceLines.length - invalidEventCount,
    invalidEventCount,
    command: options.host,
    args,
    launcher: {
      command: launcher.command,
      executable: launcher.executable,
    },
    promptSha256: hashText(JSON.stringify(options.prompt)),
    startedAt,
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    exitCode: hostReportedError && result.status === 0 ? 1 : result.status,
    signal: result.signal,
    stderr: {
      path: options.stderrRelativePath,
      sha256: hashFile(options.stderrPath),
    },
    metrics: {
      ...(usageEvent ? { usage: usageEvent.usage } : {}),
      ...(costEvent ? { costUsd: costEvent.total_cost_usd } : {}),
    },
    commandExecutions,
    unexpectedToolActivity,
    ...(result.error ? { error: result.error.message } : {}),
    ...(hostReportedError ? {
      error: typeof claudeResultEvent.result === 'string' && claudeResultEvent.result.trim()
        ? claudeResultEvent.result.trim()
        : 'Claude Code reported an execution error.',
    } : {}),
  };
}

function extractCommandExecutions(host, traceEvents) {
  if (host === 'codex') {
    return traceEvents.flatMap((event) => {
      const item = isRecord(event.item) ? event.item : null;
      if (event.type !== 'item.completed' || item?.type !== 'command_execution' || typeof item.command !== 'string') {
        return [];
      }
      return [{
        tool: 'command_execution',
        command: item.command,
        status: item.status === 'completed' && item.exit_code === 0 ? 'completed' : 'failed',
        exitCode: typeof item.exit_code === 'number' ? item.exit_code : null,
      }];
    });
  }

  const toolResults = new Map();
  for (const event of traceEvents) {
    const content = Array.isArray(event.message?.content) ? event.message.content : [];
    for (const block of content) {
      if (block?.type === 'tool_result' && typeof block.tool_use_id === 'string') {
        toolResults.set(block.tool_use_id, block.is_error === true ? 'failed' : 'completed');
      }
    }
  }
  return traceEvents.flatMap((event) => {
    const content = Array.isArray(event.message?.content) ? event.message.content : [];
    return content.flatMap((block) => {
      if (block?.type !== 'tool_use'
        || !['Bash', 'PowerShell'].includes(block.name)
        || typeof block.id !== 'string'
        || typeof block.input?.command !== 'string') {
        return [];
      }
      return [{
        tool: block.name,
        command: block.input.command,
        status: toolResults.get(block.id) || 'missing-result',
        exitCode: null,
      }];
    });
  });
}

function extractUnexpectedToolActivity(host, traceEvents) {
  if (host === 'codex') {
    const passiveItems = new Set(['agent_message', 'reasoning', 'error']);
    return traceEvents.flatMap((event) => {
      const item = isRecord(event.item) ? event.item : null;
      if (event.type !== 'item.completed' || typeof item?.type !== 'string'
        || item.type === 'command_execution' || passiveItems.has(item.type)) {
        return [];
      }
      return [item.type];
    });
  }
  return traceEvents.flatMap((event) => {
    const content = Array.isArray(event.message?.content) ? event.message.content : [];
    return content
      .filter((block) => block?.type === 'tool_use' && !['Bash', 'PowerShell'].includes(block.name))
      .map((block) => typeof block.name === 'string' ? block.name : 'unknown-tool');
  });
}

function codexInvocationArgs(options) {
  return options.readOnly
    ? [
      '--ask-for-approval',
      'never',
      'exec',
      '--sandbox',
      'read-only',
      '--ephemeral',
      '--ignore-user-config',
      '--ignore-rules',
      '--disable',
      'hooks',
      '--json',
      '-C',
      options.targetDir,
      '--output-schema',
      options.schemaPath,
      '-o',
      options.outputPath,
      '-',
    ]
    : [
      '--ask-for-approval',
      'never',
      ...(process.platform === 'win32' ? ['-c', 'windows.sandbox=unelevated'] : []),
      'exec',
      '--sandbox',
      'workspace-write',
      '--ephemeral',
      '--ignore-user-config',
      '--ignore-rules',
      '--disable',
      'hooks',
      '--json',
      '-C',
      options.targetDir,
      '--output-schema',
      options.schemaPath,
      '-o',
      options.outputPath,
      '-',
    ];
}

function claudeInvocationArgs(options) {
  const schema = JSON.stringify(readJson(options.schemaPath));
  const migrationLoop = options.readOnly === false && options.prompt?.loop?.id === 'repository-migration-loop';
  const migrationCommand = migrationLoop ? options.prompt?.lifecycleContext?.migrationCopy?.command : null;
  const migrationTool = migrationLoop ? options.prompt?.lifecycleContext?.migrationCopy?.tool : null;
  if (migrationLoop && (typeof migrationCommand !== 'string'
    || !migrationCommand.trim()
    || !['Bash', 'PowerShell'].includes(migrationTool))) {
    throw new LoopRuntimeError('Claude repository migration requires one approved internal copy command.', 'E_INPUT', 2);
  }
  return [
    '-p',
    ...(migrationCommand
      ? [
        '--safe-mode',
        '--setting-sources=',
        '--strict-mcp-config',
        '--mcp-config',
        '{"mcpServers":{}}',
        '--permission-mode',
        'dontAsk',
        '--tools',
        migrationTool,
        '--allowedTools',
        `${migrationTool}(${migrationCommand})`,
      ]
      : options.readOnly
      ? ['--permission-mode', 'plan']
      : ['--permission-mode', 'acceptEdits', '--tools', 'Read,Glob,Grep,Edit,Write']),
    '--no-session-persistence',
    '--output-format',
    'stream-json',
    '--json-schema',
    schema,
    '--verbose',
  ];
}

function resolveHostLauncher(command) {
  if (process.platform !== 'win32') {
    return { command, prefixArgs: [], executable: command, passArgs: true };
  }
  const pathEntries = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const extensions = ['.exe', '.com', '.ps1', '.cmd', '.bat'];
  for (const directory of pathEntries) {
    for (const extension of extensions) {
      const candidate = path.join(directory.replace(/^"|"$/g, ''), `${command}${extension}`);
      if (!fs.statSync(candidate, { throwIfNoEntry: false })?.isFile()) {
        continue;
      }
      if (extension === '.ps1') {
        return {
          command: 'powershell.exe',
          prefixArgs: [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            '$cliArgs = @((ConvertFrom-Json -InputObject $env:HARNESS_HUB_HOST_ARGS_JSON)); & $env:HARNESS_HUB_HOST_EXECUTABLE @cliArgs; exit $LASTEXITCODE',
          ],
          executable: candidate,
          passArgs: false,
          environment: {
            HARNESS_HUB_HOST_EXECUTABLE: candidate,
            HARNESS_HUB_HOST_ARGS_JSON: JSON.stringify([]),
          },
        };
      }
      if (extension === '.cmd' || extension === '.bat') {
        throw new LoopRuntimeError(
          `Refusing shell-string execution for ${candidate}; install an .exe or .ps1 launcher.`,
          'E_HOST_LAUNCHER',
          3,
        );
      }
      return { command: candidate, prefixArgs: [], executable: candidate, passArgs: true };
    }
  }
  throw new LoopRuntimeError(`Host command '${command}' is not available on PATH.`, 'E_HOST_MISSING', 3);
}

function inspectTestLoopPhasePlan(input, targetDir) {
  const findings = [];
  let testPaths = [];
  let implementationPaths = [];
  try {
    testPaths = normalizeRelativePaths(input.context?.testPaths, targetDir, 'input.context.testPaths');
  } catch (error) {
    findings.push(error.message);
  }
  try {
    implementationPaths = normalizeRelativePaths(input.context?.implementationPaths, targetDir, 'input.context.implementationPaths');
  } catch (error) {
    findings.push(error.message);
  }
  if (testPaths.length === 0) findings.push('test-loop requires at least one testPaths boundary for the test-design phase.');
  if (implementationPaths.length === 0) findings.push('test-loop requires at least one implementationPaths boundary for the implementation phase.');
  for (const phasePath of [...testPaths, ...implementationPaths]) {
    if (!input.allowedPaths.some((allowedPath) => pathIsWithin(phasePath, allowedPath))) {
      findings.push(`test-loop phase path '${phasePath}' is outside input.allowedPaths.`);
    }
  }
  for (const testPath of testPaths) {
    for (const implementationPath of implementationPaths) {
      if (pathIsWithin(testPath, implementationPath) || pathIsWithin(implementationPath, testPath)) {
        findings.push(`test-loop test path '${testPath}' overlaps implementation path '${implementationPath}'.`);
      }
    }
  }
  const redFailurePatterns = normalizeContextCommands(input.context?.redFailurePatterns);
  if (input.validationCommands.length === 0) {
    findings.push('test-loop requires at least one validation command used unchanged for both RED and GREEN.');
  }
  if (redFailurePatterns.length !== input.validationCommands.length) {
    findings.push('test-loop requires one non-empty redFailurePatterns entry per validation command.');
  }
  if (Array.isArray(input.context?.redValidationCommands) && input.context.redValidationCommands.length > 0) {
    findings.push('test-loop forbids a separate RED-only command; the identical validation command must prove RED before implementation and GREEN after implementation.');
  }
  return { testPaths, implementationPaths, redFailurePatterns, findings };
}

function validateTestLoopPhasePlan(input, targetDir) {
  return inspectTestLoopPhasePlan(input, targetDir).findings;
}

function executeTestLoopProducerCycle(options) {
  const plan = inspectTestLoopPhasePlan(options.input, options.targetDir);
  const executions = [];
  const validationRuns = [];
  let runState = options.runState;
  const commonContext = {
    ...(options.previousFindings.length > 0 ? { previousFindings: options.previousFindings } : {}),
    ...options.resumeContext,
  };
  let design;
  try {
    runState = updateRunState(options.runDir, runState, { phase: 'test-design' });
    design = executeRole({
      ...options,
      input: { ...options.input, allowedPaths: plan.testPaths },
      role: 'producer',
      readOnly: false,
      responseSchema: producerResponseSchema(TEST_DESIGN_OUTPUT_SCHEMA),
      context: {
        ...commonContext,
        testPhase: 'design-and-write-tests',
        phaseGoal: 'Design the P0/P1/P2 boundary and write only tests. Do not implement the target behavior.',
        nextRuntimeGate: 'The runtime will execute the unchanged validation commands and require a target-specific RED.',
      },
    });
  } catch (error) {
    if (error instanceof LoopRuntimeError) error.details.priorExecutions = executions;
    throw error;
  }
  executions.push(design);
  if (design.result.status !== 'completed' || design.boundaryFindings.length > 0) {
    return { producer: design, executions, validationRuns, runState };
  }
  const testPlan = isRecord(design.result.output) ? design.result.output.testPlan : undefined;
  const red = executeValidationCommands({
    ...options,
    phase: 'red',
    commands: options.input.validationCommands,
    expectedExit: 'nonzero',
    expectedFailurePatterns: plan.redFailurePatterns,
  });
  if (red) validationRuns.push(red);
  runState = updateRunState(options.runDir, runState, {
    phase: 'red-validated',
    validationRuns: [
      ...(Array.isArray(runState.validationRuns) ? runState.validationRuns : []),
      ...validationRuns,
    ],
  });
  if (!red || red.findings.length > 0 || testPlan === undefined) {
    return {
      producer: combineTestLoopProducer(design, null, testPlan, validationRuns),
      executions,
      validationRuns,
      runState,
    };
  }

  let implementation;
  try {
    runState = updateRunState(options.runDir, runState, { phase: 'implementing-after-red' });
    implementation = executeRole({
      ...options,
      input: { ...options.input, allowedPaths: plan.implementationPaths },
      role: 'producer',
      readOnly: false,
      responseSchema: producerResponseSchema(TEST_IMPLEMENTATION_OUTPUT_SCHEMA),
      context: {
        ...commonContext,
        testPhase: 'implementation-after-causal-red',
        phaseGoal: 'Implement only the target behavior needed to satisfy the already-written tests. Do not edit test paths.',
        testPlan: structuredClone(testPlan),
        redEvidence: validationEvidenceFor(validationRuns, 'red'),
      },
    });
  } catch (error) {
    if (error instanceof LoopRuntimeError) error.details.priorExecutions = executions;
    throw error;
  }
  executions.push(implementation);
  if (implementation.result.status !== 'completed' || implementation.boundaryFindings.length > 0) {
    return {
      producer: combineTestLoopProducer(design, implementation, testPlan, validationRuns),
      executions,
      validationRuns,
      runState,
    };
  }
  const green = executeValidationCommands({
    ...options,
    phase: 'green',
    commands: options.input.validationCommands,
    expectedExit: 'zero',
  });
  if (green) validationRuns.push(green);
  runState = updateRunState(options.runDir, runState, {
    phase: 'green-validated',
    validationRuns: [
      ...(Array.isArray(runState.validationRuns) ? runState.validationRuns : []),
      ...(green ? [green] : []),
    ],
  });
  return {
    producer: combineTestLoopProducer(design, implementation, testPlan, validationRuns),
    executions,
    validationRuns,
    runState,
  };
}

function combineTestLoopProducer(design, implementation, testPlan, validationRuns) {
  const finalExecution = implementation || design;
  const status = finalExecution.result.status;
  return {
    ...finalExecution,
    boundaryFindings: [...new Set([
      ...design.boundaryFindings,
      ...(implementation?.boundaryFindings || []),
    ])],
    result: {
      ...finalExecution.result,
      status,
      output: {
        testPlan,
        implementation: isRecord(implementation?.result?.output) ? implementation.result.output : null,
        redEvidence: validationEvidenceFor(validationRuns, 'red'),
        greenEvidence: validationEvidenceFor(validationRuns, 'green'),
        review: { source: 'independent-verifier', status: 'pending' },
      },
    },
  };
}

function validationEvidenceFor(validationRuns, phase) {
  return {
    source: 'runtime-captured',
    validationCommands: validationRuns
      .filter((run) => run.phase === phase)
      .flatMap((run) => run.commands),
  };
}

function executeLoopValidationCommands(options) {
  const validation = executeValidationCommands({
    ...options,
    phase: 'validation',
    commands: options.input.validationCommands,
    expectedExit: 'zero',
  });
  return validation ? [validation] : [];
}

function executeValidationCommands(options) {
  if (!Array.isArray(options.commands) || options.commands.length === 0) {
    return null;
  }
  const commands = [];
  const findings = [];
  const changedPaths = [];
  const gitControlPlaneChanges = [];
  const commandBoundaries = [];
  for (let index = 0; index < options.commands.length; index += 1) {
    const commandSpec = options.commands[index];
    const runtimeProbeDir = path.join(options.targetDir, '.harness-hub', 'state', '__validation__');
    let worktreeBefore;
    let gitControlPlaneBefore;
    let runtimeBefore;
    try {
      worktreeBefore = captureWorktreeSnapshot(options.targetDir);
      gitControlPlaneBefore = captureGitControlPlane(options.targetDir);
      runtimeBefore = captureRuntimeControlPlane(options.targetDir, runtimeProbeDir);
    } catch (error) {
      throw new LoopRuntimeError(
        `Validation command boundary snapshot failed: ${error instanceof Error ? error.message : String(error)}`,
        'E_BOUNDARY_CAPTURE',
        3,
        { validationCommand: commandSpec },
      );
    }
    const started = Date.now();
    const result = spawnSync(commandSpec.command, commandSpec.args, {
      cwd: path.resolve(options.targetDir, commandSpec.cwd),
      encoding: 'utf8',
      shell: false,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 15 * 60 * 1000,
      env: {
        ...process.env,
        HARNESS_HUB_CHILD_RUN: '1',
      },
    });
    const finished = Date.now();
    const commandResult = {
      command: commandSpec.command,
      args: commandSpec.args,
      cwd: commandSpec.cwd,
      exitCode: Number.isInteger(result.status) ? result.status : 1,
      signal: result.signal || null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      startedAt: new Date(started).toISOString(),
      finishedAt: new Date(finished).toISOString(),
      durationMs: finished - started,
      ...(options.expectedFailurePatterns?.[index]
        ? { expectedFailurePattern: options.expectedFailurePatterns[index] }
        : {}),
      ...(result.error ? { error: result.error.message } : {}),
    };
    let worktreeAfter;
    let gitControlPlaneAfter;
    let runtimeAfter;
    try {
      worktreeAfter = captureWorktreeSnapshot(options.targetDir);
      gitControlPlaneAfter = captureGitControlPlane(options.targetDir);
      runtimeAfter = captureRuntimeControlPlane(options.targetDir, runtimeProbeDir);
    } catch (error) {
      throw new LoopRuntimeError(
        `Validation command boundary capture failed after execution: ${error instanceof Error ? error.message : String(error)}`,
        'E_BOUNDARY_CAPTURE',
        3,
        { validationCommand: commandSpec },
      );
    }
    const commandChangedPaths = [...new Set([
      ...compareWorktreeSnapshots(worktreeBefore, worktreeAfter),
      ...committedPathsBetween(options.targetDir, gitControlPlaneBefore, gitControlPlaneAfter),
    ])].sort();
    const commandGitChanges = compareGitControlPlane(gitControlPlaneBefore, gitControlPlaneAfter);
    const runtimeChanges = compareWorktreeSnapshots(runtimeBefore, runtimeAfter);
    const commandFindings = [];
    if (commandResult.error) {
      commandFindings.push(`Validation command '${commandResult.command}' could not run: ${commandResult.error}`);
    } else if (options.expectedExit === 'zero' && commandResult.exitCode !== 0) {
      commandFindings.push(`Validation command '${commandResult.command}' failed with exit code ${commandResult.exitCode}.`);
    } else if (options.expectedExit === 'nonzero' && commandResult.exitCode === 0) {
      commandFindings.push(`RED validation command '${commandResult.command}' unexpectedly passed with exit code 0 before implementation.`);
    } else if (options.expectedExit === 'nonzero'
      && commandResult.expectedFailurePattern
      && !`${commandResult.stdout}\n${commandResult.stderr}`.includes(commandResult.expectedFailurePattern)) {
      commandFindings.push(`RED validation command '${commandResult.command}' did not emit the target-specific failure pattern '${commandResult.expectedFailurePattern}'.`);
    }
    commandFindings.push(
      ...commandChangedPaths.map((changedPath) => `Validation command changed read-only worktree path '${changedPath}'.`),
      ...commandGitChanges.map((change) => `Validation command changed Git control plane '${change}'.`),
      ...runtimeChanges.map((change) => `Validation command changed runtime control plane '${change}'.`),
    );
    commandResult.boundary = {
      changedPaths: commandChangedPaths,
      gitControlPlaneChanges: commandGitChanges,
      runtimeControlPlaneChanges: runtimeChanges,
    };
    commands.push(commandResult);
    findings.push(...commandFindings);
    changedPaths.push(...commandChangedPaths);
    gitControlPlaneChanges.push(...commandGitChanges);
    commandBoundaries.push(commandResult.boundary);
    if (commandFindings.length > 0) break;
  }
  return {
    schemaVersion: 1,
    iteration: options.iteration,
    phase: options.phase,
    expectedExit: options.expectedExit,
    commands,
    boundary: {
      changedPaths: [...new Set(changedPaths)].sort(),
      gitControlPlaneChanges: [...new Set(gitControlPlaneChanges)].sort(),
      commands: commandBoundaries,
    },
    findings,
  };
}

function normalizeContextCommands(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.filter((command) => typeof command === 'string').map((command) => command.trim()).filter(Boolean))];
}

function validateRequiredCommandEvidence(contract, validationRuns) {
  const phases = new Set(validationRuns.filter((run) => run.commands.length > 0).map((run) => run.phase));
  if (contract.id === 'test-loop') {
    return [
      ...(!phases.has('red')
        ? ['test-loop requires at least one runtime-executed RED validation command.']
        : []),
      ...(!phases.has('green')
        ? ['test-loop requires at least one runtime-executed GREEN validation command.']
        : []),
    ];
  }
  if (['implementation-review-loop', 'delivery-loop'].includes(contract.id) && !phases.has('validation')) {
    return [`${contract.id} requires runtime-executed deterministic validationCommands evidence.`];
  }
  return [];
}

function attachRuntimeDeterministicEvidence(options) {
  if (!isRecord(options.producer.result?.output)) {
    return;
  }
  const evidenceFor = (phase) => ({
    source: 'runtime-captured',
    validationCommands: options.validationRuns
      .filter((run) => run.phase === phase)
      .flatMap((run) => run.commands),
  });
  if (options.contract.id === 'test-loop') {
    options.producer.result.output.redEvidence = evidenceFor('red');
    options.producer.result.output.greenEvidence = evidenceFor('green');
  } else if (['implementation-review-loop', 'delivery-loop'].includes(options.contract.id)) {
    options.producer.result.output.deterministicEvidence = evidenceFor('validation');
  } else {
    return;
  }

  const statePath = path.join(options.runDir, 'agents', options.producer.agentId, 'state.json');
  const state = readJson(statePath);
  writeJsonAtomic(statePath, {
    ...state,
    result: options.producer.result,
    deterministicEvidenceSource: 'runtime-captured',
    updatedAt: new Date().toISOString(),
  });
  appendJsonl(path.join(options.runDir, 'agents', options.producer.agentId, 'events.jsonl'), {
    schemaVersion: 1,
    event: 'deterministic_command_evidence_attached',
    generatedAt: new Date().toISOString(),
    agentId: options.producer.agentId,
    phases: options.validationRuns.map((run) => run.phase),
    stateSha256: hashFile(statePath),
  });
}

function attachTestLoopReview(options) {
  if (!isRecord(options.producer.result?.output)) return;
  options.producer.result.output.review = {
    source: 'independent-verifier',
    verdict: options.decision.result.verdict,
    findings: Array.isArray(options.decision.result.findings) ? options.decision.result.findings : [],
  };
  const statePath = path.join(options.runDir, 'agents', options.producer.agentId, 'state.json');
  const state = readJson(statePath);
  writeJsonAtomic(statePath, {
    ...state,
    result: options.producer.result,
    updatedAt: new Date().toISOString(),
  });
}

function performDeliveryCleanup(options) {
  const requested = isRecord(options.input.context?.authorization)
    ? options.input.context.authorization
    : {};
  const evidence = {
    source: 'runtime-owned',
    cleanupPaths: [],
    commit: { status: 'not-authorized' },
  };
  const findings = [];
  let cleanupPaths = [];
  if (requested.cleanupPaths !== undefined) {
    try {
      cleanupPaths = normalizeRelativePaths(requested.cleanupPaths, options.targetDir, 'input.context.authorization.cleanupPaths');
      for (const cleanupPath of cleanupPaths) {
        assertNoLinkedAncestor(options.targetDir, cleanupPath, 'input.context.authorization.cleanupPaths');
        if (!options.input.allowedPaths.some((allowedPath) => pathIsWithin(cleanupPath, allowedPath))) {
          findings.push(`delivery-loop cleanup path '${cleanupPath}' is outside input.allowedPaths.`);
        }
        if (options.input.forbiddenPaths.some((forbiddenPath) => pathsOverlap(cleanupPath, forbiddenPath))) {
          findings.push(`delivery-loop cleanup path '${cleanupPath}' overlaps input.forbiddenPaths.`);
        }
        if (pathsOverlap(cleanupPath, '.git') || pathsOverlap(cleanupPath, '.harness-hub/state')) {
          findings.push(`delivery-loop cleanup path '${cleanupPath}' overlaps protected Git or runtime state.`);
        }
      }
    } catch (error) {
      findings.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (findings.length > 0) return { evidence, findings };

  if (cleanupPaths.length > 0) {
    const clean = runGitAction(options.targetDir, ['clean', '-fdX', '--', ...cleanupPaths]);
    if (clean.status !== 0 || clean.error) {
      findings.push(`delivery-loop runtime cleanup failed: ${clean.error?.message || clean.stderr || `exit ${clean.status}`}`);
      return { evidence, findings };
    }
    evidence.cleanupPaths = cleanupPaths;
  }

  return { evidence, findings };
}

function performDeliveryCommit(options) {
  const requested = isRecord(options.input.context?.authorization)
    ? options.input.context.authorization
    : {};
  const evidence = options.evidence;
  const findings = [];

  if (requested.commit !== true) return { evidence, findings };
  const commitMessage = typeof requested.commitMessage === 'string' ? requested.commitMessage.trim() : '';
  if (!commitMessage) {
    findings.push('delivery-loop runtime commit requires input.context.authorization.commitMessage.');
    return { evidence, findings };
  }
  const stagedBefore = readGitPathList(options.targetDir, ['diff', '--cached', '--name-only', '-z', '--'])
    .map((item) => item.replaceAll('\\', '/'));
  const stagedBeforeForbidden = stagedBefore.filter((relativePath) => options.input.forbiddenPaths.some((forbiddenPath) => pathsOverlap(relativePath, forbiddenPath)));
  if (stagedBeforeForbidden.length > 0) {
    findings.push(`delivery-loop runtime commit found pre-staged forbidden paths: ${stagedBeforeForbidden.join(', ')}.`);
    return { evidence, findings };
  }
  const stagedOutsideScope = stagedBefore.filter((relativePath) => !options.input.allowedPaths.some((allowedPath) => pathIsWithin(relativePath, allowedPath)));
  if (stagedOutsideScope.length > 0) {
    findings.push(`delivery-loop runtime commit found pre-staged paths outside input.allowedPaths: ${stagedOutsideScope.join(', ')}.`);
    return { evidence, findings };
  }

  const reviewedHead = readGitText(options.targetDir, ['rev-parse', 'HEAD']);
  const reviewedWorktree = captureWorktreeSnapshot(options.targetDir);
  const indexPath = resolveGitPath(options.targetDir, ['rev-parse', '--git-path', 'index']);
  const indexBefore = fs.statSync(indexPath, { throwIfNoEntry: false })?.isFile()
    ? fs.readFileSync(indexPath)
    : null;
  const restoreIndex = () => {
    if (indexBefore) {
      fs.writeFileSync(indexPath, indexBefore);
    } else {
      fs.rmSync(indexPath, { force: true });
    }
  };
  const stagePaths = options.input.allowedPaths.filter((relativePath) => (
    fs.statSync(path.join(options.targetDir, relativePath), { throwIfNoEntry: false })
    || readGitPathList(options.targetDir, ['ls-files', '-z', '--', relativePath]).length > 0
  ));
  if (stagePaths.length === 0) {
    evidence.commit = { status: 'not-needed', reviewedHead };
    return { evidence, findings };
  }
  const add = runGitAction(options.targetDir, ['add', '-A', '--', ...stagePaths]);
  if (add.status !== 0 || add.error) {
    restoreIndex();
    findings.push(`delivery-loop runtime staging failed: ${add.error?.message || add.stderr || `exit ${add.status}`}`);
    return { evidence, findings };
  }
  const stagedPaths = readGitPathList(options.targetDir, ['diff', '--cached', '--name-only', '-z', '--'])
    .map((item) => item.replaceAll('\\', '/'))
    .sort();
  const stagedForbidden = stagedPaths.filter((relativePath) => options.input.forbiddenPaths.some((forbiddenPath) => pathsOverlap(relativePath, forbiddenPath)));
  if (stagedForbidden.length > 0) {
    restoreIndex();
    findings.push(`delivery-loop runtime staging reached forbidden paths: ${stagedForbidden.join(', ')}.`);
    return { evidence, findings };
  }
  const stagedAfterOutsideScope = stagedPaths.filter((relativePath) => !options.input.allowedPaths.some((allowedPath) => pathIsWithin(relativePath, allowedPath)));
  if (stagedAfterOutsideScope.length > 0) {
    restoreIndex();
    findings.push(`delivery-loop runtime staging escaped input.allowedPaths: ${stagedAfterOutsideScope.join(', ')}.`);
    return { evidence, findings };
  }
  if (stagedPaths.length === 0) {
    evidence.commit = { status: 'not-needed', reviewedHead };
    return { evidence, findings };
  }
  const reviewedHashes = {};
  for (const relativePath of stagedPaths) {
    if (!Object.prototype.hasOwnProperty.call(reviewedWorktree.contentPaths, relativePath)) {
      findings.push(`delivery-loop runtime staging lacks reviewed bytes for '${relativePath}'.`);
      continue;
    }
    const reviewedHash = reviewedWorktree.contentPaths[relativePath];
    reviewedHashes[relativePath] = reviewedHash;
    const stagedHash = readOptionalGitText(options.targetDir, ['rev-parse', `:${relativePath}`]);
    if (stagedHash !== reviewedHash || hashGitWorktreeContent(options.targetDir, relativePath) !== reviewedHash) {
      findings.push(`delivery-loop staged bytes differ from reviewed bytes at '${relativePath}'.`);
    }
  }
  if (findings.length > 0) {
    restoreIndex();
    return { evidence, findings };
  }

  const hooksDir = path.join(options.runDir, 'runtime-hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  const commit = runGitAction(options.targetDir, [
    '-c', `core.hooksPath=${hooksDir}`,
    'commit',
    '--no-gpg-sign',
    '-m', commitMessage,
  ]);
  if (commit.status !== 0 || commit.error) {
    const failedHead = readGitText(options.targetDir, ['rev-parse', 'HEAD']);
    if (failedHead === reviewedHead) restoreIndex();
    evidence.commit = { status: 'failed', reviewedHead, head: failedHead };
    findings.push(`delivery-loop runtime commit failed: ${commit.error?.message || commit.stderr || `exit ${commit.status}`}`);
    return { evidence, findings };
  }

  const committedHead = readGitText(options.targetDir, ['rev-parse', 'HEAD']);
  const commitAndParents = readGitText(options.targetDir, ['rev-list', '--parents', '-n', '1', committedHead]).split(/\s+/);
  const committedPaths = committedPathsBetween(
    options.targetDir,
    { head: reviewedHead },
    { head: committedHead },
  ).sort();
  if (commitAndParents.length !== 2 || commitAndParents[1] !== reviewedHead) {
    findings.push('delivery-loop runtime commit is not one non-merge commit directly on the reviewed HEAD.');
  }
  if (JSON.stringify(committedPaths) !== JSON.stringify(stagedPaths)) {
    findings.push('delivery-loop runtime commit paths differ from the reviewed staged paths.');
  }
  for (const relativePath of stagedPaths) {
    const reviewedHash = reviewedHashes[relativePath];
    const committedHash = readOptionalGitText(options.targetDir, ['rev-parse', `${committedHead}:${relativePath}`]);
    if (committedHash !== reviewedHash || hashGitWorktreeContent(options.targetDir, relativePath) !== reviewedHash) {
      findings.push(`delivery-loop runtime commit changed reviewed bytes at '${relativePath}'.`);
    }
  }
  evidence.commit = {
    status: findings.length === 0 ? 'committed' : 'invalid',
    reviewedHead,
    head: committedHead,
    paths: committedPaths,
  };
  return { evidence, findings };
}

function runGitAction(targetDir, args) {
  return spawnSync('git', args, {
    cwd: targetDir,
    encoding: 'utf8',
    shell: false,
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

function attachDeliveryRuntimeTruth(options) {
  const output = options.producer.result.output;
  if (!isRecord(output)) return { findings: ['delivery-loop output must be an object.'], evidence: null };
  const status = readGitPathList(options.targetDir, ['status', '--porcelain=v1', '-z']);
  const head = readGitText(options.targetDir, ['rev-parse', 'HEAD']);
  const symbolicHead = readOptionalGitText(options.targetDir, ['symbolic-ref', '-q', '--short', 'HEAD']);
  const upstream = readOptionalGitText(options.targetDir, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  const local = {
    source: 'runtime-captured',
    head,
    symbolicHead,
    upstream,
    clean: status.length === 0,
    changedEntries: status,
  };
  const remoteDeclaration = isRecord(options.input.context?.remoteDelivery)
    ? options.input.context.remoteDelivery
    : {};
  const findings = [];
  const pullRequest = remoteDeclaration.pullRequest === true
    ? runReadOnlyJsonProbe(options.targetDir, 'gh', ['pr', 'view', '--json', 'number,url,state,mergeable,headRefName,headRefOid,baseRefName'], 'pull request', findings)
    : { source: 'runtime-policy', status: 'not-applicable' };
  const ci = remoteDeclaration.ci === true
    ? runReadOnlyJsonProbe(options.targetDir, 'gh', ['pr', 'checks', '--json', 'name,state,link,bucket,workflow'], 'CI checks', findings)
    : { source: 'runtime-policy', status: 'not-applicable' };
  if (remoteDeclaration.pullRequest === true && pullRequest.status === 'captured') {
    const pr = pullRequest.value;
    const state = typeof pr?.state === 'string' ? pr.state.toUpperCase() : 'UNKNOWN';
    if (state !== 'OPEN') {
      findings.push(`delivery-loop pull request state is '${state}', not OPEN.`);
    }
    if (!isRecord(pr) || typeof pr.headRefOid !== 'string' || !pr.headRefOid.trim()) {
      findings.push('delivery-loop pull request probe is missing headRefOid evidence.');
    } else if (pr.headRefOid !== head) {
      findings.push(`delivery-loop pull request headRefOid '${pr.headRefOid}' does not match local HEAD '${head}'.`);
    }
    const mergeable = typeof pr?.mergeable === 'string' ? pr.mergeable.toUpperCase() : 'UNKNOWN';
    if (mergeable !== 'MERGEABLE') {
      findings.push(`delivery-loop pull request mergeable state is '${mergeable}', not MERGEABLE.`);
    }
  }
  if (remoteDeclaration.ci === true && ci.status === 'captured') {
    const checks = Array.isArray(ci.value) ? ci.value : [];
    if (checks.length === 0) {
      findings.push('delivery-loop CI probe returned no successful checks.');
    }
    for (const check of checks) {
      const bucket = typeof check?.bucket === 'string' ? check.bucket.toLowerCase() : '';
      const state = typeof check?.state === 'string' ? check.state.toUpperCase() : 'UNKNOWN';
      if (bucket !== 'pass' || state !== 'SUCCESS') {
        findings.push(`delivery-loop CI check '${check?.name || 'unnamed'}' is not successful (state=${state}, bucket=${bucket || 'unknown'}).`);
      }
    }
  }
  const producerStatePath = path.join(options.runDir, 'agents', options.producer.agentId, 'state.json');
  const producerState = readJson(producerStatePath);
  output.git = local;
  output.pullRequest = pullRequest;
  output.ci = ci;
  output.authorization = {
    source: 'runtime-enforced',
    commit: options.localActions?.commit?.status === 'committed',
    remoteWrites: producerState.authorization?.remoteWrites === true,
    merge: producerState.authorization?.merge === true,
  };
  const evidence = { localActions: options.localActions, local, pullRequest, ci, authorization: output.authorization };
  writeJsonAtomic(producerStatePath, {
    ...producerState,
    result: options.producer.result,
    deliveryRuntimeTruth: evidence,
    updatedAt: new Date().toISOString(),
  });
  return { findings, evidence };
}

function runReadOnlyJsonProbe(targetDir, command, args, label, findings) {
  let launcher;
  try {
    launcher = resolveHostLauncher(command);
  } catch (error) {
    findings.push(`delivery-loop ${label} read-only probe failed: ${error.message}`);
    return { source: 'runtime-probe', status: 'blocked' };
  }
  const result = spawnSync(launcher.command, launcher.passArgs ? [...launcher.prefixArgs, ...args] : launcher.prefixArgs, {
    cwd: targetDir,
    encoding: 'utf8',
    shell: false,
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      ...(launcher.environment || {}),
      ...(!launcher.passArgs ? { HARNESS_HUB_HOST_ARGS_JSON: JSON.stringify(args) } : {}),
    },
  });
  if (result.error || result.status !== 0) {
    findings.push(`delivery-loop ${label} read-only probe failed: ${result.error?.message || result.stderr || `exit ${result.status}`}`);
    return { source: 'runtime-probe', status: 'blocked' };
  }
  try {
    return { source: 'runtime-probe', status: 'captured', value: JSON.parse(result.stdout) };
  } catch (error) {
    findings.push(`delivery-loop ${label} probe returned invalid JSON: ${error.message}`);
    return { source: 'runtime-probe', status: 'blocked' };
  }
}

function validateLoopDeterministicOutput(options) {
  if (options.contract.id === 'report-loop') {
    return materializeEffectiveInteractReport(options);
  }
  if (!['knowledge-init-loop', 'knowledge-maintain-loop'].includes(options.contract.id)) {
    return null;
  }
  const knowledgeRoot = isRecord(options.producer.result.output)
    && typeof options.producer.result.output.knowledgeRoot === 'string'
    && options.producer.result.output.knowledgeRoot.trim()
    ? options.producer.result.output.knowledgeRoot.trim()
    : typeof options.input.context.knowledgeRoot === 'string' && options.input.context.knowledgeRoot.trim()
      ? options.input.context.knowledgeRoot.trim()
      : 'knowledge';
  let report;
  try {
    report = validateOkf({
      targetDir: options.targetDir,
      knowledgeRoot,
      ...(typeof options.forbidKnowledgeTree === 'string'
        ? { forbidTree: options.forbidKnowledgeTree }
        : {}),
    });
  } catch (error) {
    report = {
      schemaVersion: 1,
      ok: false,
      status: 'blocked',
      fileCount: 0,
      conceptCount: 0,
      sourceCount: 0,
      findings: [{ id: 'okf-validator-error', path: knowledgeRoot, message: error.message }],
    };
  }
  const maintenanceAlignment = options.contract.id === 'knowledge-maintain-loop'
    ? validateKnowledgeMaintainAlignment({ ...options, knowledgeRoot })
    : null;
  const alignmentFindings = maintenanceAlignment?.findings || [];
  const ok = report.ok && alignmentFindings.length === 0;
  const deterministicValidation = {
    kind: 'google-okf-v0.1',
    status: ok ? 'pass' : 'blocked',
    fileCount: report.fileCount,
    conceptCount: report.conceptCount || 0,
    sourceCount: report.sourceCount,
    findings: [
      ...report.findings,
      ...alignmentFindings.map((message) => ({ id: 'knowledge-maintenance-alignment', path: knowledgeRoot, message })),
    ],
    ...(maintenanceAlignment ? { maintenanceAlignment } : {}),
  };
  const statePath = path.join(options.runDir, 'agents', options.producer.agentId, 'state.json');
  const state = readJson(statePath);
  writeJsonAtomic(statePath, {
    ...state,
    status: ok ? state.status : 'blocked',
    deterministicValidation,
    updatedAt: new Date().toISOString(),
  });
  appendJsonl(path.join(options.runDir, 'agents', options.producer.agentId, 'events.jsonl'), {
    schemaVersion: 1,
    event: 'deterministic_validation_completed',
    generatedAt: new Date().toISOString(),
    agentId: options.producer.agentId,
    kind: deterministicValidation.kind,
    status: deterministicValidation.status,
    stateSha256: hashFile(statePath),
  });
  return {
    report: deterministicValidation,
    findings: [
      ...report.findings.map((item) => `OKF ${item.id} at '${item.path}': ${item.message}`),
      ...alignmentFindings.map((message) => `Knowledge maintenance alignment: ${message}`),
    ],
  };
}

function validateKnowledgeMaintainAlignment(options) {
  const output = options.producer.result.output;
  const state = readJson(path.join(options.runDir, 'agents', options.producer.agentId, 'state.json'));
  const changedPaths = Array.isArray(state.boundary?.changedPaths) ? state.boundary.changedPaths : [];
  const findings = [];
  let changedConcepts = [];
  let sources = [];
  let upstreamChangedPaths = [];
  try {
    changedConcepts = normalizeRelativePaths(output.changedConcepts, options.targetDir, 'knowledge-maintain-loop output.changedConcepts');
  } catch (error) {
    findings.push(error.message);
  }
  try {
    sources = normalizeRelativePaths(output.sources, options.targetDir, 'knowledge-maintain-loop output.sources');
  } catch (error) {
    findings.push(error.message);
  }
  try {
    upstreamChangedPaths = normalizeRelativePaths(
      options.input.context?.knowledgeMaintenanceEvidence?.changedPaths,
      options.targetDir,
      'input.context.knowledgeMaintenanceEvidence.changedPaths',
    );
  } catch (error) {
    findings.push(error.message);
  }
  if (changedConcepts.length === 0) {
    findings.push('completed knowledge maintenance requires at least one changedConcepts entry.');
  }
  if (sources.length === 0) {
    findings.push('completed knowledge maintenance requires at least one runtime-captured non-knowledge source.');
  }
  const changedKnowledgePaths = changedPaths.filter((changedPath) => pathIsWithin(changedPath, options.knowledgeRoot));
  const changedOutsideKnowledge = changedPaths.filter((changedPath) => !pathIsWithin(changedPath, options.knowledgeRoot));
  if (changedOutsideKnowledge.length > 0) {
    findings.push(`actual diff includes non-knowledge paths: ${changedOutsideKnowledge.join(', ')}.`);
  }
  const logPaths = changedKnowledgePaths.filter((changedPath) => markdownFrontmatterType(path.join(options.targetDir, changedPath)) === 'log');
  const actualConceptPaths = changedKnowledgePaths.filter((changedPath) => !logPaths.includes(changedPath));
  if (!sameStringSet(changedConcepts, actualConceptPaths)) {
    findings.push(`changedConcepts (${changedConcepts.join(', ') || 'none'}) do not match the actual non-log knowledge diff (${actualConceptPaths.join(', ') || 'none'}).`);
  }
  if (logPaths.length === 0) {
    findings.push('the actual diff does not update an OKF type: log file.');
  } else if (typeof output.logEntry !== 'string'
    || !logPaths.some((logPath) => fs.readFileSync(path.join(options.targetDir, logPath), 'utf8').includes(output.logEntry))) {
    findings.push('logEntry is not present verbatim in an actually changed OKF log file.');
  }
  for (const source of sources) {
    if (pathIsWithin(source, options.knowledgeRoot)) {
      findings.push(`source '${source}' points into generated knowledge instead of current project evidence.`);
      continue;
    }
    if (!fs.statSync(path.join(options.targetDir, source), { throwIfNoEntry: false })?.isFile()) {
      findings.push(`source '${source}' is not an existing project-relative file.`);
    }
    if (!upstreamChangedPaths.includes(source)) {
      findings.push(`source '${source}' is not a runtime-captured path from a preceding write Loop.`);
    }
  }
  const linkedSources = new Set();
  for (const conceptPath of changedConcepts) {
    const conceptSources = extractProjectRelativeMarkdownLinks(options.targetDir, conceptPath)
      .filter((linkedPath) => sources.includes(linkedPath));
    conceptSources.forEach((source) => linkedSources.add(source));
    if (conceptSources.length === 0) {
      findings.push(`changed concept '${conceptPath}' does not cite any declared runtime-captured non-knowledge source.`);
    }
  }
  for (const source of sources) {
    if (!linkedSources.has(source)) {
      findings.push(`source '${source}' is not cited by any actually changed concept.`);
    }
  }
  return {
    changedPaths,
    changedKnowledgePaths,
    changedConcepts,
    logPaths,
    sources,
    findings,
  };
}

function markdownFrontmatterType(filePath) {
  const stat = fs.statSync(filePath, { throwIfNoEntry: false });
  if (!stat?.isFile() || path.extname(filePath).toLowerCase() !== '.md') return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return frontmatter?.[1].match(/^type:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim() || null;
}

function sameStringSet(left, right) {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function extractProjectRelativeMarkdownLinks(targetDir, conceptPath) {
  const filePath = path.join(targetDir, conceptPath);
  if (!fs.statSync(filePath, { throwIfNoEntry: false })?.isFile()) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const links = [];
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].trim().split('#')[0];
    if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) continue;
    const resolved = path.resolve(path.dirname(filePath), href);
    const relative = path.relative(targetDir, resolved).replaceAll('\\', '/');
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) links.push(relative);
  }
  return [...new Set(links)];
}

function materializeEffectiveInteractReport(options) {
  const output = options.producer.result.output;
  const complex = reportRequiresEffectiveInteract(options.input.context);
  if (!isRecord(output)) {
    return { findings: ['report-loop output must be an object before presentation generation.'] };
  }
  output.effectiveInteractUsed = false;
  if (!complex) {
    return { findings: [] };
  }
  const findings = [];
  if (!isRecord(output.interactionInput)) {
    findings.push('Complex report-loop output must provide structured interactionInput for effective-interact.');
  }
  if (!isRecord(output.presentation)
    || output.presentation.mode !== 'html-artifact') {
    findings.push('Complex report-loop output must request html-artifact mode without writing an artifact.');
  }
  if (findings.length > 0) return { findings };

  const artifactDir = path.join(options.runDir, 'artifacts');
  const artifactPath = path.join(artifactDir, 'report.html');
  const relativePath = path.relative(options.targetDir, artifactPath).replaceAll('\\', '/');
  const producerState = readJson(path.join(options.runDir, 'agents', options.producer.agentId, 'state.json'));
  const producerChangedPaths = Array.isArray(producerState.boundary?.changedPaths)
    ? producerState.boundary.changedPaths
    : [];
  if (producerChangedPaths.length > 0) {
    findings.push(`report-loop Producer is read-only but changed: ${producerChangedPaths.join(', ')}.`);
  }
  if (findings.length > 0) return { findings };

  const deterministicDir = path.join(options.runDir, 'deterministic');
  const inputPath = path.join(deterministicDir, 'effective-interact-input.json');
  fs.mkdirSync(deterministicDir, { recursive: true });
  writeJsonAtomic(inputPath, output.interactionInput);
  const generator = executeNodeJsonTool({
    script: EFFECTIVE_INTERACT_CREATE,
    args: ['--input', inputPath, '--out-dir', artifactDir, '--slug', 'report', '--json'],
    cwd: options.targetDir,
  });
  if (generator.exitCode !== 0 || !generator.payload?.ok) {
    findings.push(`effective-interact generator failed with exit code ${generator.exitCode}: ${generator.stderr || generator.stdout || 'no diagnostic'}`);
  }
  if (generator.payload?.outputPath && path.resolve(generator.payload.outputPath) !== artifactPath) {
    findings.push('effective-interact generator returned an unexpected artifact path.');
  }
  let validation = null;
  if (findings.length === 0) {
    validation = executeNodeJsonTool({
      script: EFFECTIVE_INTERACT_VALIDATE,
      args: [artifactPath, '--json', '--skip-browser'],
      cwd: options.targetDir,
    });
    if (validation.exitCode !== 0 || validation.payload?.ok !== true) {
      const issues = Array.isArray(validation.payload?.issues) ? validation.payload.issues.join('; ') : '';
      findings.push(`effective-interact validator failed with exit code ${validation.exitCode}: ${issues || validation.stderr || validation.stdout || 'no diagnostic'}`);
    }
  }
  const deterministicValidation = {
    kind: 'effective-interact',
    generator: summarizeNodeJsonTool(generator),
    validator: validation ? {
      ...summarizeNodeJsonTool(validation),
      checks: Array.isArray(validation.payload?.checks) ? validation.payload.checks : [],
      issues: Array.isArray(validation.payload?.issues) ? validation.payload.issues : [],
      warnings: Array.isArray(validation.payload?.warnings) ? validation.payload.warnings : [],
      browserStatus: validation.payload?.browser?.status || null,
    } : null,
    artifactPath: relativePath,
    status: findings.length === 0 ? 'pass' : 'blocked',
  };
  output.effectiveInteractUsed = findings.length === 0;
  output.presentation = {
    mode: 'html-artifact',
    path: relativePath,
    generatedBy: 'effective-interact',
    validation: {
      status: deterministicValidation.status,
      checks: deterministicValidation.validator?.checks || [],
      issues: deterministicValidation.validator?.issues || [],
    },
  };
  const statePath = path.join(options.runDir, 'agents', options.producer.agentId, 'state.json');
  writeJsonAtomic(statePath, {
    ...producerState,
    result: options.producer.result,
    deterministicValidation,
    updatedAt: new Date().toISOString(),
  });
  appendJsonl(path.join(options.runDir, 'agents', options.producer.agentId, 'events.jsonl'), {
    schemaVersion: 1,
    event: 'effective_interact_generated_and_validated',
    generatedAt: new Date().toISOString(),
    agentId: options.producer.agentId,
    status: deterministicValidation.status,
    artifactPath: relativePath,
    stateSha256: hashFile(statePath),
  });
  return { findings, report: deterministicValidation };
}

function executeNodeJsonTool(options) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [options.script, ...options.args], {
    cwd: options.cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 2 * 60 * 1000,
    env: { ...process.env, HARNESS_HUB_CHILD_RUN: '1' },
  });
  let payload = null;
  try {
    payload = result.stdout?.trim() ? JSON.parse(result.stdout) : null;
  } catch {
    payload = null;
  }
  return {
    command: process.execPath,
    script: path.relative(SKILLS_ROOT, options.script).replaceAll('\\', '/'),
    args: options.args.map((arg) => path.isAbsolute(arg) ? '[runtime-path]' : arg),
    exitCode: Number.isInteger(result.status) ? result.status : 1,
    signal: result.signal || null,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    durationMs: Date.now() - started,
    payload,
    ...(result.error ? { error: result.error.message } : {}),
  };
}

function summarizeNodeJsonTool(result) {
  return {
    command: result.command,
    script: result.script,
    args: result.args,
    exitCode: result.exitCode,
    signal: result.signal,
    durationMs: result.durationMs,
    ...(result.error ? { error: result.error } : {}),
  };
}

function validateProducerResult(contract, result, runtime) {
  const findings = [];
  if (!isRecord(result)) {
    return ['Producer output is not a JSON object.'];
  }
  if (result.status !== 'completed') {
    findings.push(`Producer status is '${String(result.status)}', not completed.`);
  }
  if (!isRecord(result.output)) {
    findings.push('Producer output.output must be an object.');
  } else {
    findings.push(...validateJsonSchema(result.output, contract.output.schema, 'Producer output.output'));
    findings.push(...validateOutputInvariants(contract, result.output, runtime));
  }
  if (!isRecord(result.handoff) || typeof result.handoff.summary !== 'string' || !result.handoff.summary.trim()) {
    findings.push('Producer handoff.summary must be a non-empty string.');
  }
  if (contract.id === 'report-loop' && isRecord(result.output)) {
    findings.push(...validateReportOutput(result.output, runtime));
  }
  return findings;
}

function validateJsonSchema(value, schema, valuePath) {
  if (!isRecord(schema)) return [`${valuePath} has no executable JSON schema in its Loop contract.`];
  const findings = [];
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const actualType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (types[0] && !types.includes(actualType)) {
    return [`${valuePath} must have type ${types.join(' or ')}, received ${actualType}.`];
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    findings.push(`${valuePath} must be one of: ${schema.enum.join(', ')}.`);
  }
  if (typeof value === 'string' && Number.isInteger(schema.minLength) && value.length < schema.minLength) {
    findings.push(`${valuePath} must contain at least ${schema.minLength} character(s).`);
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => findings.push(...validateJsonSchema(item, schema.items, `${valuePath}[${index}]`)));
  }
  if (isRecord(value) && schema.type === 'object') {
    for (const required of Array.isArray(schema.required) ? schema.required : []) {
      if (!Object.prototype.hasOwnProperty.call(value, required)) {
        findings.push(`${valuePath} is missing schema-required property '${required}'.`);
      }
    }
    const properties = isRecord(schema.properties) ? schema.properties : {};
    for (const [key, item] of Object.entries(value)) {
      if (properties[key]) {
        findings.push(...validateJsonSchema(item, properties[key], `${valuePath}.${key}`));
      } else if (schema.additionalProperties === false) {
        findings.push(`${valuePath} contains unsupported property '${key}'.`);
      }
    }
  }
  return findings;
}

function validateOutputInvariants(contract, output, runtime) {
  const findings = [];
  for (const invariant of contract.output.invariants || []) {
    if (invariant === 'alignment-requires-no-open-questions'
      && (output.aligned !== true || !Array.isArray(output.openQuestions) || output.openQuestions.length > 0)) {
      findings.push('requirements-loop completed output requires aligned=true and no openQuestions; unresolved questions must pause through top-level openQuestions.');
    } else if (invariant === 'runtime-red-green-evidence') {
      for (const phase of ['redEvidence', 'greenEvidence']) {
        if (output[phase]?.source !== 'runtime-captured'
          || !Array.isArray(output[phase]?.validationCommands)
          || output[phase].validationCommands.length === 0) {
          findings.push(`test-loop ${phase} must contain runtime-captured command evidence.`);
        }
      }
    } else if (invariant === 'independent-test-review'
      && (output.review?.source !== 'independent-verifier' || output.review?.status !== 'pending')) {
      findings.push('test-loop review must be reserved for the independent Verifier before verification.');
    } else if (invariant === 'deterministic-evidence-runtime-owned'
      && output.deterministicEvidence?.source !== 'runtime-captured') {
      findings.push(`${contract.id} deterministicEvidence must be attached by runtime.`);
    } else if (invariant === 'report-complexity-from-lifecycle') {
      const expected = reportRequiresEffectiveInteract(runtime.input.context) ? 'complex' : 'simple';
      if (output.complexity !== expected) findings.push(`report-loop complexity must be '${expected}' for the lifecycle context.`);
    } else if (invariant === 'effective-interact-runtime-owned'
      && reportRequiresEffectiveInteract(runtime.input.context)
      && (output.effectiveInteractUsed !== true || output.presentation?.generatedBy !== 'effective-interact')) {
      findings.push('Complex report-loop output lacks runtime-owned effective-interact evidence.');
    } else if (invariant === 'project-local-eval-candidates') {
      for (const [index, candidate] of (Array.isArray(output.evalCandidates) ? output.evalCandidates : []).entries()) {
        for (const anchor of Array.isArray(candidate?.evidenceAnchors) ? candidate.evidenceAnchors : []) {
          const normalized = anchor.replaceAll('\\', '/').replace(/^\.\//, '');
          if (path.posix.isAbsolute(normalized)
            || path.win32.isAbsolute(normalized)
            || normalized.split('/').includes('..')
            || !fs.statSync(path.join(runtime.targetDir, normalized), { throwIfNoEntry: false })) {
            findings.push(`retro-loop evalCandidates[${index}] evidence anchor '${anchor}' is not a current-project relative path.`);
          }
        }
      }
    }
  }
  return findings;
}

function validateReportOutput(output, runtime) {
  const findings = [];
  const complex = reportRequiresEffectiveInteract(runtime.input.context);
  if (!complex) {
    return findings;
  }
  if (output.effectiveInteractUsed !== true) {
    findings.push('Complex report-loop output must be generated and validated by runtime through effective-interact.');
  }
  if (!isRecord(output.presentation)
    || output.presentation.mode !== 'html-artifact'
    || typeof output.presentation.path !== 'string'
    || output.presentation.generatedBy !== 'effective-interact'
    || !isRecord(output.presentation.validation)
    || output.presentation.validation.status !== 'pass') {
    findings.push('Complex report-loop output must carry runtime-owned effective-interact generation and formal validation evidence.');
    return findings;
  }
  const relativePath = output.presentation.path.replaceAll('\\', '/').replace(/^\.\//, '');
  const expectedArtifactPath = path.relative(
    runtime.targetDir,
    path.join(runtime.runDir, 'artifacts', 'report.html'),
  ).replaceAll('\\', '/');
  if (relativePath !== expectedArtifactPath) {
    findings.push(`report-loop artifact '${relativePath}' is not the runtime-owned run artifact '${expectedArtifactPath}'.`);
    return findings;
  }
  const artifactPath = path.resolve(runtime.targetDir, relativePath);
  const relative = path.relative(runtime.targetDir, artifactPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    findings.push(`report-loop artifact '${relativePath}' escapes the target.`);
    return findings;
  }
  const stat = fs.statSync(artifactPath, { throwIfNoEntry: false });
  if (!stat?.isFile()) {
    findings.push(`report-loop artifact '${relativePath}' does not exist as a file.`);
  }
  return findings;
}

function reportRequiresEffectiveInteract(context) {
  if (!isRecord(context)) {
    return false;
  }
  const stage = typeof context.stage === 'string' ? context.stage.toLowerCase() : '';
  return ['handoff', 'comparison', 'complex-delivery', 'decision'].includes(stage)
    || numberMetric(context.changeCount) >= 5
    || numberMetric(context.decisionCount) >= 2;
}

function buildSuccessEvidence(contract, input, output) {
  const evidence = [
    'Producer output satisfies the executable Loop contract.',
    'Verifier output satisfies the executable Loop contract.',
    'Independent Verifier verdict is pass.',
  ];
  if (contract.id === 'report-loop' && reportRequiresEffectiveInteract(input.context) && output.effectiveInteractUsed === true) {
    evidence.push('report-loop lifecycle requires and verifies an effective-interact artifact.');
  }
  if (['knowledge-init-loop', 'knowledge-maintain-loop'].includes(contract.id)) {
    evidence.push(`${contract.id} passes deterministic Google OKF v0.1 structure, link, source, log, and isolation validation.`);
  }
  return evidence;
}

function validateVerifierResult(result) {
  const findings = [];
  if (!isRecord(result)) {
    return ['Verifier output is not a JSON object.'];
  }
  if (result.status !== 'completed') {
    findings.push(`Verifier status is '${String(result.status)}', not completed.`);
  }
  if (!['pass', 'revise', 'blocked'].includes(result.verdict)) {
    findings.push(`Verifier verdict '${String(result.verdict)}' is invalid.`);
  }
  if (!Array.isArray(result.findings) || result.findings.some((item) => typeof item !== 'string')) {
    findings.push('Verifier findings must be a string array.');
  }
  if (!isRecord(result.handoff) || typeof result.handoff.summary !== 'string' || !result.handoff.summary.trim()) {
    findings.push('Verifier handoff.summary must be a non-empty string.');
  }
  return findings;
}

function requiresArbiter(contract, producerOutput, verifierResult) {
  if (!contract.arbiter || !isRecord(producerOutput) || !isRecord(verifierResult)) {
    return false;
  }
  const producerVerdict = typeof producerOutput.verdict === 'string' ? producerOutput.verdict : null;
  const verifierVerdict = typeof verifierResult.verdict === 'string' ? verifierResult.verdict : null;
  return producerVerdict !== null && verifierVerdict !== null && producerVerdict !== verifierVerdict;
}

function writeIntegration(options) {
  const agentEvidence = options.agentIds.map((agentId) => ({
    agentId,
    sha256: hashFile(path.join(options.runDir, 'agents', agentId, 'state.json')),
  }));
  const integration = {
    schemaVersion: 1,
    runId: options.runId,
    loop: options.loop,
    verdict: options.verdict,
    status: options.status,
    executorMode: options.executorMode || 'cli-agent',
    validationStatus: options.validationStatus,
    validationEvidence: options.validationEvidence,
    ...(options.deterministicEvidence ? { deterministicEvidence: options.deterministicEvidence } : {}),
    agentEvidence,
    handoff: options.handoff,
    integratedAt: new Date().toISOString(),
  };
  writeJsonAtomic(path.join(options.runDir, 'integration.json'), integration);
  return integration;
}

function pauseRun(options) {
  const questions = normalizeOpenQuestions(options.result.openQuestions);
  if (questions.length === 0) {
    return blockForDeterministicFailure({
      runDir: options.runDir,
      runState: options.runState,
      runStartedAt: options.runStartedAt,
      findings: ['A paused Agent must return at least one concrete open question.'],
      agentIds: options.agentIds,
    });
  }
  const requestedAt = new Date().toISOString();
  const handoff = {
    status: 'paused',
    summary: compactSummary(options.result.handoff?.summary || 'User input is required.', 600),
    output: isRecord(options.result.output) ? options.result.output : null,
    findings: [],
    openQuestions: questions,
    nextAction: 'Collect answers from the user and resume this same runId with --answers.',
  };
  const runState = updateRunState(options.runDir, options.runState, {
    status: 'paused',
    phase: options.role,
    agentIds: options.agentIds,
    pendingInteraction: {
      role: options.role,
      iteration: options.runState.iteration,
      questions,
      requestedAt,
    },
    handoff,
    metrics: {
      ...options.runState.metrics,
      interruptCount: options.runState.metrics.interruptCount + 1,
      durationMs: options.baseDurationMs + Date.now() - options.runStartedAt,
      firstAttemptSuccess: false,
    },
  });
  appendRunEvent(options.runDir, runState.runId, runState.loop, 'run_paused', {
    iteration: runState.iteration,
    role: options.role,
    questions,
  });
  appendJsonl(path.join(options.targetDir, LOOP_RUN_LEDGER), {
    schemaVersion: 1,
    event: 'loop_orchestration_paused',
    generatedAt: requestedAt,
    runId: runState.runId,
    loop: runState.loop,
    status: 'paused',
    iteration: runState.iteration,
    role: options.role,
  });
  return publicRunResult(runState);
}

function assertResumeCompatible(existing, expected) {
  if (!isRecord(existing) || existing.status !== 'paused' || !isRecord(existing.pendingInteraction)) {
    throw new LoopRuntimeError(
      `Loop run '${expected.runId}' is not paused and cannot be resumed or overwritten.`,
      'E_RESUME_STATE',
      3,
    );
  }
  for (const key of ['runId', 'loop', 'host', 'contractHash', 'invocationHash']) {
    if (existing[key] !== expected[key]) {
      throw new LoopRuntimeError(
        `Loop run '${expected.runId}' cannot resume because ${key} changed.`,
        'E_RESUME_MISMATCH',
        3,
      );
    }
  }
  if (existing.pendingInteraction.role !== 'producer') {
    throw new LoopRuntimeError('Only a paused Producer can resume in the current state machine phase.', 'E_RESUME_PHASE', 3);
  }
}

function assertWorkflowResumeCompatible(existing, expected) {
  if (!isRecord(existing)
    || existing.kind !== 'workflow'
    || existing.status !== 'paused'
    || !isRecord(existing.pendingChild)) {
    throw new LoopRuntimeError(
      `Workflow run '${expected.runId}' is not paused and cannot be resumed or overwritten.`,
      'E_RESUME_STATE',
      3,
    );
  }
  for (const key of ['runId', 'workflow', 'host', 'invocationHash']) {
    if (existing[key] !== expected[key]) {
      throw new LoopRuntimeError(
        `Workflow run '${expected.runId}' cannot resume because ${key} changed.`,
        'E_RESUME_MISMATCH',
        3,
      );
    }
  }
  if (!Array.isArray(existing.loopIds)
    || !Number.isInteger(existing.pendingChild.index)
    || existing.pendingChild.index < 0
    || existing.pendingChild.index >= existing.loopIds.length
    || existing.pendingChild.loop !== existing.loopIds[existing.pendingChild.index]) {
    throw new LoopRuntimeError('Paused Workflow child state is invalid.', 'E_RESUME_PHASE', 3);
  }
}

function normalizeUserAnswers(value, pendingInteraction) {
  if (!isRecord(value) || value.source !== 'user' || !Array.isArray(value.answers)) {
    throw new LoopRuntimeError(
      'Resume input must declare source "user" and provide an answers array; Agent output cannot stand in for user input.',
      'E_USER_ANSWERS',
      2,
    );
  }
  const answers = value.answers.map((item, index) => {
    if (!isRecord(item)) {
      throw new LoopRuntimeError(`answers[${index}] must be an object.`, 'E_USER_ANSWERS', 2);
    }
    return {
      question: requireNonEmptyString(item.question, `answers[${index}].question`),
      answer: requireNonEmptyString(item.answer, `answers[${index}].answer`),
    };
  });
  const pendingQuestions = normalizeOpenQuestions(pendingInteraction?.questions);
  const answersByQuestion = new Map(answers.map((item) => [item.question, item.answer]));
  const missing = pendingQuestions.filter((question) => !answersByQuestion.has(question));
  const unknown = answers.filter((item) => !pendingQuestions.includes(item.question));
  if (missing.length > 0 || unknown.length > 0 || answers.length !== pendingQuestions.length) {
    throw new LoopRuntimeError(
      'Resume answers must match every pending question exactly once.',
      'E_USER_ANSWERS',
      2,
      { missingQuestions: missing, unknownQuestions: unknown.map((item) => item.question) },
    );
  }
  return { source: 'user', answers };
}

function normalizeOpenQuestions(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))];
}

function blockForDeterministicFailure(options) {
  const actionFinding = deliveryLocalActionFinding(options.runState.deliveryLocalActions);
  const findings = actionFinding ? [...options.findings, actionFinding] : options.findings;
  const summary = compactSummary(findings.join(' '), 600);
  const handoff = {
    status: 'blocked',
    summary,
    output: null,
    findings,
    nextAction: options.reason === 'verifier-rejected'
      ? 'Revise in the next iteration.'
      : 'Fix deterministic evidence before continuing.',
  };
  writeIntegration({
    runDir: options.runDir,
    runId: options.runState.runId,
    loop: options.runState.loop,
    agentIds: options.agentIds,
    verdict: 'blocked',
    status: 'blocked',
    validationStatus: 'fail',
    validationEvidence: findings,
    deterministicEvidence: {
      validationRuns: Array.isArray(options.runState.validationRuns) ? options.runState.validationRuns : [],
      ...(isRecord(options.runState.deliveryLocalActions)
        ? { deliveryLocalActions: options.runState.deliveryLocalActions }
        : {}),
    },
    handoff,
  });
  const runState = updateRunState(options.runDir, options.runState, {
    status: 'blocked',
    phase: 'blocked',
    handoff,
    integrationSha256: hashFile(path.join(options.runDir, 'integration.json')),
    metrics: {
      ...options.runState.metrics,
      durationMs: Date.now() - options.runStartedAt,
      firstAttemptSuccess: false,
    },
  });
  appendRunEvent(options.runDir, runState.runId, runState.loop, 'run_blocked', {
    iteration: runState.iteration,
    reason: options.reason || 'deterministic-validation-failed',
    findings,
  });
  return publicRunResult(runState);
}

function failAtMaximumIterations(options) {
  return failRun({
    ...options,
    summary: compactSummary(
      `Loop reached maxIterations=${options.runState.maxIterations}. ${options.findings.join(' ')}`,
      600,
    ),
    reason: 'maximum-iterations',
    nextAction: 'Return the unresolved findings to the workflow/main Agent; do not claim success.',
  });
}

function failForRuntimeError(options) {
  const code = options.error instanceof LoopRuntimeError ? options.error.code : 'E_INTERNAL';
  const finding = `Loop runtime failure ${code}: ${options.error instanceof Error ? options.error.message : String(options.error)}`;
  return failRun({
    ...options,
    findings: [finding],
    summary: compactSummary(finding, 600),
    reason: 'runtime-error',
    nextAction: 'Return the runtime failure evidence to the workflow/main Agent; do not continue from partial state.',
    errorRecord: { code, message: options.error instanceof Error ? options.error.message : String(options.error) },
  });
}

function failRun(options) {
  const actionFinding = deliveryLocalActionFinding(options.runState.deliveryLocalActions);
  const findings = actionFinding ? [...options.findings, actionFinding] : options.findings;
  const handoff = {
    status: 'failed',
    summary: actionFinding ? compactSummary(`${options.summary} ${actionFinding}`, 600) : options.summary,
    output: null,
    findings,
    nextAction: options.nextAction,
  };
  writeIntegration({
    runDir: options.runDir,
    runId: options.runState.runId,
    loop: options.runState.loop,
    agentIds: options.agentIds,
    verdict: 'fail',
    status: 'failed',
    validationStatus: 'fail',
    validationEvidence: findings,
    deterministicEvidence: {
      validationRuns: Array.isArray(options.runState.validationRuns) ? options.runState.validationRuns : [],
      ...(isRecord(options.runState.deliveryLocalActions)
        ? { deliveryLocalActions: options.runState.deliveryLocalActions }
        : {}),
    },
    handoff,
  });
  const runState = updateRunState(options.runDir, options.runState, {
    status: 'failed',
    phase: 'handoff',
    handoff,
    integrationSha256: hashFile(path.join(options.runDir, 'integration.json')),
    ...(options.errorRecord ? { error: options.errorRecord } : {}),
    metrics: {
      ...options.runState.metrics,
      durationMs: Date.now() - options.runStartedAt,
      firstAttemptSuccess: false,
    },
  });
  appendRunEvent(options.runDir, runState.runId, runState.loop, 'run_failed', {
    iteration: runState.iteration,
    reason: options.reason,
    findings,
  });
  return publicRunResult(runState);
}

function deliveryLocalActionFinding(evidence) {
  if (!isRecord(evidence)) return null;
  const actions = [];
  if (Array.isArray(evidence.cleanupPaths) && evidence.cleanupPaths.length > 0) {
    actions.push(`cleanup completed for ${evidence.cleanupPaths.join(', ')}`);
  }
  if (isRecord(evidence.commit) && (
    ['committed', 'invalid'].includes(evidence.commit.status)
    || (evidence.commit.status === 'failed' && evidence.commit.head !== evidence.commit.reviewedHead)
  )) {
    actions.push(`local commit ${evidence.commit.head || 'unknown'} has status ${evidence.commit.status}`);
  }
  return actions.length > 0
    ? `delivery-loop runtime side effects already occurred: ${actions.join('; ')}.`
    : null;
}

function normalizeInvocationInput(input, targetDir, contract) {
  if (!isRecord(input)) {
    throw new LoopRuntimeError('Loop input must be a JSON object.', 'E_INPUT', 2);
  }
  const task = requireNonEmptyString(input.task, 'input.task');
  const targetSpec = requireNonEmptyString(input.targetSpec, 'input.targetSpec');
  const acceptanceCriteria = normalizeStringArray(input.acceptanceCriteria, 'input.acceptanceCriteria', true);
  const requestedAllowedPaths = normalizeRelativePaths(input.allowedPaths, targetDir, 'input.allowedPaths');
  const forbiddenPaths = normalizeRelativePaths(input.forbiddenPaths, targetDir, 'input.forbiddenPaths');
  const validationCommands = normalizeValidationCommands(input.validationCommands, targetDir);
  const context = input.context === undefined ? {} : normalizeJsonObject(input.context, 'input.context');
  let allowedPaths = requestedAllowedPaths;
  if (['knowledge-init-loop', 'knowledge-maintain-loop'].includes(contract.id)) {
    const knowledgeRoot = normalizeRelativePaths([
      typeof context.knowledgeRoot === 'string' && context.knowledgeRoot.trim() ? context.knowledgeRoot : 'knowledge',
    ], targetDir, 'input.context.knowledgeRoot')[0];
    if (!requestedAllowedPaths.some((allowedPath) => pathIsWithin(knowledgeRoot, allowedPath))) {
      throw new LoopRuntimeError(
        `${contract.id} requires input.allowedPaths to contain its fixed knowledgeRoot '${knowledgeRoot}'.`,
        'E_INPUT_PATH',
        2,
      );
    }
    allowedPaths = [knowledgeRoot];
  }
  for (const [label, paths] of [['input.allowedPaths', allowedPaths], ['input.forbiddenPaths', forbiddenPaths]]) {
    for (const relativePath of paths) assertNoLinkedAncestor(targetDir, relativePath, label);
  }
  for (const required of contract.input.required) {
    if (!Object.prototype.hasOwnProperty.call(input, required)) {
      throw new LoopRuntimeError(`Loop input is missing '${required}'.`, 'E_INPUT', 2);
    }
  }
  return {
    schemaVersion: 1,
    task,
    targetSpec,
    acceptanceCriteria,
    allowedPaths,
    forbiddenPaths,
    validationCommands,
    context,
  };
}

function normalizeValidationCommands(value, targetDir) {
  if (!Array.isArray(value)) {
    throw new LoopRuntimeError('input.validationCommands must be an array of structured argv objects.', 'E_INPUT', 2);
  }
  return value.map((item, index) => {
    const label = `input.validationCommands[${index}]`;
    if (!isRecord(item)) {
      throw new LoopRuntimeError(`${label} must be an object; shell command strings are not supported.`, 'E_INPUT', 2);
    }
    const command = requireNonEmptyString(item.command, `${label}.command`);
    if (!Array.isArray(item.args) || item.args.some((arg) => typeof arg !== 'string')) {
      throw new LoopRuntimeError(`${label}.args must be an array of strings.`, 'E_INPUT', 2);
    }
    const remoteMutation = validationCommandRemoteMutationFinding(command, item.args);
    if (remoteMutation) {
      throw new LoopRuntimeError(`${label} uses a forbidden direct command: ${remoteMutation}`, 'E_AUTHORIZATION', 2);
    }
    const cwd = item.cwd === undefined ? '.' : requireNonEmptyString(item.cwd, `${label}.cwd`).replaceAll('\\', '/');
    if (path.posix.isAbsolute(cwd) || path.win32.isAbsolute(cwd) || cwd.split('/').includes('..')) {
      throw new LoopRuntimeError(`${label}.cwd must stay inside the target repository.`, 'E_INPUT_PATH', 2);
    }
    const resolvedCwd = path.resolve(targetDir, cwd);
    const relativeCwd = path.relative(targetDir, resolvedCwd);
    if (relativeCwd.startsWith('..') || path.isAbsolute(relativeCwd)) {
      throw new LoopRuntimeError(`${label}.cwd escapes the target repository.`, 'E_INPUT_PATH', 2);
    }
    assertNoLinkedAncestor(targetDir, cwd, `${label}.cwd`);
    return { command, args: [...item.args], cwd };
  });
}

function validationCommandRemoteMutationFinding(command, args) {
  const executable = path.basename(command).toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/i, '');
  const normalizedArgs = args.map((arg) => arg.toLowerCase());
  if (executable === 'git') {
    if (normalizedArgs.length === 2 && normalizedArgs[0] === 'diff' && normalizedArgs[1] === '--check') {
      return null;
    }
    return 'direct git validation is restricted to the exact read-only command git diff --check';
  }
  if (executable === 'gh') {
    return 'direct gh commands are forbidden; delivery uses the runtime-owned read-only probes';
  }
  if (['npm', 'pnpm', 'yarn', 'bun'].includes(executable) && normalizedArgs[0] === 'publish') {
    return `${executable} publish mutates remote package state`;
  }
  if (executable === 'curl') {
    return 'direct curl commands are forbidden in validation commands';
  }
  if (['cmd', 'powershell', 'pwsh', 'sh', 'bash', 'zsh'].includes(executable)) {
    return `${executable} shell execution is forbidden in validation commands`;
  }
  if (['node', 'bun', 'deno', 'python', 'python3', 'ruby'].includes(executable)
    && ['-e', '--eval', '-p', '--print', '-c'].includes(normalizedArgs[0])) {
    return `${executable} inline code execution is forbidden in validation commands`;
  }
  return null;
}

function assertNoLinkedAncestor(targetDir, relativePath, label) {
  const targetReal = fs.realpathSync.native(targetDir);
  const segments = relativePath.replaceAll('\\', '/').split('/').filter((segment) => segment && segment !== '.');
  let current = targetDir;
  for (const segment of segments) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!stat) break;
    if (stat.isSymbolicLink()) {
      throw new LoopRuntimeError(`${label} traverses existing symbolic link or junction '${relativePath}'.`, 'E_INPUT_PATH', 2);
    }
    const currentReal = fs.realpathSync.native(current);
    const relativeReal = path.relative(targetReal, currentReal);
    if (relativeReal.startsWith('..') || path.isAbsolute(relativeReal)) {
      throw new LoopRuntimeError(`${label} traverses an existing reparse/mount boundary '${relativePath}'.`, 'E_INPUT_PATH', 2);
    }
  }
}

function normalizeJsonObject(value, label) {
  if (!isRecord(value)) {
    throw new LoopRuntimeError(`${label} must be a JSON object.`, 'E_INPUT', 2);
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeRelativePaths(value, targetDir, label) {
  const paths = normalizeStringArray(value, label, false).map((item) => item.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, ''));
  for (const relativePath of paths) {
    if (!relativePath || path.posix.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath) || relativePath.split('/').includes('..')) {
      throw new LoopRuntimeError(`${label} contains unsafe path '${relativePath}'.`, 'E_INPUT_PATH', 2);
    }
    const resolved = path.resolve(targetDir, relativePath);
    const relative = path.relative(targetDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new LoopRuntimeError(`${label} escapes the target: '${relativePath}'.`, 'E_INPUT_PATH', 2);
    }
  }
  return [...new Set(paths)].sort();
}

function normalizeStringArray(value, label, requireItems) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new LoopRuntimeError(`${label} must be an array of non-empty strings.`, 'E_INPUT', 2);
  }
  const result = [...new Set(value.map((item) => item.trim()))];
  if (requireItems && result.length === 0) {
    throw new LoopRuntimeError(`${label} must not be empty.`, 'E_INPUT', 2);
  }
  return result;
}

function requireDirectory(value, label) {
  const resolved = path.resolve(requireNonEmptyString(value, label));
  if (!fs.statSync(resolved, { throwIfNoEntry: false })?.isDirectory()) {
    throw new LoopRuntimeError(`${label} directory does not exist: ${resolved}`, 'E_TARGET', 2);
  }
  return resolved;
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new LoopRuntimeError(`${label} must be a non-empty string.`, 'E_INPUT', 2);
  }
  return value.trim();
}

function normalizeHost(value) {
  const host = normalizeId(value, 'host');
  if (!['codex', 'claude'].includes(host)) {
    throw new LoopRuntimeError(`Unsupported Host '${value}'.`, 'E_HOST_UNSUPPORTED', 2);
  }
  return host;
}

function normalizeId(value, label) {
  const normalized = requireNonEmptyString(value, label).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,95}$/.test(normalized)) {
    throw new LoopRuntimeError(`${label} contains unsupported characters.`, 'E_INPUT', 2);
  }
  return normalized;
}

function ensureRuntimeStateDir(targetDir) {
  const stateDir = path.join(targetDir, '.harness-hub', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  ensureIgnoreLine(path.join(targetDir, '.harness-hub', '.gitignore'), 'state/');
  ensureIgnoreLine(path.join(targetDir, '.harness-hub', '.gitignore'), '.gitignore');
}

function ensureIgnoreLine(filePath, requiredLine) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (existing.split(/\r?\n/).map((line) => line.trim()).includes(requiredLine)) {
    return;
  }
  const separator = !existing || existing.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(filePath, `${separator}${requiredLine}\n`, 'utf8');
}

function withRunLock(runDir, callback) {
  const locksDir = path.join(runDir, '.locks');
  const lockDir = path.join(locksDir, 'runner');
  fs.mkdirSync(locksDir, { recursive: true });
  try {
    fs.mkdirSync(lockDir);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new LoopRuntimeError(`Loop run is busy: ${path.basename(runDir)}`, 'E_RUN_BUSY', 3);
    }
    throw error;
  }
  const token = `${process.pid}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  writeJsonAtomic(path.join(lockDir, 'owner.json'), { pid: process.pid, token, acquiredAt: new Date().toISOString() });
  try {
    return callback();
  } finally {
    const owner = readOptionalJson(path.join(lockDir, 'owner.json'));
    if (owner?.token === token) {
      fs.rmSync(lockDir, { recursive: true, force: true });
    }
  }
}

function incrementCliMetrics(runDir, runState, trace) {
  const usage = isRecord(trace?.metrics?.usage) ? trace.metrics.usage : {};
  const inputTokens = numberMetric(usage.input_tokens ?? usage.inputTokens);
  const outputTokens = numberMetric(usage.output_tokens ?? usage.outputTokens);
  const totalTokens = numberMetric(usage.total_tokens ?? usage.totalTokens) || inputTokens + outputTokens;
  const costUsd = numberMetric(trace?.metrics?.costUsd);
  return updateRunState(runDir, runState, {
    metrics: {
      ...runState.metrics,
      cliCalls: runState.metrics.cliCalls + 1,
      durationMs: runState.metrics.durationMs + numberMetric(trace?.durationMs),
      inputTokens: numberMetric(runState.metrics.inputTokens) + inputTokens,
      outputTokens: numberMetric(runState.metrics.outputTokens) + outputTokens,
      totalTokens: numberMetric(runState.metrics.totalTokens) + totalTokens,
      costUsd: Number((numberMetric(runState.metrics.costUsd) + costUsd).toFixed(6)),
    },
  });
}

function numberMetric(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function updateRunState(runDir, runState, patch) {
  const updated = { ...runState, ...patch, updatedAt: new Date().toISOString() };
  writeRunState(runDir, updated);
  return updated;
}

function writeRunState(runDir, state) {
  writeJsonAtomic(path.join(runDir, 'run.json'), state);
}

function appendRunEvent(runDir, runId, loop, event, details = {}) {
  appendJsonl(path.join(runDir, 'events.jsonl'), {
    schemaVersion: 1,
    event,
    generatedAt: new Date().toISOString(),
    runId,
    loop,
    ...details,
  });
}

function publicRunResult(runState) {
  return {
    schemaVersion: 1,
    runId: runState.runId,
    loop: runState.loop,
    status: runState.status,
    iteration: runState.iteration,
    handoff: runState.handoff,
    metrics: runState.metrics,
    ...(runState.error ? { error: runState.error } : {}),
  };
}

function compactSummary(value, maxCharacters) {
  const summary = requireNonEmptyString(value, 'handoff.summary').replace(/\s+/g, ' ');
  return summary.length <= maxCharacters ? summary : `${summary.slice(0, maxCharacters - 3)}...`;
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.renameSync(temporary, filePath);
      return;
    } catch (error) {
      lastError = error;
      if (!['EPERM', 'EACCES', 'EEXIST'].includes(error?.code)) {
        throw error;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10 * (attempt + 1));
    }
  }
  if (process.platform === 'win32' && fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
    fs.renameSync(temporary, filePath);
    return;
  }
  throw lastError;
}

function appendJsonl(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function readOptionalJson(filePath) {
  try {
    return readJson(filePath);
  } catch {
    return null;
  }
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function hashText(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashJson(value) {
  return hashText(JSON.stringify(sortValue(value)));
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

class LoopRuntimeError extends Error {
  constructor(message, code, exitCode, details = {}) {
    super(message);
    this.name = 'LoopRuntimeError';
    this.code = code;
    this.exitCode = exitCode;
    this.details = details;
  }
}

function parseCli(argv) {
  const [command, targetDir, ...args] = argv;
  if (command === 'contracts') {
    const contractArgs = [targetDir, ...args].filter(Boolean);
    if (contractArgs.some((arg) => arg !== '--json')) {
      throw new LoopRuntimeError(`Unsupported contracts option '${contractArgs.find((arg) => arg !== '--json')}'.`, 'E_USAGE', 2);
    }
    return { command, json: contractArgs.includes('--json') };
  }
  if (!['run', 'workflow', 'route'].includes(command) || !targetDir) {
    throw new LoopRuntimeError('Usage: loop-runtime.mjs <run|workflow|route> <target> [--loop <id>|--workflow <id>|--prompt <request>] --run-id <id> --host <codex|claude> --input <json> [--answers <json>] [--json]', 'E_USAGE', 2);
  }
  const options = { command, targetDir, loop: null, workflow: null, prompt: null, runId: null, host: null, inputPath: null, answersPath: null, json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      options.json = true;
    } else if (['--loop', '--workflow', '--prompt', '--run-id', '--host', '--input', '--answers'].includes(arg)) {
      const value = args[++index];
      if (!value) {
        throw new LoopRuntimeError(`Missing value for ${arg}.`, 'E_USAGE', 2);
      }
      if (arg === '--loop') options.loop = value;
      if (arg === '--workflow') options.workflow = value;
      if (arg === '--prompt') options.prompt = value;
      if (arg === '--run-id') options.runId = value;
      if (arg === '--host') options.host = value;
      if (arg === '--input') options.inputPath = value;
      if (arg === '--answers') options.answersPath = value;
    } else {
      throw new LoopRuntimeError(`Unsupported option '${arg}'.`, 'E_USAGE', 2);
    }
  }
  const owner = command === 'run' ? options.loop : command === 'workflow' ? options.workflow : options.prompt;
  if (!owner || !options.runId || !options.host || !options.inputPath) {
    const ownerFlag = command === 'run' ? 'loop' : command === 'workflow' ? 'workflow' : 'prompt';
    throw new LoopRuntimeError(`Missing required --${ownerFlag}, --run-id, --host, or --input.`, 'E_USAGE', 2);
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let jsonOutput = process.argv.includes('--json');
  try {
    const options = parseCli(process.argv.slice(2));
    jsonOutput = options.json;
    if (options.command === 'contracts') {
      const result = listLoopContracts();
      console.log(jsonOutput ? JSON.stringify(result, null, 2) : result.loopIds.join('\n'));
      process.exitCode = 0;
    } else if (options.command === 'route') {
      const result = runRoutedWorkflow({
        targetDir: options.targetDir,
        prompt: options.prompt,
        runId: options.runId,
        host: options.host,
        input: readJson(path.resolve(options.inputPath)),
        ...(options.answersPath ? { answers: readJson(path.resolve(options.answersPath)) } : {}),
      });
      console.log(jsonOutput ? JSON.stringify(result, null, 2) : `${result.route.owner} ${result.status}: ${result.handoff.summary}`);
      process.exitCode = ['completed', 'paused'].includes(result.status) ? 0 : 3;
    } else if (options.command === 'workflow') {
      const result = runExecutableWorkflow({
        targetDir: options.targetDir,
        workflow: options.workflow,
        runId: options.runId,
        host: options.host,
        input: readJson(path.resolve(options.inputPath)),
        ...(options.answersPath ? { answers: readJson(path.resolve(options.answersPath)) } : {}),
      });
      console.log(jsonOutput ? JSON.stringify(result, null, 2) : `${result.workflow} ${result.status}: ${result.handoff.summary}`);
      process.exitCode = ['completed', 'paused'].includes(result.status) ? 0 : 3;
    } else {
      const result = runExecutableLoop({
        targetDir: options.targetDir,
        loop: options.loop,
        runId: options.runId,
        host: options.host,
        input: readJson(path.resolve(options.inputPath)),
        ...(options.answersPath ? { answers: readJson(path.resolve(options.answersPath)) } : {}),
      });
      console.log(jsonOutput ? JSON.stringify(result, null, 2) : `${result.loop} ${result.status}: ${result.handoff.summary}`);
      process.exitCode = ['completed', 'paused'].includes(result.status) ? 0 : 3;
    }
  } catch (error) {
    const report = {
      schemaVersion: 1,
      ok: false,
      code: error instanceof LoopRuntimeError ? error.code : 'E_INTERNAL',
      message: error.message,
      ...(error instanceof LoopRuntimeError ? error.details : {}),
    };
    console.error(jsonOutput ? JSON.stringify(report) : `loop-runtime: ${report.message}`);
    process.exitCode = error instanceof LoopRuntimeError ? error.exitCode : 1;
  }
}
