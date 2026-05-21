#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const VALID_STATES = new Set([
  'question',
  'sdd-change',
  'diagnosis',
  'review',
  'delivery',
  'skill-hub-maintenance',
  'clarify',
  'none',
]);

const VALID_PHASES = new Set([
  'pre-implementation',
  'pre-delivery',
]);

function parseArgs(argv) {
  const options = {
    state: 'none',
    phase: 'pre-implementation',
    hasSpec: false,
    hasAcceptance: false,
    hasPlan: false,
    hasHandoff: false,
    materialChanges: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--state') {
      options.state = readValue(argv, ++index, arg);
    } else if (arg === '--phase') {
      options.phase = readValue(argv, ++index, arg);
    } else if (arg === '--has-spec') {
      options.hasSpec = true;
    } else if (arg === '--has-acceptance') {
      options.hasAcceptance = true;
    } else if (arg === '--has-plan') {
      options.hasPlan = true;
    } else if (arg === '--has-handoff') {
      options.hasHandoff = true;
    } else if (arg === '--material-changes') {
      options.materialChanges = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unsupported option '${arg}'`);
    }
  }

  if (!VALID_STATES.has(options.state)) {
    throw new Error(`Unsupported state '${options.state}'`);
  }
  if (!VALID_PHASES.has(options.phase)) {
    throw new Error(`Unsupported phase '${options.phase}'`);
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

export function evaluateAdvisory(options) {
  const warnings = [];

  if (options.state === 'sdd-change' && options.phase === 'pre-implementation') {
    if (!options.hasSpec) {
      warnings.push({
        id: 'missing-spec',
        message: 'SDD implementation should not start before the target spec is aligned.',
      });
    }
    if (!options.hasAcceptance) {
      warnings.push({
        id: 'missing-acceptance',
        message: 'SDD implementation should not start before acceptance criteria are aligned.',
      });
    }
    if (!options.hasPlan) {
      warnings.push({
        id: 'missing-plan',
        message: 'SDD implementation should not start before an executable plan is aligned.',
      });
    }
  }

  if (options.phase === 'pre-delivery' && options.materialChanges && !options.hasHandoff) {
    warnings.push({
      id: 'missing-effective-interact-handoff',
      message: 'Material work should produce an effective-interact handoff unless explicitly waived.',
    });
  }

  return {
    ok: warnings.length === 0,
    blocking: false,
    mutates: false,
    state: options.state,
    phase: options.phase,
    warnings,
  };
}

function printHelp() {
  console.log(`Usage: advisory-check.mjs --state <state> --phase <phase> [flags] [--json]

Flags:
  --has-spec
  --has-acceptance
  --has-plan
  --has-handoff
  --material-changes

This command is advisory and side-effect free. It never dispatches agents or mutates local or remote state.`);
}

function printText(result) {
  if (result.ok) {
    console.log('Advisory check passed.');
    return;
  }
  console.log('Advisory warnings:');
  for (const warning of result.warnings) {
    console.log(`- ${warning.id}: ${warning.message}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exitCode = 0;
    } else {
      const result = evaluateAdvisory(options);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printText(result);
      }
      process.exitCode = 0;
    }
  } catch (error) {
    console.error(`advisory-check: ${error.message}`);
    process.exitCode = 2;
  }
}
