import { expect, test } from 'bun:test';
import fs from 'node:fs';

const skill = fs.readFileSync('skills/decision-ui/SKILL.md', 'utf8');
const capabilities = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
  components: Record<string, { kind: string; path: string; distribution: string; host?: string }>;
};

test('decision-ui remains an upstream Codex-only atomic capability', () => {
  expect(skill).toContain('name: decision-ui');
  expect(skill).toContain('# Decision UI for Codex');
  expect(capabilities.components['skill:decision-ui']).toEqual({
    kind: 'skill',
    path: 'skills/decision-ui',
    distribution: 'target-distributed',
    host: 'codex',
  });
  expect(fs.existsSync('skills/decision-ui/agents/openai.yaml')).toBe(false);
});

test('decision-ui interrupts only real high-impact forks and resumes from structured input', () => {
  expect(skill).toContain('用户可见的结果、范围或优先级');
  expect(skill).toContain('风险、成本、不可逆性或外部影响');
  expect(skill).toContain('每个问题只提供 2-3 个互斥、可执行的选项');
  expect(skill).toContain('收到选择后立即恢复原任务');
  expect(skill).toContain('低风险、可逆的实现细节');
  expect(skill).toContain('一个方案明显优于其他方案');
});

test('decision-ui falls back honestly and contains no global Codex setup path', () => {
  expect(skill).toContain('明确说明当前宿主无法渲染原生选择控件');
  expect(skill).toContain('不要声称文本列表是可点击的');
  expect(skill).not.toContain('config.toml');
  expect(skill).not.toContain('default_mode_request_user_input');

  const migration = fs.readFileSync('scripts/migrate.mjs', 'utf8');
  expect(migration).not.toContain('codex features enable');
  expect(migration).not.toContain('config.toml');
  expect(migration).not.toContain('default_mode_request_user_input');
});
