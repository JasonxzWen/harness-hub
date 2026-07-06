import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

const skillDir = 'skills/quick-learn';
const skill = fs.readFileSync(`${skillDir}/SKILL.md`, 'utf8');

function frontmatterValue(name: string): string {
  const match = skill.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match?.[1] || '';
}

test('quick-learn has a narrow source-backed learning trigger', () => {
  const description = frontmatterValue('description');

  expect(description.startsWith('Load when')).toBe(true);
  expect(description.split(/\s+/).length).toBeLessThanOrEqual(50);
  expect(description).toContain('source-backed learning project');
  expect(description).toContain('syllabus');
  expect(description).toContain('teach-back');
  expect(description).toContain('quizzes');
  expect(description).toContain('do not load for routine implementation');
});

test('quick-learn defines source pack, staged review, teaching, and logging', () => {
  expect(skill).toContain('Source first');
  expect(skill).toContain('Confirm the syllabus before teaching');
  expect(skill).toContain('Run stage-level review');
  expect(skill).toContain('references/source-strategy.md');
  expect(skill).toContain('references/learning-project-lifecycle.md');
  expect(skill).toContain('references/teaching-and-assessment.md');
  expect(skill).toContain('references/review-and-orchestration.md');
  expect(skill).toContain('scripts/log_quick_learn_event.py');
  expect(fs.existsSync(`${skillDir}/references/source-strategy.md`)).toBe(true);
  expect(fs.existsSync(`${skillDir}/references/learning-project-lifecycle.md`)).toBe(true);
  expect(fs.existsSync(`${skillDir}/references/teaching-and-assessment.md`)).toBe(true);
  expect(fs.existsSync(`${skillDir}/references/review-and-orchestration.md`)).toBe(true);
  expect(fs.existsSync(`${skillDir}/scripts/log_quick_learn_event.py`)).toBe(true);
});

test('quick-learn logger writes project state, sources, reviews, and notes', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-learn-log-'));
  const script = path.resolve(`${skillDir}/scripts/log_quick_learn_event.py`);
  const result = spawnSync(
    'python',
    [
      script,
      '--topic',
      'Event Sourcing',
      '--event',
      'source-review',
      '--module',
      'Foundations',
      '--concept',
      'Append-only log',
      '--summary',
      'Reviewed source pack and found enough primary material.',
      '--mastery',
      '4',
      '--source-title',
      'Official documentation',
      '--source-url',
      'https://example.com/docs',
      '--quality',
      'A',
      '--review-status',
      'pass',
      '--log-root',
      tempDir,
    ],
    { encoding: 'utf8' },
  );

  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.status).toBe('ok');
  expect(fs.existsSync(path.join(tempDir, 'event-sourcing', 'events.jsonl'))).toBe(true);
  expect(fs.existsSync(path.join(tempDir, 'event-sourcing', 'project.json'))).toBe(true);
  expect(fs.existsSync(path.join(tempDir, 'event-sourcing', 'progress.json'))).toBe(true);
  expect(fs.existsSync(path.join(tempDir, 'event-sourcing', 'sources.json'))).toBe(true);
  expect(fs.existsSync(path.join(tempDir, 'event-sourcing', 'reviews.jsonl'))).toBe(true);
  expect(fs.existsSync(path.join(tempDir, 'event-sourcing', 'notes.md'))).toBe(true);

  const project = JSON.parse(fs.readFileSync(path.join(tempDir, 'event-sourcing', 'project.json'), 'utf8'));
  expect(project.current_module).toBe('Foundations');
  expect(project.concepts['Append-only log'].mastery).toBe(4);

  const sources = JSON.parse(fs.readFileSync(path.join(tempDir, 'event-sourcing', 'sources.json'), 'utf8'));
  expect(sources.sources[0].quality).toBe('A');
});

test('quick-learn logger avoids fixed fallback slugs', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-learn-log-slug-'));
  const script = path.resolve(`${skillDir}/scripts/log_quick_learn_event.py`);
  const result = spawnSync(
    'python',
    [
      script,
      '--topic',
      '!!!',
      '--event',
      'contract',
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

test('quick-learn replaces the retired learning coach in the standard install surface', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { kind: string; path: string; source: string; provides?: string[] } | undefined>;
  };
  const component = index.components['skill:quick-learn'];
  const retiredSkill = ['skill', ['feynman', 'learning', 'coach'].join('-')].join(':');

  expect(index.components[retiredSkill]).toBeUndefined();
  expect(component?.kind).toBe('skill');
  expect(component?.path).toBe('skills/quick-learn');
  expect(component?.source).toBe('local-original');
  expect(component?.provides).toContain('source-backed-learning-projects');
  expect(component?.provides).toContain('stage-reviewed-learning-flow');
});
