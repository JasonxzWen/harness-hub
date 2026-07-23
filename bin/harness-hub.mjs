#!/usr/bin/env node

import { runGuidedMigration, runMigration } from '../scripts/migrate.mjs';

const HELP = `Usage:
  node bin/harness-hub.mjs migrate <target> --yes [--host claude|codex|both] [--primary claude|codex] [--force]
  node bin/harness-hub.mjs migrate <target> --guided

Managed migration performs deterministic repository distribution.
Later migration with a valid schemaVersion 1 manifest inherits omitted Host and primary values.
First migration requires --host; first migration in both mode also requires --primary.
Guided migration is a read-only jump point for Agent-led, user-approved selective adoption.`;

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
  const migrationArgs = args.slice(1);
  const guidedRequest = migrationArgs.includes('--guided');
  try {
    const result = guidedRequest
      ? runGuidedMigration(migrationArgs)
      : runMigration(migrationArgs);
    console.log(JSON.stringify(result));
  } catch (error) {
    const known = error
      && typeof error === 'object'
      && typeof error.code === 'string'
      && typeof error.phase === 'string'
      && Number.isInteger(error.exitCode);
    console.error(JSON.stringify({
      ok: false,
      phase: known ? error.phase : 'internal',
      code: known ? error.code : 'E_INTERNAL',
      message: error instanceof Error ? error.message : String(error),
      ...(guidedRequest ? { strategy: 'guided', mutated: false } : {}),
      ...(!guidedRequest && known && 'strategy' in error ? { strategy: error.strategy } : {}),
      ...(!guidedRequest && known && 'mutated' in error ? { mutated: error.mutated } : {}),
      ...(known && 'rolledBack' in error ? { rolledBack: error.rolledBack } : {}),
      ...(known && error.originalError ? { originalError: error.originalError } : {}),
    }));
    process.exitCode = known && Number.isInteger(error.exitCode) ? error.exitCode : 1;
  }
}
