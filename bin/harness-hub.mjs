#!/usr/bin/env node

import { runCli } from '../dist/harnessHub.js';

runCli(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`harness-hub: ${error.message}`);
  process.exitCode = 1;
});
