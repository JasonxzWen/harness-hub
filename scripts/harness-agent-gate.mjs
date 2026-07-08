#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { classifyIntent } from '../skills/workflow-router/scripts/route-intent.mjs';
import { evaluateAdvisory } from '../skills/workflow-router/scripts/advisory-check.mjs';

const SUPPORTED_EVENTS = new Set([
  'session-start',
  'user-prompt',
  'pre-tool',
  'post-tool',
  'session-stop',
]);

const REMOTE_WRITE_PATTERNS = [
  /(?:^|[;&|()\n])\s*git\s+push\b/i,
  /(?:^|[;&|()\n])\s*gh\s+pr\s+(create|edit|merge|comment|review|close|reopen|ready|lock|unlock)\b/i,
  /(?:^|[;&|()\n])\s*gh\s+issue\s+(create|edit|comment|close|reopen|delete|lock|unlock)\b/i,
  /(?:^|[;&|()\n])\s*gh\s+release\s+(create|upload|delete|edit)\b/i,
  /(?:^|[;&|()\n])\s*gh\s+api\b[^\n]*(?:--method|-X)\s+(?:POST|PUT|PATCH|DELETE)\b/i,
  /(?:^|[;&|()\n])\s*(?:npm|pnpm)\s+(?:publish|unpublish|deprecate|dist-tag|access|owner|token)\b/i,
  /(?:^|[;&|()\n])\s*yarn\s+(?:publish|npm\s+publish|npm\s+tag|npm\s+dist-tag)\b/i,
  /(?:^|[;&|()\n])\s*vercel\s+(?:deploy|promote)\b/i,
  /(?:^|[;&|()\n])\s*firebase\s+deploy\b/i,
  /(?:^|[;&|()\n])\s*wrangler\s+deploy\b/i,
  /(?:^|[;&|()\n])\s*(?:netlify|fly|railway)\s+(?:deploy|up)\b/i,
];

const DESTRUCTIVE_PATTERNS = [
  /(?:^|[;&|()\n])\s*rm\s+-[^\n\s]*(?:r[^\n\s]*f|f[^\n\s]*r)\b/i,
  /(?:^|[;&|()\n])\s*git\s+reset\s+--hard\b/i,
  /(?:^|[;&|()\n])\s*git\s+clean\s+-[^\n\s]*(?:f[^\n\s]*d|d[^\n\s]*f)\b/i,
  /(?:^|[;&|()\n])\s*(?:Remove-Item|rm|ri|del)\b[^\n]*(?:-Recurse|-Force)\b/i,
  /(?:^|[;&|()\n])\s*rmdir\s+\/s\b/i,
  /(?:^|[;&|()\n])\s*del\s+\/[sq]\b/i,
];

