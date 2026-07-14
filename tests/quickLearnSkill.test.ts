import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';

const skillDir = 'skills/quick-learn';
const skill = fs.readFileSync(`${skillDir}/SKILL.md`, 'utf8');
const sourceStrategy = fs.readFileSync(`${skillDir}/references/source-strategy.md`, 'utf8');
const lifecycle = fs.readFileSync(`${skillDir}/references/learning-project-lifecycle.md`, 'utf8');
const review = fs.readFileSync(`${skillDir}/references/review-and-orchestration.md`, 'utf8');
const teaching = fs.readFileSync(`${skillDir}/references/teaching-and-assessment.md`, 'utf8');

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
  expect(skill).toContain('Promote concrete module sources before teaching');
  expect(skill).toContain('clear stale `pending_user_confirmation` state');
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

test('quick-learn captures trace follow-up guardrails', () => {
  expect(review).toContain('Do not treat lack of a separate user subagent request as a fallback reason by itself');
  expect(review).toContain('host policy, missing tool, user prohibition, cost/latency tradeoff');
  expect(sourceStrategy).toContain('module teaching needs concrete anchors');
  expect(sourceStrategy).toContain('For evolving vendor learning hubs, do not stop at the top-level hub page');
  expect(lifecycle).toContain('clear or supersede `pending_user_confirmation`');
  expect(lifecycle).toContain('When teaching begins, update project state to `in_progress`');
});

test('quick-learn calibrates beginner teaching without replacing instruction with questions', () => {
  expect(skill).toContain('Questions are evidence, not the delivery mechanism');
  expect(skill).toContain('log it as `teaching-review`');
  expect(skill).toContain('current understanding, not durable retention');
  expect(lifecycle).toContain('--metadata retrieval=delayed');
  expect(teaching).toContain('## Beginner And Vocabulary Gate');
  expect(teaching).toContain('Define unfamiliar vocabulary before using it in a graded check');
  expect(teaching).toContain('Faster means less repetition and wider coverage, not less explanation');
  expect(teaching).toContain('separate from the 1-to-5 evidence-quality score');
  expect(teaching).toContain('separate core judgment, reasoning, decision-relevant caveats, and wording quality');
  expect(lifecycle).toContain('insert a short prerequisite bridge');
  expect(sourceStrategy).toContain('Discovery-only coverage');
  expect(sourceStrategy).toContain('does not count as original-text coverage');
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
      '--source-id',
      'S1',
      '--source-title',
      'Official documentation',
      '--source-url',
      'https://example.com/docs',
      '--local-path',
      'materials/docs.html',
      '--tier',
      'Primary',
      '--quality',
      'A',
      '--freshness',
      'evolving',
      '--used-for',
      'facts',
      '--used-for',
      'assessment',
      '--gaps',
      'API examples only.',
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
  expect(project.concepts['Append-only log']).toBeUndefined();

  const sources = JSON.parse(fs.readFileSync(path.join(tempDir, 'event-sourcing', 'sources.json'), 'utf8'));
  expect(sources.sources[0].id).toBe('S1');
  expect(sources.sources[0].local_path).toBe('materials/docs.html');
  expect(sources.sources[0].tier).toBe('Primary');
  expect(sources.sources[0].quality).toBe('A');
  expect(sources.sources[0].freshness).toBe('evolving');
  expect(sources.sources[0].used_for).toEqual(['facts', 'assessment']);
  expect(sources.sources[0].gaps).toBe('API examples only.');
});

test('quick-learn logger advances syllabus and project status after confirmation and lesson start', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-learn-status-'));
  const topicDir = path.join(tempDir, 'event-sourcing');
  fs.mkdirSync(topicDir, { recursive: true });
  fs.writeFileSync(
    path.join(topicDir, 'syllabus.json'),
    JSON.stringify(
      {
        status: 'pending_user_confirmation',
        requires_confirmation_before_teaching: true,
        modules: [{ id: 'm1', title: 'Foundations' }],
      },
      null,
      2,
    ),
  );

  const script = path.resolve(`${skillDir}/scripts/log_quick_learn_event.py`);
  const confirm = spawnSync(
    'python',
    [
      script,
      '--topic',
      'Event Sourcing',
      '--event',
      'syllabus-confirmation',
      '--summary',
      'User confirmed the custom syllabus.',
      '--phase',
      'syllabus-confirmed',
      '--next-action',
      'Start Foundations.',
      '--log-root',
      tempDir,
    ],
    { encoding: 'utf8' },
  );

  expect(confirm.status).toBe(0);
  let syllabus = JSON.parse(fs.readFileSync(path.join(topicDir, 'syllabus.json'), 'utf8'));
  let project = JSON.parse(fs.readFileSync(path.join(topicDir, 'project.json'), 'utf8'));
  expect(syllabus.status).toBe('confirmed');
  expect(syllabus.requires_confirmation_before_teaching).toBe(false);
  expect(syllabus.current_phase).toBe('syllabus-confirmed');
  expect(syllabus.next_action).toBe('Start Foundations.');
  expect(project.status).toBe('confirmed');
  expect(project.current_phase).toBe('syllabus-confirmed');
  expect(project.next_action).toBe('Start Foundations.');

  const lesson = spawnSync(
    'python',
    [
      script,
      '--topic',
      'Event Sourcing',
      '--event',
      'lesson',
      '--module',
      'Foundations',
      '--summary',
      'Started the first lesson.',
      '--next-action',
      'Ask the first transfer question.',
      '--log-root',
      tempDir,
    ],
    { encoding: 'utf8' },
  );

  expect(lesson.status).toBe(0);
  syllabus = JSON.parse(fs.readFileSync(path.join(topicDir, 'syllabus.json'), 'utf8'));
  project = JSON.parse(fs.readFileSync(path.join(topicDir, 'project.json'), 'utf8'));
  const progress = JSON.parse(fs.readFileSync(path.join(topicDir, 'progress.json'), 'utf8'));
  expect(syllabus.status).toBe('in_progress');
  expect(syllabus.current_module).toBe('Foundations');
  expect(project.status).toBe('in_progress');
  expect(project.current_module).toBe('Foundations');
  expect(progress.last_event.next_action).toBe('Ask the first transfer question.');
});

