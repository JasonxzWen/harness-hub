import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'bun:test';

type WorkflowCase = {
  id: string;
  prompt: string;
  expectedState: string;
  expectedOwner: string | null;
  mutationAllowed: boolean;
  expectedLoops: string[];
};

const ROUTER = path.resolve('skills/workflow-router/scripts/route-intent.mjs');
const RUNTIME = 'skills/workflow-router/scripts/loop-runtime.mjs';
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/workflow-router-cases.json', 'utf8')) as {
  schemaVersion: number;
  cases: WorkflowCase[];
};

function route(prompt: string): Record<string, unknown> {
  const result = spawnSync(process.execPath, [ROUTER, '--prompt', prompt, '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe('');
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

function workflowLoops(source: string, owner: string): string[] {
  const escaped = owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`'${escaped}': Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\)`));
  expect(match, `${owner} is missing from the executable workflow map`).not.toBeNull();
  return [...match![1].matchAll(/'([a-z-]+-loop)'/g)].map((entry) => entry[1]);
}

test('router fixture maps every non-trivial intent to one of five generic workflows', () => {
  expect(fixture.schemaVersion).toBe(1);
  expect(new Set(fixture.cases.map((entry) => entry.id)).size).toBe(fixture.cases.length);

  const owners = new Set<string>();
  for (const entry of fixture.cases) {
    expect(entry.id).toMatch(/^[a-z0-9-]+$/);
    expect(entry.prompt.trim().length).toBeGreaterThan(5);

    const actual = route(entry.prompt);
    expect(actual).toMatchObject({
      schemaVersion: 1,
      state: entry.expectedState,
      owner: entry.expectedOwner,
      mutationAllowed: entry.mutationAllowed,
      mutates: false,
    });
    if (entry.expectedOwner) owners.add(entry.expectedOwner);
  }

  expect([...owners].sort()).toEqual([
    'answer-workflow',
    'delivery-workflow',
    'diagnosis-workflow',
    'review-workflow',
    'sdd-workflow',
  ]);
});

test('the runtime workflow map exactly matches the fixture loop sequences', () => {
  const runtime = fs.readFileSync(RUNTIME, 'utf8');
  const expectedByOwner = new Map<string, string[]>();

  for (const entry of fixture.cases) {
    if (!entry.expectedOwner) continue;
    const previous = expectedByOwner.get(entry.expectedOwner);
    if (previous) {
      expect(entry.expectedLoops).toEqual(previous);
    } else {
      expectedByOwner.set(entry.expectedOwner, entry.expectedLoops);
    }
  }

  for (const [owner, loops] of expectedByOwner) {
    expect(workflowLoops(runtime, owner)).toEqual(loops);
  }
  expect(runtime).not.toContain('hub-maintenance-workflow');
  expect(runtime).not.toContain('harness-hub-maintenance');
});

test('router output is consumed by the sole workflow runtime instead of returned as advisory text', () => {
  const runtime = fs.readFileSync(RUNTIME, 'utf8');

  expect(runtime).toContain("import { classifyIntent } from './route-intent.mjs'");
  expect(runtime).toContain('export function runRoutedWorkflow(options)');
  expect(runtime).toContain('const route = classifyIntent(prompt)');
  expect(runtime).toContain('workflow: route.owner');
  expect(runtime).toContain('router: route');
  expect(runtime).toContain('runExecutableWorkflow({');
});
