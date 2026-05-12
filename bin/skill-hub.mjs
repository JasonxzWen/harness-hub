#!/usr/bin/env node

import { runCli } from '../dist/skillHub.js';

runCli(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
}).catch((error) => {
  console.error(`skill-hub: ${error.message}`);
  process.exitCode = 1;
});