test('quick-learn logger keeps teaching review out of learner mastery state', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-learn-teaching-review-'));
  const script = path.resolve(`${skillDir}/scripts/log_quick_learn_event.py`);
  const assessment = spawnSync(
    'python',
    [
      script,
      '--topic',
      'Investing Basics',
      '--event',
      'assessment',
      '--module',
      'Fund basics',
      '--concept',
      'Question-heavy pacing',
      '--mastery',
      '2',
      '--summary',
      'The learner needs a clearer explanation.',
      '--log-root',
      tempDir,
    ],
    { encoding: 'utf8' },
  );
  const result = spawnSync(
    'python',
    [
      script,
      '--topic',
      'Investing Basics',
      '--event',
      'teaching-review',
      '--module',
      'Fund basics',
      '--concept',
      'Question-heavy pacing',
      '--mastery',
      '2',
      '--review-status',
      'warn',
      '--summary',
      'Learner asked for explanation before terminology checks.',
      '--log-root',
      tempDir,
    ],
    { encoding: 'utf8' },
  );

  expect(assessment.status).toBe(0);
  expect(result.status).toBe(0);
  const topicDir = path.join(tempDir, 'investing-basics');
  const project = JSON.parse(fs.readFileSync(path.join(topicDir, 'project.json'), 'utf8'));
  const progress = JSON.parse(fs.readFileSync(path.join(topicDir, 'progress.json'), 'utf8'));
  const reviews = fs.readFileSync(path.join(topicDir, 'reviews.jsonl'), 'utf8');
  const events = fs.readFileSync(path.join(topicDir, 'events.jsonl'), 'utf8');
  const notes = fs.readFileSync(path.join(topicDir, 'notes.md'), 'utf8');
  expect(project.concepts['Question-heavy pacing'].mastery).toBe(2);
  expect(progress.modules['Fund basics'].events).toBe(1);
  expect(progress.weak_concepts).toContain('Question-heavy pacing');
  expect(progress.review_queue).toContain('Question-heavy pacing');
  expect(progress.last_event.event).toBe('teaching-review');
  expect(progress.last_teaching_review.event).toBe('teaching-review');
  expect(reviews).toContain('"event": "teaching-review"');
  expect(events).toContain('"mastery": null');
  expect(notes.split('- teaching-review')[1]).not.toContain('Mastery: 2/5');
});

test('quick-learn logger keeps immediate mastery for delayed review', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-learn-remediation-'));
  const script = path.resolve(`${skillDir}/scripts/log_quick_learn_event.py`);
  const runAssessment = (mastery: string, delayed = false) => {
    const args = [
      script,
      '--topic',
      'Investing Basics',
      '--event',
      'assessment',
      '--module',
      'Risk',
      '--concept',
      'Drawdown',
      '--mastery',
      mastery,
      '--summary',
      `Assessment mastery ${mastery}.`,
      '--log-root',
      tempDir,
    ];
    if (delayed) args.push('--metadata', 'retrieval=delayed');
    return spawnSync('python', args, { encoding: 'utf8' });
  };

  expect(runAssessment('2', true).status).toBe(0);
  expect(runAssessment('4').status).toBe(0);

  const topicDir = path.join(tempDir, 'investing-basics');
  const project = JSON.parse(fs.readFileSync(path.join(topicDir, 'project.json'), 'utf8'));
  let progress = JSON.parse(fs.readFileSync(path.join(topicDir, 'progress.json'), 'utf8'));
  expect(project.concepts.Drawdown.mastery).toBe(4);
  expect(progress.weak_concepts).not.toContain('Drawdown');
  expect(progress.review_queue).toContain('Drawdown');

  expect(runAssessment('4', true).status).toBe(0);
  progress = JSON.parse(fs.readFileSync(path.join(topicDir, 'progress.json'), 'utf8'));
  expect(progress.weak_concepts).not.toContain('Drawdown');
  expect(progress.review_queue).not.toContain('Drawdown');
});

