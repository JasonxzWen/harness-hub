#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const scriptPath = './scripts/validate-skills.ps1';
const extraArgs = process.argv.slice(2);

const candidates = process.platform === 'win32'
  ? [
      ['powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]],
      ['pwsh', ['-NoProfile', '-File', scriptPath]]
    ]
  : [
      ['pwsh', ['-NoProfile', '-File', scriptPath]],
      ['powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]]
    ];

const missingCommands = [];

for (const [command, args] of candidates) {
  const result = spawnSync(command, [...args, ...extraArgs], {
    stdio: 'inherit',
    shell: false
  });

  if (result.error?.code === 'ENOENT') {
    missingCommands.push(command);
    continue;
  }

  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

console.error(`PowerShell is required to run ${scriptPath}. Tried: ${missingCommands.join(', ')}`);
process.exit(127);
