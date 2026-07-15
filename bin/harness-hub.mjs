#!/usr/bin/env node

import { runMigration } from '../scripts/migrate.mjs';

const HELP = `Usage:
  node bin/harness-hub.mjs migrate <target> --host claude|codex|both --yes [--primary claude|codex] [--force]

Runs the repository's only target initialization capability: one complete migration.
In both mode, --primary selects only the CLI used for first-time OKF initialization.`;

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(HELP);
} else if (args[0] !== 'migrate') {
  console.error(JSON.stringify({
    ok: false,
    phase: 'input',
    code: 'E_INPUT',
    message: "The only command is 'migrate'.",
  }));
  process.exitCode = 2;
} else {
  try {
    console.log(JSON.stringify(runMigration(args.slice(1))));
  } catch (error) {
    const known = error && typeof error === 'object' && 'code' in error;
    console.error(JSON.stringify({
      ok: false,
      phase: known ? error.phase : 'internal',
      code: known ? error.code : 'E_INTERNAL',
      message: error instanceof Error ? error.message : String(error),
      ...(known && 'rolledBack' in error ? { rolledBack: error.rolledBack } : {}),
      ...(known && error.originalError ? { originalError: error.originalError } : {}),
    }));
    process.exitCode = known && Number.isInteger(error.exitCode) ? error.exitCode : 1;
  }
}
