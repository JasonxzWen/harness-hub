#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { evaluateHarnessAgentGate } from './harness-agent-gate.mjs';

const HOSTS = new Set(['codex', 'claude', 'raw']);

const EVENT_ALIASES = new Map([
  ['session-start', 'session-start'],
  ['sessionstart', 'session-start'],
  ['user-prompt', 'user-prompt'],
  ['userpromptsubmit', 'user-prompt'],
  ['pre-tool', 'pre-tool'],
  ['pretooluse', 'pre-tool'],
  ['post-tool', 'post-tool'],
  ['posttooluse', 'post-tool'],
  ['posttoolusefailure', 'post-tool'],
  ['session-stop', 'session-stop'],
  ['stop', 'session-stop'],
  ['sessionend', 'session-stop'],
]);

const HOST_EVENT_BY_GATE_EVENT = {
  codex: {
    'session-start': 'SessionStart',
    'user-prompt': 'UserPromptSubmit',
    'pre-tool': 'PreToolUse',
    'post-tool': 'PostToolUse',
    'session-stop': 'Stop',
  },
  claude: {
    'session-start': 'SessionStart',
    'user-prompt': 'UserPromptSubmit',
    'pre-tool': 'PreToolUse',
    'post-tool': 'PostToolUse',
    'session-stop': 'Stop',
  },
  raw: {},
};

function parseArgs(argv) {
  const options = {
    targetDir: process.cwd(),
    host: null,
    event: null,
    inputPath: null,
    enforce: false,
    help: false,
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--host') {
      options.host = readValue(argv, ++index, arg).toLowerCase();
    } else if (arg === '--event') {
      options.event = readValue(argv, ++index, arg);
    } else if (arg === '--input') {
      options.inputPath = readValue(argv, ++index, arg);
    } else if (arg === '--enforce') {
      options.enforce = true;
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
  if (options.host && !HOSTS.has(options.host)) {
    throw new Error(`Unsupported host '${options.host}'. Supported hosts: ${[...HOSTS].join(', ')}`);
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
  if (options.inputPath) {
    return parseInputText(fs.readFileSync(path.resolve(options.inputPath), 'utf8'));
  }
  if (!process.stdin.isTTY) {
    return parseInputText(fs.readFileSync(0, 'utf8'));
  }
  return {};
}

function parseInputText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return {};
  }
  const value = JSON.parse(trimmed);
  if (!isRecord(value)) {
    throw new Error('Hook input must be a JSON object.');
  }
  return value;
}

export function evaluateHarnessAgentHook(rawOptions, rawInput = {}) {
  const host = rawOptions.host || stringField(rawInput, 'host') || 'raw';
  if (!HOSTS.has(host)) {
    throw new Error(`Unsupported host '${host}'. Supported hosts: ${[...HOSTS].join(', ')}`);
  }
  const rawEvent = rawOptions.event
    || stringField(rawInput, 'hook_event_name')
    || stringField(rawInput, 'hookEventName')
    || stringField(rawInput, 'event');
  const event = normalizeEvent(rawEvent);
  const targetDir = path.resolve(
    rawOptions.targetDir
    || stringField(rawInput, 'cwd')
    || stringField(rawInput, 'project_dir')
    || process.cwd(),
  );
  const gate = evaluateHarnessAgentGate({
    targetDir,
    event,
    enforce: Boolean(rawOptions.enforce),
  }, rawInput);
  const hostEvent = rawEvent || HOST_EVENT_BY_GATE_EVENT[host]?.[event] || event;
  const output = host === 'raw'
    ? gate
    : makeHostOutput(host, hostEvent, event, gate);
  return {
    host,
    hostEvent,
    event,
    gate,
    output,
    exitCode: host === 'raw' ? gate.exitCode : 0,
  };
}

function normalizeEvent(value) {
  const key = String(value || '').replace(/[^A-Za-z0-9-]/g, '').toLowerCase();
  const event = EVENT_ALIASES.get(key);
  if (!event) {
    throw new Error(`Unsupported hook event '${value || ''}'.`);
  }
  return event;
}

function makeHostOutput(host, hostEvent, gateEvent, gate) {
  if (gate.blocking && gateEvent === 'pre-tool') {
    return {
      systemMessage: summarizeFindings(gate),
      hookSpecificOutput: {
        hookEventName: hostEvent,
        permissionDecision: 'deny',
        permissionDecisionReason: summarizeFindings(gate),
      },
    };
  }

  if (gate.findings.length === 0) {
    return null;
  }

  return {
    systemMessage: summarizeFindings(gate),
    hookSpecificOutput: {
      hookEventName: hostEvent,
      additionalContext: summarizeFindings(gate),
    },
  };
}

function summarizeFindings(gate) {
  const findingText = gate.findings
    .map((finding) => `${finding.id}: ${finding.message}`)
    .join('; ');
  return findingText || `Harness Hub gate decision: ${gate.decision}`;
}

function printHelp() {
  console.log(`Usage: harness-agent-hook [target] --host <codex|claude|raw> [--event HookEvent] [--input input.json] [--enforce]

Reads host hook JSON from stdin, runs scripts/harness-agent-gate.mjs, and emits host-compatible JSON.
The default mode is advisory. Use --enforce only after reviewing and approving blocking hook rollout.`);
}

function stringField(record, field) {
  if (!isRecord(record)) {
    return '';
  }
  const value = record[field];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exitCode = 0;
    } else {
      const input = readInput(options);
      const result = evaluateHarnessAgentHook(options, input);
      if (result.output) {
        console.log(JSON.stringify(result.output, null, 2));
      }
      process.exitCode = result.exitCode;
    }
  } catch (error) {
    console.error(`harness-agent-hook: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
