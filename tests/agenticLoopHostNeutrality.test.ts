import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'bun:test';

const GENERIC_PATHS = [
  'harness/minimal/AGENTS.md',
  'harness/minimal/state-templates/current-task.md',
  'harness/minimal/state-templates/progress.md',
  'harness/minimal/state-templates/session-handoff.md',
  'skills/sdd-workflow/SKILL.md',
  'skills/delivery-workflow/SKILL.md',
  'skills/review-workflow/SKILL.md',
  'skills/hub-maintenance-workflow/SKILL.md',
  'skills/workflow-router/references/agentic-loops.md',
  'skills/workflow-router/references/orchestration-policy.md',
  'docs/development-workflow.md',
  'docs/workflow-router-spec.md',
];

const FORBIDDEN_GENERIC_MARKERS = [
  'spawn_agent',
  'subagent_type',
  '.codex/agents',
  '.claude/agents',
  '.claude/skills',
  'mcp__',
  'Codex subagent',
  'Codex subagents',
  'Claude Code subagent',
  'Claude Code subagents',
];

test('generic agentic loop surfaces stay host-neutral and do not dispatch agents', () => {
  for (const relativePath of GENERIC_PATHS) {
    const content = fs.readFileSync(relativePath, 'utf8');
    expect(content, relativePath).toContain('delegated-agent');
    for (const marker of FORBIDDEN_GENERIC_MARKERS) {
      expect(content, `${relativePath} should not contain ${marker}`).not.toContain(marker);
    }
  }
});

test('host-specific agentic loop details live only in adapter docs', () => {
  const codex = fs.readFileSync(path.join('docs', 'host-adapters', 'codex-agentic-loops.md'), 'utf8');
  const claude = fs.readFileSync(path.join('docs', 'host-adapters', 'claude-code-agentic-loops.md'), 'utf8');

  expect(codex).toContain('Codex subagent');
  expect(codex).toContain('delegated-agent');
  expect(claude).toContain('Claude Code subagent');
  expect(claude).toContain('delegated-agent');
});