const CREDENTIAL_PATTERNS = [
  /(?:^|[;&|()\n])\s*(?:export\s+)?[A-Z_][A-Z0-9_]*(?:SECRET|TOKEN|API_?KEY|PRIVATE_?KEY)[A-Z0-9_]*\s*=/i,
  /(^|[\s"'=\\/])\.env(?:$|[\s"'\\/]|\.((?!example\b|sample\b|template\b)[A-Za-z0-9_-]+))/i,
  /(^|[\s"'=\\/])id_(?:rsa|dsa|ecdsa|ed25519)(?:$|[\s"'\\/])/i,
];

const HOST_CONFIG_PATTERNS = [
  /(^|[\s"'=\\/])\.codex([\\/]|$)/i,
  /(^|[\s"'=\\/])\.claude([\\/]|$)/i,
  /hooks?\.json/i,
  /settings\.json/i,
  /config\.toml/i,
];

function parseArgs(argv) {
  const options = {
    targetDir: process.cwd(),
    event: null,
    inputPath: null,
    prompt: null,
    enforce: false,
    json: false,
    help: false,
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--event') {
      options.event = readValue(argv, ++index, arg);
    } else if (arg === '--input') {
      options.inputPath = readValue(argv, ++index, arg);
    } else if (arg === '--prompt') {
      options.prompt = readValue(argv, ++index, arg);
    } else if (arg === '--enforce') {
      options.enforce = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unsupported option '${arg}'`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    options.targetDir = positional[0];
  }
  if (positional.length > 1) {
    throw new Error(`Unexpected positional argument '${positional[1]}'`);
  }

  if (options.event && !SUPPORTED_EVENTS.has(options.event)) {
    throw new Error(`Unsupported event '${options.event}'. Supported events: ${[...SUPPORTED_EVENTS].join(', ')}`);
  }

  return options;
}

function readValue(argv, index, flag) {
  const value = argv[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function readInput(options) {
  let input = {};
  if (options.inputPath) {
    input = JSON.parse(fs.readFileSync(path.resolve(options.inputPath), 'utf8'));
  } else if (!process.stdin.isTTY) {
    const text = fs.readFileSync(0, 'utf8').trim();
    if (text) {
      input = JSON.parse(text);
    }
  }
  if (!isRecord(input)) {
    throw new Error('Input must be a JSON object.');
  }
  return input;
}

export function evaluateHarnessAgentGate(rawOptions, rawInput = {}) {
  const options = {
    targetDir: path.resolve(rawOptions.targetDir || process.cwd()),
    event: rawOptions.event || stringField(rawInput, 'event') || null,
    prompt: rawOptions.prompt || stringField(rawInput, 'prompt') || stringField(rawInput, 'userPrompt') || null,
    enforce: Boolean(rawOptions.enforce),
  };

  if (!options.event) {
    throw new Error('Missing --event <event> or input.event.');
  }
  if (!SUPPORTED_EVENTS.has(options.event)) {
    throw new Error(`Unsupported event '${options.event}'. Supported events: ${[...SUPPORTED_EVENTS].join(', ')}`);
  }

  const generatedAt = new Date().toISOString();
  const checks = [];
  const findings = [];
  const eventResult = evaluateEvent(options, rawInput, checks, findings);
  const interrupt = findings.some((finding) => finding.severity === 'blocker');
  const warn = findings.some((finding) => finding.severity === 'warn');
  const decision = interrupt ? 'interrupt' : warn ? 'warn' : 'allow';
  const blocking = Boolean(options.enforce && interrupt);
  const exitCode = blocking ? 3 : 0;

  return {
    schemaVersion: 1,
    generatedAt,
    targetDir: options.targetDir,
    event: options.event,
    ...eventResult,
    layer: 'hook-event-handler',
    authority: 'local-deterministic-gate',
    mutates: false,
    dispatchesDelegatedAgents: false,
    blocking,
    enforce: options.enforce,
    ok: !interrupt && !warn,
    decision,
    exitCode,
    checks,
    findings,
  };
}

function evaluateEvent(options, input, checks, findings) {
  if (options.event === 'session-start') {
    return evaluateSessionStart(options, checks, findings);
  }
  if (options.event === 'user-prompt') {
    return evaluateUserPrompt(options, input, checks, findings);
  }
  if (options.event === 'pre-tool') {
    return evaluatePreTool(options, input, checks, findings);
  }
  if (options.event === 'post-tool') {
    return evaluatePostTool(input, checks, findings);
  }
  if (options.event === 'session-stop') {
    return evaluateSessionStop(options, checks, findings);
  }
  throw new Error(`Unsupported event '${options.event}'.`);
}

function evaluateSessionStart(options, checks, findings) {
  checks.push({
    id: 'target-exists',
    status: fs.existsSync(options.targetDir) ? 'pass' : 'fail',
    evidence: options.targetDir,
  });
  if (!fs.existsSync(options.targetDir)) {
    findings.push(finding('missing-target', 'Target directory does not exist.', 'blocker'));
    return {};
  }

  const git = readGitSnapshot(options.targetDir);
  checks.push({
    id: 'freshness-snapshot',
    status: git.insideWorkTree ? 'pass' : 'warn',
    evidence: git.insideWorkTree ? git.branchLine : 'not a git worktree',
  });
  if (!git.insideWorkTree) {
    findings.push(finding('not-a-git-worktree', 'Target is not a git worktree; freshness checks are advisory only.', 'warn'));
  }

  return { git };
}

function evaluateUserPrompt(options, input, checks, findings) {
  const prompt = options.prompt || stringField(input, 'message') || '';
  if (!prompt.trim()) {
    findings.push(finding('missing-prompt', 'UserPromptSubmit gate needs prompt text.', 'blocker'));
    return {};
  }

  const route = classifyIntent(prompt);
  const phase = route.state === 'delivery' ? 'pre-delivery' : 'pre-implementation';
  const advisory = evaluateAdvisory({
    state: route.state,
    phase,
    currentTaskPath: path.join(options.targetDir, '.harness-hub', 'state', 'current-task.md'),
    expectedOutputMode: route.expectedOutputMode,
  });

  checks.push({
    id: 'workflow-route',
    status: route.owner ? 'pass' : 'warn',
    evidence: route.owner || route.state,
  });
  if (!advisory.ok) {
    findings.push(finding('workflow-advisory', 'Workflow advisory warnings are present.', 'warn', {
      warnings: advisory.warnings.map((warning) => warning.id),
    }));
  }

  return { route, advisory };
}

function evaluatePreTool(options, input, checks, findings) {
  const tool = normalizeToolInput(input, options.prompt);
  const text = buildToolRiskText(tool);
  checks.push({
    id: 'pre-tool-risk-scan',
    status: 'pass',
    evidence: tool.name || 'unknown-tool',
  });

  addPatternFindings(text, REMOTE_WRITE_PATTERNS, findings, 'remote-write', 'Tool input appears to perform a remote write.');
  addPatternFindings(text, DESTRUCTIVE_PATTERNS, findings, 'destructive-command', 'Tool input appears to perform destructive filesystem work.');
  addPatternFindings(text, CREDENTIAL_PATTERNS, findings, 'credential-sensitive', 'Tool input appears to touch credentials or secrets.');

  if (isLikelyMutation(tool) && HOST_CONFIG_PATTERNS.some((pattern) => pattern.test(text))) {
    findings.push(finding('host-config-mutation', 'Tool input appears to mutate Codex or Claude Code host-local configuration.', 'blocker'));
  }

  return { tool };
}

function evaluatePostTool(input, checks, findings) {
  const tool = normalizeToolInput(input);
  const status = stringField(input, 'status') || stringField(input, 'toolStatus') || stringField(input, 'outcome');
  const exitCode = numberField(input, 'exitCode') ?? numberField(input, 'exit_code');
  checks.push({
    id: 'post-tool-observation',
    status: exitCode && exitCode !== 0 ? 'warn' : 'pass',
    evidence: tool.name || status || 'tool-observed',
  });
  if (exitCode && exitCode !== 0) {
    findings.push(finding('tool-failed', `Tool exited with code ${exitCode}.`, 'warn'));
  }
  return { tool, toolStatus: status || null, toolExitCode: exitCode ?? null };
}

function evaluateSessionStop(options, checks, findings) {
  const git = readGitSnapshot(options.targetDir);
  const changedPaths = git.insideWorkTree ? git.changedPaths : [];
  const requiredReviews = classifyRequiredReviewLenses(changedPaths);
  checks.push({
    id: 'required-evidence-snapshot',
    status: requiredReviews.length > 0 ? 'warn' : 'pass',
    evidence: `${changedPaths.length} changed paths`,
  });
  if (requiredReviews.length > 0) {
    findings.push(finding('missing-closeout-evidence-check', 'Changed paths need closeout evidence before handoff.', 'blocker', {
      requiredReviews: requiredReviews.map((item) => item.id),
    }));
  }

  return { git, changedPaths, requiredReviews };
}

function readGitSnapshot(targetDir) {
  try {
    execGitReadOnly(targetDir, ['rev-parse', '--is-inside-work-tree'], {
      stderr: 'ignore',
    });
  } catch {
    return {
      insideWorkTree: false,
      branchLine: null,
      changedPaths: [],
    };
  }

  const status = execGitReadOnly(targetDir, ['status', '--short', '--branch', '--untracked-files=all'])
    .split(/\r?\n/)
    .filter(Boolean);
  const branchLine = status.find((line) => line.startsWith('##')) || '## unknown';
  const changedPaths = status
    .filter((line) => !line.startsWith('##'))
    .map((line) => normalizeStatusPath(line.slice(3)))
    .filter((item) => item && !isIgnoredRuntimePath(item))
    .sort();

  return {
    insideWorkTree: true,
    branchLine,
    changedPaths,
  };
}

function execGitReadOnly(targetDir, args, io = {}) {
  return execFileSync('git', args, {
      cwd: targetDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: '0',
      },
      stdio: ['ignore', 'pipe', io.stderr === 'ignore' ? 'ignore' : 'pipe'],
    });
}

function normalizeStatusPath(value) {
  return String(value || '')
    .replace(/^"|"$/g, '')
    .replace(/^.* -> /, '')
    .replaceAll('\\', '/')
    .trim();
}

function classifyRequiredReviewLenses(changedPaths) {
  const groups = new Map();
  const add = (id, level, pathValue, reason) => {
    const current = groups.get(id) || { id, level, paths: [], reasons: [] };
    current.level = higherLevel(current.level, level);
    current.paths = [...new Set([...current.paths, pathValue])].sort();
    current.reasons = [...new Set([...current.reasons, reason])].sort();
    groups.set(id, current);
  };

  for (const changedPath of changedPaths) {
    let matched = false;
    if (isSecuritySensitive(changedPath)) {
      add('security-review', 'L2', changedPath, 'security-sensitive path changed');
      matched = true;
    }
    if (isWorkflowPath(changedPath)) {
      add('workflow-review', isSecuritySensitive(changedPath) ? 'L2' : 'L1', changedPath, 'workflow or harness path changed');
      matched = true;
    }
    if (changedPath.startsWith('src/')) {
      add('implementation-review', 'L1', changedPath, 'source path changed');
      matched = true;
    }
    if (changedPath.startsWith('tests/')) {
      add('test-review', 'L1', changedPath, 'test path changed');
      matched = true;
    }
    if (isDocumentationPath(changedPath)) {
      add('docs-consistency', 'L0', changedPath, 'documentation path changed');
      matched = true;
    }
    if (!matched) {
      add('implementation-review', 'L1', changedPath, 'general mutation path changed');
    }
  }

  return [...groups.values()].map((item) => ({
    ...item,
    reason: item.reasons.join('; '),
  })).sort((left, right) => left.id.localeCompare(right.id));
}

function higherLevel(left, right) {
  const rank = { L0: 0, L1: 1, L2: 2 };
  return rank[right] > rank[left] ? right : left;
}

function isWorkflowPath(changedPath) {
  return changedPath === 'AGENTS.md'
    || changedPath === 'CLAUDE.md'
    || changedPath.startsWith('harness/')
    || changedPath.startsWith('skills/')
    || changedPath.startsWith('capabilities/')
    || changedPath.startsWith('.github/')
    || changedPath.includes('workflow')
    || changedPath.includes('agentic-loop');
}

function isDocumentationPath(changedPath) {
  return changedPath === 'README.md'
    || changedPath === 'README.zh-CN.md'
    || changedPath.startsWith('docs/')
    || changedPath.endsWith('.md');
}

function isSecuritySensitive(changedPath) {
  return changedPath.startsWith('.github/workflows/')
    || /auth|credential|secret|token|permission|approval|security|sandbox|filesystem|publish|remote/i.test(changedPath);
}

function isIgnoredRuntimePath(changedPath) {
  return changedPath.startsWith('.harness-hub/state/')
    || changedPath.startsWith('.harness-hub/reports/')
    || changedPath.startsWith('.codex/')
    || changedPath.startsWith('.claude/');
}

function normalizeToolInput(input, fallbackCommand = '') {
  const rawInput = isRecord(input.tool_input)
    ? input.tool_input
    : isRecord(input.toolInput)
      ? input.toolInput
      : isRecord(input.tool)
        ? input.tool
        : input;
  const name = stringField(input, 'tool_name')
    || stringField(input, 'toolName')
    || stringField(input, 'name')
    || stringField(rawInput, 'tool_name')
    || stringField(rawInput, 'toolName');
  const command = stringField(rawInput, 'command')
    || stringField(rawInput, 'cmd')
    || stringField(input, 'command')
    || fallbackCommand;
  const patch = stringField(rawInput, 'patch') || stringField(input, 'patch');
  const filePath = stringField(rawInput, 'file_path')
    || stringField(rawInput, 'filePath')
    || stringField(rawInput, 'path')
    || stringField(input, 'file_path')
    || stringField(input, 'filePath')
    || stringField(input, 'path');
  return { name, command, patch, filePath, rawInput };
}

function buildToolRiskText(tool) {
  return [tool.name, tool.command, tool.filePath, tool.patch]
    .filter(Boolean)
    .join('\n');
}

function isLikelyMutation(tool) {
  return /bash|apply_patch|edit|write/i.test(tool.name || '')
    || /\b(write|set-content|add-content|out-file|new-item|copy-item|move-item|remove-item|mkdir|touch|tee|sed\s+-i|git\s+commit)\b/i.test(tool.command || '')
    || /(^|[^>])>{1,2}[^>]/.test(tool.command || '');
}

function addPatternFindings(text, patterns, findings, id, message) {
  if (patterns.some((pattern) => pattern.test(text))) {
    findings.push(finding(id, message, 'blocker'));
  }
}

function finding(id, message, severity, extra = {}) {
  return { id, message, severity, ...extra };
}

function stringField(record, field) {
  if (!isRecord(record)) {
    return '';
  }
  const value = record[field];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function numberField(record, field) {
  if (!isRecord(record)) {
    return null;
  }
  const value = record[field];
  return Number.isInteger(value) ? value : null;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function printHelp() {
  console.log(`Usage: node scripts/harness-agent-gate.mjs [target] --event <event> [--input input.json] [--prompt text] [--enforce] [--json]

Events:
  session-start  Read-only freshness snapshot.
  user-prompt    Route prompt through workflow-router and advisory gates.
  pre-tool       Deterministic local risk scan for a tool call.
  post-tool      Read-only tool result observation.
  session-stop   Dirty-path closeout evidence snapshot.

This runner is a hook-event adapter, not a new workflow owner and not an agentic loop type.
It never writes local state, hook config, global config, remotes, or CI configuration.
By default it is advisory and exits 0 for interrupt findings; use --enforce to return 3 for deterministic blockers.`);
}

function printText(result) {
  console.log(`${result.event}: ${result.decision}`);
  for (const findingItem of result.findings) {
    console.log(`- ${findingItem.severity}: ${findingItem.id}: ${findingItem.message}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exitCode = 0;
    } else {
      const input = readInput(options);
      const result = evaluateHarnessAgentGate(options, input);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printText(result);
      }
      process.exitCode = result.exitCode;
    }
  } catch (error) {
    const result = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      ok: false,
      mutates: false,
      dispatchesDelegatedAgents: false,
      blocking: true,
      decision: 'error',
      exitCode: 2,
      findings: [finding('invalid-input', error instanceof Error ? error.message : String(error), 'blocker')],
    };
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(`harness-agent-gate: ${result.findings[0].message}`);
    }
    process.exitCode = 2;
  }
}
