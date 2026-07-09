import fs from 'node:fs';
import { expect, test } from 'bun:test';

type LifecycleGate =
  | 'align-user-need'
  | 'gather-required-material'
  | 'write-spec-and-acceptance'
  | 'write-executable-plan-and-align'
  | 'clean-unneeded-files'
  | 'implement'
  | 'test-and-accept'
  | 'finish-closeout'
  | 'deliver-report';

type WorkflowState =
  | 'question'
  | 'sdd-change'
  | 'diagnosis'
  | 'review'
  | 'delivery'
  | 'harness-hub-maintenance'
  | 'clarify'
  | 'none';

type WorkflowCase = {
  id: string;
  kind: 'positive' | 'ambiguous' | 'no-mutation' | 'no-owner';
  prompt: string;
  expectedState: WorkflowState;
  expectedOwner: string | null;
  mutationAllowed: boolean;
  requiredGates: LifecycleGate[];
  docsBoundary: string;
};

type WorkflowFixture = {
  version: number;
  lifecycleGates: LifecycleGate[];
  cases: WorkflowCase[];
};

const lifecycleGates: LifecycleGate[] = [
  'align-user-need',
  'gather-required-material',
  'write-spec-and-acceptance',
  'write-executable-plan-and-align',
  'clean-unneeded-files',
  'implement',
  'test-and-accept',
  'finish-closeout',
  'deliver-report',
];

const stateOwners: Record<Exclude<WorkflowState, 'clarify' | 'none'>, string> = {
  question: 'answer-workflow',
  'sdd-change': 'sdd-workflow',
  diagnosis: 'diagnosis-workflow',
  review: 'review-workflow',
  delivery: 'delivery-workflow',
  'harness-hub-maintenance': 'hub-maintenance-workflow',
};

const lifecyclePhrases: Record<LifecycleGate, string> = {
  'align-user-need': 'Align user need',
  'gather-required-material': 'Gather required material',
  'write-spec-and-acceptance': 'Write spec and acceptance',
  'write-executable-plan-and-align': 'Write executable plan and align',
  'clean-unneeded-files': 'Clean unneeded files',
  implement: 'Implement',
  'test-and-accept': 'Test and accept',
  'finish-closeout': 'Finish closeout',
  'deliver-report': 'Deliver report',
};

function readFixture(): WorkflowFixture {
  return JSON.parse(fs.readFileSync('tests/fixtures/workflow-router-cases.json', 'utf8'));
}

test('workflow-router fixture has a strict lifecycle schema', () => {
  const fixture = readFixture();
  const ids = new Set<string>();

  expect(fixture.version).toBe(1);
  expect(fixture.lifecycleGates).toEqual(lifecycleGates);
  expect(Array.isArray(fixture.cases)).toBe(true);

  for (const entry of fixture.cases) {
    expect(entry.id).toMatch(/^[a-z0-9-]+$/);
    expect(ids.has(entry.id)).toBe(false);
    ids.add(entry.id);
    expect(['positive', 'ambiguous', 'no-mutation', 'no-owner']).toContain(entry.kind);
    expect(entry.prompt.trim().length).toBeGreaterThan(12);
    expect(entry.docsBoundary.trim().length).toBeGreaterThan(12);

    for (const gate of entry.requiredGates) {
      expect(lifecycleGates).toContain(gate);
    }
  }
});

test('workflow-router cases enforce one top-level owner or explicit no-owner outcome', () => {
  const fixture = readFixture();
  const coveredStates = new Set<WorkflowState>();

  for (const entry of fixture.cases) {
    coveredStates.add(entry.expectedState);

    if (entry.expectedState === 'clarify' || entry.expectedState === 'none') {
      expect(entry.expectedOwner).toBeNull();
      expect(entry.mutationAllowed).toBe(false);
      continue;
    }

    expect(entry.expectedOwner).toBe(stateOwners[entry.expectedState]);
  }

  for (const state of Object.keys(stateOwners) as Array<keyof typeof stateOwners>) {
    expect(coveredStates.has(state)).toBe(true);
  }
  expect(coveredStates.has('clarify')).toBe(true);
  expect(coveredStates.has('none')).toBe(true);
});

test('workflow-router cases preserve read-only states and SDD lifecycle gates', () => {
  const fixture = readFixture();
  const fullLifecycleStates: WorkflowState[] = ['sdd-change', 'harness-hub-maintenance'];

  for (const entry of fixture.cases) {
    if (entry.expectedState === 'question' || entry.expectedState === 'review') {
      expect(entry.mutationAllowed).toBe(false);
    }

    if (fullLifecycleStates.includes(entry.expectedState)) {
      expect(entry.requiredGates).toEqual(lifecycleGates);
    }

    if (entry.expectedState === 'sdd-change') {
      expect(entry.requiredGates.indexOf('gather-required-material')).toBeLessThan(
        entry.requiredGates.indexOf('write-spec-and-acceptance'),
      );
      expect(entry.requiredGates.indexOf('clean-unneeded-files')).toBeLessThan(
        entry.requiredGates.indexOf('implement'),
      );
    }
  }
});

test('workflow-router docs and source dossier contain required lifecycle evidence', () => {
  const fixture = readFixture();
  const spec = fs.readFileSync('docs/workflow-router-spec.md', 'utf8');
  const plan = fs.readFileSync('docs/workflow-router-execution-plan.md', 'utf8');
  const dossier = fs.readFileSync('docs/workflow-source-dossier.md', 'utf8');
  const docs = `${spec}\n${plan}\n${dossier}`;

  for (const phrase of Object.values(lifecyclePhrases)) {
    expect(spec).toContain(phrase);
    expect(plan).toContain(phrase);
  }

  for (const entry of fixture.cases) {
    expect(docs).toContain(entry.docsBoundary);
  }

  for (const source of ['Matt Pocock skills', 'Matt Pocock README process model', 'Superpowers', 'Everything Claude Code', 'OpenSpec', 'Effective Interact']) {
    expect(dossier).toContain(source);
  }

  for (const decision of ['Adopt', 'Adapt', 'Reference-only', 'Reject for default']) {
    expect(dossier).toContain(decision);
  }
});
