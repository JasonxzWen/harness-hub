import fs from 'node:fs';
import { expect, test } from 'bun:test';

const skill = fs.readFileSync('skills/agent-reach/SKILL.md', 'utf8');
const license = fs.readFileSync('skills/agent-reach/LICENSE.txt', 'utf8');
const routing = fs.readFileSync('docs/skill-routing.md', 'utf8');
const sources = fs.readFileSync('docs/source-projects.md', 'utf8');

test('Agent Reach keeps a canonical source-traceable MIT skill', () => {
  const index = JSON.parse(fs.readFileSync('capabilities/index.json', 'utf8')) as {
    components: Record<string, { kind: string; path: string; distribution: string }>;
  };

  expect(skill).toContain('name: agent-reach');
  expect(skill).toContain('description: Load when');
  expect(skill).toContain('license: MIT');
  expect(skill).toContain('source: https://github.com/Panniantong/Agent-Reach');
  expect(skill).toContain('revision: e825f6740d24c6c315c3b0dc41907e6c87ff39a5');
  expect(license).toContain('MIT License');
  expect(license).toContain('Copyright (c) 2025 Agent Eyes');
  expect(index.components['skill:agent-reach']).toEqual({
    kind: 'skill',
    path: 'skills/agent-reach',
    distribution: 'target-distributed',
  });
  expect(sources).toContain('`Panniantong/Agent-Reach`');
  expect(sources).toContain('`e825f6740d24c6c315c3b0dc41907e6c87ff39a5`');
  expect(sources).toContain('MIT; upstream license retained in the Skill');
});

test('Agent Reach reports runtime prerequisites instead of fabricating availability', () => {
  expect(skill).toContain('Run agent-reach doctor --json');
  expect(skill).toContain('marks active for the requested');
  expect(skill).toContain('report the missing user-level');
  expect(skill).toContain('Never infer availability from this Skill being present');
  expect(routing).toContain('`agent-reach` never proves its own runtime availability');
});

test('Agent Reach forbids dependency, login, credential, and global configuration mutation', () => {
  expect(skill).toContain('Do not run Agent Reach install, update, uninstall, configure, login, or');
  expect(skill).toContain('Do not install or upgrade Python, Node.js, GitHub CLI, mcporter, browser');
  expect(skill).toContain('Do not write ~/.agent-reach, Host global configuration, shell profiles, or');
  expect(skill).toContain('Do not copy, export, request, or persist cookies, tokens, browser profiles, QR');
  expect(skill).toContain('Do not weaken sandbox, approval, or repository authorization boundaries');
  expect(routing).toContain('do not install, configure, authenticate, write `~/.agent-reach`, or copy credentials');
  expect(sources).toContain('never installs dependencies, writes `~/.agent-reach`, configures accounts, or copies cookies, credentials, and browser state');
});
