import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

const skillDir = '.agents/skills/feynman-learning-coach';
const skill = fs.readFileSync(`${skillDir}/SKILL.md`, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('feynman-learning-coach has a narrow tutoring trigger', () => {
  const description = frontmatterValue('description');

  expect(description).toContain('Feynman learning loop');
  expect(description).toContain('teach-back checks');
  expect(description).toContain('durable learning logs');
  expect(description).toContain('do not use for routine code implementation');
});

test('feynman-learning-coach defines progressive teaching and logging', () => {
  expect(skill).toContain('Establish the learning contract');
  expect(skill).toContain('Feynman Loop');
  expect(skill).toContain('teach it back in their own words');
  expect(skill).toContain('scripts/log_learning_event.py');
  expect(skill).toContain('references/feynman-session-patterns.md');
  expect(fs.existsSync(`${skillDir}/references/feynman-session-patterns.md`)).toBe(true);
  expect(fs.existsSync(`${skillDir}/scripts/log_learning_event.py`)).toBe(true);
});

test('feynman-learning-coach logger writes jsonl, state, and notes', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feynman-log-'));
  const script = path.resolve(`${skillDir}/scripts/log_learning_event.py`);
  const result = spawnSync(
    'python',
    [
      script,
      '--topic',
      'Hash Maps',
      '--event',
      'concept',
      '--concept',
      'Collision handling',
      '--summary',
      'Explained collisions and asked for teach-back.',
      '--confidence',
      '4',
      '--log-root',
      tempDir,
    ],
    { encoding: 'utf8' },
  );

  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.status).toBe('ok');
  expect(fs.existsSync(path.join(tempDir, 'hash-maps', 'events.jsonl'))).toBe(true);
  expect(fs.existsSync(path.join(tempDir, 'hash-maps', 'state.json'))).toBe(true);
  expect(fs.existsSync(path.join(tempDir, 'hash-maps', 'notes.md'))).toBe(true);

  const state = JSON.parse(fs.readFileSync(path.join(tempDir, 'hash-maps', 'state.json'), 'utf8'));
  expect(state.concepts['Collision handling'].confidence).toBe(4);
});

test('feynman-learning-coach logger avoids fixed fallback slugs', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feynman-log-slug-'));
  const script = path.resolve(`${skillDir}/scripts/log_learning_event.py`);
  const result = spawnSync(
    'python',
    [
      script,
      '--topic',
      '!!!',
      '--event',
      'scope',
      '--summary',
      'Smoke test fallback slug.',
      '--log-root',
      tempDir,
    ],
    { encoding: 'utf8' },
  );

  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.topic_slug).toMatch(/^topic-[a-f0-9]{8}$/);
  expect(output.topic_slug).not.toBe('learning-topic');
});

test('feynman-learning-coach is installable from the explicit learning profile', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    profiles: Record<string, { components: string[] }>;
    components: Record<string, { path: string; source: string; provides?: string[] }>;
  };
  const component = index.components['skill:feynman-learning-coach'];

  expect(index.profiles.learning.components).toContain('skill:feynman-learning-coach');
  expect(index.profiles.minimal.components).not.toContain('skill:feynman-learning-coach');
  expect(component.path).toBe('.agents/skills/feynman-learning-coach');
  expect(component.source).toBe('learn-faster-kit-inspired-local');
  expect(component.provides).toContain('teach-back-checks');
});