test('quick-learn logger rejects unsupported retrieval metadata', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-learn-retrieval-metadata-'));
  const script = path.resolve(`${skillDir}/scripts/log_quick_learn_event.py`);
  const result = spawnSync(
    'python',
    [
      script,
      '--topic',
      'Investing Basics',
      '--event',
      'assessment',
      '--concept',
      'Drawdown',
      '--mastery',
      '4',
      '--metadata',
      'retrieval=delay',
      '--summary',
      'Invalid delayed retrieval marker.',
      '--log-root',
      tempDir,
    ],
    { encoding: 'utf8' },
  );

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('metadata retrieval must be delayed');
});

test('quick-learn logger does not resolve learner weakness from source review metadata', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-learn-source-review-'));
  const script = path.resolve(`${skillDir}/scripts/log_quick_learn_event.py`);
  const runEvent = (event: string, mastery: string) =>
    spawnSync(
      'python',
      [
        script,
        '--topic',
        'Investing Basics',
        '--event',
        event,
        '--module',
        'Risk',
        '--concept',
        'Drawdown',
        '--mastery',
        mastery,
        '--summary',
        `${event} mastery ${mastery}.`,
        '--log-root',
        tempDir,
      ],
      { encoding: 'utf8' },
    );

  expect(runEvent('assessment', '2').status).toBe(0);
  expect(runEvent('source-review', '4').status).toBe(0);

  const progress = JSON.parse(
    fs.readFileSync(path.join(tempDir, 'investing-basics', 'progress.json'), 'utf8'),
  );
  const project = JSON.parse(
    fs.readFileSync(path.join(tempDir, 'investing-basics', 'project.json'), 'utf8'),
  );
  const events = fs.readFileSync(path.join(tempDir, 'investing-basics', 'events.jsonl'), 'utf8');
  expect(project.concepts.Drawdown.mastery).toBe(2);
  expect(progress.modules.Risk.concepts.Drawdown.mastery).toBe(2);
  expect(progress.weak_concepts).toContain('Drawdown');
  expect(progress.review_queue).toContain('Drawdown');
  expect(events.split('\n')[1]).toContain('"mastery": null');
});

test('quick-learn logger preserves mastery across ungraded learning process events', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-learn-ungraded-events-'));
  const script = path.resolve(`${skillDir}/scripts/log_quick_learn_event.py`);
  const runEvent = (event: string, mastery?: string) => {
    const args = [
      script,
      '--topic',
      'Investing Basics',
      '--event',
      event,
      '--module',
      'Risk',
      '--concept',
      'Drawdown',
      '--summary',
      `${event} event.`,
      '--log-root',
      tempDir,
    ];
    if (mastery) args.push('--mastery', mastery);
    return spawnSync('python', args, { encoding: 'utf8' });
  };

  expect(runEvent('assessment', '4').status).toBe(0);
  expect(runEvent('question', '1').status).toBe(0);
  expect(runEvent('lesson').status).toBe(0);

  const topicDir = path.join(tempDir, 'investing-basics');
  const project = JSON.parse(fs.readFileSync(path.join(topicDir, 'project.json'), 'utf8'));
  const progress = JSON.parse(fs.readFileSync(path.join(topicDir, 'progress.json'), 'utf8'));
  const events = fs.readFileSync(path.join(topicDir, 'events.jsonl'), 'utf8').trim().split('\n');
  expect(project.concepts.Drawdown.mastery).toBe(4);
  expect(progress.modules.Risk.concepts.Drawdown.mastery).toBe(4);
  expect(progress.modules.Risk.concepts.Drawdown.last_event).toBe('lesson');
  expect(events[1]).toContain('"mastery": null');
  expect(progress.weak_concepts).not.toContain('Drawdown');
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
    components: Record<
      string,
      { kind: string; path: string; source: string; version: string; provides?: string[] } | undefined
    >;
  };
  const component = index.components['skill:quick-learn'];
  const retiredSkill = ['skill', ['feynman', 'learning', 'coach'].join('-')].join(':');

  expect(index.components[retiredSkill]).toBeUndefined();
  expect(component?.kind).toBe('skill');
  expect(component?.path).toBe('skills/quick-learn');
  expect(component?.source).toBe('local-original');
  expect(component?.version).toBe('0.2.0');
  expect(component?.provides).toContain('source-backed-learning-projects');
  expect(component?.provides).toContain('stage-reviewed-learning-flow');
  expect(component?.provides).toContain('beginner-calibrated-teaching');
  expect(component?.provides).toContain('teaching-review-state-separation');
});
